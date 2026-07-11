import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WinnerEligibilityEngine } from "../../domain/chit/services/WinnerEligibilityEngine.js";
import { AuctionEngine } from "../../domain/chit/services/AuctionEngine.js";
import { LuckyDrawEngine } from "../../domain/chit/services/LuckyDrawEngine.js";
import { LuckyDrawValidator } from "../../domain/chit/validators/LuckyDrawValidator.js";
import { AIConversationSetup } from "../../ai/AIConversationSetup.js";
import { previewRunningMigration } from "../../services/runningMigrationService.js";
import { previewMemberReplacement } from "../../services/memberReplacementService.js";
import { parseScheduleCaptureFile } from "../../services/smartCaptureService.js";

describe("phase 2 winner and setup engines", () => {
  const group = { id: "g1", chit_value: 200000, total_members: 20, total_months: 20, status: "active" };
  const ruleSet = {
    paymentPatternType: "AUCTION_DIVIDEND",
    winnerLockRule: "ONCE_LIFTED_LOCKED",
    liftEffectiveRule: "NEXT_MONTH",
    minimumBidType: "PERCENTAGE",
    minimumBidValue: 5,
    maximumBidType: "PERCENTAGE",
    maximumBidValue: 30,
    commissionType: "PERCENTAGE",
    commissionValue: 5,
  };

  it("excludes already lifted winners from eligibility", () => {
    const members = [{ id: "m1", chit_group_id: "g1", status: "active" }, { id: "m2", chit_group_id: "g1", status: "active" }];
    const auctions = [{ winner_member_id: "m1", group_id: "g1", auction_month: 1 }];
    const eligible = WinnerEligibilityEngine.getEligibleMembers({ members, group, auctions, ruleSet });

    assert.deepEqual(eligible.map((member) => member.id), ["m2"]);
  });

  it("validates auction bid min/max and calculates payout values", () => {
    const belowMin = AuctionEngine.buildAuctionPreview({ group, ruleSet, bidAmount: 5000 });
    const inRange = AuctionEngine.buildAuctionPreview({ group, ruleSet, bidAmount: 40000 });

    assert.equal(belowMin.bidValidation.isValid, false);
    assert.equal(inRange.bidValidation.isValid, true);
    assert.equal(inRange.commission, 10000);
    assert.ok(inRange.dividend >= 0);
  });

  it("prevents duplicate lucky draw winners for the same month", () => {
    const validation = LuckyDrawValidator.validateDraw({
      group,
      scheduleRow: { monthNumber: 2 },
      eligibleMembers: [{ id: "m2" }],
      existingWinners: [{ groupId: "g1", monthNumber: 2, status: "CONFIRMED" }],
    });

    assert.equal(validation.isValid, false);
  });

  it("selects deterministic lucky draw winner for tests", () => {
    const selectionA = LuckyDrawEngine.selectWinner({ eligibleMembers: [{ id: "a" }, { id: "b" }], deterministicSeed: "seed" });
    const selectionB = LuckyDrawEngine.selectWinner({ eligibleMembers: [{ id: "a" }, { id: "b" }], deterministicSeed: "seed" });

    assert.equal(selectionA.winner.id, selectionB.winner.id);
  });

  it("keeps local conversation state until required fields are collected", () => {
    let state = AIConversationSetup.start("Create a 5 lakh chit for 50 members", { tenant_id: "t1" });
    assert.equal(state.collectedFields.chitValue, 500000);
    assert.equal(state.collectedFields.members, 50);
    while (!state.completed) state = AIConversationSetup.answer(state, "20");
    assert.equal(state.completed, true);
    assert.equal(state.draftPlan.length, 3);
  });

  it("maps CSV schedule capture rows and blocks unsupported XLSX parser mode", async () => {
    const csv = new File(["month,payment,payout\n1,5000,95000"], "schedule.csv", { type: "text/csv" });
    const xlsx = new File([""], "schedule.xlsx");
    const parsedCsv = await parseScheduleCaptureFile(csv);
    const parsedXlsx = await parseScheduleCaptureFile(xlsx);

    assert.equal(parsedCsv.rows[0].standardPayment, 5000);
    assert.equal(parsedXlsx.sourceType, "XLSX_MANUAL_FALLBACK");
  });

  it("previews migration reconciliation and replacement obligation rules", () => {
    const migration = previewRunningMigration({
      collections: [{ paid_amount: 1000 }],
      receipts: [{ amount: 1000 }],
      currentMonth: 8,
    });
    const replacement = previewMemberReplacement({
      groupId: "g1",
      outgoingMember: { id: "old" },
      incomingMember: { id: "new" },
      effectiveMonth: 6,
      reason: "Owner approved replacement",
    });

    assert.equal(migration.reconciliation.status, "PASS");
    assert.equal(replacement.canConfirm, true);
  });
});
