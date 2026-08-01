import test from "node:test";import assert from "node:assert/strict";import { AIOrchestrator } from "../../services/ai/AIOrchestrator.js";
const tenant={tenant_id:"tenant-a",data_scope:"tenant_chit_operations"};
test("AI router requires tenant context",()=>{assert.equal(new AIOrchestrator().route({text:"show pending"}).status,"blocked")});
test("AI router requires confirmation for consequential commands",()=>{const result=new AIOrchestrator().route({text:"send reminder to pending members",tenantContext:tenant});assert.equal(result.status,"confirmation_required");assert.equal(result.requiresConfirmation,true)});
test("AI router uses deterministic routes and reports the server-backed OCR adapter",()=>{const result=new AIOrchestrator().route({text:"show pending",tenantContext:tenant});assert.equal(result.action.route,"/chits/collections/pending");assert.equal(result.providerStatus.ai.configured,false);assert.equal(result.providerStatus.ocr.configured,true)});
