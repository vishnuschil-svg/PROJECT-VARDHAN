import test from "node:test";
import assert from "node:assert/strict";
import {
  createEntityId,
  fromProductionCollection,
  fromProductionFinanceEntry,
  isUuid,
  toProductionCollection,
  toProductionFinanceEntry,
  toProductionMember,
  toProductionReceipt,
} from "../../services/productionChitPersistence.js";
import { resolveRepositoryBackend } from "../../config/repositoryBackend.js";

test("production money-path mappers emit schema columns and UUID ids", () => {
  const id = createEntityId();
  assert.equal(isUuid(id), true);

  const collection = toProductionCollection({
    id,
    chit_group_id: "11111111-1111-4111-8111-111111111111",
    member_id: "22222222-2222-4222-8222-222222222222",
    collection_month: "2026-08",
    payment_date: "2026-08-02",
    installment_month: 3,
    installment_amount: 1000,
    paid_amount: 800,
    pending_amount: 200,
    receipt_number: "MNCP-RCP-1",
    payment_method: "UPI",
    is_partial: true,
    advance_amount: 0,
    payment_type: "PARTIAL",
  });

  assert.equal(collection.receipt_no, "MNCP-RCP-1");
  assert.equal(collection.collection_date, "2026-08-02");
  assert.equal(collection.group_id, "11111111-1111-4111-8111-111111111111");
  assert.equal(collection.metadata.installment_month, 3);
  assert.equal("receipt_number" in collection, false);
  assert.equal("payment_date" in collection, false);
  assert.equal("chit_group_id" in collection, false);

  const receipt = toProductionReceipt({
    id: createEntityId(),
    collection_id: id,
    group_id: collection.group_id,
    member_id: collection.member_id,
    receipt_number: "MNCP-RCP-1",
    amount: 800,
    payment_date: "2026-08-02",
  });
  assert.equal(receipt.receipt_no, "MNCP-RCP-1");
  assert.equal("receipt_number" in receipt, false);

  const finance = toProductionFinanceEntry({
    id: createEntityId(),
    type: "income",
    date: "2026-08-02",
    amount: 800,
    status: "Posted",
    receipt_no: "MNCP-RCP-1",
  });
  assert.equal(finance.entry_type, "income");
  assert.equal(finance.entry_date, "2026-08-02");
  assert.equal(finance.status, "posted");
  assert.equal("type" in finance, false);
  assert.equal("date" in finance, false);

  const member = toProductionMember({
    member_name: "Asha",
    member_number: "M-1",
    chit_group_id: collection.group_id,
    mobile_number: "9999999999",
  });
  assert.equal(member.group_id, collection.group_id);
  assert.equal("id" in member, false);
});

test("production output adapters restore UI aliases", () => {
  const collection = fromProductionCollection({
    id: createEntityId(),
    receipt_no: "R-9",
    collection_date: "2026-08-01",
    group_id: "11111111-1111-4111-8111-111111111111",
    metadata: { installment_month: 2 },
  });
  assert.equal(collection.receipt_number, "R-9");
  assert.equal(collection.payment_date, "2026-08-01");
  assert.equal(collection.installment_month, 2);

  const finance = fromProductionFinanceEntry({
    entry_type: "payout",
    entry_date: "2026-08-01",
    receipt_no: "R-9",
  });
  assert.equal(finance.type, "payout");
  assert.equal(finance.date, "2026-08-01");
});

test("non-uuid local ids are stripped from production member payloads", () => {
  const payload = toProductionMember({
    id: "member-123",
    member_name: "Ravi",
    member_number: "M-2",
    chit_group_id: "11111111-1111-4111-8111-111111111111",
  });
  assert.equal("id" in payload, false);
});

test("collection service production mode uses persistent helpers instead of local facade", async () => {
  const serviceSource = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../../services/collectionService.js", import.meta.url), "utf8")
  );
  assert.match(serviceSource, /saveCollectionRecordPersistent/);
  assert.match(serviceSource, /saveReceiptRecordPersistent/);
  assert.match(serviceSource, /saveFinanceEntryPersistent/);
  assert.match(serviceSource, /isProductionRepositoryMode/);
  assert.match(serviceSource, /export async function recordCollectionPayment/);

  assert.equal(
    resolveRepositoryBackend({
      VITE_APP_MODE: "production",
      VITE_REPOSITORY_BACKEND: "supabase",
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: "anon",
    }),
    "supabase"
  );
});

test("winner and payout services route finance through persistent helper", async () => {
  const winnerSource = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../../services/winnerService.js", import.meta.url), "utf8")
  );
  const payoutSource = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../../services/payoutService.js", import.meta.url), "utf8")
  );
  assert.match(winnerSource, /confirmWinnerEventPersistent/);
  assert.doesNotMatch(winnerSource, /from ["'].*chits\/FinanceRepository/);
  assert.match(payoutSource, /recordPayoutPaymentPersistent/);
  assert.doesNotMatch(payoutSource, /from ["'].*chits\/FinanceRepository/);
});
