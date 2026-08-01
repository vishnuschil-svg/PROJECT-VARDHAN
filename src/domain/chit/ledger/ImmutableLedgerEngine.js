export const LEDGER_STATUS = Object.freeze({ READY: "READY", INVALID: "INVALID" });
export const LEDGER_HASH_ALGORITHMS = Object.freeze({ SHA256: "SHA-256", LEGACY_FNV1A64: "FNV-1A-64" });
const SHA256_GENESIS_HASH = "0".repeat(64);
const LEGACY_GENESIS_HASH = "0".repeat(16);

export function createLedger({ ledgerId = "chit-ledger", createdAt = null, tenantContext = {}, tenantId, dataScope } = {}) {
  const binding = normalizeTenantBinding(tenantContext, tenantId, dataScope);
  return freezeLedger({
    ledgerId,
    ...binding,
    hashAlgorithm: LEDGER_HASH_ALGORITHMS.SHA256,
    genesisHash: SHA256_GENESIS_HASH,
    version: 0,
    entries: [],
    auditTrail: [{ action: "LEDGER_CREATED", version: 0, at: createdAt, hashAlgorithm: LEDGER_HASH_ALGORITHMS.SHA256, ...binding }],
    versionHistory: [{ version: 0, entryCount: 0, headHash: SHA256_GENESIS_HASH, hashAlgorithm: LEDGER_HASH_ALGORITHMS.SHA256 }],
    headHash: SHA256_GENESIS_HASH,
  });
}

export function appendTransaction(ledger, transaction) {
  const verification = verifyLedger(ledger);
  if (!verification.valid) throw new Error(`Ledger is invalid: ${verification.errors.join(" ")}`);
  validateTransaction(transaction);

  const version = ledger.version + 1;
  const entryId = transaction.id || `${ledger.ledgerId}-entry-${version}`;
  if (ledger.entries.some((entry) => entry.id === entryId)) throw new Error(`Duplicate ledger entry id: ${entryId}`);

  const payload = {
    id: entryId,
    version,
    transactionType: transaction.transactionType || "FINANCIAL",
    reference: transaction.reference || null,
    reversalOf: transaction.reversalOf || null,
    postings: transaction.postings.map((posting) => ({
      account: String(posting.account),
      debit: amount(posting.debit),
      credit: amount(posting.credit),
    })),
    createdAt: transaction.createdAt || null,
    metadata: transaction.metadata ? structuredCloneSafe(transaction.metadata) : {},
    previousHash: ledger.headHash,
    hashAlgorithm: LEDGER_HASH_ALGORITHMS.SHA256,
    tenantId: ledger.tenantId || null,
    dataScope: ledger.dataScope || null,
  };
  const entry = deepFreeze({ ...payload, hash: hashCanonical(payload, LEDGER_HASH_ALGORITHMS.SHA256) });
  return freezeLedger({
    ...ledger,
    version,
    entries: [...ledger.entries, entry],
    auditTrail: [...ledger.auditTrail, { action: transaction.reversalOf ? "TRANSACTION_REVERSED" : "TRANSACTION_APPENDED", entryId, version, at: transaction.createdAt || null }],
    hashAlgorithm: LEDGER_HASH_ALGORITHMS.SHA256,
    genesisHash: ledger.genesisHash || inferGenesisHash(ledger),
    versionHistory: [...ledger.versionHistory, { version, entryCount: ledger.entries.length + 1, headHash: entry.hash, hashAlgorithm: LEDGER_HASH_ALGORITHMS.SHA256 }],
    headHash: entry.hash,
  });
}

export function rollbackTransaction(ledger, entryId, { id, createdAt = null, reason = "Rollback" } = {}) {
  const original = ledger.entries.find((entry) => entry.id === entryId);
  if (!original) throw new Error(`Ledger entry not found: ${entryId}`);
  if (ledger.entries.some((entry) => entry.reversalOf === entryId)) throw new Error(`Ledger entry already reversed: ${entryId}`);
  return appendTransaction(ledger, {
    id: id || `${ledger.ledgerId}-reversal-${ledger.version + 1}`,
    transactionType: "REVERSAL",
    reference: original.reference,
    reversalOf: entryId,
    createdAt,
    metadata: { reason },
    postings: original.postings.map((posting) => ({ account: posting.account, debit: posting.credit, credit: posting.debit })),
  });
}

export function verifyLedger(ledger) {
  const errors = [];
  const warnings = [];
  if (!ledger || !Array.isArray(ledger.entries)) return { valid: false, status: LEDGER_STATUS.INVALID, errors: ["Ledger is required."] };
  let previousHash = ledger.genesisHash || inferGenesisHash(ledger);
  ledger.entries.forEach((entry, index) => {
    if (entry.version !== index + 1) errors.push(`Entry ${entry.id} has an invalid version.`);
    if (entry.previousHash !== previousHash) errors.push(`Entry ${entry.id} has an invalid previous hash.`);
    const { hash, ...payload } = entry;
    const hashAlgorithm = entry.hashAlgorithm || inferHashAlgorithm(hash);
    if (hashCanonical(payload, hashAlgorithm) !== hash) errors.push(`Entry ${entry.id} failed cryptographic hash verification.`);
    if (hashAlgorithm === LEDGER_HASH_ALGORITHMS.LEGACY_FNV1A64) warnings.push(`Entry ${entry.id} uses legacy FNV-1a integrity hashing.`);
    if (ledger.tenantId && hashAlgorithm === LEDGER_HASH_ALGORITHMS.SHA256 && entry.tenantId !== ledger.tenantId) errors.push(`Entry ${entry.id} has an invalid tenant binding.`);
    if (ledger.dataScope && hashAlgorithm === LEDGER_HASH_ALGORITHMS.SHA256 && entry.dataScope !== ledger.dataScope) errors.push(`Entry ${entry.id} has an invalid data-scope binding.`);
    if (!isBalanced(entry.postings)) errors.push(`Entry ${entry.id} is not double-entry balanced.`);
    previousHash = hash;
  });
  if (ledger.version !== ledger.entries.length) errors.push("Ledger version does not match its entry history.");
  if (Array.isArray(ledger.versionHistory)) ledger.versionHistory.forEach((history, index) => {
    if (history.version !== index || history.entryCount !== index) errors.push(`Ledger version history ${index} is invalid.`);
    const expectedHead = index === 0 ? (ledger.genesisHash || inferGenesisHash(ledger)) : ledger.entries[index - 1]?.hash;
    if (history.headHash !== expectedHead) errors.push(`Ledger version history ${index} has an invalid head hash.`);
  });
  if (ledger.headHash !== previousHash) errors.push("Ledger head hash is invalid.");
  return { valid: errors.length === 0, status: errors.length ? LEDGER_STATUS.INVALID : LEDGER_STATUS.READY, errors, warnings };
}

