import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");

test("dashboard AI panel exposes collapse state and an accessible control relationship", async () => {
  const source = await read("../../pages/chits/ChitDashboard.jsx");
  assert.match(source, /id="chit-ai-priorities"/);
  assert.match(source, /aria-controls="chit-ai-priorities"/);
  assert.match(source, /aria-expanded="true"/);
  assert.match(source, /aria-expanded="false"/);
});

test("responsive navigation and dashboard preserve touch and reduced-motion contracts", async () => {
  const [navigation, dashboard] = await Promise.all([
    read("../../components/chit/ChitNavigation.css"),
    read("../../pages/chits/ChitCommandDashboard.css"),
  ]);
  assert.match(navigation, /min-height:\s*44px/);
  assert.match(dashboard, /@media\(max-width:600px\)/);
  assert.match(dashboard, /@media\(prefers-reduced-motion:reduce\)/);
});

test("receipt feedback is announced and receipt actions meet the touch target", async () => {
  const [source, styles] = await Promise.all([
    read("../../pages/chits/Receipts.jsx"),
    read("../../pages/chits/Receipts.css"),
  ]);
  assert.match(source, /role="status" aria-live="polite"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /aria-label="Dismiss receipt error"/);
  assert.match(styles, /\.production-receipt-actions button\s*\{[\s\S]*?min-height:\s*44px/);
});

test("internal trial reset remains explicitly confirmed and tenant-tag scoped", async () => {
  const source = await read("../../pages/chits/ChitDashboard.jsx");
  assert.match(source, /window\.confirm/);
  assert.match(source, /tenant-scoped records tagged as Internal Trial data/);
  assert.match(source, /Real business records will remain untouched/);
});

test("receipt print output retains a dedicated print contract", async () => {
  const source = await read("../../receipts/ReceiptPrint.js");
  assert.match(source, /<!doctype html>/);
  assert.match(source, /@media print/);
  assert.match(source, /\.receipt-template \{ box-shadow: none; \}/);
});
