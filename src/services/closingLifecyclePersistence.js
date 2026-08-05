import { createRepositoryProvider } from "../repositories/repositoryProvider.js";
import { resolveRepositoryBackend, REPOSITORY_BACKENDS } from "../config/repositoryBackend.js";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase/SupabaseClient.js";
import { DividendRepository as LocalDividendRepository } from "../repositories/DividendRepository.js";
import { ExpenseRepository as LocalExpenseRepository } from "../repositories/ExpenseRepository.js";
import { MonthClosingRepository as LocalMonthClosingRepository } from "../repositories/MonthClosingRepository.js";
import { ChitCompletionRepository as LocalCompletionRepository } from "../repositories/ChitCompletionRepository.js";
import { GroupsRepository as LocalGroupsRepository } from "../repositories/chits/GroupsRepository.js";
import { FinanceRepository as LocalFinanceRepository } from "../repositories/chits/FinanceRepository.js";
import { LedgerRepository as LocalLedgerRepository } from "../repositories/LedgerRepository.js";
import { DividendEngine } from "../domain/chit/services/DividendEngine.js";
import { Expense } from "../domain/chit/entities/Expense.js";
import {
  createEntityId,
  fromProductionCompletion,
  fromProductionDividend,
  fromProductionExpense,
  fromProductionMonthClosing,
  isUuid,
  toProductionDividend,
  toProductionExpense,
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

export function assertExpenseAuthorized(permissions = {}, profile = {}, role = "") {
  const elevated =
    permissions?.isPlatformOwner ||
    permissions?.actions?.manage_chits ||
    permissions?.actions?.manage_expenses ||
    ["owner", "admin", "operator", "platform_owner"].includes(
      String(role || profile?.role || "").toLowerCase()
    );
  if (permissions?.actions?.manage_expenses === false || permissions?.actions?.manage_chits === false) {
    return false;
  }
  if (permissions && Object.keys(permissions).length && permissions.actions && !elevated) {
    return Boolean(permissions.actions.manage_expenses || permissions.actions.manage_chits);
  }
  return true;
}

export function assertReopenAuthorized(permissions = {}, profile = {}, role = "") {
  return (
    permissions?.isPlatformOwner ||
    ["owner", "admin", "platform_owner"].includes(String(role || profile?.role || "").toLowerCase()) ||
    permissions?.actions?.reopen_month === true
  );
}

export async function listDividendsPersistent(activeTenantContext) {
  if (isLocalMode()) {
    return LocalDividendRepository.list(activeTenantContext).map(fromProductionDividend);
  }
  const result = await createRepositoryProvider().DividendsRepository.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  });
  if (!result.success) throw new Error(result.message || "Dividends could not be loaded.");
  return (result.data || []).map(fromProductionDividend);
}

export async function listExpensesPersistent(activeTenantContext) {
  if (isLocalMode()) {
    return LocalExpenseRepository.list(activeTenantContext).map(fromProductionExpense);
  }
  const result = await createRepositoryProvider().ExpensesRepository.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  });
  if (!result.success) throw new Error(result.message || "Expenses could not be loaded.");
  return (result.data || []).map(fromProductionExpense);
}

export async function listMonthClosingsPersistent(activeTenantContext) {
  if (isLocalMode()) {
    return LocalMonthClosingRepository.list(activeTenantContext).map(fromProductionMonthClosing);
  }
  const result = await createRepositoryProvider().MonthClosingRepository.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  });
  if (!result.success) throw new Error(result.message || "Month closings could not be loaded.");
  return (result.data || []).map(fromProductionMonthClosing);
}

export async function listCompletionsPersistent(activeTenantContext) {
  if (isLocalMode()) {
    return LocalCompletionRepository.list(activeTenantContext).map(fromProductionCompletion);
  }
  const result = await createRepositoryProvider().CompletionsRepository.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  });
  if (!result.success) throw new Error(result.message || "Completions could not be loaded.");
  return (result.data || []).map(fromProductionCompletion);
}

