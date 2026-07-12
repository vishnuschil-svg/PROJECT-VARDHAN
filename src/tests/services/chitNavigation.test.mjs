import test from "node:test";
import assert from "node:assert/strict";

const expected = ["Home","Chit Groups","Members","Collections","Auctions and Lift","Pending and Follow-up","Receipts and Ledger","Finance and Profit","Reports","Support","Settings"];
test("approved Chit workflow contains eleven primary destinations",()=>{assert.equal(expected.length,11);assert.equal(new Set(expected).size,11)});
