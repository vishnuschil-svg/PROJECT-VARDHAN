import test from "node:test";
import assert from "node:assert/strict";
import { PracticeRepository } from "../../repositories/PracticeRepository.js";

const context = { tenant_id: "practice-test", data_scope: "test_scope" };

test("PracticeRepository isolates practice data with prefix", () => {
  const store = new Map();
  global.window = {
    localStorage: {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, v),
    },
  };

  const testRow = { id: "test-123", name: "Test Data" };
  PracticeRepository.save(testRow, context);

  const practiceRows = PracticeRepository.list(context);
  assert.ok(practiceRows.every((row) => row.id?.startsWith("practice-")));
  assert.ok(practiceRows[0].isPractice);
  assert.ok(practiceRows[0].practiceCreatedAt);

  delete global.window;
});

test("PracticeRepository resetAll removes only practice data", () => {
  const store = new Map();
  global.window = {
    localStorage: {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, v),
    },
  };

  PracticeRepository.save({ id: "test-1", name: "Practice 1" }, context);
  PracticeRepository.save({ id: "test-2", name: "Practice 2" }, context);

  const result = PracticeRepository.resetAll(context);
  assert.strictEqual(result.deleted, 2);

  const remaining = PracticeRepository.list(context);
  assert.strictEqual(remaining.length, 0);

  delete global.window;
});

test("PracticeRepository getPracticeState returns correct stats", () => {
  const store = new Map();
  global.window = {
    localStorage: {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, v),
    },
  };

  PracticeRepository.save({ id: "test-1", name: "Practice 1" }, context);
  PracticeRepository.save({ id: "test-2", name: "Practice 2" }, context);

  const state = PracticeRepository.getPracticeState(context);
  assert.ok(state.hasPracticeData);
  assert.strictEqual(state.practiceRecordCount, 2);
  assert.ok(state.lastReset);

  delete global.window;
});

test("PracticeRepository handles empty state", () => {
  const store = new Map();
  global.window = {
    localStorage: {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, v),
    },
  };

  const state = PracticeRepository.getPracticeState(context);
  assert.strictEqual(state.hasPracticeData, false);
  assert.strictEqual(state.practiceRecordCount, 0);
  assert.strictEqual(state.lastReset, null);

  delete global.window;
});
