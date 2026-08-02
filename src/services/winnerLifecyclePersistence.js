import { createRepositoryProvider } from "../repositories/repositoryProvider.js";
import { resolveRepositoryBackend, REPOSITORY_BACKENDS } from "../config/repositoryBackend.js";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase/SupabaseClient.js";
import { AuctionRepository as LocalAuctionFacade } from "../repositories/AuctionRepository.js";
import { LuckyDrawRepository as LocalLuckyDrawRepository } from "../repositories/LuckyDrawRepository.js";
import { PayoutRepository as LocalPayoutRepository } from "../repositories/PayoutRepository.js";
import { WinnerRepository as LocalWinnerRepository } from "../repositories/WinnerRepository.js";
import { LedgerRepository as LocalLedgerRepository } from "../repositories/LedgerRepository.js";
import {
  createEntityId,
  fromProductionAuction,
  fromProductionLedgerEntry,
  fromProductionLuckyDraw,
  fromProductionPayout,
  fromProductionWinner,
  isUuid,
  toProductionAuction,
  toProductionLedgerEntry,
  toProductionLuckyDraw,
  toProductionPayout,
  toProductionWinner,
} from "./productionChitPersistence.js";

function isLocalMode(env = import.meta.env) {
  return resolveRepositoryBackend(env) === REPOSITORY_BACKENDS.LOCAL;
}

function requireTenant(activeTenantContext = {}) {
  const tenant_id = activeTenantContext.tenant_id || activeTenantContext.tenantId || "";
  const data_scope = activeTenantContext.data_scope || activeTenantContext.dataScope || "";
  if (!tenant_id || !data_scope) {
    throw new Error("Active tenant context is required.");
  }
  return { tenant_id, data_scope };
}

export async function listAuctionsPersistent(activeTenantContext) {
  if (isLocalMode()) {
    return LocalAuctionFacade.list(activeTenantContext).map(fromProductionAuction);
  }
  const result = await createRepositoryProvider().AuctionRepository.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  });
  if (!result.success) throw new Error(result.message || "Auctions could not be loaded.");
  return (result.data || []).map(fromProductionAuction);
}

export async function listLuckyDrawsPersistent(activeTenantContext) {
  if (isLocalMode()) {
    return LocalLuckyDrawRepository.list(activeTenantContext).map(fromProductionLuckyDraw);
  }
  const result = await createRepositoryProvider().LuckyDrawsRepository.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  });
  if (!result.success) throw new Error(result.message || "Lucky draws could not be loaded.");
  return (result.data || []).map(fromProductionLuckyDraw);
}

export async function listWinnersPersistent(activeTenantContext) {
  if (isLocalMode()) {
    return LocalWinnerRepository.list(activeTenantContext).map(fromProductionWinner);
  }
  const result = await createRepositoryProvider().WinnersRepository.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  });
  if (!result.success) throw new Error(result.message || "Winners could not be loaded.");
  return (result.data || []).map(fromProductionWinner);
}

export async function listPayoutsPersistent(activeTenantContext) {
  if (isLocalMode()) {
    return LocalPayoutRepository.list(activeTenantContext).map(fromProductionPayout);
  }
  const result = await createRepositoryProvider().PayoutRepository.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  });
  if (!result.success) throw new Error(result.message || "Payouts could not be loaded.");
  return (result.data || []).map(fromProductionPayout);
}

export async function listLedgerEntriesPersistent(activeTenantContext) {
  if (isLocalMode()) {
    return LocalLedgerRepository.listLedgerEntries(activeTenantContext).map(fromProductionLedgerEntry);
  }
  const result = await createRepositoryProvider().LedgerRepository.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  });
  if (!result.success) throw new Error(result.message || "Ledger entries could not be loaded.");
  return (result.data || []).map(fromProductionLedgerEntry);
}

export async function saveLedgerEntryPersistent(entry, activeTenantContext) {
  if (isLocalMode()) {
    return fromProductionLedgerEntry(
      LocalLedgerRepository.saveLedgerEntry(toProductionLedgerEntry(entry), activeTenantContext)
    );
  }
  const payload = toProductionLedgerEntry({
    ...entry,
    id: isUuid(entry?.id) ? entry.id : createEntityId(),
  });
  const result = await createRepositoryProvider().LedgerRepository.create(payload, {
    activeTenantContext,
  });
  if (!result.success) {
    if (/duplicate|unique/i.test(String(result.message || ""))) {
      const existing = await listLedgerEntriesPersistent(activeTenantContext);
      const match = existing.find((row) => row.reference_no === payload.reference_no);
      if (match) return match;
    }
    throw new Error(result.message || "Ledger entry could not be saved.");
  }
  return fromProductionLedgerEntry(result.data);
}