export async function postDividendBatchPersistent(input, activeTenantContext) {
  const scope = requireTenant(activeTenantContext);
  const groupId = input.group_id || input.groupId;
  const month = Number(input.dividend_month || input.monthNumber || input.month || 0);
  const allocation = input.allocations
    ? { allocations: input.allocations, pool: input.pool, rounding: input.rounding }
    : DividendEngine.allocateMonthDividends({
        discount: input.discount,
        commission: input.commission,
        members: input.members || [],
        winnerMemberId: input.winner_member_id || input.winnerMemberId,
        excludeWinner: input.excludeWinner !== false,
      });
  const idempotencyKey =
    input.idempotency_key ||
    `dividend:${scope.tenant_id}:${scope.data_scope}:${groupId}:${month}`;

  if (isLocalMode()) {
    return postDividendBatchLocal(
      { ...input, group_id: groupId, dividend_month: month, ...allocation, idempotency_key: idempotencyKey },
      activeTenantContext
    );
  }

  if (!isSupabaseConfigured) {
    throw new Error("Supabase is required for production dividend posting.");
  }

  const client = getSupabaseClient();
  const { data, error } = await client.rpc("post_chit_dividend_batch", {
    p_payload: {
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      group_id: groupId,
      auction_id: input.auction_id || input.auctionId || null,
      dividend_month: month,
      dividend_date: input.dividend_date || input.date || new Date().toISOString().slice(0, 10),
      allocations: allocation.allocations,
      rounding: allocation.rounding,
      idempotency_key: idempotencyKey,
    },
  });
  if (error) throw new Error(error.message || "Dividend posting failed.");

  const rows = await listDividendsPersistent(activeTenantContext);
  const posted = rows.filter((row) => row.metadata?.idempotency_key === idempotencyKey);
  return {
    success: true,
    idempotent: Boolean(data?.idempotent),
    dividends: posted,
    pool: allocation.pool,
    rounding: allocation.rounding,
    rpc: data,
  };
}

export async function postExpensePersistent(input, activeTenantContext, auth = {}) {
  const scope = requireTenant(activeTenantContext);
  if (!assertExpenseAuthorized(auth.permissions, auth.profile, auth.role)) {
    return { success: false, message: "Unauthorized role for expense posting." };
  }

  const expense = new Expense({
    ...input,
    id: isUuid(input.id) ? input.id : createEntityId(),
  }).toJSON();
  const idempotencyKey =
    input.idempotency_key ||
    expense.reference ||
    `expense:${scope.tenant_id}:${scope.data_scope}:${expense.id}`;

  if (isLocalMode()) {
    return postExpenseLocal({ ...expense, idempotency_key: idempotencyKey }, activeTenantContext);
  }

  if (!isSupabaseConfigured) {
    throw new Error("Supabase is required for production expense posting.");
  }

  const client = getSupabaseClient();
  const { data, error } = await client.rpc("post_chit_expense_event", {
    p_payload: {
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      group_id: expense.groupId || null,
      expense_date: expense.date,
      category: expense.category,
      description: expense.notes || expense.vendor || expense.category,
      amount: expense.amount,
      payment_method: expense.paymentMode,
      paid_to: expense.vendor,
      receipt_url: expense.attachmentMetadata?.url || null,
      reference_no: expense.reference || `expense:${idempotencyKey}`,
      status: expense.status,
      metadata: {
        attachment_metadata: expense.attachmentMetadata,
        approved_by: expense.approvedBy,
        batch_id: expense.batchId,
      },
      idempotency_key: idempotencyKey,
    },
  });
  if (error) throw new Error(error.message || "Expense posting failed.");

  const rows = await listExpensesPersistent(activeTenantContext);
  const saved =
    rows.find((row) => row.id === data?.expense_id) ||
    rows.find((row) => row.metadata?.idempotency_key === idempotencyKey);
  return {
    success: true,
    idempotent: Boolean(data?.idempotent),
    expense: saved || fromProductionExpense(toProductionExpense(expense)),
    rpc: data,
  };
}

