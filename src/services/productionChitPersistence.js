/**
 * Production field maps and UUID helpers for MITRA NIDHI money-path entities.
 * Keeps Supabase payloads allowlisted to schema columns.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value || ""));
}

export function createEntityId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function toProductionMember(member = {}) {
  const payload = {
    group_id: member.group_id || member.chit_group_id,
    member_name: member.member_name || member.name || "",
    member_number: member.member_number || "",
    mobile_number: member.mobile_number || member.mobile || null,
    whatsapp_number: member.whatsapp_number || null,
    email: member.email || null,
    address: member.address || null,
    aadhaar_masked: member.aadhaar_masked || null,
    pan: member.pan || null,
    nominee_name: member.nominee_name || null,
    nominee_mobile: member.nominee_mobile || null,
    bank_name: member.bank_name || null,
    account_number_masked: member.account_number_masked || null,
    ifsc: member.ifsc || null,
    join_date: member.join_date || null,
    status: member.status || "active",
    metadata: {
      ...(member.metadata || {}),
      chit_group_id: member.chit_group_id || member.group_id,
    },
  };

  if (isUuid(member.id)) {
    payload.id = member.id;
  }

  return payload;
}

export function fromProductionMember(member = {}) {
  return {
    ...member,
    chit_group_id: member.chit_group_id || member.group_id || member.metadata?.chit_group_id,
    group_id: member.group_id || member.chit_group_id,
  };
}

export function toProductionCollection(collection = {}) {
  const receiptNo = collection.receipt_no || collection.receipt_number;
  const collectionDate = collection.collection_date || collection.payment_date;
  const payload = {
    group_id: collection.group_id || collection.chit_group_id,
    member_id: collection.member_id,
    collection_month: collection.collection_month,
    collection_date: collectionDate,
    installment_amount: Number(collection.installment_amount || 0),
    fine_amount: Number(collection.fine_amount || 0),
    discount_amount: Number(collection.discount_amount || 0),
    dividend_adjustment: Number(collection.dividend_adjustment || 0),
    paid_amount: Number(collection.paid_amount || 0),
    pending_amount: Number(collection.pending_amount || 0),
    payment_method: collection.payment_method || "Cash",
    collected_by: collection.collected_by || null,
    receipt_no: receiptNo,
    is_partial: Boolean(collection.is_partial),
    notes: collection.notes || null,
    status: collection.status || "posted",
    metadata: {
      ...(collection.metadata || {}),
      installment_month: collection.installment_month ?? collection.metadata?.installment_month,
      advance_amount: collection.advance_amount ?? collection.metadata?.advance_amount,
      payment_type: collection.payment_type ?? collection.metadata?.payment_type,
      chit_group_id: collection.chit_group_id || collection.group_id,
    },
  };

  if (isUuid(collection.id)) {
    payload.id = collection.id;
  }

  return payload;
}

export function fromProductionCollection(collection = {}) {
  return {
    ...collection,
    receipt_number: collection.receipt_number || collection.receipt_no,
    payment_date: collection.payment_date || collection.collection_date,
    chit_group_id: collection.chit_group_id || collection.group_id || collection.metadata?.chit_group_id,
    installment_month:
      collection.installment_month ?? collection.metadata?.installment_month ?? 1,
    advance_amount: collection.advance_amount ?? collection.metadata?.advance_amount ?? 0,
    payment_type: collection.payment_type ?? collection.metadata?.payment_type,
  };
}

export function toProductionReceipt(receipt = {}) {
  const payload = {
    collection_id: receipt.collection_id,
    group_id: receipt.group_id || receipt.chit_group_id,
    member_id: receipt.member_id,
    receipt_no: receipt.receipt_no || receipt.receipt_number,
    amount: Number(receipt.amount || receipt.amountPaid || 0),
    payment_date: receipt.payment_date || receipt.collection_date,
    payment_method: receipt.payment_method || receipt.paymentMode || "Cash",
    can_print_pdf: receipt.can_print_pdf !== false,
    can_print_whatsapp: receipt.can_print_whatsapp !== false,
    document_url: receipt.document_url || null,
    notes: receipt.notes || null,
    status: receipt.status || "ready",
    metadata: {
      ...(receipt.metadata || {}),
      receipt_model: receipt.receipt_model || receipt.metadata?.receipt_model,
    },
  };

  if (isUuid(receipt.id)) {
    payload.id = receipt.id;
  }

  return payload;
}

export function fromProductionReceipt(receipt = {}) {
  return {
    ...receipt,
    receipt_number: receipt.receipt_number || receipt.receipt_no,
  };
}

export function toProductionFinanceEntry(entry = {}) {
  const payload = {
    group_id: entry.group_id || null,
    member_id: entry.member_id || null,
    collection_id: entry.collection_id || null,
    receipt_no: entry.receipt_no || entry.receipt_number || null,
    entry_date: entry.entry_date || entry.date || new Date().toISOString().slice(0, 10),
    entry_type: entry.entry_type || entry.type || "income",
    category: entry.category || null,
    particulars: entry.particulars || null,
    description: entry.description || null,
    amount: Number(entry.amount || 0),
    cash_in: Number(entry.cash_in || entry.cashIn || 0),
    cash_out: Number(entry.cash_out || entry.cashOut || 0),
    bank_in: Number(entry.bank_in || entry.bankIn || 0),
    bank_out: Number(entry.bank_out || entry.bankOut || 0),
    balance: Number(entry.balance || 0),
    payment_mode: entry.payment_mode || entry.paymentMode || null,
    status: normalizeFinanceStatus(entry.status),
    metadata: entry.metadata || {},
  };

  if (isUuid(entry.id)) {
    payload.id = entry.id;
  }

  return payload;
}

export function fromProductionFinanceEntry(entry = {}) {
  return {
    ...entry,
    type: entry.type || entry.entry_type,
    date: entry.date || entry.entry_date,
    receipt_number: entry.receipt_number || entry.receipt_no,
  };
}

export function toProductionAuction(auction = {}) {
  const payload = {
    group_id: auction.group_id || auction.chit_group_id || auction.groupId,
    auction_month: Number(auction.auction_month || auction.monthNumber || auction.month_number || 0),
    auction_date: auction.auction_date || auction.event_date || null,
    winner_member_id: auction.winner_member_id || auction.winnerId || auction.member_id || null,
    bid_amount: Number(auction.bid_amount || auction.bidAmount || 0),
    lift_amount: Number(
      auction.lift_amount || auction.prize_amount || auction.prizeAmount || auction.payout_amount || 0
    ),
    dividend_amount: Number(auction.dividend_amount || auction.dividend || 0),
    participants: auction.participants || [],
    notes: auction.notes || null,
    status: auction.status || "CONFIRMED",
    metadata: {
      ...(auction.metadata || {}),
      bid_percentage: auction.bid_percentage ?? auction.bidPercentage ?? auction.metadata?.bid_percentage,
      prize_amount: auction.prize_amount ?? auction.prizeAmount ?? auction.metadata?.prize_amount,
      payout_amount: auction.payout_amount ?? auction.payoutAmount ?? auction.metadata?.payout_amount,
      commission_amount:
        auction.commission_amount ?? auction.commission ?? auction.metadata?.commission_amount,
      organizer_profit:
        auction.organizer_profit ?? auction.organizerProfit ?? auction.metadata?.organizer_profit,
      idempotency_key: auction.idempotency_key || auction.metadata?.idempotency_key,
    },
  };
  if (isUuid(auction.id)) payload.id = auction.id;
  return payload;
}

export function fromProductionAuction(auction = {}) {
  return {
    ...auction,
    chit_group_id: auction.chit_group_id || auction.group_id,
    bid_percentage: auction.bid_percentage ?? auction.metadata?.bid_percentage,
    prize_amount: auction.prize_amount ?? auction.metadata?.prize_amount ?? auction.lift_amount,
    payout_amount: auction.payout_amount ?? auction.metadata?.payout_amount ?? auction.lift_amount,
    commission_amount: auction.commission_amount ?? auction.metadata?.commission_amount,
    organizer_profit: auction.organizer_profit ?? auction.metadata?.organizer_profit,
    dividend: auction.dividend ?? auction.dividend_amount,
  };
}

export function toProductionLuckyDraw(draw = {}) {
  const payload = {
    group_id: draw.group_id || draw.chit_group_id || draw.groupId,
    draw_month: Number(draw.draw_month || draw.monthNumber || draw.month_number || 1),
    draw_date: draw.draw_date || draw.event_date || null,
    winner_member_id: draw.winner_member_id || draw.memberId || draw.member_id || null,
    prize_amount: Number(draw.prize_amount || draw.prizeAmount || draw.payout_amount || 0),
    participants: draw.participants || [],
    notes: draw.notes || null,
    status: draw.status || "CONFIRMED",
    metadata: {
      ...(draw.metadata || {}),
      random_value: draw.random_value ?? draw.randomValue ?? draw.metadata?.random_value,
      winner_index: draw.winner_index ?? draw.winnerIndex ?? draw.metadata?.winner_index,
      deterministic_seed:
        draw.deterministic_seed ?? draw.deterministicSeed ?? draw.metadata?.deterministic_seed,
      draw_number: draw.draw_number || draw.metadata?.draw_number,
      idempotency_key: draw.idempotency_key || draw.metadata?.idempotency_key,
      payout_amount: draw.payout_amount ?? draw.payoutAmount ?? draw.metadata?.payout_amount,
    },
  };
  if (isUuid(draw.id)) payload.id = draw.id;
  return payload;
}

export function fromProductionLuckyDraw(draw = {}) {
  return {
    ...draw,
    chit_group_id: draw.chit_group_id || draw.group_id,
    monthNumber: draw.monthNumber || draw.draw_month,
    memberId: draw.memberId || draw.winner_member_id,
    random_value: draw.random_value ?? draw.metadata?.random_value,
    winner_index: draw.winner_index ?? draw.metadata?.winner_index,
    payout_amount: draw.payout_amount ?? draw.metadata?.payout_amount ?? draw.prize_amount,
  };
}

export function toProductionWinner(winner = {}) {
  const payload = {
    group_id: winner.group_id || winner.groupId || winner.chit_group_id,
    member_id: winner.member_id || winner.memberId || winner.winner_member_id,
    auction_id: isUuid(winner.auction_id || winner.auctionId) ? winner.auction_id || winner.auctionId : null,
    lucky_draw_id: isUuid(winner.lucky_draw_id || winner.luckyDrawId)
      ? winner.lucky_draw_id || winner.luckyDrawId
      : null,
    month_number: Number(winner.month_number || winner.monthNumber || 1),
    winner_mode: winner.winner_mode || winner.winnerMode || "AUCTION",
    bid_amount: Number(winner.bid_amount || winner.bidAmount || 0),
    bid_percentage: Number(winner.bid_percentage || winner.bidPercentage || 0),
    prize_amount: Number(winner.prize_amount || winner.prizeAmount || 0),
    payout_amount: Number(winner.payout_amount || winner.payoutAmount || 0),
    dividend_amount: Number(winner.dividend_amount || winner.dividend || 0),
    commission_amount: Number(winner.commission_amount || winner.commission || 0),
    organizer_profit: Number(winner.organizer_profit || winner.organizerProfit || 0),
    status: winner.status || "CONFIRMED",
    confirmed_by: winner.confirmed_by || winner.confirmedBy || null,
    confirmed_at: winner.confirmed_at || winner.confirmedAt || null,
    cancelled_by: winner.cancelled_by || winner.cancelledBy || null,
    cancelled_at: winner.cancelled_at || winner.cancelledAt || null,
    cancellation_reason: winner.cancellation_reason || winner.cancellationReason || null,
    metadata: {
      ...(winner.metadata || {}),
      idempotency_key: winner.idempotency_key || winner.metadata?.idempotency_key,
      is_winner_locked: true,
      workspace_id: winner.workspaceId || winner.workspace_id || winner.metadata?.workspace_id,
    },
  };
  if (isUuid(winner.id)) payload.id = winner.id;
  return payload;
}

export function fromProductionWinner(winner = {}) {
  return {
    ...winner,
    id: winner.id,
    tenantId: winner.tenantId || winner.tenant_id,
    groupId: winner.groupId || winner.group_id,
    group_id: winner.group_id || winner.groupId,
    memberId: winner.memberId || winner.member_id,
    member_id: winner.member_id || winner.memberId,
    monthNumber: winner.monthNumber || winner.month_number,
    winnerMode: winner.winnerMode || winner.winner_mode,
    bidAmount: winner.bidAmount ?? winner.bid_amount,
    bidPercentage: winner.bidPercentage ?? winner.bid_percentage,
    prizeAmount: winner.prizeAmount ?? winner.prize_amount,
    payoutAmount: winner.payoutAmount ?? winner.payout_amount,
    dividend: winner.dividend ?? winner.dividend_amount,
    commission: winner.commission ?? winner.commission_amount,
    organizerProfit: winner.organizerProfit ?? winner.organizer_profit,
    status: winner.status,
    confirmedBy: winner.confirmedBy || winner.confirmed_by,
    confirmedAt: winner.confirmedAt || winner.confirmed_at,
    createdAt: winner.createdAt || winner.created_at,
    updatedAt: winner.updatedAt || winner.updated_at,
  };
}

export function toProductionPayout(plan = {}) {
  const total = Number(plan.payout_amount || plan.totalPayout || plan.total_payout || 0);
  const paid = Number(plan.paid_amount || plan.paidAmount || 0);
  const payload = {
    group_id: plan.group_id || plan.groupId,
    member_id: plan.member_id || plan.memberId || null,
    auction_id: isUuid(plan.auction_id || plan.auctionId) ? plan.auction_id || plan.auctionId : null,
    winner_id: isUuid(plan.winner_id || plan.winnerId || plan.winnerResultId)
      ? plan.winner_id || plan.winnerId || plan.winnerResultId
      : null,
    payout_month: Number(plan.payout_month || plan.monthNumber || plan.month_number || 1),
    payout_date: plan.payout_date || plan.payoutDate || null,
    payout_amount: total,
    payment_method: plan.payment_method || plan.paymentMethod || "Cash",
    paid_amount: paid,
    balance_amount: Number(plan.balance_amount ?? Math.max(total - paid, 0)),
    reference_no: plan.reference_no || plan.referenceNo || plan.payment_reference || null,
    notes: plan.notes || null,
    status: plan.status || "PENDING",
    metadata: {
      ...(plan.metadata || {}),
      payout_mode: plan.payoutMode || plan.payout_mode || plan.metadata?.payout_mode,
      installment_count: plan.installmentCount ?? plan.installment_count,
      installment_schedule: plan.installmentSchedule || plan.installment_schedule || [],
      idempotency_key: plan.idempotency_key || plan.metadata?.idempotency_key,
      winner_result_id: plan.winnerResultId || plan.winner_result_id,
    },
  };
  if (isUuid(plan.id)) payload.id = plan.id;
  return payload;
}

export function fromProductionPayout(plan = {}) {
  return {
    ...plan,
    id: plan.id,
    groupId: plan.groupId || plan.group_id,
    group_id: plan.group_id || plan.groupId,
    memberId: plan.memberId || plan.member_id,
    member_id: plan.member_id || plan.memberId,
    winnerId: plan.winnerId || plan.winner_id,
    winner_id: plan.winner_id || plan.winnerId,
    winnerResultId: plan.winnerResultId || plan.winner_id,
    totalPayout: plan.totalPayout ?? plan.payout_amount,
    paidAmount: plan.paidAmount ?? plan.paid_amount,
    pendingAmount: plan.pendingAmount ?? plan.balance_amount,
    payoutMode: plan.payoutMode || plan.metadata?.payout_mode || "FULL",
    installmentCount: plan.installmentCount ?? plan.metadata?.installment_count ?? 0,
    installmentSchedule: plan.installmentSchedule || plan.metadata?.installment_schedule || [],
    reference_no: plan.reference_no,
    status: plan.status,
  };
}

export function toProductionLedgerEntry(entry = {}) {
  const payload = {
    group_id: entry.group_id || entry.groupId || null,
    member_id: entry.member_id || entry.memberId || null,
    collection_id: isUuid(entry.collection_id) ? entry.collection_id : null,
    entry_type: entry.entry_type || entry.type || "adjustment",
    entry_date: entry.entry_date || entry.date || new Date().toISOString().slice(0, 10),
    amount: Number(entry.amount || 0),
    description: entry.description || null,
    reference_no: entry.reference_no || entry.referenceNo || null,
    status: entry.status || "posted",
  };
  if (isUuid(entry.id)) payload.id = entry.id;
  return payload;
}

export function fromProductionLedgerEntry(entry = {}) {
  return {
    ...entry,
    type: entry.type || entry.entry_type,
    date: entry.date || entry.entry_date,
    referenceNo: entry.referenceNo || entry.reference_no,
  };
}

function normalizeFinanceStatus(status) {
  const value = String(status || "posted").trim().toLowerCase();
  if (value === "obligation") return "obligation";
  if (value === "void" || value === "cancelled") return "void";
  return "posted";
}
