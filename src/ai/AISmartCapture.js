import { createLocalAIProvider } from "./providers/localAIProvider.js";
import { AIChitPlanDesigner } from "./AIChitPlanDesigner.js";

const provider = createLocalAIProvider();

export const AISmartCapture = {
  async capture({ file, manualText = "" } = {}) {
    const result = await provider.extractChitPattern({ file, manualText });
    const fields = normalizeCapturedFields(result.fields);
    const plan = AIChitPlanDesigner.design({
      chitValue: fields.chitValue.value,
      members: fields.memberCount.value,
      duration: fields.duration.value,
      commission: fields.commission.value,
      auctionType: "Captured Pattern",
    });

    return {
      ...result,
      fields,
      lowConfidenceFields: Object.entries(fields)
        .filter(([, field]) => Number(field.confidence || 0) < 0.6)
        .map(([key]) => key),
      plan,
      validation: plan.validation,
    };
  },
};

function normalizeCapturedFields(fields = {}) {
  return {
    chitName: fields.chitName || { value: "", confidence: 0.2 },
    chitValue: fields.chitValue || { value: 0, confidence: 0.2 },
    memberCount: fields.memberCount || { value: 0, confidence: 0.2 },
    duration: fields.duration || { value: 0, confidence: 0.2 },
    monthlyPayment: fields.monthlyPayment || { value: 0, confidence: 0.2 },
    monthWisePattern: fields.monthWisePattern || { value: [], confidence: 0.2 },
    liftedAmounts: fields.liftedAmounts || { value: [], confidence: 0.2 },
    nonLiftedAmounts: fields.nonLiftedAmounts || { value: [], confidence: 0.2 },
    prizeAmount: fields.prizeAmount || { value: 0, confidence: 0.2 },
    commission: fields.commission || { value: 5, confidence: 0.2 },
    organiserDetails: fields.organiserDetails || { value: "", confidence: 0.2 },
    contactDetails: fields.contactDetails || { value: "", confidence: 0.2 },
  };
}
