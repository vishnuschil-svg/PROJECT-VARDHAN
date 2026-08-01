const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 150000;

export const ENCRYPTION_VERSION = "AES-GCM-PBKDF2-v1";

export async function sha256Hex(value) {
  assertCrypto();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(typeof value === "string" ? value : canonicalStringify(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function encryptJSON(value, secret) {
  assertCrypto();
  assertSecret(secret);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secret, salt, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(value)),
  );
  return {
    version: ENCRYPTION_VERSION,
    algorithm: "AES-GCM",
    keyDerivation: "PBKDF2-SHA-256",
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptJSON(envelope, secret) {
  assertCrypto();
  assertSecret(secret);
  if (envelope?.version !== ENCRYPTION_VERSION) throw new Error("Unsupported encrypted payload version.");
  const salt = fromBase64(envelope.salt);
  const iv = fromBase64(envelope.iv);
  const key = await deriveKey(secret, salt, ["decrypt"]);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      fromBase64(envelope.ciphertext),
    );
    return JSON.parse(decoder.decode(plaintext));
  } catch {
    throw new Error("Encrypted payload could not be authenticated.");
  }
}

async function deriveKey(secret, salt, usages) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

function assertCrypto() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error("Web Crypto is required for encrypted backup operations.");
  }
}

function assertSecret(secret) {
  if (typeof secret !== "string" || secret.length < 12) throw new Error("Encryption secret must contain at least 12 characters.");
}

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(String(value || ""));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
