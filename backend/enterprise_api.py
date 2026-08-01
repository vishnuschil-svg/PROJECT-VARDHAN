from __future__ import annotations

import json
import os
from dataclasses import asdict
from datetime import UTC, datetime, timedelta
from typing import Any, Callable, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

from enterprise_integrations import (
    EmailServiceAdapter,
    GstInvoiceService,
    LicenseLifecycleService,
    MonitoringAlertAdapter,
    RazorpaySubscriptionsAdapter,
    SmsGatewayAdapter,
    WhatsAppCloudAdapter,
    production_configuration_status,
)


class CommunicationRequest(BaseModel):
    channel: Literal["WHATSAPP", "SMS", "EMAIL"]
    recipient: str
    body: str = Field(min_length=1, max_length=10000)
    subject: str = Field(default="", max_length=500)
    template_id: str | None = Field(default=None, alias="templateId")
    dedupe_key: str = Field(min_length=1, max_length=250, alias="dedupeKey")


class SubscriptionRequest(BaseModel):
    plan_id: str = Field(alias="planId")
    product_id: str = Field(alias="productId")
    total_count: int = Field(default=12, alias="totalCount", ge=1, le=120)
    trial_days: int = Field(default=14, alias="trialDays", ge=0, le=90)


class LicenseActivationRequest(BaseModel):
    product_id: str = Field(alias="productId")
    subscription_id: str = Field(alias="subscriptionId")
    expires_at: datetime = Field(alias="expiresAt")


class GstInvoiceRequest(BaseModel):
    invoice_number: str = Field(alias="invoiceNumber")
    supplier_gstin: str = Field(alias="supplierGstin")
    customer_gstin: str = Field(alias="customerGstin")
    supplier_state: str = Field(alias="supplierState")
    customer_state: str = Field(alias="customerState")
    lines: list[dict[str, Any]] = Field(min_length=1)


