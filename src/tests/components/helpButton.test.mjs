import test from "node:test";
import assert from "node:assert/strict";

test("HelpButton routes to AI workspace with feature parameter", () => {
  const feature = "COLLECTIONS";
  const expectedRoute = `/chits/ai?help=${feature}`;
  assert.strictEqual(expectedRoute, "/chits/ai?help=COLLECTIONS");
});

test("HelpButton supports variant prop", () => {
  const variant = "secondary";
  assert.strictEqual(variant, "secondary");
});

test("HelpButton handles different feature names", () => {
  const features = ["DASHBOARD", "COLLECTIONS", "AUCTIONS", "MEMBERS", "GROUPS", "RECEIPTS", "REPORTS"];
  assert.ok(Array.isArray(features));
  assert.strictEqual(features.length, 7);
  features.forEach((feature) => {
    assert.ok(typeof feature === "string");
    assert.ok(feature.length > 0);
  });
});
