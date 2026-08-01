import { ChitDocumentUnderstandingEngine } from "../domain/chit/services/ChitDocumentUnderstandingEngine.js";
import { GroupsRepository } from "../repositories/chits/GroupsRepository.js";
import { CaptureRepository } from "../repositories/CaptureRepository.js";
import { ChitScheduleRepository } from "../repositories/ChitScheduleRepository.js";
import { ChitRuleRepository } from "../repositories/ChitRuleRepository.js";
import { ChitTemplateRepository } from "../repositories/ChitTemplateRepository.js";
import { ActivityRepository } from "../repositories/ActivityRepository.js";
import { extractDocumentEvidence } from "./documentExtractionCore.js";

export async function analyzeChitDocument(file,options={}){
  const evidence=await extractDocumentEvidence(file,options);
  return ChitDocumentUnderstandingEngine.buildAnalysis({
    file,
    rawText:evidence.rawText,
    rows:evidence.rows,
    provider:evidence.provider
  });
}
export function correctChitAnalysis(analysis,corrections){return ChitDocumentUnderstandingEngine.applyCorrections(analysis,corrections)}
export function saveChitAnalysisDraft(analysis,tenantContext){return CaptureRepository.save({...analysis,status:"DRAFT"},tenantContext)}
export function reconstructChitFromAnalysis(analysis,{tenantContext,confirmed=false,saveTemplate=false}={}){
  if(!confirmed)throw new Error("Owner confirmation is required before ERP records can be created.");
  if(!tenantContext?.tenant_id||!tenantContext?.data_scope)throw new Error("Tenant and workspace scope are required.");

  /**
   * Safe value extractor — returns null for missing/unset values.
   * Never defaults to 0. Unknown values remain null.
   */
  const safeValue=(key)=>{
    const v=analysis.fields[key]?.userCorrectedValue??analysis.fields[key]?.normalizedValue;
    if(v===null||v===undefined||v==="")return null;
    const num=Number(v);
    return isNaN(num)?null:num;
  };

  const hasSchedule=analysis.schedule&&analysis.schedule.length>0;
  const groupId=`group-import-${Date.now()}`;
  const group=GroupsRepository.upsert({
    id:groupId,
    chit_name:analysis.fields.chitName?.userCorrectedValue||analysis.fields.chitName?.normalizedValue||null,
    chit_code:`IMP-${Date.now()}`,
    chit_value:safeValue("chitValue"),
    monthly_amount:safeValue("monthlyPayment"),
    total_members:safeValue("memberCount"),
    total_months:safeValue("duration"),
    commission_rate:safeValue("commission"),
    status:"active",
    source:"AI_DOCUMENT_RECONSTRUCTION",
    document_reference:analysis.id
  },{activeTenantContext:tenantContext});

  const schedule=hasSchedule
    ?ChitScheduleRepository.saveMany(analysis.schedule.map(row=>({
      ...row,
      id:undefined,
      groupId:group.id,
      group_id:group.id,
      isUserConfirmed:true,
      standardPayment:row.standardPayment??null,
      nonLiftedPayment:row.nonLiftedPayment??null,
      liftedPayment:row.liftedPayment??null,
      prizeAmount:row.prizeAmount??null,
      bidAmount:row.bidAmount??null,
      commissionValue:row.commissionValue??null,
      deposit:row.deposit??null,
      dividendPerMember:row.dividendPerMember??null,
      penalty:row.penalty??null,
      otherDeductions:row.otherDeductions??null,
      netAmount:row.netAmount??null,
      confidence:row.confidence||0.6,
    })),tenantContext)
    :[];

  const rules=ChitRuleRepository.save({
    groupId:group.id,
    status:"CONFIRMED",
    liftedMemberRule:null,
    nonLiftedMemberRule:null,
    auctionConfiguration:{confirmed:true},
    dividendConfiguration:{confirmed:true},
    commissionConfiguration:{rate:safeValue("commission")},
    collectionConfiguration:{scheduleDriven:true},
    receiptConfiguration:{numbered:true},
    ledgerConfiguration:{scheduleDriven:true},
    reportsConfiguration:{scheduleDriven:true},
    terms:(analysis.terms||[]).map(term=>({
      originalWording:term.originalWording,
      normalizedMeaning:term.normalizedMeaning,
      enforced:false,
      confirmed:Boolean(term.confirmed)
    })),
    relationships:analysis.relationships||[]
  },tenantContext);

  const document=CaptureRepository.save({
    ...analysis,
    status:"CONFIRMED",
    confirmedConfiguration:{groupId:group.id},
    auditHistory:[
      ...analysis.auditHistory,
      {action:"ERP_RECONSTRUCTED",at:new Date().toISOString(),details:{groupId:group.id}}
    ]
  },tenantContext);

  const template=saveTemplate
    ?ChitTemplateRepository.save({
      name:`${analysis.fields.chitName?.userCorrectedValue||analysis.fields.chitName?.normalizedValue||"Imported"} template`,
      description:"Owner-confirmed document reconstruction",
      groupId:group.id,
      schedule,
      rules,
      sourceDocumentId:document.id
    },tenantContext)
    :null;

  const activity=ActivityRepository.addActivity({
    title:"Chit reconstructed from document",
    description:`${group.chit_name||"Chit group"} created after owner confirmation.`,
    icon:"AI",
    route:"/chits/groups"
  },tenantContext);

  return{group,schedule,rules,document,template,activity};
}
