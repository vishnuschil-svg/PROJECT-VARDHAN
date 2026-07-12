import test from "node:test";
import assert from "node:assert/strict";
import { ERP_MODULES, CHIT_MANAGEMENT_ERP } from "../../config/erpModules.js";

test("ERP catalog keeps only MITRA NIDHI launchable in the released roadmap", () => {
  const released = ERP_MODULES.filter((item) => item.status === "Active");
  assert.equal(released.length, 1);
  assert.equal(released[0].id, CHIT_MANAGEMENT_ERP);
  assert.ok(ERP_MODULES.filter((item) => item.id !== CHIT_MANAGEMENT_ERP).every((item) => item.status === "Coming Soon"));
});
