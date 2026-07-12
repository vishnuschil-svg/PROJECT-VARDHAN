import { executeCommand } from "../../ai/AICommandCenter.js";
import { ExternalAIProviderAdapter } from "../../ai/providers/ExternalAIProviderAdapter.js";
import { ExternalOCRProviderAdapter } from "../../ai/providers/ExternalOCRProviderAdapter.js";
import { ExternalSpeechProviderAdapter } from "../../ai/providers/ExternalSpeechProviderAdapter.js";
import { ExternalTranslationProviderAdapter } from "../../ai/providers/ExternalTranslationProviderAdapter.js";

const CONFIRMATION_COMMANDS=["delete","cancel payment","reverse payment","close chit","send reminder","send message"];
export class AIOrchestrator {
  constructor({ ai=ExternalAIProviderAdapter,ocr=ExternalOCRProviderAdapter,speech=ExternalSpeechProviderAdapter,translation=ExternalTranslationProviderAdapter }={}){this.providers={ai,ocr,speech,translation}}
  getProviderStatus(){return Object.fromEntries(Object.entries(this.providers).map(([key,provider])=>[key,{name:provider.name,configured:provider.isConfigured()}]))}
  route({text,tenantContext,permissions={},confirmed=false}={}){
    if(!tenantContext?.tenant_id||!tenantContext?.data_scope)return response("Tenant context required","Select a business workspace before asking AI to access business data.","blocked",0.99,{warning:"No tenant data was read."});
    const input=String(text||"").trim(); if(!input)return response("Tell me what you need","Type a question or choose a quick action.","needs_input",1);
    const destructive=CONFIRMATION_COMMANDS.some((word)=>input.toLowerCase().includes(word));
    if(destructive&&!confirmed)return response("Confirmation required","This action can change business records or contact people. Review it before continuing.","confirmation_required",0.98,{requiresConfirmation:true,source:"Local safety policy"});
    if(permissions.ai===false)return response("AI access restricted","Your role does not have permission to use AI actions in this workspace.","blocked",0.99,{source:"Workspace permissions"});
    const command=executeCommand(input);
    return {...command,status:command.confidence<.5?"needs_review":"ready",source:"Local deterministic command router",providerStatus:this.getProviderStatus(),requiresConfirmation:false,suggestedNextAction:command.action};
  }
}
function response(title,message,status,confidence,extra={}){return{title,message,status,confidence,source:"VARDHAN OS",warnings:extra.warning?[extra.warning]:[],actions:[],support:{available:true,route:"/chits/support"},...extra}}
export const aiOrchestrator=new AIOrchestrator();
