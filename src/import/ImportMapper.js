export const IMPORT_FIELD_SCHEMAS = {
  Members: {
    required: ["member_name", "mobile_number"],
    optional: ["member_number", "whatsapp_number", "email", "aadhaar_masked", "pan", "chit_group_id", "join_date", "status"],
    aliases: {
      member_name: ["member name", "name", "customer name", "subscriber"],
      member_number: ["member no", "member number", "subscriber no"],
      mobile_number: ["mobile", "phone", "mobile number", "contact"],
      whatsapp_number: ["whatsapp", "whatsapp number"],
      email: ["email", "email id"],
      aadhaar_masked: ["aadhaar", "aadhar", "aadhaar number"],
      pan: ["pan", "pan number"],
      chit_group_id: ["group", "group id", "chit group"],
      join_date: ["join date", "joined", "date"],
      status: ["status"],
    },
  },
  "Chit Groups": {
    required: ["chit_name", "monthly_amount", "total_members"],
    optional: ["chit_code", "chit_value", "total_months", "start_date", "status"],
    aliases: {
      chit_name: ["chit name", "group name", "name"],
      chit_code: ["chit code", "group code", "code"],
      chit_value: ["chit value", "value", "amount"],
      monthly_amount: ["monthly amount", "installment", "installment amount"],
      total_members: ["members", "total members", "count"],
      total_months: ["months", "total months"],
      start_date: ["start date", "date"],
      status: ["status"],
    },
  },
  Collections: {
    required: ["member_id", "paid_amount"],
    optional: ["receipt_number", "group_id", "collection_month", "payment_method", "pending_amount", "payment_date"],
    aliases: {
      member_id: ["member", "member id", "member number"],
      paid_amount: ["paid", "paid amount", "amount", "collection"],
      receipt_number: ["receipt", "receipt number", "receipt no"],
      group_id: ["group", "group id", "chit group"],
      collection_month: ["month", "collection month"],
      payment_method: ["mode", "payment mode", "payment method"],
      pending_amount: ["pending", "pending amount", "balance"],
      payment_date: ["date", "payment date"],
    },
  },
  Receipts: {
    required: ["receipt_number", "amount"],
    optional: ["member_id", "group_id", "payment_date", "payment_method", "notes"],
    aliases: {
      receipt_number: ["receipt", "receipt no", "receipt number"],
      amount: ["amount", "paid", "paid amount"],
      member_id: ["member", "member id"],
      group_id: ["group", "group id"],
      payment_date: ["date", "payment date"],
      payment_method: ["mode", "payment mode"],
      notes: ["notes", "remarks"],
    },
  },
  Finance: {
    required: ["type", "amount"],
    optional: ["date", "category", "particulars", "payment_mode", "status"],
    aliases: {
      type: ["type", "entry type"],
      amount: ["amount", "value"],
      date: ["date"],
      category: ["category"],
      particulars: ["particulars", "description", "details"],
      payment_mode: ["mode", "payment mode"],
      status: ["status"],
    },
  },
  Auctions: {
    required: ["chit_group_id", "auction_date"],
    optional: ["auction_month", "winner_member_id", "bid_amount", "lift_amount", "status"],
    aliases: {
      chit_group_id: ["group", "group id", "chit group"],
      auction_date: ["auction date", "date"],
      auction_month: ["month", "auction month"],
      winner_member_id: ["winner", "winner member", "member"],
      bid_amount: ["bid", "bid amount"],
      lift_amount: ["lift", "lift amount"],
      status: ["status"],
    },
  },
};

export function detectMappedFields(headers = [], importType = "Members") {
  const schema = IMPORT_FIELD_SCHEMAS[importType] || IMPORT_FIELD_SCHEMAS.Members;
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  return [...schema.required, ...schema.optional].reduce((mapped, field) => {
    const aliases = [field, ...(schema.aliases[field] || [])].map(normalizeHeader);
    const match = normalizedHeaders.find((header) => aliases.includes(header.normalized));

    if (match) {
      mapped[field] = match.original;
    }

    return mapped;
  }, {});
}

export function mapRows(rows = [], mappedFields = {}) {
  return rows.map((row, index) => ({
    rowNumber: index + 1,
    source: row,
    data: Object.entries(mappedFields).reduce((mappedRow, [targetField, sourceField]) => {
      mappedRow[targetField] = row[sourceField];
      return mappedRow;
    }, {}),
  }));
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}
