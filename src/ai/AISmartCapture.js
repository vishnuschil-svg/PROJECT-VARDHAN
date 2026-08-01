import { createLocalAIProvider } from "./providers/localAIProvider.js";
import { ExternalOCRProviderAdapter } from "./providers/ExternalOCRProviderAdapter.js";
import { AIChitPlanDesigner } from "./AIChitPlanDesigner.js";

export const AISmartCapture = {
  async capture({ file, manualText = "", activeTenantContext } = {}) {
    console.log("[AISmartCapture] capture called, file:", file?.name, "manualText length:", manualText.length, "workspaceId:", activeTenantContext?.workspaceId);
    let provider;
    let result;

    // Always try external OCR provider first if file is provided
    // This ensures the backend receives the POST request even if the provider is not fully configured
    if (file) {
      try {
        console.log("[AISmartCapture] Attempting external OCR provider with workspaceId:", activeTenantContext?.workspaceId);
        provider = ExternalOCRProviderAdapter;
        result = await provider.extract(file, {
          documentType: "CHIT_REGISTER",
          workspaceId: activeTenantContext?.workspaceId
        });
        console.log("[AISmartCapture] External OCR provider succeeded");
      } catch (error) {
        // Fall back to local provider on any OCR errors (including configuration errors)
        console.warn("[AISmartCapture] External OCR provider failed, falling back to local:", error.message);
        provider = createLocalAIProvider();
        result = await provider.extractChitPattern({ file, manualText });
      }
    } else {
      // Use local provider for manual text only
      console.log("[AISmartCapture] Using local provider for manual text");
      provider = createLocalAIProvider();
      result = await provider.extractChitPattern({ file, manualText });
    }

    const fields = normalizeCapturedFields(result.fields);
    const plan = AIChitPlanDesigner.design({
      chitValue: fields.chitValue.value,
      members: fields.memberCount.value,
      duration: fields.duration.value,
      commission: fields.commission.value,
      auctionType: "Captured Pattern",
    });

    console.log("[AISmartCapture] Returning result with fields:", Object.keys(fields));
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
