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
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Mapping, Protocol


class HttpTransport(Protocol):
    async def request(self, method: str, url: str, *, headers: Mapping[str, str], payload: dict[str, Any]) -> dict[str, Any]: ...


class JsonHttpTransport:
    async def request(self, method: str, url: str, *, headers: Mapping[str, str], payload: dict[str, Any]) -> dict[str, Any]:
        return await asyncio.to_thread(self._request, method, url, headers, payload)

    @staticmethod
    def _request(method: str, url: str, headers: Mapping[str, str], payload: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        request = urllib.request.Request(url, data=body, method=method, headers={"Content-Type": "application/json", **headers})
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                content = response.read().decode("utf-8")
                return json.loads(content) if content else {"status": response.status}
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:1000]
            raise RuntimeError(f"Provider returned HTTP {exc.code}: {detail}") from exc


@dataclass(frozen=True)
class ProviderResult:
    provider: str
    external_id: str
    status: str
    response: dict[str, Any]


class WhatsAppCloudAdapter:
    def __init__(self, token: str, phone_number_id: str, transport: HttpTransport | None = None, api_version: str = "v21.0") -> None:
        self.token, self.phone_number_id = token, phone_number_id
        self.transport = transport or JsonHttpTransport()
        self.url = f"https://graph.facebook.com/{api_version}/{phone_number_id}/messages"

    def configured(self) -> bool:
        return bool(self.token and self.phone_number_id)

    async def send(self, *, to: str, body: str, template: str | None = None, language: str = "en_US") -> ProviderResult:
        if not self.configured(): raise RuntimeError("WhatsApp Cloud API is not configured")
        message = {"messaging_product": "whatsapp", "to": normalize_phone(to)}
        message.update({"type": "template", "template": {"name": template, "language": {"code": language}}} if template else {"type": "text", "text": {"preview_url": False, "body": body}})
        response = await self.transport.request("POST", self.url, headers={"Authorization": f"Bearer {self.token}"}, payload=message)
        return ProviderResult("whatsapp-cloud", str(response.get("messages", [{}])[0].get("id", "")), "accepted", response)


class SmsGatewayAdapter:
    def __init__(self, url: str, api_key: str, sender_id: str, transport: HttpTransport | None = None) -> None:
        self.url, self.api_key, self.sender_id = url, api_key, sender_id
        self.transport = transport or JsonHttpTransport()

    def configured(self) -> bool:
        return bool(self.url and self.api_key and self.sender_id)

    async def send(self, *, to: str, body: str, template_id: str | None = None) -> ProviderResult:
        if not self.configured(): raise RuntimeError("SMS gateway is not configured")
        payload = {"to": normalize_phone(to), "message": body, "senderId": self.sender_id, "templateId": template_id}
        response = await self.transport.request("POST", self.url, headers={"Authorization": f"Bearer {self.api_key}"}, payload=payload)
        return ProviderResult("sms-gateway", str(response.get("id", response.get("messageId", ""))), "accepted", response)


class EmailServiceAdapter:
    def __init__(self, api_key: str, from_email: str, transport: HttpTransport | None = None, url: str = "https://api.sendgrid.com/v3/mail/send") -> None:
        self.api_key, self.from_email, self.url = api_key, from_email, url
        self.transport = transport or JsonHttpTransport()

    def configured(self) -> bool:
        return bool(self.api_key and self.from_email)

    async def send(self, *, to: str, subject: str, html: str, text: str = "") -> ProviderResult:
        if not self.configured(): raise RuntimeError("Email service is not configured")
        payload = {"personalizations": [{"to": [{"email": to}]}], "from": {"email": self.from_email}, "subject": subject, "content": [{"type": "text/plain", "value": text or subject}, {"type": "text/html", "value": html}]}
        response = await self.transport.request("POST", self.url, headers={"Authorization": f"Bearer {self.api_key}"}, payload=payload)
        return ProviderResult("sendgrid", str(response.get("id", "")), "accepted", response)


class RazorpaySubscriptionsAdapter:
    def __init__(self, key_id: str, key_secret: str, webhook_secret: str, transport: HttpTransport | None = None) -> None:
        self.key_id, self.key_secret, self.webhook_secret = key_id, key_secret, webhook_secret
        self.transport = transport or JsonHttpTransport()
        token = base64.b64encode(f"{key_id}:{key_secret}".encode()).decode()
        self.headers = {"Authorization": f"Basic {token}"}

    def configured(self) -> bool:
        return bool(self.key_id and self.key_secret and self.webhook_secret)

    async def create_subscription(self, *, plan_id: str, tenant_id: str, data_scope: str = "real_tenant", product_id: str, total_count: int = 12) -> dict[str, Any]:
        if not self.configured(): raise RuntimeError("Razorpay subscriptions are not configured")
        return await self.transport.request("POST", "https://api.razorpay.com/v1/subscriptions", headers=self.headers, payload={"plan_id": plan_id, "total_count": total_count, "customer_notify": 1, "notes": {"tenant_id": tenant_id, "data_scope": data_scope, "product_id": product_id}})

    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        if not self.webhook_secret: return False
        expected = hmac.new(self.webhook_secret.encode(), payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)


