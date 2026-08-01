import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createLedger, appendTransaction, migrateLedgerIntegrity, rollbackTransaction, verifyLedger } from "../../domain/chit/ledger/ImmutableLedgerEngine.js";

const transaction = {
  id: "collection-1", reference: "receipt-1", createdAt: "2026-08-01T00:00:00.000Z",
  postings: [{ account: "Cash", debit: 1000, credit: 0 }, { account: "Member Collection", debit: 0, credit: 1000 }],
};

test("ledger is append-only, double-entry balanced, audited, versioned, and hash verified", () => {
  const genesis = createLedger({ ledgerId: "ledger-test", createdAt: "2026-08-01T00:00:00.000Z" });
  const next = appendTransaction(genesis, transaction);
  assert.equal(genesis.entries.length, 0);
  assert.equal(next.entries.length, 1);
  assert.equal(next.version, 1);
  assert.equal(next.auditTrail.at(-1).action, "TRANSACTION_APPENDED");
  assert.equal(next.versionHistory.at(-1).headHash, next.headHash);
  assert.equal(verifyLedger(next).valid, true);
  assert.throws(() => { next.entries.push({}); }, TypeError);
  const tenantLedger = appendTransaction(createLedger({ ledgerId: "secure", tenantContext: { tenant_id: "tenant-a", data_scope: "real_tenant" } }), transaction);
  const { hash, ...payload } = tenantLedger.entries[0];
  assert.equal(hash.length, 64);
  assert.equal(hash, createHash("sha256").update(canonicalStringify(payload)).digest("hex"));
  assert.equal(tenantLedger.entries[0].tenantId, "tenant-a");
  const tenantTamper = JSON.parse(JSON.stringify(tenantLedger));
  tenantTamper.entries[0].tenantId = "tenant-b";
  assert.equal(verifyLedger(tenantTamper).valid, false);
});

test("rollback appends a reversal without editing historical entries", () => {
  const posted = appendTransaction(createLedger({ ledgerId: "ledger-test" }), transaction);
  const original = JSON.stringify(posted.entries[0]);
  const rolledBack = rollbackTransaction(posted, "collection-1", { reason: "Owner correction" });
  assert.equal(rolledBack.entries.length, 2);
  assert.equal(JSON.stringify(rolledBack.entries[0]), original);
  assert.equal(rolledBack.entries[1].reversalOf, "collection-1");
  assert.equal(verifyLedger(rolledBack).valid, true);
  const legacyPayload = {
    id: "legacy-entry", version: 1, transactionType: "FINANCIAL", reference: null, reversalOf: null,
    postings: [{ account: "Cash", debit: 100, credit: 0 }, { account: "Income", debit: 0, credit: 100 }],
    createdAt: null, metadata: {}, previousHash: "0000000000000000",
  };
  const legacyHash = legacyFnv(canonicalStringify(legacyPayload));
  const legacy = {
    ledgerId: "legacy", version: 1, entries: [{ ...legacyPayload, hash: legacyHash }], headHash: legacyHash,
    auditTrail: [], versionHistory: [
      { version: 0, entryCount: 0, headHash: "0000000000000000" },
      { version: 1, entryCount: 1, headHash: legacyHash },
    ],
  };
  assert.equal(verifyLedger(legacy).valid, true);
  assert.match(verifyLedger(legacy).warnings[0], /legacy FNV/i);
  const migrated = migrateLedgerIntegrity(legacy, { at: "2026-07-21T00:00:00.000Z" });
  assert.equal(migrated.entries[0].hash, legacyHash);
  const mixed = appendTransaction(migrated, { ...transaction, id: "sha-entry" });
  assert.equal(mixed.entries[1].hash.length, 64);
  assert.equal(verifyLedger(mixed).valid, true);
});

test("unbalanced and tampered ledgers are rejected", () => {
  const ledger = createLedger();
  assert.throws(() => appendTransaction(ledger, { postings: [{ account: "Cash", debit: 100 }, { account: "Income", credit: 90 }] }), /balance/);
  const posted = appendTransaction(ledger, transaction);
  const tampered = JSON.parse(JSON.stringify(posted));
  tampered.entries[0].postings[0].debit = 5000;
  assert.equal(verifyLedger(tampered).valid, false);
});

function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function legacyFnv(text) {
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}
