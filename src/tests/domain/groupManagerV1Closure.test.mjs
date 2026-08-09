import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("onboarding requires and records the organizer responsibility declaration", async () => {
  const [page, service] = await Promise.all([
    read("src/pages/auth/Onboarding.jsx"),
    read("src/services/auth/AccessProviderService.js"),
  ]);
  assert.match(page, /COMPLIANCE_DECLARATION/);
  assert.match(page, /type="checkbox"[\s\S]*required/);
  assert.match(service, /declarationAccepted !== true/);
  assert.match(service, /group_manager_declaration_accepted_at/);
});

test("settings keeps the organizer declaration visible", async () => {
  const source = await read("src/pages/chits/Settings.jsx");
  assert.match(source, /Organizer responsibility/);
  assert.match(source, /COMPLIANCE_DECLARATION/);
  assert.match(source, /PRODUCT_DISCLAIMER/);
});

test("receipt outputs identify the organizer as issuer and VARDHAN as software only", async () => {
  const [template, image] = await Promise.all([
    read("src/receipts/ReceiptTemplate.js"),
    read("src/config/chitReceiptImage.js"),
  ]);
  assert.match(template, /receipt\.issuerName \|\| "Organizer"/);
  assert.match(template, /RECEIPT_DISCLAIMER/);
  assert.match(template, /Software powered by/);
  assert.match(image, /Issued by/);
  assert.match(image, /technology and record-management software only/);
});

test("member receipt payment coordinates come only from organizer settings", async () => {
  const [repository, collections] = await Promise.all([
    read("src/repositories/ReceiptRepository.js"),
    read("src/pages/chits/Collections.jsx"),
  ]);
  assert.match(repository, /getPaymentSettings\(context\)/);
  assert.match(repository, /resolveOrganizerPaymentDetails/);
  assert.doesNotMatch(repository, /vardhan@upi|State Bank Operating Account|XXXXXX7890/i);
  assert.doesNotMatch(collections, /VARDHAN Own Chit Business/);
});

test("manual records retain the enterprise layout and responsive record styling", async () => {
  const [page, styles] = await Promise.all([
    read("src/pages/chits/ManualRecords.jsx"),
    read("src/pages/chits/ManualRecords.css"),
  ]);
  assert.match(page, /<ChitLayout/);
  assert.match(styles, /var\(--border-color/);
  assert.match(styles, /record-card/);
  assert.match(styles, /@media\(max-width:800px\)/);
});

test("015 is the sole Group Manager safety migration and remains additive", async () => {
  const names = await readdir(new URL("supabase/migrations/", root));
  const safetyMigrations = names.filter((name) => /group_manager|manual_distribution/i.test(name));
  assert.deepEqual(safetyMigrations, ["015_group_manager_manual_distribution_records.sql"]);
  const sql = await read("supabase/migrations/015_group_manager_manual_distribution_records.sql");
  assert.match(sql, /DEPENDS_ON: 014_payment_reliability_reconciliation\.sql/);
  assert.doesNotMatch(sql, /\b(drop table|truncate|delete from)\b/i);
  assert.doesNotMatch(sql, /alter table public\.(chit_auctions|chit_winners|lucky_draws|chit_payouts)/i);
});
