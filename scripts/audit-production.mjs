import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// GHSA-qwww-vcr4-c8h2 affects only unstable React Server Component APIs.
// VARDHAN is a Vite SPA and does not use those APIs. The published patched
// version (8.3.0) is not yet available from npm, so keep this exception exact
// and fail closed for every other high or critical advisory.
const allowedAdvisories = new Set([1124282]);
const allowedDependencyChain = new Set(["react-router", "react-router-dom"]);

let stdout;
try {
  const command = process.platform === "win32"
    ? [process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm audit --json"]]
    : ["npm", ["audit", "--json"]];
  ({ stdout } = await execFileAsync(command[0], command[1], {
    maxBuffer: 10 * 1024 * 1024,
  }));
} catch (error) {
  stdout = error.stdout;
  if (!stdout) throw error;
}

const report = JSON.parse(stdout);
const blocking = [];

for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
  if (!new Set(["high", "critical"]).has(vulnerability.severity)) continue;

  const advisoryIds = (vulnerability.via ?? [])
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => Number(entry.source));
  const indirectPackages = (vulnerability.via ?? [])
    .filter((entry) => typeof entry === "string");

  const isExactException = allowedDependencyChain.has(packageName)
    && advisoryIds.every((id) => allowedAdvisories.has(id))
    && indirectPackages.every((name) => allowedDependencyChain.has(name))
    && (advisoryIds.length > 0 || indirectPackages.length > 0);

  if (!isExactException) {
    blocking.push({ packageName, severity: vulnerability.severity, advisoryIds });
  }
}

if (blocking.length > 0) {
  console.error(JSON.stringify({ ok: false, blocking }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  exception: "GHSA-qwww-vcr4-c8h2",
  reason: "unstable RSC APIs are not used; patched npm release is pending",
}, null, 2));
