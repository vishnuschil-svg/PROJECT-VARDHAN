import hashlib
import hmac
import json
import unittest
from datetime import UTC, datetime

from enterprise_integrations import (
    EmailServiceAdapter,
    GstInvoiceService,
    LicenseLifecycleService,
    RazorpaySubscriptionsAdapter,
    SmsGatewayAdapter,
    WhatsAppCloudAdapter,
)


class FakeTransport:
    def __init__(self): self.requests = []
    async def request(self, method, url, *, headers, payload):
        self.requests.append({"method": method, "url": url, "headers": headers, "payload": payload})
        if "graph.facebook" in url: return {"messages": [{"id": "wamid-1"}]}
        if "razorpay" in url: return {"id": "sub-1", "status": "created"}
        return {"id": "provider-1", "status": "accepted"}


class EnterpriseIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def test_notification_adapters_send_only_through_server_credentials(self):
        transport = FakeTransport()
        whatsapp = WhatsAppCloudAdapter("token", "phone-id", transport)
        sms = SmsGatewayAdapter("https://sms.example/send", "key", "VARDHN", transport)
        email = EmailServiceAdapter("key", "billing@example.com", transport)
        self.assertEqual((await whatsapp.send(to="+919999999999", body="Receipt ready")).external_id, "wamid-1")
        self.assertEqual((await sms.send(to="+919999999999", body="OTP 1234")).status, "accepted")
        self.assertEqual((await email.send(to="owner@example.com", subject="Invoice", html="<p>Ready</p>")).status, "accepted")
        self.assertEqual(len(transport.requests), 3)

    async def test_razorpay_signature_subscription_license_trial_and_gst(self):
        transport = FakeTransport()
        razorpay = RazorpaySubscriptionsAdapter("key-id", "key-secret", "webhook-secret", transport)
        subscription = await razorpay.create_subscription(plan_id="plan-1", tenant_id="tenant-a", product_id="chit", total_count=12)
        self.assertEqual(subscription["id"], "sub-1")
        self.assertEqual(transport.requests[-1]["payload"]["notes"]["data_scope"], "real_tenant")
        payload = json.dumps({"event": "subscription.activated"}).encode()
        signature = hmac.new(b"webhook-secret", payload, hashlib.sha256).hexdigest()
        self.assertTrue(razorpay.verify_webhook(payload, signature))
        self.assertFalse(razorpay.verify_webhook(payload, "tampered"))

        lifecycle = LicenseLifecycleService("license-secret")
        activation = lifecycle.activate(tenant_id="tenant-a", product_id="chit", subscription_id="sub-1", expires_at=datetime(2027, 1, 1, tzinfo=UTC), activated_by="owner-1")
        self.assertTrue(lifecycle.verify(activation))
        self.assertEqual(lifecycle.trial_state(starts_at=datetime(2026, 1, 1, tzinfo=UTC), trial_days=14, now=datetime(2026, 1, 15, tzinfo=UTC))["status"], "TRIAL_EXPIRED")

        invoice = GstInvoiceService.create(invoice_number="INV-1", supplier_gstin="36ABCDE1234F1Z5", customer_gstin="36ABCDE1234F1Z5", supplier_state="TS", customer_state="TS", lines=[{"description": "Subscription", "taxableAmount": "1000", "gstRate": "18"}], issued_at=datetime(2026, 1, 1, tzinfo=UTC))
        self.assertEqual(invoice["grandTotal"], "1180.00")
        self.assertEqual(invoice["taxMode"], "CGST_SGST")


if __name__ == "__main__": unittest.main()