export async function confirmWinnerEventPersistent(payload, activeTenantContext) {
  const scope = requireTenant(activeTenantContext);
  const idempotencyKey =
    payload.idempotency_key ||
    `winner:${scope.tenant_id}:${scope.data_scope}:${payload.group_id}:${payload.month_number}:${payload.event_type}`;

  if (isLocalMode()) {
    return confirmWinnerEventLocal({ ...payload, idempotency_key: idempotencyKey }, activeTenantContext);
  }

  if (!isSupabaseConfigured) {
    throw new Error("Supabase is required for production winner confirmation.");
  }

  const client = getSupabaseClient();
  const { data, error } = await client.rpc("confirm_chit_winner_event", {
    p_payload: {
      ...payload,
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      idempotency_key: idempotencyKey,
    },
  });

  if (error) {
    throw new Error(error.message || "Winner confirmation failed.");
  }

  const winners = await listWinnersPersistent(activeTenantContext);
  const winner =
    winners.find((row) => row.id === data?.winner_id) ||
    winners.find((row) => row.metadata?.idempotency_key === idempotencyKey);

  const auctions = await listAuctionsPersistent(activeTenantContext);
  const draws = await listLuckyDrawsPersistent(activeTenantContext);
  const payouts = await listPayoutsPersistent(activeTenantContext);

  return {
    success: true,
    idempotent: Boolean(data?.idempotent),
    winner: winner || null,
    auction: auctions.find((row) => row.id === data?.auction_id) || null,
    draw: draws.find((row) => row.id === data?.lucky_draw_id) || null,
    payout: payouts.find((row) => row.id === data?.payout_id) || null,
    rpc: data,
    message: data?.idempotent
      ? "Winner confirmation already applied."
      : "Winner confirmed and durable records saved.",
  };
}

export async function recordPayoutPaymentPersistent(plan, amount, paymentMode, activeTenantContext, options = {}) {
  const scope = requireTenant(activeTenantContext);
  const paymentReference =
    options.paymentReference || `payref:${plan.id}:${Number(plan.paidAmount || plan.paid_amount || 0)}:${amount}`;
  const idempotencyKey = options.idempotencyKey || `payout-pay:${plan.id}:${paymentReference}`;

  if (isLocalMode()) {
    return recordPayoutPaymentLocal(plan, amount, paymentMode, activeTenantContext, {
      paymentReference,
      idempotencyKey,
    });
  }

  if (!isSupabaseConfigured) {
    throw new Error("Supabase is required for production payout payments.");
  }

  const client = getSupabaseClient();
  const { data, error } = await client.rpc("record_chit_payout_payment", {
    p_payload: {
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      payout_id: plan.id,
      amount: Number(amount || 0),
      payment_method: paymentMode,
      payment_reference: paymentReference,
      idempotency_key: idempotencyKey,
      description: options.description || "Winner payout payment",
    },
  });

  if (error) {
    throw new Error(error.message || "Payout payment failed.");
  }

  const payouts = await listPayoutsPersistent(activeTenantContext);
  const updated = payouts.find((row) => row.id === (data?.payout_id || plan.id)) || plan;
  return {
    success: true,
    idempotent: Boolean(data?.idempotent),
    payout: fromProductionPayout(updated),
    rpc: data,
  };
}

