import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const TEMPLATE_KEY = "vardhan.chit.messageTemplates.v1";
const JOB_KEY = "vardhan.chit.messageJobs.v1";

export const CommunicationRepository = {
  listTemplates(activeTenantContext) {
    return listScopedRows(TEMPLATE_KEY, activeTenantContext);
  },
  saveTemplate(template, activeTenantContext) {
    return upsertScopedRow(TEMPLATE_KEY, template, activeTenantContext, "message-template");
  },
  listJobs(activeTenantContext) {
    return listScopedRows(JOB_KEY, activeTenantContext);
  },
  saveJob(job, activeTenantContext) {
    return upsertScopedRow(JOB_KEY, job, activeTenantContext, "message-job");
  },
};
