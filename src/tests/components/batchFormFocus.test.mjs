import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");

test("batch draft updates do not restart the modal focus lifecycle", async () => {
  const modal = await read("../../components/common/Modal.jsx");

  assert.match(modal, /const onCloseRef = useRef\(onClose\)/);
  assert.match(modal, /onCloseRef\.current = onClose/);
  assert.match(modal, /if \(event\.key === "Escape"\) onCloseRef\.current\?\.\(\)/);
  assert.match(modal, /}, \[isOpen\]\);/);
  assert.doesNotMatch(modal, /}, \[isOpen, onClose\]\);/);
});

test("all batch text and date controls remain controlled without dynamic keys", async () => {
  const form = await read("../../components/batches/BatchForm.jsx");

  for (const field of ["name", "code", "description", "startDate", "endDate"]) {
    assert.match(form, new RegExp(`value=\\{value\\.${field} \\|\\| ""\\}`));
    assert.match(form, new RegExp(`set\\("${field}", event\\.target\\.value\\)`));
  }
  assert.doesNotMatch(form, /<(?:input|textarea)[^>]*\skey=/);
});
