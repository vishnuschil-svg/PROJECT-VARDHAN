import { ChitDocumentUnderstandingEngine } from "../domain/chit/services/ChitDocumentUnderstandingEngine.js";
import { ChitCalculationEngine } from "../domain/chit/services/ChitCalculationEngine.js";
import { GroupsRepository } from "../repositories/chits/GroupsRepository.js";
import { CaptureRepository } from "../repositories/CaptureRepository.js";
import { ChitScheduleRepository } from "../repositories/ChitScheduleRepository.js";
import { ChitRuleRepository } from "../repositories/ChitRuleRepository.js";
import { ChitTemplateRepository } from "../repositories/ChitTemplateRepository.js";
import { ActivityRepository } from "../repositories/ActivityRepository.js";
import { ExternalOCRProviderAdapter } from "../ai/providers/ExternalOCRProviderAdapter.js";

export async function analyzeChitDocument(file,{manualText=""}={}){
  const validation=ChitDocumentUnderstandingEngine.validateFile(file);if(!validation.valid)throw new Error(validation.errors.join(" "));
  let rawText=manualText;let rows=[];let provider="manual";
  if(validation.extension==="json"){rawText=await file.text();const parsed=JSON.parse(rawText);rows=Array.isArray(parsed)?parsed:(parsed.schedule||[]);provider="deterministic-json"}
  else if(validation.extension==="csv"){rawText=await file.text();rows=parseCsv(rawText);provider="deterministic-csv"}
  else if(validation.requiresExternalProvider){if(!ExternalOCRProviderAdapter.isConfigured()&&!manualText)throw new Error("OCR is not configured. Add the visible text manually to continue without simulated extraction.")}
  else if(validation.requiresSpreadsheetProvider)throw new Error("Excel parsing is not configured. Save the sheet as CSV to use deterministic import.");
  return ChitDocumentUnderstandingEngine.buildAnalysis({file,rawText,rows,provider});
}
export function correctChitAnalysis(analysis,corrections){return ChitDocumentUnderstandingEngine.applyCorrections(analysis,corrections)}
export function saveChitAnalysisDraft(analysis,tenantContext){return CaptureRepository.save({...analysis,status:"DRAFT"},tenantContext)}
export function reconstructChitFromAnalysis(analysis,{tenantContext,confirmed=false,saveTemplate=false}={}){
  if(!confirmed)throw new Error("Owner confirmation is required before ERP records can be created.");
  if(!tenantContext?.tenant_id||!tenantContext?.data_scope)throw new Error("Tenant and workspace scope are required.");
  if(analysis.missingInformation?.length)throw new Error(`Confirm missing information: ${analysis.missingInformation.join(", ")}.`);
  const value=(key)=>analysis.fields[key]?.userCorrectedValue??analysis.fields[key]?.normalizedValue;
  const groupId=`group-import-${Date.now()}`;const group=GroupsRepository.upsert({id:groupId,chit_name:value("chitName"),chit_code:`IMP-${Date.now()}`,chit_value:Number(value("chitValue")),monthly_amount:Number(value("monthlyPayment")),total_members:Number(value("memberCount")),total_months:Number(value("duration")),commission_rate:Number(value("commission")||0),status:"upcoming",source:"AI_DOCUMENT_RECONSTRUCTION",document_reference:analysis.id},{activeTenantContext:tenantContext});
  const schedule=ChitScheduleRepository.saveMany(analysis.schedule.map(row=>({...row,id:undefined,groupId:group.id,group_id:group.id,isUserConfirmed:true,prizeAmount:row.prizeAmount||ChitCalculationEngine.calculatePrizeAmount(Number(value("chitValue")),Number(row.bidAmount||0),ChitCalculationEngine.calculateCommission(Number(value("chitValue")),Number(row.commissionValue||value("commission")||0)))})),tenantContext);
  const rules=ChitRuleRepository.save({groupId:group.id,status:"CONFIRMED",liftedMemberRule:analysis.rules.find(x=>x.type==="LIFTED")||null,nonLiftedMemberRule:analysis.rules.find(x=>x.type==="NON_LIFTED")||null,auctionConfiguration:{confirmed:true},dividendConfiguration:{confirmed:true},commissionConfiguration:{rate:Number(value("commission")||0)},collectionConfiguration:{scheduleDriven:true},receiptConfiguration:{numbered:true},ledgerConfiguration:{scheduleDriven:true},reportsConfiguration:{scheduleDriven:true},terms:analysis.terms.map(term=>({originalWording:term.originalWording,normalizedMeaning:term.normalizedMeaning,enforced:false,confirmed:Boolean(term.confirmed)})),relationships:analysis.relationships},tenantContext);
  const document=CaptureRepository.save({...analysis,status:"CONFIRMED",confirmedConfiguration:{groupId:group.id},auditHistory:[...analysis.auditHistory,{action:"ERP_RECONSTRUCTED",at:new Date().toISOString(),details:{groupId:group.id}}]},tenantContext);
  const template=saveTemplate?ChitTemplateRepository.save({name:`${value("chitName")} imported template`,description:"Owner-confirmed document reconstruction",groupId:group.id,schedule,rules,sourceDocumentId:document.id},tenantContext):null;
  const activity=ActivityRepository.addActivity({title:"Chit reconstructed from document",description:`${group.chit_name} created after owner confirmation.`,icon:"AI",route:"/chits/groups"},tenantContext);
  return{group,schedule,rules,document,template,activity};
}
function parseCsv(text){const lines=String(text).split(/\r?\n/).filter(Boolean);if(!lines.length)return[];const headers=splitCsv(lines[0]);return lines.slice(1).map(line=>{const values=splitCsv(line);return Object.fromEntries(headers.map((h,i)=>[h.trim(),values[i]?.trim()||""]))})}
function splitCsv(line){return String(line).split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(x=>x.replace(/^\"|\"$/g,""))}
