import { CaptureRepository } from "../repositories/CaptureRepository.js";
import { CaptureValidator } from "../domain/chit/validators/CaptureValidator.js";

export function saveCaptureResult(capture, activeTenantContext) {
  const validation = CaptureValidator.validateCaptureFields(capture.fields || {});
  const record = CaptureRepository.save({
    ...capture,
    validation,
    status: validation.isValid ? "READY_FOR_REVIEW" : "NEEDS_OWNER_INPUT",
  }, activeTenantContext);
  return { record, validation };
}

export async function parseScheduleCaptureFile(file) {
  if (!file) return { rows: [], errors: ["File is required."], sourceType: "NONE" };
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "json") {
    const parsed = JSON.parse(await file.text());
    const rows = Array.isArray(parsed) ? parsed : parsed.schedule || [];
    return { rows: rows.map(mapScheduleRow), errors: [], sourceType: "JSON" };
  }
  if (extension === "csv") {
    const text = await file.text();
    return { rows: parseCsv(text).map(mapScheduleRow), errors: [], sourceType: "CSV" };
  }
  if (["xlsx", "xls"].includes(extension)) {
    return {
      rows: [],
      errors: ["XLSX parser is not connected in local mode. Save as CSV or enter values manually."],
      sourceType: "XLSX_MANUAL_FALLBACK",
    };
  }
  return {
    rows: [],
    errors: ["Image/PDF requires manual capture until OCR provider is connected."],
    sourceType: "MANUAL_CAPTURE",
  };
}

function parseCsv(text) {
  const [headerLine, ...lines] = String(text || "").split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(",").map((item) => item.trim());
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function mapScheduleRow(row, index = 0) {
  return {
    monthNumber: Number(row.monthNumber || row.month || index + 1),
    monthLabel: row.monthLabel || row.month_label || `Month ${Number(row.monthNumber || row.month || index + 1)}`,
    standardPayment: Number(row.standardPayment || row.monthlyPayment || row.payment || 0),
    nonLiftedPayment: Number(row.nonLiftedPayment || row.non_lifted_payment || row.payment || 0),
    liftedPayment: Number(row.liftedPayment || row.lifted_payment || row.payment || 0),
    prizeAmount: Number(row.prizeAmount || row.prize || 0),
    payoutAmount: Number(row.payoutAmount || row.payout || row.prizeAmount || 0),
    bidAmount: Number(row.bidAmount || row.bid || 0),
    bidPercentage: Number(row.bidPercentage || row.bid_percentage || 0),
    dividendPerMember: Number(row.dividendPerMember || row.dividend || 0),
    commissionValue: Number(row.commissionValue || row.commission || 0),
    dailyCollectionAmount: Number(row.dailyCollectionAmount || row.daily || 0),
    allocationType: row.allocationType || row.allocation || "NORMAL",
    winnerSelectionMode: row.winnerSelectionMode || row.winnerMode || "AUCTION",
    notes: row.notes || "",
    sourceType: "IMPORT",
    confidence: "MEDIUM",
    isUserConfirmed: false,
  };
}
