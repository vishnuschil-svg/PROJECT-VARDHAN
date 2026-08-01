import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const endpoint = process.env.CDP_ENDPOINT || "http://127.0.0.1:9222";
const app = process.env.APP_URL || "http://127.0.0.1:4173";
const output = path.resolve("artifacts/internal-trial-audit");
const validChitFixture = path.join(output, "valid-chit-plan.json");
const routes = [
  "/dashboard", "/chits", "/chits/batches", "/chits/groups", "/chits/members",
  "/chits/collections", "/chits/receipts", "/chits/member-ledger",
  "/chits/collections/pending", "/chits/auctions", "/chits/lucky-draw",
  "/chits/payouts", "/chits/finance", "/chits/reports", "/chits/ai",
  "/chits/academy", "/chits/support", "/chits/settings",
];

const targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No Chrome page target is available.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const browserErrors = [];
let commandId = 0;
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") browserErrors.push({ type: "exception", detail: message.params.exceptionDetails.text });
  if (message.method === "Log.entryAdded" && ["error", "warning"].includes(message.params.entry.level)) browserErrors.push({ type: message.params.entry.level, detail: message.params.entry.text });
  if (message.id && pending.has(message.id)) {
    const task = pending.get(message.id); pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++commandId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const navigate = async (route) => {
  await send("Page.navigate", { url: `${app}${route}` });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await wait(100);
    const ready = await evaluate("document.readyState === 'complete' && !document.body.innerText.includes('Loading...')");
    if (ready) return;
  }
  throw new Error(`Route did not settle: ${route}`);
};
const clickText = (text) => evaluate(`(() => { const node = [...document.querySelectorAll('button,a')].find((item) => item.textContent.trim().includes(${JSON.stringify(text)})); if (!node) return false; node.click(); return true; })()`);
const setInput = (selector, value) => evaluate(`(() => { const node=document.querySelector(${JSON.stringify(selector)}); if(!node)return false; const setter=Object.getOwnPropertyDescriptor(node.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set; setter.call(node,${JSON.stringify(value)}); node.dispatchEvent(new Event('input',{bubbles:true})); node.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
const setByLabel = (label, value) => evaluate(`(() => { const label=[...document.querySelectorAll('label')].find(x=>x.textContent.trim().startsWith(${JSON.stringify(label)})); const node=label?.querySelector('input,select,textarea')||(label?.htmlFor&&document.getElementById(label.htmlFor)); if(!node)return false; const proto=node.tagName==='SELECT'?HTMLSelectElement.prototype:node.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(node,${JSON.stringify(value)}); node.dispatchEvent(new Event('input',{bubbles:true})); node.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);

await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("DOM.enable");
await mkdir(output, { recursive: true });

await navigate("/login");
await evaluate("localStorage.clear(); sessionStorage.clear(); true");
await navigate("/login");
const loginBefore = await evaluate("({path:location.pathname,title:document.querySelector('h2')?.textContent,text:document.body.innerText.slice(0,500)})");
await setInput('input[type="email"]', "admin@vardhan.com");
await setInput('input[type="password"]', "admin123");
await evaluate("(() => { const form=document.querySelector('form'); if(!form)return false; form.requestSubmit(); return true; })()");
for (let attempt = 0; attempt < 50 && await evaluate("location.pathname") === "/login"; attempt += 1) await wait(100);
await wait(300);
const loginAfter = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,300)})");

const routeSnapshots = [];
for (const route of routes) {
  await navigate(route);
  routeSnapshots.push(await evaluate(`({route:${JSON.stringify(route)},path:location.pathname,title:document.querySelector('h1,h2')?.textContent||'',buttons:[...document.querySelectorAll('button')].map(x=>x.textContent.trim()).filter(Boolean),inputs:document.querySelectorAll('input,select,textarea').length,body:document.body.innerText.slice(0,800),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth})`));
}

await navigate("/chits/batches");
const batchOpened = await clickText("Create Batch"); await wait(200);
const nameSelector = ".batch-form input";
await evaluate(`document.querySelector(${JSON.stringify(nameSelector)})?.focus()`);
const focusSequence = [];
for (const character of "Trial Batch") {
  await send("Input.insertText", { text: character }); await wait(30);
  focusSequence.push(await evaluate(`document.activeElement===document.querySelector(${JSON.stringify(nameSelector)})`));
}
const batchTypedValue = await evaluate(`document.querySelector(${JSON.stringify(nameSelector)})?.value`);
const batchSaved = await clickText("Save Batch"); await wait(250);
const batchResult = await evaluate("({path:location.pathname,modal:Boolean(document.querySelector('[role=dialog]')),text:document.body.innerText.slice(0,700)})");