export async function cancelWinnerEventPersistent(payload, activeTenantContext) {
  const scope = requireTenant(activeTenantContext);

  if (isLocalMode()) {
    const winners = LocalWinnerRepository.list(activeTenantContext).map(fromProductionWinner);
    const existing = winners.find((row) => row.id === payload.winner_id);
    if (!existing) throw new Error("Winner was not found.");
    if (String(existing.status || "").toUpperCase() === "CANCELLED") {
      return { success: true, idempotent: true, winner: existing };
    }
    const cancelled = fromProductionWinner(
      LocalWinnerRepository.save(
        {
          ...existing,
          status: "CANCELLED",
          cancelledBy: payload.cancelled_by,
          cancelled_by: payload.cancelled_by,
          cancelledAt: new Date().toISOString(),
          cancelled_at: new Date().toISOString(),
          cancellationReason: payload.reason,
          cancellation_reason: payload.reason,
        },
        activeTenantContext
      )
    );
    return { success: true, idempotent: false, winner: cancelled };
  }

  if (!isSupabaseConfigured) {
    throw new Error("Supabase is required for production winner correction.");
  }

  const client = getSupabaseClient();
  const { data, error } = await client.rpc("cancel_chit_winner_event", {
    p_payload: {
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      winner_id: payload.winner_id,
      reason: payload.reason,
      cancelled_by: payload.cancelled_by,
    },
  });
  if (error) throw new Error(error.message || "Winner correction failed.");

  const winners = await listWinnersPersistent(activeTenantContext);
  return {
    success: true,
    idempotent: Boolean(data?.idempotent),
    winner: winners.find((row) => row.id === payload.winner_id) || null,
    rpc: data,
  };
}

async function confirmWinnerEventLocal(payload, activeTenantContext) {
  const winners = LocalWinnerRepository.list(activeTenantContext).map(fromProductionWinner);
  const existingByKey = winners.find(
    (row) => (row.metadata?.idempotency_key || row.idempotency_key) === payload.idempotency_key
  );
  if (existingByKey) {
    return {
      success: true,
      idempotent: true,
      winner: existingByKey,
      auction: null,
      draw: null,
      payout: null,
      message: "Winner confirmation already applied.",
    };
  }

  const duplicate = winners.find(
    (row) =>
      (row.groupId || row.group_id) === payload.group_id &&
      Number(row.monthNumber || row.month_number) === Number(payload.month_number) &&
      String(row.status || "").toUpperCase() !== "CANCELLED"
  );
  if (duplicate) {
    throw new Error("A winner is already locked for this chit month.");
  }

  let auction = null;
  let draw = null;
  if (payload.event_type === "AUCTION") {
    auction = fromProductionAuction(
      LocalAuctionFacade.save(
        toProductionAuction({
          id: createEntityId(),
          group_id: payload.group_id,
          auction_month: payload.month_number,
          auction_date: payload.event_date,
          winner_member_id: payload.member_id,
          bid_amount: payload.bid_amount,
          prize_amount: payload.prize_amount,
          payout_amount: payload.payout_amount,
          dividend_amount: payload.dividend_amount,
          commission_amount: payload.commission_amount,
          organizer_profit: payload.organizer_profit,
          bid_percentage: payload.bid_percentage,
          status: "CONFIRMED",
          idempotency_key: payload.idempotency_key,
          metadata: payload.event_metadata,
        }),
        activeTenantContext
      )
    );
  } else {
    draw = fromProductionLuckyDraw(
      LocalLuckyDrawRepository.save(
        toProductionLuckyDraw({
          id: createEntityId(),
          group_id: payload.group_id,
          draw_month: payload.month_number,
          draw_date: payload.event_date,
          winner_member_id: payload.member_id,
          prize_amount: payload.prize_amount,
          payout_amount: payload.payout_amount,
          status: "CONFIRMED",
          random_value: payload.random_value,
          winner_index: payload.winner_index,
          deterministic_seed: payload.deterministic_seed,
          idempotency_key: payload.idempotency_key,
          metadata: payload.event_metadata,
        }),
        activeTenantContext
      )
    );
  }

  const winner = fromProductionWinner(
    LocalWinnerRepository.save(
      toProductionWinner({
        id: createEntityId(),
        group_id: payload.group_id,
        member_id: payload.member_id,
        auction_id: auction?.id,
        lucky_draw_id: draw?.id,
        month_number: payload.month_number,
        winner_mode: payload.winner_mode || payload.event_type,
        bid_amount: payload.bid_amount,
        bid_percentage: payload.bid_percentage,
        prize_amount: payload.prize_amount,
        payout_amount: payload.payout_amount,
        dividend_amount: payload.dividend_amount,
        commission_amount: payload.commission_amount,
        organizer_profit: payload.organizer_profit,
        status: "CONFIRMED",
        confirmed_by: payload.confirmed_by,
        confirmed_at: new Date().toISOString(),
        idempotency_key: payload.idempotency_key,
        metadata: payload.winner_metadata,
      }),
      activeTenantContext
    )
  );

  const { saveFinanceEntryPersistent } = await import("./chitDataService.js");
  await saveFinanceEntryPersistent(
    {
      id: createEntityId(),
      type: "payout_obligation",
      entry_type: "payout_obligation",
      category: payload.event_type,
      particulars: payload.finance_particulars,
      description: payload.finance_description || "Winner payout obligation",
      amount: payload.payout_amount,
      bank_out: payload.payout_amount,
      payment_mode: "Pending",
      status: "Obligation",
      group_id: payload.group_id,
      member_id: payload.member_id,
      metadata: { winner_id: winner.id, idempotency_key: `${payload.idempotency_key}:finance` },
    },
    activeTenantContext
  );

  await saveLedgerEntryPersistent(
    {
      id: createEntityId(),
      group_id: payload.group_id,
      member_id: payload.member_id,
      entry_type: "winner_lift",
      amount: payload.payout_amount,
      description: payload.ledger_description || "Winner lift / payout obligation",
      reference_no: `winner:${winner.id}`,
    },
    activeTenantContext
  );

  let payout = null;
  if (payload.create_payout_plan !== false) {
    payout = fromProductionPayout(
      LocalPayoutRepository.save(
        toProductionPayout({
          id: createEntityId(),
          group_id: payload.group_id,
          member_id: payload.member_id,
          auction_id: auction?.id,
          winner_id: winner.id,
          payout_month: payload.month_number,
          payout_amount: payload.payout_amount,
          paid_amount: 0,
          status: "PENDING",
          reference_no: `payout-plan:${winner.id}`,
          idempotency_key: `${payload.idempotency_key}:payout`,
        }),
        activeTenantContext
      )
    );
  }

  return {
    success: true,
    idempotent: false,
    winner,
    auction,
    draw,
    payout,
    message: "Winner confirmed and durable records saved.",
  };
}

