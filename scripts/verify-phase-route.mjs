import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const route = process.argv[2] || "/chits";
const expected = process.argv.slice(3);
const endpoint = "http://127.0.0.1:9222";
const app = "http://127.0.0.1:4173";
const target = (await fetch(`${endpoint}/json/list`).then((response) => response.json())).find((item) => item.type === "page");
if (!target) throw new Error("No Chrome page target.");
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const errors = [];
let id = 0;
const handshake = new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
await handshake;
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") errors.push(message.params.entry.text);
  if (message.id && pending.has(message.id)) {
    const task = pending.get(message.id); pending.delete(message.id);
    message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params })); });
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable");
await send("Page.setLifecycleEventsEnabled", { enabled: true });
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: app + route });
let state;
for (let attempt = 0; attempt < 50; attempt += 1) {
  await wait(150);
  const result = await send("Runtime.evaluate", { expression: "JSON.stringify({path:location.pathname,text:document.body.innerText,loading:document.body.innerText.includes('Loading...'),hasError:document.body.innerText.includes('Something went wrong'),scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth})", returnByValue: true });
  state = JSON.parse(result.result.value);
  if (state.path === route && !state.loading && state.text.trim()) break;
}
if (state.path !== route || state.loading || state.hasError || state.scrollWidth > state.clientWidth) throw new Error(`Route verification failed: ${JSON.stringify(state)}`);
for (const text of expected) if (!state.text.toLowerCase().includes(text.toLowerCase())) throw new Error(`Expected text not rendered: ${text}. Body: ${state.text.slice(0, 1200)}`);
if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
const output = path.resolve("artifacts/master-phases"); await mkdir(output, { recursive: true });
const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
const name = route.replace(/^\//, "").replace(/\//g, "-") || "home";
await writeFile(path.join(output, `${name}.png`), Buffer.from(shot.data, "base64"));
await writeFile(path.join(output, `${name}.json`), JSON.stringify({ route, expected, state: { ...state, text: undefined }, errors }, null, 2));
socket.close();
console.log(JSON.stringify({ route, expected, errors, overflow: state.scrollWidth > state.clientWidth }));