await navigate("/chits/groups");
const groupCreateClicked = await clickText("Create Chit"); await wait(300);
const groupCreateResult = await evaluate("({path:location.pathname,title:document.querySelector('h1,h2')?.textContent||'',text:document.body.innerText.slice(0,700)})");
await clickText("Upload Chit Document"); await wait(250);
const documentNode = await send("DOM.getDocument", { depth: -1 });
const fileNode = await send("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector: 'input[type="file"]' });
await send("DOM.setFileInputFiles", { nodeId: fileNode.nodeId, files: [validChitFixture] }); await wait(200);
const groupJourney = [];
for (const action of ["Upload & Analyze", "View analysis summary", "View Extracted Details", "Next", "Next", "Next", "Next"]) {
  const clicked = await clickText(action); await wait(250);
  groupJourney.push({ action, clicked, path: await evaluate("location.pathname") });
}
await evaluate("document.querySelector('.ai-confirm input')?.click()"); await wait(100);
const confirmClicked = await clickText("Confirm & Create Chit Group"); await wait(350);
const groupFinal = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,900)})");

await navigate("/chits/members"); await clickText("Add Member"); await wait(200);
for (const [label, value] of [["Member Name","Trial Member"],["Member ID / Member Number","TRIAL-001"],["Mobile Number","9876543210"],["WhatsApp Number","9876543210"],["Address","Internal trial address"],["Aadhaar Number","123456789012"],["Nominee Name","Trial Nominee"],["Nominee Mobile","9876500000"],["Bank Name","Trial Bank"],["Account Number","1234567890"],["IFSC","TRIAL000001"],["Join Date","2026-07-13"]]) await setByLabel(label,value);
await evaluate("(() => { const node=[...document.querySelectorAll('label')].find(x=>x.textContent.trim().startsWith('Assigned Chit Group'))?.querySelector('select'); if(!node||node.options.length<2)return false; node.value=node.options[1].value; node.dispatchEvent(new Event('change',{bubbles:true})); return true; })()");
const memberSaveClicked = await clickText("Save Member"); await wait(300);
const memberResult = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,1000),error:document.querySelector('.member-form-error')?.textContent||''})");

await navigate("/chits/collections"); await clickText("Record Collection"); await wait(250);
const collectionContinueClicked = await clickText("Validate & Continue"); await wait(200);
const collectionConfirmClicked = await clickText("Confirm & Generate Receipt"); await wait(400);
const collectionResult = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,1200),validationError:document.querySelector('.collection-error-dialog')?.textContent||''})");

await navigate("/chits/receipts");
const receiptResult = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,1000),rows:document.querySelectorAll('tbody tr').length})");
await navigate("/chits/member-ledger");
const ledgerResult = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,1200)})");
await navigate("/chits/finance");
const financeResult = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,1200)})");
await navigate("/chits/reports");
const reportsResult = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,1200)})");
await navigate("/chits/collections/pending");
const pendingResult = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,900)})");
await navigate("/chits/auctions");
const auctionResult = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,1100)})");
await clickText("Start Auction"); await wait(200);
const auctionModalResult = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,1400)})");
await navigate("/chits/lucky-draw");
const luckyDrawResult = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,1000)})");
await navigate("/chits/payouts");
const payoutResult = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,900)})");
await navigate("/dashboard");
const dashboardFinal = await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,1200)})");

const result = { generatedAt: new Date().toISOString(), loginBefore, loginAfter, routeSnapshots, batch: { batchOpened, focusSequence, batchTypedValue, batchSaved, batchResult }, groupCreate: { groupCreateClicked, groupCreateResult, groupJourney, confirmClicked, groupFinal }, member: { memberSaveClicked, memberResult }, collection: { collectionContinueClicked, collectionConfirmClicked, collectionResult }, downstream: { receiptResult, ledgerResult, financeResult, reportsResult, pendingResult, auctionResult, auctionModalResult, luckyDrawResult, payoutResult, dashboardFinal }, browserErrors };
await writeFile(path.join(output, "browser-audit-results.json"), JSON.stringify(result, null, 2));
socket.close();
console.log(JSON.stringify({ loginAfter, batch: result.batch, groupCreate: result.groupCreate, browserErrors, routes: routeSnapshots.length }, null, 2));