async function recordPayoutPaymentLocal(plan, amount, paymentMode, activeTenantContext, options) {
  const existingFinanceKey = options.idempotencyKey;
  const ledger = LocalLedgerRepository.listLedgerEntries(activeTenantContext);
  const alreadyPaid = ledger.some(
    (row) =>
      row.reference_no === options.paymentReference ||
      row.metadata?.idempotency_key === existingFinanceKey
  );

  const { PayoutEngine } = await import("../domain/chit/services/PayoutEngine.js");
  const updated = fromProductionPayout(
    LocalPayoutRepository.save(PayoutEngine.applyPayment(plan, amount), activeTenantContext)
  );

  if (!alreadyPaid) {
    const isBank = !["CASH"].includes(String(paymentMode || "").toUpperCase());
    const { saveFinanceEntryPersistent } = await import("./chitDataService.js");
    await saveFinanceEntryPersistent(
      {
        id: createEntityId(),
        type: "payout",
        entry_type: "payout",
        category: "Winner Payout",
        amount: Number(amount || 0),
        cash_out: isBank ? 0 : Number(amount || 0),
        bank_out: isBank ? Number(amount || 0) : 0,
        payment_mode: paymentMode,
        status: "Posted",
        group_id: updated.group_id || updated.groupId,
        member_id: updated.member_id || updated.memberId,
        metadata: {
          payout_plan_id: updated.id,
          idempotency_key: options.idempotencyKey,
          payment_reference: options.paymentReference,
        },
      },
      activeTenantContext
    );
    await saveLedgerEntryPersistent(
      {
        id: createEntityId(),
        group_id: updated.group_id || updated.groupId,
        member_id: updated.member_id || updated.memberId,
        entry_type: "payout",
        amount: Number(amount || 0),
        description: "Winner payout payment",
        reference_no: options.paymentReference,
      },
      activeTenantContext
    );
  }

  return {
    success: true,
    idempotent: alreadyPaid,
    payout: updated,
  };
}

export function assertOperatorRole(permissions = {}, profile = {}, role = "") {
  const elevated =
    permissions?.isPlatformOwner ||
    permissions?.actions?.manage_chits ||
    permissions?.actions?.confirm_winner ||
    ["owner", "admin", "operator", "platform_owner"].includes(
      String(role || profile?.role || "").toLowerCase()
    );
  if (permissions?.actions?.confirm_winner === false || permissions?.actions?.manage_chits === false) {
    return false;
  }
  if (permissions && Object.keys(permissions).length && !elevated && permissions.actions) {
    return Boolean(permissions.actions.confirm_winner || permissions.actions.manage_chits);
  }
  return true;
}
