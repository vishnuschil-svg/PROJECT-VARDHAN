import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const endpoint = process.env.CDP_ENDPOINT || "http://127.0.0.1:9334";
const app = process.env.APP_URL || "http://127.0.0.1:5174";
const output = path.resolve("artifacts/ocr-pipeline");
const targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No Chrome page target is available.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let id = 0;
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const handler = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) handler.reject(new Error(message.error.message));
  else handler.resolve(message.result);
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const next = ++id;
  pending.set(next, { resolve, reject });
  socket.send(JSON.stringify({ id: next, method, params }));
});

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
});
await send("Page.navigate", {
  url: `${app}/scripts/browser-fixtures/ocr-pipeline.html`,
});
for (let attempt = 0; attempt < 50; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const status = await send("Runtime.evaluate", {
    expression: "document.body?.dataset?.complete === 'true'",
    returnByValue: true,
  });
  if (status.result.value) break;
  if (attempt === 49) throw new Error("Browser pipeline verification did not finish.");
}
const evaluated = await send("Runtime.evaluate", {
  expression: "JSON.stringify(window.__OCR_BROWSER_RESULTS__)",
  returnByValue: true,
});
const results = JSON.parse(evaluated.result.value);
if (results.some((result) => result.workspace === "FAIL" || result.normalization === "FAIL" || result.draft === "FAIL")) {
  throw new Error(`Browser verification failed: ${JSON.stringify(results)}`);
}
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
const screenshot = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: false,
});
await writeFile(path.join(output, "browser-verification.png"), Buffer.from(screenshot.data, "base64"));
socket.close();
console.log(JSON.stringify(results, null, 2));