export async function confirmMonthClosingPersistent(input, activeTenantContext) {
  const scope = requireTenant(activeTenantContext);
  const groupId = input.groupId || input.group_id;
  const monthNumber = Number(input.monthNumber || input.closing_month || 0);
  const closingYear = Number(input.closingYear || input.closing_year || new Date().getFullYear());
  const idempotencyKey =
    input.idempotency_key ||
    `month-close:${scope.tenant_id}:${scope.data_scope}:${groupId}:${monthNumber}:${closingYear}`;

  if (isLocalMode()) {
    return confirmMonthClosingLocal(
      { ...input, groupId, monthNumber, closingYear, idempotency_key: idempotencyKey },
      activeTenantContext
    );
  }

  if (!isSupabaseConfigured) {
    throw new Error("Supabase is required for production month closing.");
  }

  const client = getSupabaseClient();
  const { data, error } = await client.rpc("confirm_month_closing_event", {
    p_payload: {
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      group_id: groupId,
      closing_month: monthNumber,
      closing_year: closingYear,
      organizer_confirmed: Boolean(input.organizerConfirmed),
      summary: input.summary || input.preview?.summary || {},
      notes: input.notes || null,
      metadata: input.metadata || {},
      idempotency_key: idempotencyKey,
    },
  });
  if (error) throw new Error(error.message || "Month closing failed.");

  const rows = await listMonthClosingsPersistent(activeTenantContext);
  const snapshot =
    rows.find((row) => row.id === data?.month_closing_id) ||
    rows.find((row) => row.metadata?.idempotency_key === idempotencyKey);
  return {
    success: true,
    idempotent: Boolean(data?.idempotent),
    snapshot,
    rpc: data,
  };
}

export async function reopenMonthClosingPersistent(snapshot, options = {}, activeTenantContext) {
  const scope = requireTenant(activeTenantContext);
  if (!assertReopenAuthorized(options.permissions, options.profile, options.role) && !options.hasPermission) {
    return { success: false, message: "Reopen permission is required." };
  }
  if (!options.reason) {
    return { success: false, message: "Reopen reason is required." };
  }

  if (isLocalMode()) {
    if (String(snapshot.status || "").toUpperCase() === "REOPENED") {
      return { success: true, idempotent: true, snapshot };
    }
    const updated = fromProductionMonthClosing(
      LocalMonthClosingRepository.save(
        {
          ...snapshot,
          status: "REOPENED",
          reopenReason: options.reason,
          reopen_reason: options.reason,
          reopenedAt: new Date().toISOString(),
          reopened_at: new Date().toISOString(),
          reopenedBy: options.reopenedBy || options.profile?.id || "local-owner",
        },
        activeTenantContext
      )
    );
    return { success: true, idempotent: false, snapshot: updated };
  }

  if (!isSupabaseConfigured) {
    throw new Error("Supabase is required for production month reopen.");
  }

  const client = getSupabaseClient();
  const { data, error } = await client.rpc("reopen_month_closing_event", {
    p_payload: {
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      month_closing_id: snapshot.id,
      reason: options.reason,
      reopened_by: options.reopenedBy || options.profile?.id || null,
    },
  });
  if (error) throw new Error(error.message || "Month reopen failed.");

  const rows = await listMonthClosingsPersistent(activeTenantContext);
  return {
    success: true,
    idempotent: Boolean(data?.idempotent),
    snapshot: rows.find((row) => row.id === snapshot.id) || null,
    rpc: data,
  };
}

export async function confirmChitCompletionPersistent(input, activeTenantContext) {
  const scope = requireTenant(activeTenantContext);
  const group = input.group || {};
  const groupId = group.id || input.groupId || input.group_id;
  const idempotencyKey =
    input.idempotency_key || `chit-complete:${scope.tenant_id}:${scope.data_scope}:${groupId}`;

  if (isLocalMode()) {
    return confirmCompletionLocal(
      { ...input, groupId, idempotency_key: idempotencyKey },
      activeTenantContext
    );
  }

  if (!isSupabaseConfigured) {
    throw new Error("Supabase is required for production chit completion.");
  }

  const client = getSupabaseClient();
  const { data, error } = await client.rpc("confirm_chit_completion_event", {
    p_payload: {
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      group_id: groupId,
      organizer_confirmed: Boolean(input.organizerConfirmed),
      snapshot: input.snapshot || input.preview || {},
      notes: input.notes || null,
      completed_by: input.completedBy || null,
      metadata: { ...(input.metadata || {}), export_ready: true },
      idempotency_key: idempotencyKey,
    },
  });
  if (error) throw new Error(error.message || "Chit completion failed.");

  const rows = await listCompletionsPersistent(activeTenantContext);
  return {
    success: true,
    idempotent: Boolean(data?.idempotent),
    snapshot: rows.find((row) => row.id === data?.completion_id) || null,
    rpc: data,
  };
}

