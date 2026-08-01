import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AuctionEngine } from "../../domain/chit/services/AuctionEngine.js";
import { LuckyDrawEngine } from "../../domain/chit/services/LuckyDrawEngine.js";

test("auction preview supports fixed prize and variable bid simulation", () => {
  const group = { chit_value: 100000, total_members: 10 };
  const fixed = AuctionEngine.buildAuctionPreview({ group, scheduleRow: { prizeAmount: 80000 }, bidAmount: 15000 });
  const variable = AuctionEngine.buildAuctionPreview({ group, scheduleRow: {}, bidPercentage: 20 });
  assert.equal(fixed.prizeAmount, 80000);
  assert.equal(fixed.bidAmount, 15000);
  assert.equal(variable.bidAmount, 20000);
  assert.match(variable.explanation, /Bid 20000/);
});

test("lucky draw selection is deterministic when an audit seed is supplied", () => {
  const members = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(
    LuckyDrawEngine.selectWinner({ eligibleMembers: members, deterministicSeed: "audit-seed" }),
    LuckyDrawEngine.selectWinner({ eligibleMembers: members, deterministicSeed: "audit-seed" })
  );
});

test("auction workspace exposes winner/dividend history and audit log", async () => {
  const source = await readFile(new URL("../../pages/chits/Auctions.jsx", import.meta.url), "utf8");
  assert.match(source, /winner history/i);
  assert.match(source, /dividend history/i);
  assert.match(source, /auditLogs/);
  assert.match(source, /lucky_draw_auction_completed/);
});
