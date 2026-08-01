import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AI_ANALYSIS_STAGES, AI_CHIT_STEPS, canCreateFromAnalysis, confidenceStatus, flowStorageKey, resolveReviewItem, stepFromPath } from "../../config/aiChitFlow.js";
import { ChitDocumentUnderstandingEngine } from "../../domain/chit/services/ChitDocumentUnderstandingEngine.js";

test("AI chit journey has the approved ten-screen route order and refresh resolution", () => {
  assert.deepEqual(AI_CHIT_STEPS.map(x=>x.id), ["welcome","upload","analyzing","summary","details","schedule","rules","terms","review","success"]);
  for (const step of AI_CHIT_STEPS) assert.equal(stepFromPath(step.path), step.id);
  assert.equal(stepFromPath("/unknown"), "welcome");
});

test("analysis stages remain evidence-labelled rather than fake animation", () => {
  assert.equal(AI_ANALYSIS_STAGES.length, 8);
  assert.equal(AI_ANALYSIS_STAGES[0], "Understanding document type");
  assert.equal(AI_ANALYSIS_STAGES.at(-1), "Preparing summary");
});

test("upload validation covers valid files, blocked types, and oversized documents", () => {
  assert.equal(ChitDocumentUnderstandingEngine.validateFile({name:"plan.csv",size:100}).valid, true);
  assert.equal(ChitDocumentUnderstandingEngine.validateFile({name:"plan.exe",size:100}).valid, false);
  assert.match(ChitDocumentUnderstandingEngine.validateFile({name:"plan.pdf",size:16*1024*1024}).errors.join(" "), /15 MB/);
});

test("confidence, missing rows, rule decisions, terms and final confirmation are explicit", () => {
  assert.equal(confidenceStatus(.9,"Probable"), "High");
  assert.equal(confidenceStatus(.6,"Probable"), "Probable");
  assert.equal(confidenceStatus(.9,"Missing"), "Missing");
  assert.equal(resolveReviewItem({originalWording:"Exact"},"Confirmed").confirmed, true);
  assert.equal(resolveReviewItem({originalWording:"Exact"},"Rejected").confirmed, false);
  assert.equal(canCreateFromAnalysis({missingInformation:[]},false), false);
  assert.equal(canCreateFromAnalysis({missingInformation:[]},true), true);
  assert.equal(canCreateFromAnalysis({missingInformation:["duration"]},true), false);
});

test("flow persistence key is tenant and data-scope isolated", () => {
  assert.notEqual(flowStorageKey({tenant_id:"a",data_scope:"real_tenant"}), flowStorageKey({tenant_id:"b",data_scope:"real_tenant"}));
  assert.notEqual(flowStorageKey({tenant_id:"a",data_scope:"real_tenant"}), flowStorageKey({tenant_id:"a",data_scope:"demo_sandbox"}));
});

test("dedicated page contains tabs, schedule editing, provider honesty, mobile navigation and success dashboard", async () => {
  const source = await readFile(new URL("../../pages/chits/AIChitFlow.jsx", import.meta.url), "utf8");
  for (const text of ["Core Business Fields","Add missing row","Delete duplicate row","Manual evidence path used","AI Assistant","Confirm & Create Chit Group","Total chit groups"]) assert.match(source,new RegExp(text.replace(/[&]/g,"&")));
  assert.doesNotMatch(source, /<Modal|ChitStudioLauncher/);
  const css = await readFile(new URL("../../pages/chits/AIChitFlow.css", import.meta.url), "utf8");
  assert.match(css,/overflow-x:hidden/); assert.match(css,/@media\(max-width:360px\)/); assert.match(css,/@media\(min-width:768px\)/); assert.match(css,/min-height:44px/);
});

test("active entry points route to dedicated flow and groups no longer auto-open studio modal", async () => {
  const groups = await readFile(new URL("../../pages/chits/ChitGroups.jsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../../pages/chits/ChitDashboard.jsx", import.meta.url), "utf8");
  const router = await readFile(new URL("../../routes/AppRouter.jsx", import.meta.url), "utf8");
  assert.match(groups,/navigate\("\/chits\/ai-chit/); assert.doesNotMatch(groups,/defaultOpen|ChitStudioLauncher|searchParams/);
  assert.match(dashboard,/"Create Chit","\/chits\/ai-chit"/); assert.match(router,/path="\/chits\/ai-chit\/\*"/);
});