async function postDividendBatchLocal(input, activeTenantContext) {
  const existing = LocalDividendRepository.list(activeTenantContext).map(fromProductionDividend);
  const byKey = existing.filter((row) => row.metadata?.idempotency_key === input.idempotency_key);
  if (byKey.length) {
    return { success: true, idempotent: true, dividends: byKey, pool: input.pool, rounding: input.rounding };
  }

  const closed = LocalMonthClosingRepository.list(activeTenantContext)
    .map(fromProductionMonthClosing)
    .some(
      (row) =>
        row.groupId === input.group_id &&
        Number(row.monthNumber) === Number(input.dividend_month) &&
        String(row.status || "").toUpperCase() === "CLOSED"
    );
  if (closed) throw new Error("Cannot post dividends into a closed month.");

  for (const allocation of input.allocations || []) {
    const duplicate = existing.find(
      (row) =>
        row.groupId === input.group_id &&
        String(row.memberId) === String(allocation.member_id) &&
        Number(row.dividendMonth) === Number(input.dividend_month) &&
        !["CANCELLED", "REVERSED"].includes(String(row.status || "").toUpperCase())
    );
    if (duplicate) throw new Error("Duplicate dividend allocation for member/month.");
  }

  const posted = [];
  for (const allocation of input.allocations || []) {
    const reference = allocation.reference_no || `dividend:${input.idempotency_key}:${allocation.member_id}`;
    const saved = fromProductionDividend(
      LocalDividendRepository.save(
        toProductionDividend({
          id: createEntityId(),
          group_id: input.group_id,
          member_id: allocation.member_id,
          auction_id: input.auction_id,
          dividend_month: input.dividend_month,
          dividend_date: input.dividend_date || new Date().toISOString().slice(0, 10),
          amount: allocation.amount,
          notes: allocation.notes,
          reference_no: reference,
          status: "POSTED",
          idempotency_key: input.idempotency_key,
          rounding: input.rounding,
          winner_excluded: allocation.winner_excluded,
        }),
        activeTenantContext
      )
    );
    posted.push(saved);

    LocalFinanceRepository.upsert(
      {
        id: createEntityId(),
        type: "dividend",
        entry_type: "dividend",
        category: "Dividend",
        description: allocation.notes || "Dividend allocation",
        amount: allocation.amount,
        group_id: input.group_id,
        member_id: allocation.member_id,
        status: "posted",
        metadata: { idempotency_key: `${input.idempotency_key}:finance:${allocation.member_id}` },
      },
      { activeTenantContext }
    );
    LocalLedgerRepository.saveLedgerEntry(
      {
        id: createEntityId(),
        group_id: input.group_id,
        member_id: allocation.member_id,
        entry_type: "dividend",
        amount: allocation.amount,
        description: "Dividend allocation",
        reference_no: reference,
        status: "posted",
      },
      activeTenantContext
    );
  }

  return {
    success: true,
    idempotent: false,
    dividends: posted,
    pool: input.pool,
    rounding: input.rounding,
  };
}

async function postExpenseLocal(expense, activeTenantContext) {
  const existing = LocalExpenseRepository.list(activeTenantContext).map(fromProductionExpense);
  const prior = existing.find((row) => row.metadata?.idempotency_key === expense.idempotency_key);
  if (prior) return { success: true, idempotent: true, expense: prior };

  const saved = fromProductionExpense(
    LocalExpenseRepository.save(
      {
        ...toProductionExpense(expense),
        id: expense.id,
        metadata: {
          ...(expense.attachmentMetadata ? { attachment_metadata: expense.attachmentMetadata } : {}),
          idempotency_key: expense.idempotency_key,
          approved_by: expense.approvedBy,
        },
      },
      activeTenantContext
    )
  );

  const mode = String(expense.paymentMode || "").toUpperCase();
  const isBank = mode !== "CASH";
  LocalFinanceRepository.upsert(
    {
      id: createEntityId(),
      type: "expense",
      entry_type: "expense",
      category: expense.category,
      description: expense.notes || expense.vendor || expense.category,
      amount: expense.amount,
      cash_out: isBank ? 0 : expense.amount,
      bank_out: isBank ? expense.amount : 0,
      payment_mode: expense.paymentMode,
      status: expense.status,
      date: expense.date,
      group_id: expense.groupId,
      metadata: { idempotency_key: `${expense.idempotency_key}:finance`, expense_id: saved.id },
    },
    { activeTenantContext }
  );
  LocalLedgerRepository.saveLedgerEntry(
    {
      id: createEntityId(),
      group_id: expense.groupId || null,
      entry_type: "expense",
      amount: expense.amount,
      description: expense.notes || expense.vendor || expense.category,
      reference_no: expense.reference || `expense:${expense.idempotency_key}`,
      status: "posted",
    },
    activeTenantContext
  );

  return { success: true, idempotent: false, expense: saved };
}

