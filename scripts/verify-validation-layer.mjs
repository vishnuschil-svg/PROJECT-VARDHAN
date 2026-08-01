import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const endpoint = "http://127.0.0.1:9222";
const app = "http://127.0.0.1:4173";
const output = path.resolve("artifacts/validation-layer");
const targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No Chromium page target is available.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const browserErrors = [];
let id = 0;
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") browserErrors.push(message.params.entry.text);
  if (message.id && pending.has(message.id)) {
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handlers.reject(new Error(message.error.message));
    else handlers.resolve(message.result);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const requestId = ++id;
  pending.set(requestId, { resolve, reject });
  socket.send(JSON.stringify({ id: requestId, method, params }));
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const evaluate = async (expression) => {
  const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
};

await mkdir(output, { recursive: true });
await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });

await send("Page.navigate", { url: `${app}/login` });
await waitFor(() => Boolean(document.querySelector("form input[type=email]")));
await evaluate(`(() => {
  const set = (element, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  };
  set(document.querySelector('input[type=email]'), 'admin@vardhan.com');
  set(document.querySelector('input[type=password]'), 'admin123');
  document.querySelector('form button[type=submit]').click();
})()`);
await waitFor(() => location.pathname === "/dashboard", 60);

const cases = [
  { name: "fixed-monthly-valid", expected: "VALID", draft: completeDraft("FIXED_MONTHLY", [1000, 1000]) },
  { name: "variable-monthly-valid", expected: "VALID", draft: completeDraft("VARIABLE_MONTHLY", [1200, 800]) },
  { name: "invalid", expected: "INVALID", draft: invalidDraft() },
  { name: "needs-owner-confirmation", expected: "NEEDS_OWNER_CONFIRMATION", draft: missingPrimitiveDraft() },
  { name: "unsupported-pattern", expected: "UNSUPPORTED_PATTERN", draft: completeDraft("DAILY_ROLLOVER", [1000, 1000]) },
];

const results = [];
for (const item of cases) {
  const state = { draft: item.draft, confirmed: true, created: null, documentName: `${item.name}.json` };
  await evaluate(`(() => {
    const value = ${JSON.stringify(JSON.stringify(state))};
    sessionStorage.setItem('vardhan.ai-chit-flow.v1.platform-owner.platform_owner', value);
    sessionStorage.setItem('vardhan.ai-chit-flow.v1.own-chit-business.own_business', value);
  })()`);
  await send("Page.navigate", { url: `${app}/chits/ai-chit/review` });
  await waitFor(() => Boolean(document.querySelector(".bw-validation-banner[data-validation-status]")), 60);
  const rendered = await evaluate(`(() => {
    const banner = document.querySelector('.bw-validation-banner[data-validation-status]');
    const button = document.querySelector('.bw-create-btn');
    return {
      path: location.pathname,
      status: banner?.dataset.validationStatus,
      buttonDisabled: Boolean(button?.disabled),
      errorsVisible: Boolean(document.querySelector('.bw-validation-errors')),
      warningsVisible: Boolean(document.querySelector('.bw-validation-warnings')),
      missingFieldsVisible: Boolean(document.querySelector('.bw-validation-missing')),
      unsupportedVisible: Boolean(document.querySelector('.bw-validation-unsupported')),
      invalidHighlightVisible: Boolean(document.querySelector('.bw-invalid-field,.bw-invalid-row')),
      dslStatus: document.querySelector('[data-pipeline-step=dsl]')?.dataset.status,
      simulationStatus: document.querySelector('[data-pipeline-step=simulation]')?.dataset.status,
      ownerApprovalStatus: document.querySelector('[data-pipeline-step=owner]')?.dataset.status,
      ruleEngineStatus: document.querySelector('[data-pipeline-step=rules]')?.dataset.status,
      ledgerStatus: document.querySelector('[data-pipeline-step=ledger]')?.dataset.status,
      bodyText: document.body.innerText,
    };
  })()`);
  if (rendered.status !== item.expected) throw new Error(`${item.name}: expected ${item.expected}, rendered ${rendered.status}`);
  if (rendered.buttonDisabled !== (item.expected !== "VALID")) throw new Error(`${item.name}: creation gate rendered incorrectly`);
  if (item.expected === "VALID" && (rendered.dslStatus !== "SUCCESS" || rendered.simulationStatus !== "PASS" || rendered.ownerApprovalStatus !== "APPROVED" || rendered.ruleEngineStatus !== "PASS" || rendered.ledgerStatus !== "READY")) throw new Error(`${item.name}: approval pipeline rendered incorrectly`);
  if (item.expected === "INVALID" && (!rendered.errorsVisible || !rendered.invalidHighlightVisible)) throw new Error(`${item.name}: errors/highlights not visible`);
  if (item.expected === "NEEDS_OWNER_CONFIRMATION" && (!rendered.warningsVisible || !rendered.missingFieldsVisible)) throw new Error(`${item.name}: warnings/missing fields not visible`);
  if (item.expected === "UNSUPPORTED_PATTERN" && !rendered.unsupportedVisible) throw new Error(`${item.name}: unsupported pattern not visible`);
  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(path.join(output, `${item.name}.png`), Buffer.from(screenshot.data, "base64"));
  delete rendered.bodyText;
  results.push({ name: item.name, expected: item.expected, ...rendered });
}