def build_enterprise_router(workspace_dependency: Callable[..., Any], pool_getter: Callable[[Request], Any]) -> APIRouter:
    router = APIRouter(prefix="/v1")
    whatsapp = WhatsAppCloudAdapter(os.getenv("WHATSAPP_ACCESS_TOKEN", ""), os.getenv("WHATSAPP_PHONE_NUMBER_ID", ""))
    sms = SmsGatewayAdapter(os.getenv("SMS_GATEWAY_URL", ""), os.getenv("SMS_GATEWAY_API_KEY", ""), os.getenv("SMS_SENDER_ID", ""))
    email = EmailServiceAdapter(os.getenv("EMAIL_API_KEY", ""), os.getenv("EMAIL_FROM", ""), url=os.getenv("EMAIL_API_URL", "https://api.sendgrid.com/v3/mail/send"))
    razorpay = RazorpaySubscriptionsAdapter(os.getenv("RAZORPAY_KEY_ID", ""), os.getenv("RAZORPAY_KEY_SECRET", ""), os.getenv("RAZORPAY_WEBHOOK_SECRET", ""))
    licenses = LicenseLifecycleService(os.getenv("LICENSE_SIGNING_SECRET", ""))
    alerts = MonitoringAlertAdapter(os.getenv("MONITORING_ALERT_WEBHOOK", ""), os.getenv("MONITORING_ALERT_TOKEN", ""))

    @router.get("/health/enterprise")
    async def enterprise_health(request: Request, context=Depends(workspace_dependency)) -> dict[str, Any]:
        del context
        pool = pool_getter(request)
        database = bool(await pool.fetchval("select true"))
        configuration = production_configuration_status()
        return {"status": "healthy" if database and all(configuration.values()) else "degraded", "database": database, "configuration": configuration, "timestamp": datetime.now(UTC).isoformat()}

    @router.post("/communications/send")
    async def send_communication(payload: CommunicationRequest, request: Request, context=Depends(workspace_dependency)) -> dict[str, Any]:
        workspace_id, tenant_id, data_scope, role, principal = context
        if role not in {"owner", "admin", "operator"}: raise HTTPException(status.HTTP_403_FORBIDDEN, "A write role is required")
        pool = pool_getter(request)
        duplicate = await pool.fetchval("select id from public.notification_deliveries where workspace_id=$1 and tenant_id=$2 and data_scope=$3 and dedupe_key=$4", workspace_id, tenant_id, data_scope, payload.dedupe_key)
        if duplicate: raise HTTPException(status.HTTP_409_CONFLICT, "Duplicate notification prevented")
        try:
            if payload.channel == "WHATSAPP": result = await whatsapp.send(to=payload.recipient, body=payload.body, template=payload.template_id)
            elif payload.channel == "SMS": result = await sms.send(to=payload.recipient, body=payload.body, template_id=payload.template_id)
            else: result = await email.send(to=payload.recipient, subject=payload.subject or "VARDHAN notification", html=payload.body, text=payload.body)
        except Exception as exc:
            if os.getenv("MONITORING_ALERT_WEBHOOK"):
                try: await alerts.send(severity="error", title="Communication provider failure", details={"channel": payload.channel, "tenantId": str(tenant_id), "error": str(exc)})
                except Exception: pass
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc
        row_id = await pool.fetchval("""insert into public.notification_deliveries(workspace_id,tenant_id,data_scope,channel,recipient,dedupe_key,provider,provider_message_id,status,payload,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,'DELIVERED',$9::jsonb,$10) returning id""", workspace_id, tenant_id, data_scope, payload.channel, payload.recipient, payload.dedupe_key, result.provider, result.external_id, json.dumps(asdict(result)), principal.user_id)
        return {"id": str(row_id), **asdict(result)}

    @router.post("/billing/subscriptions")
    async def create_subscription(payload: SubscriptionRequest, request: Request, context=Depends(workspace_dependency)) -> dict[str, Any]:
        workspace_id, tenant_id, data_scope, role, principal = context
        if role not in {"owner", "admin"}: raise HTTPException(status.HTTP_403_FORBIDDEN, "Owner or admin role is required")
        try: result = await razorpay.create_subscription(plan_id=payload.plan_id, tenant_id=str(tenant_id), data_scope=data_scope, product_id=payload.product_id, total_count=payload.total_count)
        except Exception as exc: raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc
        pool = pool_getter(request)
        trial_ends_at = datetime.now(UTC) + timedelta(days=payload.trial_days)
        await pool.execute("""insert into public.billing_subscriptions(workspace_id,tenant_id,data_scope,product_id,provider,provider_subscription_id,status,trial_ends_at,payload,created_by) values($1,$2,$3,$4,'razorpay',$5,$6,$7,$8::jsonb,$9) on conflict(provider,provider_subscription_id) do update set status=excluded.status,trial_ends_at=excluded.trial_ends_at,payload=excluded.payload,updated_at=now()""", workspace_id, tenant_id, data_scope, payload.product_id, result.get("id"), result.get("status", "created"), trial_ends_at, json.dumps(result), principal.user_id)
        return result

    @router.post("/licenses/activate")
    async def activate_license(payload: LicenseActivationRequest, request: Request, context=Depends(workspace_dependency)) -> dict[str, Any]:
        workspace_id, tenant_id, data_scope, role, principal = context
        if role not in {"owner", "admin"}: raise HTTPException(status.HTTP_403_FORBIDDEN, "Owner or admin role is required")
        pool = pool_getter(request)
        subscription_valid = await pool.fetchval("""select exists(select 1 from public.billing_subscriptions where workspace_id=$1 and tenant_id=$2 and data_scope=$3 and provider_subscription_id=$4 and status in ('active','authenticated'))""", workspace_id, tenant_id, data_scope, payload.subscription_id)
        if not subscription_valid: raise HTTPException(status.HTTP_409_CONFLICT, "A verified active subscription is required for license activation")
        activation = licenses.activate(tenant_id=str(tenant_id), data_scope=data_scope, product_id=payload.product_id, subscription_id=payload.subscription_id, expires_at=payload.expires_at, activated_by=str(principal.user_id))
        await pool.execute("""insert into public.license_activations(id,workspace_id,tenant_id,data_scope,product_id,subscription_id,status,expires_at,signature,created_by) values($1,$2,$3,$4,$5,$6,'ACTIVE',$7,$8,$9)""", activation["activationId"], workspace_id, tenant_id, data_scope, payload.product_id, payload.subscription_id, payload.expires_at, activation["signature"], principal.user_id)
        return activation

    @router.get("/licenses/{product_id}/status")
    async def license_status(product_id: str, request: Request, context=Depends(workspace_dependency)) -> dict[str, Any]:
        workspace_id, tenant_id, data_scope, _, _ = context
        pool = pool_getter(request)
        active = await pool.fetchrow("""select status,expires_at from public.license_activations where workspace_id=$1 and tenant_id=$2 and data_scope=$3 and product_id=$4 order by created_at desc limit 1""", workspace_id, tenant_id, data_scope, product_id)
        now = datetime.now(UTC)
        if active and active["status"] == "ACTIVE" and active["expires_at"] > now:
            return {"status": "ACTIVE", "expiresAt": active["expires_at"].isoformat()}
        subscription = await pool.fetchrow("""select created_at,trial_ends_at from public.billing_subscriptions where workspace_id=$1 and tenant_id=$2 and data_scope=$3 and product_id=$4 order by created_at desc limit 1""", workspace_id, tenant_id, data_scope, product_id)
        if not subscription or not subscription["trial_ends_at"]: return {"status": "INACTIVE", "daysRemaining": 0}
        trial_days = max(0, (subscription["trial_ends_at"].date() - subscription["created_at"].date()).days)
        return licenses.trial_state(starts_at=subscription["created_at"], trial_days=trial_days, now=now)

    @router.post("/invoices/gst")
    async def create_gst_invoice(payload: GstInvoiceRequest, request: Request, context=Depends(workspace_dependency)) -> dict[str, Any]:
        workspace_id, tenant_id, data_scope, role, principal = context
        if role not in {"owner", "admin"}: raise HTTPException(status.HTTP_403_FORBIDDEN, "Owner or admin role is required")
        try: invoice = GstInvoiceService.create(invoice_number=payload.invoice_number, supplier_gstin=payload.supplier_gstin, customer_gstin=payload.customer_gstin, supplier_state=payload.supplier_state, customer_state=payload.customer_state, lines=payload.lines, issued_at=datetime.now(UTC))
        except ValueError as exc: raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
        pool = pool_getter(request)
        await pool.execute("""insert into public.gst_invoices(workspace_id,tenant_id,data_scope,invoice_number,status,taxable_total,tax_total,grand_total,payload,created_by) values($1,$2,$3,$4,'ISSUED',$5,$6,$7,$8::jsonb,$9)""", workspace_id, tenant_id, data_scope, payload.invoice_number, invoice["taxableTotal"], invoice["taxTotal"], invoice["grandTotal"], json.dumps(invoice), principal.user_id)
        return invoice

    @router.post("/webhooks/razorpay")
    async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(alias="X-Razorpay-Signature")) -> dict[str, bool]:
        raw = await request.body()
        if not razorpay.verify_webhook(raw, x_razorpay_signature): raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Razorpay signature")
        event = json.loads(raw)
        entity = event.get("payload", {}).get("subscription", {}).get("entity", {})
        notes = entity.get("notes", {})
        tenant_id, data_scope = notes.get("tenant_id"), notes.get("data_scope")
        if not tenant_id or not data_scope: raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Webhook tenant metadata is missing")
        pool = pool_getter(request)
        await pool.execute("""insert into public.provider_webhook_events(provider,event_id,tenant_id,data_scope,event_type,payload,verified) values('razorpay',$1,$2,$3,$4,$5::jsonb,true) on conflict(provider,event_id) do nothing""", event.get("id") or entity.get("id"), tenant_id, data_scope, event.get("event", "unknown"), raw.decode())
        if entity.get("id"):
            await pool.execute("""update public.billing_subscriptions set status=$1,payload=$2::jsonb,updated_at=now() where provider='razorpay' and provider_subscription_id=$3 and tenant_id=$4 and data_scope=$5""", entity.get("status", "unknown"), json.dumps(entity), entity["id"], tenant_id, data_scope)
        return {"accepted": True}

    return router