async function confirmMonthClosingLocal(input, activeTenantContext) {
  if (!input.organizerConfirmed) {
    return { success: false, message: "Organizer confirmation is mandatory." };
  }

  const existing = LocalMonthClosingRepository.list(activeTenantContext).map(fromProductionMonthClosing);
  const byKey = existing.find((row) => row.metadata?.idempotency_key === input.idempotency_key);
  if (byKey) return { success: true, idempotent: true, snapshot: byKey };

  const alreadyClosed = existing.find(
    (row) =>
      row.groupId === input.groupId &&
      Number(row.monthNumber) === Number(input.monthNumber) &&
      Number(row.closingYear || new Date().getFullYear()) === Number(input.closingYear) &&
      String(row.status || "").toUpperCase() === "CLOSED"
  );
  if (alreadyClosed) {
    return { success: false, message: "This chit month is already closed." };
  }

  const summary = input.summary || input.preview?.summary || {
    groupId: input.groupId,
    monthNumber: input.monthNumber,
  };

  const snapshot = fromProductionMonthClosing(
    LocalMonthClosingRepository.save(
      {
        id: createEntityId(),
        groupId: input.groupId,
        monthNumber: input.monthNumber,
        closingYear: input.closingYear,
        status: "CLOSED",
        confirmedAt: new Date().toISOString(),
        summary,
        metadata: { idempotency_key: input.idempotency_key },
      },
      activeTenantContext
    )
  );
  return { success: true, idempotent: false, snapshot };
}

async function confirmCompletionLocal(input, activeTenantContext) {
  if (!input.organizerConfirmed) {
    return { success: false, message: "Organizer confirmation is mandatory." };
  }

  const existing = LocalCompletionRepository.list(activeTenantContext).map(fromProductionCompletion);
  const byKey = existing.find((row) => row.metadata?.idempotency_key === input.idempotency_key);
  if (byKey) return { success: true, idempotent: true, snapshot: byKey };

  const already = existing.find(
    (row) => row.groupId === input.groupId && String(row.status || "").toUpperCase() === "COMPLETED"
  );
  if (already) {
    return { success: false, message: "This chit is already completed." };
  }

  const snapshotPayload = input.snapshot || input.preview || {
    groupId: input.groupId,
    status: "COMPLETED",
  };

  const snapshot = fromProductionCompletion(
    LocalCompletionRepository.save(
      {
        id: createEntityId(),
        groupId: input.groupId,
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
        snapshot: snapshotPayload,
        metadata: { idempotency_key: input.idempotency_key, export_ready: true },
      },
      activeTenantContext
    )
  );

  try {
    const groups = await LocalGroupsRepository.list?.({ activeTenantContext }) ||
      LocalGroupsRepository.getAll?.({ activeTenantContext });
    const list = groups?.data || groups || [];
    const group = (Array.isArray(list) ? list : []).find((row) => row.id === input.groupId);
    if (group && typeof LocalGroupsRepository.update === "function") {
      await LocalGroupsRepository.update(
        input.groupId,
        { ...group, status: "closed", metadata: { ...(group.metadata || {}), read_only: true } },
        { activeTenantContext }
      );
    } else if (group && typeof LocalGroupsRepository.save === "function") {
      LocalGroupsRepository.save({ ...group, status: "closed" }, activeTenantContext);
    }
  } catch {
    // Group status update is best-effort in local mode.
  }

  return { success: true, idempotent: false, snapshot };
}