if (browserErrors.length) throw new Error(`Browser errors: ${browserErrors.join(" | ")}`);
await writeFile(path.join(output, "results.json"), JSON.stringify({ results, browserErrors }, null, 2));
socket.close();
console.log(JSON.stringify({ results, browserErrors }, null, 2));

async function waitFor(predicate, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const passed = await evaluate(`Boolean((${predicate.toString()})())`);
    if (passed) return;
    await wait(200);
  }
  throw new Error(`Browser condition timed out at ${await evaluate("location.href")}`);
}

function scheduleRow(monthNumber, standardPayment) {
  return {
    monthNumber, standardPayment, nonLiftedPayment: standardPayment, liftedPayment: standardPayment,
    prizeAmount: 1800, commissionValue: 5, deposit: 200, dividendPerMember: 100,
    penalty: 25, bidAmount: 200, otherDeductions: 0, netAmount: 1600,
    confidence: 1, status: "OWNER_DEFINED", evidence: `Browser fixture month ${monthNumber}`,
  };
}

function completeDraft(installmentPattern, payments) {
  return {
    business: {
      chitName: { value: "Browser Validation Chit", state: "OWNER_DEFINED" },
      chitValue: { value: 2000, state: "OWNER_DEFINED" },
      duration: { value: payments.length, state: "OWNER_DEFINED" },
      memberCount: { value: 2, state: "OWNER_DEFINED" },
      installmentPattern: { value: installmentPattern, state: "OWNER_DEFINED" },
      startDate: { value: "2026-08-01", state: "OWNER_DEFINED" },
      endDate: { value: "2026-09-01", state: "OWNER_DEFINED" },
    },
    financialPrimitives: {
      bidRule: { value: "Auction", state: "OWNER_DEFINED" }, commission: { value: 5, state: "OWNER_DEFINED" },
      dividend: { value: 100, state: "OWNER_DEFINED" }, penalty: { value: 25, state: "OWNER_DEFINED" },
      liftRule: { value: "NEXT_MONTH", state: "OWNER_DEFINED" }, deposit: { value: 200, state: "OWNER_DEFINED" },
      prizeRule: { value: "MONTHLY", state: "OWNER_DEFINED" },
    },
    schedule: payments.map((payment, index) => scheduleRow(index + 1, payment)),
    members: [], rules: { detected: [], notDetected: [] },
    confidence: { overall: 1, business: {}, financialPrimitives: {}, rules: {}, schedule: 1, members: 0 },
    evidence: { business: {}, financialPrimitives: {}, rules: {}, scheduleRows: [], members: [] },
    extractionMetadata: { sourceDocument: { name: "browser-fixture.json", documentType: "Month-wise Schedule" } },
    workspace: { status: "NEEDS_REVIEW", ownerConfirmed: false, ownerChanges: [], auditLog: [] },
  };
}

function invalidDraft() {
  const draft = completeDraft("FIXED_MONTHLY", [1000, 1000]);
  draft.business.chitValue.value = 0;
  draft.schedule[1].monthNumber = 1;
  draft.schedule[0].penalty = -1;
  return draft;
}

function missingPrimitiveDraft() {
  const draft = completeDraft("FIXED_MONTHLY", [1000, 1000]);
  draft.financialPrimitives.penalty = { value: null, state: "NOT_FOUND" };
  return draft;
}
