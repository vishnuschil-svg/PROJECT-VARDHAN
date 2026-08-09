"""Trusted Razorpay order, callback, and raw-webhook integration for annual billing."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import os
import urllib.error
import urllib.request
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Callable

import asyncpg
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field


RAZORPAY_API_BASE = "https://api.razorpay.com/v1"
PURCHASE_ROLES = frozenset({"owner", "admin"})
TERMINAL_SUCCESS_STATES = frozenset({"CAPTURED", "SUBSCRIPTION_ACTIVATED"})
RECONCILABLE_STATES = frozenset({"ORDER_CREATED", "CUSTOMER_ACTION_PENDING", "PAYMENT_REPORTED", "VERIFIED", "VERIFYING", "PENDING_CONFIRMATION"})


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class CreateOrderRequest(StrictModel):
    plan_code: str = Field(alias="planCode", min_length=3, max_length=20)
    idempotency_key: str = Field(alias="idempotencyKey", min_length=16, max_length=120)


class VerifyCheckoutRequest(StrictModel):
    attempt_id: uuid.UUID = Field(alias="attemptId")
    razorpay_order_id: str = Field(alias="razorpayOrderId", min_length=8, max_length=100)
    razorpay_payment_id: str = Field(alias="razorpayPaymentId", min_length=8, max_length=100)
    razorpay_signature: str = Field(alias="razorpaySignature", min_length=32, max_length=256)


def razorpay_mode() -> str:
    mode = os.getenv("RAZORPAY_MODE", "test").strip().upper()
    if mode not in {"TEST", "LIVE"}:
        raise RuntimeError("RAZORPAY_MODE must be test or live")
    return mode


def require_razorpay_configuration() -> tuple[str, str, str]:
    key_id = os.getenv("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "").strip()
    if not key_id or not key_secret or not webhook_secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "PAYMENT_PROVIDER_NOT_CONFIGURED")
    mode = razorpay_mode()
    if os.getenv("VARDHAN_ENV", "").strip().upper() == "PRODUCTION" and mode != "LIVE":
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Production requires RAZORPAY_MODE=live")
    expected_prefix = "rzp_test_" if mode == "TEST" else "rzp_live_"
    if not key_id.startswith(expected_prefix):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Razorpay key does not match configured mode")
    return key_id, key_secret, webhook_secret


def verify_checkout_signature(order_id: str, payment_id: str, signature: str, key_secret: str) -> bool:
    expected = hmac.new(key_secret.encode("utf-8"), f"{order_id}|{payment_id}".encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature.strip().lower())


def verify_webhook_signature(raw_body: bytes, signature: str, webhook_secret: str) -> bool:
    expected = hmac.new(webhook_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature.strip().lower())


def safe_attempt(row: Any) -> dict[str, Any]:
    normalized = {"SUBSCRIPTION_ACTIVATED": "ACTIVE", "CAPTURED": "CAPTURED", "FAILED": "FAILED", "EXPIRED": "EXPIRED", "REFUNDED": "REFUNDED", "REVERSED": "REVERSED"}.get(row["state"], "VERIFYING" if row["state"] in RECONCILABLE_STATES else row["state"])
    return {
        "attemptId": str(row["id"]), "state": row["state"], "normalizedStatus": normalized, "planCode": row["plan_code"],
        "planName": row["plan_name_snapshot"], "amount": row["amount_paise"], "currency": row["currency"],
        "orderId": row["provider_order_id"], "paymentId": row["provider_payment_id"],
        "expiresAt": row["expires_at"].isoformat(), "activatedAt": row["activated_at"].isoformat() if row["activated_at"] else None,
        "lastProviderCheckAt": row.get("last_provider_check_at").isoformat() if row.get("last_provider_check_at") else None,
        "providerLastStatus": row.get("provider_last_status"), "reconcileAttemptCount": row.get("reconcile_attempt_count", 0),
        "lastErrorCode": row.get("last_error_code"), "webhookReceived": bool(row.get("webhook_event_id")),
        "callbackVerified": bool(row.get("callback_verified_at")),
    }


class RazorpayOrdersClient:
    def __init__(self, key_id: str, key_secret: str):
        self.key_id = key_id
        self.key_secret = key_secret

    def create_order(self, *, amount: int, currency: str, receipt: str, notes: dict[str, str]) -> dict[str, Any]:
        body = json.dumps({"amount": amount, "currency": currency, "receipt": receipt, "notes": notes}).encode("utf-8")
        credentials = base64.b64encode(f"{self.key_id}:{self.key_secret}".encode("utf-8")).decode("ascii")
        request = urllib.request.Request(
            f"{RAZORPAY_API_BASE}/orders", data=body, method="POST",
            headers={"Authorization": f"Basic {credentials}", "Content-Type": "application/json", "User-Agent": "VardhanERP/1.0"},
        )
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                return json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise RuntimeError("Razorpay order creation failed") from exc

    def fetch_order_payments(self, order_id: str) -> list[dict[str, Any]]:
        credentials = base64.b64encode(f"{self.key_id}:{self.key_secret}".encode("utf-8")).decode("ascii")
        request = urllib.request.Request(f"{RAZORPAY_API_BASE}/orders/{order_id}/payments", headers={"Authorization": f"Basic {credentials}", "User-Agent": "VardhanERP/1.0"})
        last_error: Exception | None = None
        for attempt in range(2):
            try:
                with urllib.request.urlopen(request, timeout=8) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                    return payload.get("items", []) if isinstance(payload.get("items"), list) else []
            except urllib.error.HTTPError as exc:
                if exc.code in {400, 404}:
                    raise LookupError("PAYMENT_NOT_FOUND") from exc
                last_error = exc
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                last_error = exc
            if attempt == 0:
                __import__("time").sleep(0.25)
        raise RuntimeError("PAYMENT_PROVIDER_TEMPORARY_ERROR") from last_error


def classify_provider_payments(payments: list[dict[str, Any]], attempt: Any, now: datetime | None = None) -> tuple[str, dict[str, Any] | None]:
    matching = [item for item in payments if item.get("order_id") == attempt["provider_order_id"] and item.get("amount") == attempt["amount_paise"] and item.get("currency") == attempt["currency"]]
    captured = next((item for item in matching if item.get("status") == "captured" and item.get("captured") is True), None)
    if captured:
        return "PAYMENT_CAPTURED", captured
    refunded = next((item for item in matching if item.get("status") == "refunded" or item.get("refund_status") == "full"), None)
    if refunded:
        return "PAYMENT_REFUNDED", refunded
    if any(item.get("status") in {"created", "authorized"} for item in matching):
        return "PAYMENT_STILL_PENDING", matching[0]
    if matching and all(item.get("status") == "failed" for item in matching):
        return "PAYMENT_CONFIRMED_FAILED", matching[0]
    if (now or datetime.now(UTC)) >= attempt["expires_at"]:
        return "PAYMENT_ORDER_EXPIRED", None
    return "PAYMENT_STILL_PENDING", None


async def record_reconciliation_event(connection: Any, attempt: Any, event_type: str, actor_type: str, provider_status: str | None = None, error_code: str | None = None, actor_user_id: uuid.UUID | None = None) -> None:
    await connection.execute(
        """insert into public.payment_reconciliation_events(tenant_id,data_scope,workspace_id,attempt_id,event_type,provider_status,error_code,actor_type,actor_user_id)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9)""",
        attempt["tenant_id"], attempt["data_scope"], attempt["workspace_id"], attempt["id"], event_type, provider_status, error_code, actor_type, actor_user_id,
    )


async def ensure_saas_billing_receipt(connection: Any, attempt: Any, subscription_payment_id: uuid.UUID) -> Any:
    receipt_number = f"VDS-{subscription_payment_id.hex.upper()}"
    receipt = await connection.fetchrow(
        """insert into public.saas_billing_receipts(
             tenant_id,data_scope,workspace_id,subscription_payment_id,subscription_id,receipt_number,
             customer_name,plan_code,plan_name,billing_period,valid_from,valid_until,amount_paise,currency,
             payment_date,provider,provider_payment_id,provider_order_id,provider_receipt,payment_status)
           select p.tenant_id,p.data_scope,p.workspace_id,p.id,p.subscription_id,$2,
             w.business_name,$3,$4,$5,p.verified_at,s.paid_entitlement_ends_at,p.amount_paise,p.currency,
             p.verified_at,p.provider,p.provider_payment_id,p.provider_order_id,$6,'SUCCESS'
           from public.subscription_payments p
           join public.billing_subscriptions s on s.id=p.subscription_id
           join public.workspaces w on w.id=p.workspace_id and w.tenant_id=p.tenant_id and w.data_scope=p.data_scope
           where p.id=$1
           on conflict(subscription_payment_id) do nothing returning *""",
        subscription_payment_id, receipt_number, attempt["plan_code"], attempt["plan_name_snapshot"],
        "ANNUAL", attempt["provider_receipt"],
    )
    if receipt is not None:
        return receipt
    return await connection.fetchrow(
        "select * from public.saas_billing_receipts where subscription_payment_id=$1",
        subscription_payment_id,
    )


async def reconcile_attempt(pool: asyncpg.Pool, attempt_id: uuid.UUID, client: RazorpayOrdersClient, actor_type: str, actor_user_id: uuid.UUID | None = None) -> Any:
    attempt = await pool.fetchrow("select * from public.payment_checkout_attempts where id=$1", attempt_id)
    if attempt is None or attempt["state"] not in RECONCILABLE_STATES:
        return attempt
    try:
        payments = await asyncio.to_thread(client.fetch_order_payments, attempt["provider_order_id"])
        outcome, payment = classify_provider_payments(payments, attempt)
    except LookupError:
        outcome, payment = "PAYMENT_NOT_FOUND", None
    except RuntimeError:
        outcome, payment = "PAYMENT_PROVIDER_TEMPORARY_ERROR", None
    async with pool.acquire() as connection, connection.transaction():
        locked = await connection.fetchrow("select * from public.payment_checkout_attempts where id=$1 for update", attempt_id)
        if locked["state"] not in RECONCILABLE_STATES:
            return locked
        await record_reconciliation_event(connection, locked, "PAYMENT_RECHECK_STARTED", actor_type, outcome, actor_user_id=actor_user_id)
        if outcome == "PAYMENT_CAPTURED" and payment:
            payment_id = str(payment["id"])
            event_key = f"reconcile:{locked['id']}:{payment_id}:captured"
            evidence = {"event": "payment.captured.reconciled", "payload": {"payment": {"entity": payment}}}
            webhook_id = await connection.fetchval(
                """insert into public.provider_webhook_events(id,tenant_id,data_scope,provider,event_id,event_type,payload,verified)
                   values(gen_random_uuid(),$1,$2,'razorpay',$3,'payment.captured.reconciled',$4::jsonb,true)
                   on conflict(provider,event_id) do nothing returning id""",
                locked["tenant_id"], locked["data_scope"], event_key, json.dumps(evidence, separators=(",", ":")),
            )
            if webhook_id is None:
                webhook_id = await connection.fetchval(
                    "select id from public.provider_webhook_events where provider='razorpay' and event_id=$1",
                    event_key,
                )
            await connection.execute("update public.payment_checkout_attempts set provider_payment_id=$2,state='CAPTURED',provider_last_status='captured',last_provider_check_at=now(),reconcile_attempt_count=reconcile_attempt_count+1,webhook_event_id=$3 where id=$1", locked["id"], payment_id, webhook_id)
            await record_reconciliation_event(connection, locked, "PAYMENT_RECHECK_CAPTURED", actor_type, "captured", actor_user_id=actor_user_id)
            subscription_payment_id = await connection.fetchval("select public.process_verified_annual_payment($1,$2,$3,$4,$5,$6,$7)", webhook_id, locked["workspace_id"], locked["plan_code"], payment_id, locked["provider_order_id"], f"razorpay:{payment_id}", locked["user_id"])
            await ensure_saas_billing_receipt(connection, locked, subscription_payment_id)
            row = await connection.fetchrow("update public.payment_checkout_attempts set state='SUBSCRIPTION_ACTIVATED',subscription_payment_id=$2,activated_at=coalesce(activated_at,now()),next_reconcile_at=null,reconcile_lock_token=null,reconcile_lock_until=null where id=$1 returning *", locked["id"], subscription_payment_id)
            await record_reconciliation_event(connection, row, "SUBSCRIPTION_RECOVERED", actor_type, "captured", actor_user_id=actor_user_id)
            return row
        if outcome == "PAYMENT_CONFIRMED_FAILED":
            row = await connection.fetchrow("update public.payment_checkout_attempts set state='FAILED',provider_last_status='failed',last_provider_check_at=now(),reconcile_attempt_count=reconcile_attempt_count+1,last_error_code='PAYMENT_CONFIRMED_FAILED',next_reconcile_at=null where id=$1 returning *", locked["id"])
            await record_reconciliation_event(connection, row, "PAYMENT_RECHECK_FAILED", actor_type, "failed", "PAYMENT_CONFIRMED_FAILED", actor_user_id)
            return row
        if outcome in {"PAYMENT_ORDER_EXPIRED", "PAYMENT_NOT_FOUND"} and datetime.now(UTC) >= locked["expires_at"]:
            row = await connection.fetchrow("update public.payment_checkout_attempts set state='EXPIRED',provider_last_status=$2,last_provider_check_at=now(),reconcile_attempt_count=reconcile_attempt_count+1,last_error_code=$2,next_reconcile_at=null where id=$1 returning *", locked["id"], outcome)
            await record_reconciliation_event(connection, row, "PAYMENT_RECHECK_FAILED", actor_type, outcome, outcome, actor_user_id)
            return row
        row = await connection.fetchrow("update public.payment_checkout_attempts set state='PENDING_CONFIRMATION',provider_last_status=$2,last_provider_check_at=now(),reconcile_attempt_count=reconcile_attempt_count+1,last_error_code=case when $2='PAYMENT_PROVIDER_TEMPORARY_ERROR' then $2 else null end,next_reconcile_at=now()+interval '5 minutes',reconcile_lock_token=null,reconcile_lock_until=null where id=$1 returning *", locked["id"], outcome)
        await record_reconciliation_event(connection, row, "PAYMENT_RECHECK_PENDING", actor_type, outcome, row["last_error_code"], actor_user_id)
        return row


def extract_payment(payload: dict[str, Any]) -> dict[str, Any]:
    payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
    return payment if isinstance(payment, dict) else {}


def extract_refund_payment_id(payload: dict[str, Any]) -> str:
    refund = payload.get("payload", {}).get("refund", {}).get("entity", {})
    payment = extract_payment(payload)
    return str(refund.get("payment_id") or payment.get("id") or "")


def build_razorpay_router(
    workspace_dependency: Callable[..., Any],
    pool_dependency: Callable[..., asyncpg.Pool],
    principal_dependency: Callable[..., Any],
) -> APIRouter:
    router = APIRouter(prefix="/api/payments/razorpay", tags=["payments"])

    @router.post("/create-order")
    async def create_order(
        payload: CreateOrderRequest,
        context: tuple[uuid.UUID, str, str, str, Any] = Depends(workspace_dependency),
        pool: asyncpg.Pool = Depends(pool_dependency),
    ) -> dict[str, Any]:
        key_id, key_secret, _ = require_razorpay_configuration()
        workspace_id, tenant_id, data_scope, role, principal = context
        if role not in PURCHASE_ROLES:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only workspace owners or admins can purchase a plan")
        plan_code = payload.plan_code.strip().upper()
        async with pool.acquire() as connection:
            plan = await connection.fetchrow(
                """select id,plan_code,version,plan_name,price_paise,currency,billing_period,max_active_chits
                   from public.subscription_plans where product_id='chit_management' and plan_code=$1 and status='ACTIVE'
                     and effective_from<=now() and (effective_to is null or effective_to>now()) order by version desc limit 1""",
                plan_code,
            )
            if plan is None or plan["billing_period"] != "ANNUAL" or plan["currency"] != "INR":
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown or inactive annual plan")
            existing = await connection.fetchrow(
                """select * from public.payment_checkout_attempts
                   where workspace_id=$1 and user_id=$2 and client_idempotency_key=$3""",
                workspace_id, principal.user_id, payload.idempotency_key,
            )
            if existing is not None:
                if existing["plan_code"] != plan_code:
                    raise HTTPException(status.HTTP_409_CONFLICT, "Idempotency key is already bound to another plan")
                if existing["provider_order_id"]:
                    return {**safe_attempt(existing), "keyId": key_id, "merchantName": "VARDHAN", "billingLabel": "VISHNU VARDHAN"}
                raise HTTPException(status.HTTP_409_CONFLICT, "Checkout order creation is already in progress")
            unresolved = await connection.fetchrow(
                """select * from public.payment_checkout_attempts where workspace_id=$1 and plan_code=$2
                   and state in ('ORDER_CREATED','CUSTOMER_ACTION_PENDING','PAYMENT_REPORTED','VERIFIED','VERIFYING','PENDING_CONFIRMATION','CAPTURED')
                   order by created_at desc limit 1""", workspace_id, plan_code,
            )
            if unresolved is not None:
                return {**safe_attempt(unresolved), "keyId": key_id, "merchantName": "VARDHAN", "billingLabel": "VISHNU VARDHAN", "reused": True, "message": "An unresolved payment already exists. Do not pay again; check its status first."}
            attempt_id = uuid.uuid4()
            receipt = f"vdn_{attempt_id.hex}"
            expires_at = datetime.now(UTC) + timedelta(minutes=20)
            await connection.execute(
                """insert into public.payment_checkout_attempts
                   (id,tenant_id,data_scope,workspace_id,user_id,plan_id,plan_code,plan_version,plan_name_snapshot,
                    amount_paise,currency,billing_period,max_active_chits_snapshot,provider_mode,client_idempotency_key,provider_receipt,expires_at)
                   values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)""",
                attempt_id, tenant_id, data_scope, workspace_id, principal.user_id, plan["id"], plan_code,
                plan["version"], plan["plan_name"], plan["price_paise"], plan["currency"], plan["billing_period"],
                plan["max_active_chits"], razorpay_mode(), payload.idempotency_key, receipt, expires_at,
            )
        client = RazorpayOrdersClient(key_id, key_secret)
        try:
            order = await asyncio.to_thread(
                client.create_order, amount=plan["price_paise"], currency=plan["currency"], receipt=receipt,
                notes={"purchase_id": str(attempt_id), "workspace_id": str(workspace_id), "plan_code": plan_code},
            )
            if order.get("amount") != plan["price_paise"] or order.get("currency") != "INR" or order.get("receipt") != receipt or not str(order.get("id", "")).startswith("order_"):
                raise RuntimeError("Razorpay returned an invalid order mapping")
            row = await pool.fetchrow(
                """update public.payment_checkout_attempts set provider_order_id=$2,state='ORDER_CREATED',next_reconcile_at=now()+interval '2 minutes',updated_at=now()
                   where id=$1 and state='CREATED' returning *""", attempt_id, order["id"],
            )
            return {**safe_attempt(row), "keyId": key_id, "merchantName": "VARDHAN", "billingLabel": "VISHNU VARDHAN"}
        except asyncpg.UniqueViolationError:
            await pool.execute("update public.payment_checkout_attempts set state='FAILED',failure_code='DUPLICATE_UNRESOLVED_PURCHASE',updated_at=now() where id=$1 and state='CREATED'", attempt_id)
            existing = await pool.fetchrow(
                """select * from public.payment_checkout_attempts where workspace_id=$1 and plan_code=$2
                   and state in ('ORDER_CREATED','CUSTOMER_ACTION_PENDING','PAYMENT_REPORTED','VERIFIED','VERIFYING','PENDING_CONFIRMATION','CAPTURED')
                   order by created_at desc limit 1""", workspace_id, plan_code,
            )
            if existing is not None:
                return {**safe_attempt(existing), "keyId": key_id, "merchantName": "VARDHAN", "billingLabel": "VISHNU VARDHAN", "reused": True, "message": "An unresolved payment already exists. Do not pay again; check its status first."}
            raise HTTPException(status.HTTP_409_CONFLICT, "Another payment attempt is already in progress")
        except Exception as exc:
            await pool.execute("update public.payment_checkout_attempts set state='FAILED',failure_code='ORDER_CREATION_FAILED',updated_at=now() where id=$1 and state='CREATED'", attempt_id)
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Payment order could not be created") from exc

    @router.post("/verify-checkout")
    async def verify_checkout(
        payload: VerifyCheckoutRequest,
        context: tuple[uuid.UUID, str, str, str, Any] = Depends(workspace_dependency),
        pool: asyncpg.Pool = Depends(pool_dependency),
    ) -> dict[str, Any]:
        _, key_secret, _ = require_razorpay_configuration()
        workspace_id, _, _, _, principal = context
        async with pool.acquire() as connection, connection.transaction():
            row = await connection.fetchrow("select * from public.payment_checkout_attempts where id=$1 for update", payload.attempt_id)
            if row is None or row["workspace_id"] != workspace_id or row["user_id"] != principal.user_id:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment attempt not found")
            if row["provider_order_id"] != payload.razorpay_order_id:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Payment order mismatch")
            if row["provider_payment_id"] and row["provider_payment_id"] != payload.razorpay_payment_id:
                raise HTTPException(status.HTTP_409_CONFLICT, "Payment attempt is already bound to another payment")
            if not verify_checkout_signature(row["provider_order_id"], payload.razorpay_payment_id, payload.razorpay_signature, key_secret):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid payment signature")
            if row["state"] not in TERMINAL_SUCCESS_STATES:
                row = await connection.fetchrow(
                    """update public.payment_checkout_attempts set provider_payment_id=$2,state='VERIFYING',callback_verified_at=now(),next_reconcile_at=now()+interval '2 minutes',updated_at=now()
                       where id=$1 returning *""", row["id"], payload.razorpay_payment_id,
                )
            return {**safe_attempt(row), "message": "Payment received. Verifying securely through Razorpay webhook."}

    @router.get("/attempts/{attempt_id}")
    async def attempt_status(
        attempt_id: uuid.UUID,
        context: tuple[uuid.UUID, str, str, str, Any] = Depends(workspace_dependency),
        pool: asyncpg.Pool = Depends(pool_dependency),
    ) -> dict[str, Any]:
        workspace_id, _, _, _, principal = context
        row = await pool.fetchrow("select * from public.payment_checkout_attempts where id=$1 and workspace_id=$2 and user_id=$3", attempt_id, workspace_id, principal.user_id)
        if row is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment attempt not found")
        if row["state"] in RECONCILABLE_STATES:
            key_id, key_secret, _ = require_razorpay_configuration()
            row = await reconcile_attempt(pool, row["id"], RazorpayOrdersClient(key_id, key_secret), "CUSTOMER_STATUS", principal.user_id)
        return safe_attempt(row)

    @router.post("/admin/recheck/{attempt_id}")
    async def admin_recheck(attempt_id: uuid.UUID, principal: Any = Depends(principal_dependency), pool: asyncpg.Pool = Depends(pool_dependency)) -> dict[str, Any]:
        allowed = await pool.fetchval("select exists(select 1 from public.user_profiles where id=$1 and is_platform_owner=true)", principal.user_id)
        if not allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Platform owner access required")
        key_id, key_secret, _ = require_razorpay_configuration()
        row = await reconcile_attempt(pool, attempt_id, RazorpayOrdersClient(key_id, key_secret), "ADMIN", principal.user_id)
        if row is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment attempt not found")
        return safe_attempt(row)

    @router.get("/reconcile-pending")
    async def reconcile_pending(request: Request, pool: asyncpg.Pool = Depends(pool_dependency)) -> dict[str, Any]:
        cron_secret = os.getenv("CRON_SECRET", "").strip()
        authorization = request.headers.get("authorization", "")
        if not cron_secret or not hmac.compare_digest(authorization, f"Bearer {cron_secret}"):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Reconciliation job authentication failed")
        key_id, key_secret, _ = require_razorpay_configuration()
        lock_token = uuid.uuid4()
        async with pool.acquire() as connection, connection.transaction():
            rows = await connection.fetch(
                """select id from public.payment_checkout_attempts where state in ('ORDER_CREATED','CUSTOMER_ACTION_PENDING','PAYMENT_REPORTED','VERIFIED','VERIFYING','PENDING_CONFIRMATION')
                   and coalesce(next_reconcile_at,created_at)<=now() and (reconcile_lock_until is null or reconcile_lock_until<now())
                   order by coalesce(next_reconcile_at,created_at) limit 1 for update skip locked"""
            )
            ids = [row["id"] for row in rows]
            if ids:
                await connection.execute("update public.payment_checkout_attempts set reconcile_lock_token=$2,reconcile_lock_until=now()+interval '2 minutes' where id=any($1::uuid[])", ids, lock_token)
        client = RazorpayOrdersClient(key_id, key_secret)
        processed = 0
        failed = 0
        for attempt_id in ids:
            try:
                await reconcile_attempt(pool, attempt_id, client, "SCHEDULED_JOB")
                processed += 1
            except Exception:
                # Keep the batch progressing; the short claim lease makes this attempt retryable.
                failed += 1
        return {"ok": failed == 0, "claimed": len(ids), "processed": processed, "failed": failed}

    @router.post("/webhook")
    async def webhook(
        request: Request,
        x_razorpay_signature: str = Header(alias="X-Razorpay-Signature"),
        x_razorpay_event_id: str = Header(alias="X-Razorpay-Event-Id"),
        pool: asyncpg.Pool = Depends(pool_dependency),
    ) -> dict[str, Any]:
        _, _, webhook_secret = require_razorpay_configuration()
        raw_body = await request.body()
        if not verify_webhook_signature(raw_body, x_razorpay_signature, webhook_secret):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid webhook signature")
        try:
            event = json.loads(raw_body)
        except json.JSONDecodeError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid webhook payload") from exc
        event_type = str(event.get("event", ""))
        payment = extract_payment(event)
        payment_id = str(payment.get("id") or extract_refund_payment_id(event))
        order_id = str(payment.get("order_id") or event.get("payload", {}).get("order", {}).get("entity", {}).get("id") or "")
        async with pool.acquire() as connection, connection.transaction():
            attempt = None
            if order_id:
                attempt = await connection.fetchrow("select * from public.payment_checkout_attempts where provider='razorpay' and provider_order_id=$1 for update", order_id)
            if attempt is None and payment_id:
                attempt = await connection.fetchrow("select * from public.payment_checkout_attempts where provider='razorpay' and provider_payment_id=$1 for update", payment_id)
            if attempt is None:
                return {"accepted": True, "matched": False}
            existing_event = await connection.fetchrow("select id from public.provider_webhook_events where provider='razorpay' and event_id=$1", x_razorpay_event_id)
            if existing_event is not None:
                if attempt["subscription_payment_id"]:
                    await ensure_saas_billing_receipt(connection, attempt, attempt["subscription_payment_id"])
                await record_reconciliation_event(connection, attempt, "WEBHOOK_REPLAY_IGNORED", "WEBHOOK", event_type)
                return {"accepted": True, "duplicate": True}
            webhook_id = await connection.fetchval(
                """insert into public.provider_webhook_events(id,tenant_id,data_scope,provider,event_id,event_type,payload,verified)
                   values(gen_random_uuid(),$1,$2,'razorpay',$3,$4,$5::jsonb,true) returning id""",
                attempt["tenant_id"], attempt["data_scope"], x_razorpay_event_id, event_type, json.dumps(event, separators=(",", ":")),
            )
            await record_reconciliation_event(connection, attempt, "WEBHOOK_RECEIVED", "WEBHOOK", event_type)
            if event_type in {"payment.captured", "order.paid"}:
                if not payment_id or payment.get("amount") != attempt["amount_paise"] or payment.get("currency") != attempt["currency"] or (payment.get("status") != "captured" and payment.get("captured") is not True):
                    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Captured payment does not match purchase")
                if attempt["state"] != "SUBSCRIPTION_ACTIVATED":
                    await connection.execute("update public.payment_checkout_attempts set provider_payment_id=$2,state='CAPTURED',webhook_event_id=$3,updated_at=now() where id=$1", attempt["id"], payment_id, webhook_id)
                    subscription_payment_id = await connection.fetchval(
                        "select public.process_verified_annual_payment($1,$2,$3,$4,$5,$6,$7)", webhook_id, attempt["workspace_id"], attempt["plan_code"], payment_id, attempt["provider_order_id"], f"razorpay:{payment_id}", attempt["user_id"],
                    )
                    await ensure_saas_billing_receipt(connection, attempt, subscription_payment_id)
                    await connection.execute("update public.payment_checkout_attempts set state='SUBSCRIPTION_ACTIVATED',subscription_payment_id=$2,activated_at=now(),updated_at=now() where id=$1", attempt["id"], subscription_payment_id)
            elif event_type == "payment.failed" and attempt["state"] not in TERMINAL_SUCCESS_STATES and attempt["state"] not in {"FAILED", "CANCELLED", "EXPIRED"}:
                await connection.execute("update public.payment_checkout_attempts set state='FAILED',failure_code=$2,failure_description=$3,webhook_event_id=$4,updated_at=now() where id=$1", attempt["id"], str(payment.get("error_code") or "PAYMENT_FAILED")[:120], str(payment.get("error_description") or "Payment failed")[:500], webhook_id)
            elif event_type in {"refund.processed", "payment.dispute.created", "payment.dispute.action_required"} and payment_id:
                reversal_status = "REFUNDED" if event_type == "refund.processed" else "REVERSED"
                if attempt["state"] in TERMINAL_SUCCESS_STATES or (attempt["state"] == "REFUNDED" and reversal_status == "REVERSED"):
                    await connection.execute("update public.payment_checkout_attempts set state=$2,webhook_event_id=$3,refunded_at=case when $2='REFUNDED' then now() else refunded_at end,reversed_at=case when $2='REVERSED' then now() else reversed_at end,updated_at=now() where id=$1", attempt["id"], reversal_status, webhook_id)
                    await connection.fetchval("select public.process_verified_payment_reversal($1,$2,$3,$4)", payment_id, reversal_status, webhook_id, f"Verified Razorpay {event_type}")
            return {"accepted": True, "duplicate": False}

    return router