export function migrateLedgerIntegrity(ledger, { at = null } = {}) {
  const verification = verifyLedger(ledger);
  if (!verification.valid) throw new Error(`Ledger migration blocked: ${verification.errors.join(" ")}`);
  if (ledger.hashAlgorithm === LEDGER_HASH_ALGORITHMS.SHA256 && ledger.genesisHash) return ledger;
  return freezeLedger({
    ...ledger,
    hashAlgorithm: LEDGER_HASH_ALGORITHMS.SHA256,
    genesisHash: inferGenesisHash(ledger),
    auditTrail: [...(ledger.auditTrail || []), {
      action: "LEDGER_HASH_MIGRATION_ENABLED",
      version: ledger.version,
      at,
      historicalAlgorithm: LEDGER_HASH_ALGORITHMS.LEGACY_FNV1A64,
      newEntryAlgorithm: LEDGER_HASH_ALGORITHMS.SHA256,
    }],
  });
}

export function isLedgerReady(ledger) {
  return verifyLedger(ledger).status === LEDGER_STATUS.READY;
}

function validateTransaction(transaction) {
  if (!transaction || !Array.isArray(transaction.postings) || transaction.postings.length < 2) throw new Error("At least two postings are required.");
  if (!isBalanced(transaction.postings)) throw new Error("Transaction debits and credits must balance and be greater than zero.");
  transaction.postings.forEach((posting) => {
    if (!posting.account) throw new Error("Every posting requires an account.");
    if (amount(posting.debit) > 0 && amount(posting.credit) > 0) throw new Error("A posting cannot contain both debit and credit.");
  });
}

function isBalanced(postings = []) {
  const debit = postings.reduce((sum, posting) => sum + amount(posting.debit), 0);
  const credit = postings.reduce((sum, posting) => sum + amount(posting.credit), 0);
  return debit > 0 && Math.abs(debit - credit) < 0.000001;
}

function amount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function hashCanonical(value, algorithm) {
  const text = canonicalStringify(value);
  if (algorithm === LEDGER_HASH_ALGORITHMS.SHA256) return sha256(text);
  if (algorithm !== LEDGER_HASH_ALGORITHMS.LEGACY_FNV1A64) throw new Error(`Unsupported ledger hash algorithm: ${algorithm}`);
  return legacyFnv1a64(text);
}

function legacyFnv1a64(text) {
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const message = new Uint8Array(paddedLength);
  message.set(bytes);
  message[bytes.length] = 0x80;
  const view = new DataView(message.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  const constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const state = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const words = new Uint32Array(64);
  const rotate = (value, count) => (value >>> count) | (value << (32 - count));
  for (let offset = 0; offset < message.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotate(words[index - 15], 7) ^ rotate(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotate(words[index - 2], 17) ^ rotate(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = state;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + constants[index] + words[index]) >>> 0;
      const s0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      h=g;g=f;f=e;e=(d+temp1)>>>0;d=c;c=b;b=a;a=(temp1+temp2)>>>0;
    }
    state[0]=(state[0]+a)>>>0;state[1]=(state[1]+b)>>>0;state[2]=(state[2]+c)>>>0;state[3]=(state[3]+d)>>>0;
    state[4]=(state[4]+e)>>>0;state[5]=(state[5]+f)>>>0;state[6]=(state[6]+g)>>>0;state[7]=(state[7]+h)>>>0;
  }
  return state.map((value) => value.toString(16).padStart(8, "0")).join("");
}

function inferHashAlgorithm(hash) {
  return String(hash || "").length === 16 ? LEDGER_HASH_ALGORITHMS.LEGACY_FNV1A64 : LEDGER_HASH_ALGORITHMS.SHA256;
}

function inferGenesisHash(ledger) {
  return ledger.entries?.[0]?.previousHash || (inferHashAlgorithm(ledger.headHash) === LEDGER_HASH_ALGORITHMS.LEGACY_FNV1A64 ? LEGACY_GENESIS_HASH : SHA256_GENESIS_HASH);
}

function normalizeTenantBinding(context, tenantId, dataScope) {
  return {
    tenantId: String(tenantId || context?.tenant_id || context?.tenantId || "") || null,
    dataScope: String(dataScope || context?.data_scope || context?.dataScope || "") || null,
  };
}

function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function freezeLedger(ledger) {
  return deepFreeze(structuredCloneSafe(ledger));
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export const ImmutableLedgerEngine = Object.freeze({ create: createLedger, append: appendTransaction, rollback: rollbackTransaction, verify: verifyLedger, migrate: migrateLedgerIntegrity, isReady: isLedgerReady });
export default ImmutableLedgerEngine;
