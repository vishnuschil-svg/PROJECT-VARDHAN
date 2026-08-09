import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../../../supabase/migrations/012_annual_subscriptions_referrals_marketing.sql", import.meta.url), "utf8");

test("growth migration is annual-only and seeds locked plan prices", () => {
  assert.match(sql, /'STARTER',1,'Starter',149900,'INR','ANNUAL',1/);
  assert.match(sql, /'GROWTH',1,'Growth',299900,'INR','ANNUAL',3/);
  assert.match(sql, /'BUSINESS',1,'Business',499900,'INR','ANNUAL',null/);
  assert.doesNotMatch(sql, /billing_period\s*=\s*'MONTHLY'/i);
});

test("payment activation is service-role only and verifies webhook amount", () => {
  assert.match(sql, /verified webhook event required/);
  assert.match(sql, /verified payment amount or currency mismatch/);
  assert.match(sql, /grant execute on function public\.process_verified_annual_payment[\s\S]*to service_role/);
  assert.match(sql, /revoke all on function public\.process_verified_annual_payment[\s\S]*authenticated/);
});

test("referral reward is one-time, fixed at two months, and auditable", () => {
  assert.match(sql, /idx_referral_rewards_grant_once/);
  assert.match(sql, /reward_months integer not null default 2/);
  assert.match(sql, /growth_audit_events/);
  assert.match(sql, /self referral is not allowed/);
});

test("paid chit capacity is enforced with a locked subscription counter", () => {
  assert.match(sql, /limit 1 for update/);
  assert.match(sql, /PLAN_ACTIVE_CHIT_LIMIT_REACHED/);
  assert.match(sql, /chit_groups_paid_plan_limit/);
});
