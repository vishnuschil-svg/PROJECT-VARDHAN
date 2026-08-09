import hashlib
import hmac
import os
import unittest
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from backend.razorpay_payments import classify_provider_payments, razorpay_mode, require_razorpay_configuration, verify_checkout_signature, verify_webhook_signature


class RazorpaySignatureTests(unittest.TestCase):
    def test_valid_checkout_signature(self):
        secret = "test-secret"
        signature = hmac.new(secret.encode(), b"order_123|pay_123", hashlib.sha256).hexdigest()
        self.assertTrue(verify_checkout_signature("order_123", "pay_123", signature, secret))

    def test_invalid_checkout_signature(self):
        self.assertFalse(verify_checkout_signature("order_123", "pay_123", "0" * 64, "test-secret"))

    def test_valid_raw_webhook_signature(self):
        secret = "webhook-secret"
        body = b'{"event":"payment.captured","payload":{}}'
        signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        self.assertTrue(verify_webhook_signature(body, signature, secret))

    def test_changed_webhook_body_is_rejected(self):
        secret = "webhook-secret"
        signature = hmac.new(secret.encode(), b"original", hashlib.sha256).hexdigest()
        self.assertFalse(verify_webhook_signature(b"parsed-or-changed", signature, secret))

    def test_test_and_live_modes_are_explicit(self):
        with patch.dict(os.environ, {"RAZORPAY_MODE": "test"}):
            self.assertEqual(razorpay_mode(), "TEST")
        with patch.dict(os.environ, {"RAZORPAY_MODE": "live"}):
            self.assertEqual(razorpay_mode(), "LIVE")

    def test_invalid_mode_fails_closed(self):
        with patch.dict(os.environ, {"RAZORPAY_MODE": "automatic-live"}):
            with self.assertRaises(RuntimeError):
                razorpay_mode()

    def test_production_rejects_test_mode(self):
        with patch.dict(os.environ, {"VARDHAN_ENV": "production", "RAZORPAY_MODE": "test", "RAZORPAY_KEY_ID": "rzp_test_example", "RAZORPAY_KEY_SECRET": "secret", "RAZORPAY_WEBHOOK_SECRET": "webhook"}, clear=True):
            with self.assertRaises(Exception) as context:
                require_razorpay_configuration()
            self.assertIn("RAZORPAY_MODE=live", str(context.exception))

    def test_live_mode_rejects_test_key(self):
        with patch.dict(os.environ, {"VARDHAN_ENV": "production", "RAZORPAY_MODE": "live", "RAZORPAY_KEY_ID": "rzp_test_example", "RAZORPAY_KEY_SECRET": "secret", "RAZORPAY_WEBHOOK_SECRET": "webhook"}, clear=True):
            with self.assertRaises(Exception) as context:
                require_razorpay_configuration()
            self.assertIn("does not match configured mode", str(context.exception))

    def test_live_mode_accepts_live_key_contract(self):
        environment = {"VARDHAN_ENV": "production", "RAZORPAY_MODE": "live", "RAZORPAY_KEY_ID": "rzp_live_example", "RAZORPAY_KEY_SECRET": "secret", "RAZORPAY_WEBHOOK_SECRET": "webhook"}
        with patch.dict(os.environ, environment, clear=True):
            self.assertEqual(require_razorpay_configuration(), ("rzp_live_example", "secret", "webhook"))


class RazorpayReconciliationClassificationTests(unittest.TestCase):
    def attempt(self, *, expired=False):
        return {"provider_order_id": "order_123", "amount_paise": 149900, "currency": "INR", "expires_at": datetime.now(UTC) + (timedelta(minutes=-1) if expired else timedelta(minutes=10))}

    def test_exact_captured_payment_is_authoritative(self):
        outcome, payment = classify_provider_payments([{"id": "pay_123", "order_id": "order_123", "amount": 149900, "currency": "INR", "status": "captured", "captured": True}], self.attempt())
        self.assertEqual((outcome, payment["id"]), ("PAYMENT_CAPTURED", "pay_123"))

    def test_wrong_amount_never_classifies_as_captured(self):
        outcome, _ = classify_provider_payments([{"id": "pay_bad", "order_id": "order_123", "amount": 1, "currency": "INR", "status": "captured", "captured": True}], self.attempt())
        self.assertEqual(outcome, "PAYMENT_STILL_PENDING")

    def test_authorized_payment_remains_pending(self):
        outcome, _ = classify_provider_payments([{"order_id": "order_123", "amount": 149900, "currency": "INR", "status": "authorized"}], self.attempt())
        self.assertEqual(outcome, "PAYMENT_STILL_PENDING")

    def test_authoritative_failure_is_distinct(self):
        outcome, _ = classify_provider_payments([{"order_id": "order_123", "amount": 149900, "currency": "INR", "status": "failed"}], self.attempt())
        self.assertEqual(outcome, "PAYMENT_CONFIRMED_FAILED")

    def test_empty_unexpired_order_remains_pending(self):
        self.assertEqual(classify_provider_payments([], self.attempt())[0], "PAYMENT_STILL_PENDING")

    def test_empty_expired_order_is_expired(self):
        self.assertEqual(classify_provider_payments([], self.attempt(expired=True))[0], "PAYMENT_ORDER_EXPIRED")


if __name__ == "__main__":
    unittest.main()