class LicenseLifecycleService:
    def __init__(self, signing_secret: str) -> None:
        self.signing_secret = signing_secret

    def activate(self, *, tenant_id: str, product_id: str, subscription_id: str, expires_at: datetime, activated_by: str, data_scope: str = "real_tenant") -> dict[str, Any]:
        if not self.signing_secret: raise RuntimeError("License signing secret is not configured")
        payload = {"tenantId": tenant_id, "dataScope": data_scope, "productId": product_id, "subscriptionId": subscription_id, "expiresAt": expires_at.astimezone(UTC).isoformat(), "activatedBy": activated_by}
        signature = hmac.new(self.signing_secret.encode(), canonical_json(payload), hashlib.sha256).hexdigest()
        return {**payload, "activationId": str(uuid.uuid4()), "signature": signature, "status": "ACTIVE"}

    def verify(self, activation: Mapping[str, Any]) -> bool:
        signature = str(activation.get("signature", ""))
        payload = {key: activation[key] for key in ["tenantId", "dataScope", "productId", "subscriptionId", "expiresAt", "activatedBy"]}
        expected = hmac.new(self.signing_secret.encode(), canonical_json(payload), hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected)

    @staticmethod
    def trial_state(*, starts_at: datetime, trial_days: int, now: datetime | None = None) -> dict[str, Any]:
        current = now or datetime.now(UTC)
        expires_at = starts_at.astimezone(UTC) + timedelta(days=max(0, trial_days))
        remaining = max(0, (expires_at - current).days + (1 if current < expires_at else 0))
        return {"status": "TRIAL_ACTIVE" if current < expires_at else "TRIAL_EXPIRED", "expiresAt": expires_at.isoformat(), "daysRemaining": remaining}


class GstInvoiceService:
    @staticmethod
    def create(*, invoice_number: str, supplier_gstin: str, customer_gstin: str, supplier_state: str, customer_state: str, lines: list[dict[str, Any]], issued_at: datetime) -> dict[str, Any]:
        normalized_lines, taxable_total, tax_total = [], Decimal("0"), Decimal("0")
        interstate = supplier_state.strip().upper() != customer_state.strip().upper()
        for item in lines:
            taxable = money(item["taxableAmount"])
            rate = Decimal(str(item.get("gstRate", 18)))
            tax = (taxable * rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            taxable_total += taxable; tax_total += tax
            normalized_lines.append({**item, "taxableAmount": str(taxable), "gstRate": str(rate), "igst": str(tax if interstate else Decimal("0")), "cgst": str(Decimal("0") if interstate else tax / 2), "sgst": str(Decimal("0") if interstate else tax / 2), "lineTotal": str(taxable + tax)})
        return {"invoiceNumber": invoice_number, "supplierGstin": validate_gstin(supplier_gstin), "customerGstin": validate_gstin(customer_gstin), "issuedAt": issued_at.astimezone(UTC).isoformat(), "placeOfSupply": customer_state, "taxMode": "IGST" if interstate else "CGST_SGST", "lines": normalized_lines, "taxableTotal": str(taxable_total), "taxTotal": str(tax_total), "grandTotal": str(taxable_total + tax_total)}


class MonitoringAlertAdapter:
    def __init__(self, webhook_url: str, webhook_token: str, transport: HttpTransport | None = None) -> None:
        self.webhook_url, self.webhook_token = webhook_url, webhook_token
        self.transport = transport or JsonHttpTransport()

    async def send(self, *, severity: str, title: str, details: dict[str, Any]) -> dict[str, Any]:
        if not self.webhook_url: raise RuntimeError("Monitoring alert webhook is not configured")
        return await self.transport.request("POST", self.webhook_url, headers={"Authorization": f"Bearer {self.webhook_token}"} if self.webhook_token else {}, payload={"severity": severity, "title": title, "details": details, "occurredAt": datetime.now(UTC).isoformat()})


def production_configuration_status() -> dict[str, bool]:
    return {
        "supabase": bool(os.getenv("DATABASE_URL") and os.getenv("SUPABASE_JWT_SECRET")),
        "redis": os.getenv("RATE_LIMIT_BACKEND") == "redis" and bool(os.getenv("REDIS_URL")),
        "whatsapp": bool(os.getenv("WHATSAPP_ACCESS_TOKEN") and os.getenv("WHATSAPP_PHONE_NUMBER_ID")),
        "sms": bool(os.getenv("SMS_GATEWAY_URL") and os.getenv("SMS_GATEWAY_API_KEY") and os.getenv("SMS_SENDER_ID")),
        "email": bool(os.getenv("EMAIL_API_KEY") and os.getenv("EMAIL_FROM")),
        "razorpay": bool(os.getenv("RAZORPAY_KEY_ID") and os.getenv("RAZORPAY_KEY_SECRET") and os.getenv("RAZORPAY_WEBHOOK_SECRET")),
        "licenseSigning": bool(os.getenv("LICENSE_SIGNING_SECRET")),
        "backupEncryption": bool(os.getenv("BACKUP_ENCRYPTION_KEY")),
        "monitoring": bool(os.getenv("MONITORING_ALERT_WEBHOOK")),
    }


def normalize_phone(value: str) -> str:
    normalized = "".join(character for character in str(value) if character.isdigit())
    if not 8 <= len(normalized) <= 15: raise ValueError("Phone number must contain 8 to 15 digits")
    return normalized


def validate_gstin(value: str) -> str:
    normalized = str(value).strip().upper()
    if len(normalized) != 15 or not normalized[:2].isdigit() or not normalized.isalnum(): raise ValueError("GSTIN must be a valid 15-character identifier")
    return normalized


def money(value: Any) -> Decimal:
    amount = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if amount < 0: raise ValueError("Invoice amounts cannot be negative")
    return amount


def canonical_json(value: Mapping[str, Any]) -> bytes:
    return json.dumps(value, separators=(",", ":"), sort_keys=True).encode()
