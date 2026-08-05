import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AI_ANALYSIS_STAGES,
  AI_CHIT_STEPS,
  aiChitPath,
  buildOwnerConfirmedFixedSchedule,
  canCreateFromAnalysis,
  confidenceStatus,
  draftIdFromSearch,
  flowStorageKey,
  isPersistedDraftId,
  resolveReviewItem,
  stepFromPath,
} from "../../config/aiChitFlow.js";
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

test("flow persistence key is tenant, data-scope, and workspace isolated", () => {
  assert.notEqual(flowStorageKey({tenant_id:"a",data_scope:"real_tenant"}), flowStorageKey({tenant_id:"b",data_scope:"real_tenant"}));
  assert.notEqual(flowStorageKey({tenant_id:"a",data_scope:"real_tenant"}), flowStorageKey({tenant_id:"a",data_scope:"demo_sandbox"}));
  assert.notEqual(
    flowStorageKey({tenant_id:"a",data_scope:"real_tenant",workspace_id:"workspace-1"}),
    flowStorageKey({tenant_id:"a",data_scope:"real_tenant",workspace_id:"workspace-2"})
  );
});

test("durable draft URLs preserve only valid persisted draft IDs", () => {
  const id = "7c359ab9-f530-4ef3-a8fb-8c97d6ce2c88";
  assert.equal(isPersistedDraftId(id), true);
  assert.equal(isPersistedDraftId("local-draft-1"), false);
  assert.equal(aiChitPath("review", id), `/chits/ai-chit/review?draft=${id}`);
  assert.equal(draftIdFromSearch(`?draft=${id}`), id);
});

test("dedicated page contains tabs, schedule editing, provider honesty, mobile navigation and success dashboard", async () => {
  const source = await readFile(new URL("../../pages/chits/AIChitFlow.jsx", import.meta.url), "utf8");
  for (const text of ["Core Business Fields","Add missing row","Delete duplicate row","Manual evidence path used","AI Assistant","Confirm & Create Chit Group","Total chit groups"]) assert.match(source,new RegExp(text.replace(/[&]/g,"&")));
  assert.doesNotMatch(source, /<Modal|ChitStudioLauncher/);
  const css = await readFile(new URL("../../pages/chits/AIChitFlow.css", import.meta.url), "utf8");
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /@media\s*\(\s*max-width:\s*360px\s*\)/);
  assert.match(css, /@media\s*\(\s*min-width:\s*768px\s*\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /#7A1F3D|#7a1f3d|--maroon/);
  assert.doesNotMatch(css, /#07091a|#11132d|#2d1d69/);
});

test("AI chit flow uses the shared ChitLayout shell", async () => {
  const source = await readFile(new URL("../../pages/chits/AIChitFlow.jsx", import.meta.url), "utf8");
  assert.match(source, /import ChitLayout/);
  assert.match(source, /<ChitLayout/);
  assert.match(source, /MAX_OCR_RETRIES/);
  assert.match(source, /ai-ocr-status/);
  assert.match(source, /loadBusinessUnderstandingDraft/);
  assert.match(source, /saveBusinessUnderstandingDraft\(draft, context\)/);
  assert.match(source, /go\("review", \{ draftId: saved\.id \}\)/);
  assert.match(source, /sessionStorage\.removeItem\(key\)/);
});

test("active entry points route to dedicated flow and groups no longer auto-open studio modal", async () => {
  const groups = await readFile(new URL("../../pages/chits/ChitGroups.jsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../../pages/chits/ChitDashboard.jsx", import.meta.url), "utf8");
  const router = await readFile(new URL("../../routes/AppRouter.jsx", import.meta.url), "utf8");
  assert.match(groups,/navigate\("\/chits\/ai-chit/); assert.doesNotMatch(groups,/defaultOpen|ChitStudioLauncher|searchParams/);
  assert.match(dashboard,/"Create Chit","\/chits\/ai-chit"/); assert.match(router,/path="\/chits\/ai-chit\/\*"/);
});


test("owner-confirmed fixed schedule repair uses only explicit duration and installment", () => {
  const rows = buildOwnerConfirmedFixedSchedule({ duration: 5, grossInstallment: 10000, installmentPattern: "FIXED_MONTHLY" });
  assert.equal(rows.length, 5);
  assert.equal(rows[0].standardPayment, 10000);
  assert.equal(rows[4].monthNumber, 5);
  assert.equal(rows[0].nonLiftedPayment, null);
  assert.throws(() => buildOwnerConfirmedFixedSchedule({ duration: 5, grossInstallment: 10000, installmentPattern: "UNKNOWN" }), /Fixed Monthly/);
  assert.throws(() => buildOwnerConfirmedFixedSchedule({ duration: 0, grossInstallment: 10000, installmentPattern: "FIXED_MONTHLY" }), /valid duration/);
});
