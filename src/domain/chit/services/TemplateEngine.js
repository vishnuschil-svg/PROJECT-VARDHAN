import { ChitTemplate } from "../entities/ChitTemplate.js";

export const TemplateEngine = {
  buildTemplate(input = {}) {
    return new ChitTemplate(input).toJSON();
  },

  versionTemplate(template = {}, patch = {}) {
    return new ChitTemplate({
      ...template,
      ...patch,
      id: patch.id || `${template.id || "template"}-v${Number(template.version || 1) + 1}`,
      version: Number(template.version || 1) + 1,
      status: "DRAFT",
      createdAt: template.createdAt,
      updatedAt: new Date().toISOString(),
    }).toJSON();
  },

  createGroupPayloadFromTemplate(template = {}, basic = {}) {
    const firstRow = template.schedule?.[0] || {};
    return {
      id: basic.id || `chit-${Date.now()}`,
      chit_name: basic.chitName || template.name,
      chit_code: basic.chitCode || `TPL-${Date.now()}`,
      chit_value: Number(basic.chitValue || firstRow.prizeAmount || firstRow.payoutAmount || 0),
      monthly_amount: Number(firstRow.standardPayment || firstRow.nonLiftedPayment || 0),
      total_members: Number(basic.totalMembers || basic.members || 0),
      total_months: Number(template.schedule?.length || basic.totalMonths || 0),
      status: "Upcoming",
      template_id: template.id,
      rule_set_version: template.ruleSet?.version || template.version || 1,
      schedule_driven: true,
    };
  },
};
