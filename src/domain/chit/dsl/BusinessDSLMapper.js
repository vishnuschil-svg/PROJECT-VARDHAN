import { validateDraft, VALIDATION_STATUS } from "../validation/ValidationService.js";
import {
  BUSINESS_DSL_STATUS,
  createBusinessDSLModel,
  createDSLField,
} from "./BusinessDSLModel.js";

const BUSINESS_FIELDS = Object.freeze([
  "chitName", "chitValue", "duration", "memberCount", "installmentPattern", "startDate", "endDate",
  "grossInstallment", "installmentMode", "foremanCommissionPercent",
  "minimumDiscountPercent", "maximumDiscountPercent", "prizeAmount",
  "auctionPattern", "organizerName", "contactNumber",
  "fractionalTicketInformation", "specialRules", "notes",
]);

const SCHEDULE_FIELDS = Object.freeze([
  "monthNumber", "standardPayment", "nonLiftedPayment", "liftedPayment", "prizeAmount",
  "commissionValue", "deposit", "dividendPerMember", "penalty", "bidAmount",
  "otherDeductions", "netAmount",
]);

export function mapDraftToBusinessDSL(draft) {
  const validation = validateDraft(draft);
  if (validation.status !== VALIDATION_STATUS.VALID) {
    return unsupported([...validation.errors, ...validation.warnings, ...validation.unsupportedRules]);
  }

  try {
    const model = createBusinessDSLModel({
      Business: mapBusiness(draft),
      Members: mapMembers(draft),
      Schedule: mapSchedule(draft),
      CollectionRule: {
        installmentPattern: businessField(draft, "installmentPattern"),
        monthlyValues: draft.schedule.map((row, index) => scheduleField(row, index, "standardPayment")),
      },
      LiftRule: {
        auction: primitiveField(draft, "bidRule"),
        prize: primitiveField(draft, "prizeRule"),
      },
      CommissionRule: { value: primitiveField(draft, "commission") },
      DividendRule: { value: primitiveField(draft, "dividend") },
      PenaltyRule: { value: primitiveField(draft, "penalty") },
      DepositRule: { value: primitiveField(draft, "deposit") },
      AfterLiftRule: { value: primitiveField(draft, "liftRule") },
    });

    return { status: BUSINESS_DSL_STATUS.SUCCESS, model, unsupportedRules: [] };
  } catch (error) {
    return unsupported([error?.message || "Draft could not be mapped to BusinessDSLModel."]);
  }
}

function mapBusiness(draft) {
  return Object.fromEntries(BUSINESS_FIELDS.map((field) => [field, businessField(draft, field)]));
}

function mapMembers(draft) {
  return (draft.members || []).map((member, index) => Object.fromEntries(
    Object.entries(member).map(([field, value]) => [
      field,
      createDSLField(`members[${index}].${field}`, member.confidence ?? draft.confidence?.members, value),
    ])
  ));
}

function mapSchedule(draft) {
  return draft.schedule.map((row, index) => Object.fromEntries(
    SCHEDULE_FIELDS.map((field) => [field, scheduleField(row, index, field)])
  ));
}

function businessField(draft, field) {
  const businessItem = draft.business[field] || { state: "NOT_FOUND", value: null };
  return createDSLField(
    `business.${field}`,
    draft.confidence?.business?.[field] ?? (businessItem.state === "OWNER_DEFINED" ? 1 : 0),
    businessItem.value
  );
}

function scheduleField(row, index, field) {
  return createDSLField(`schedule[${index}].${field}`, row.confidence, row[field]);
}

function primitiveField(draft, field) {
  const primitive = draft.financialPrimitives[field] || { state: "NOT_FOUND", value: null };
  return createDSLField(
    `financialPrimitives.${field}`,
    draft.confidence?.financialPrimitives?.[field] ?? (primitive.state === "OWNER_DEFINED" ? 1 : 0),
    primitive.value
  );
}

function unsupported(rules) {
  return {
    status: BUSINESS_DSL_STATUS.UNSUPPORTED_PATTERN,
    model: null,
    unsupportedRules: [...new Set(rules.filter(Boolean))],
  };
}

export const BusinessDSLMapper = Object.freeze({ map: mapDraftToBusinessDSL });
export default BusinessDSLMapper;
