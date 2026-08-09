import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");
const designRoot = path.join(projectRoot, "src", "design-system");

const requiredFiles = [
  "tokens.css",
  "design-system.css",
  "Button.jsx",
  "FormControls.jsx",
  "Feedback.jsx",
  "Breadcrumb.jsx",
  "Sidebar.jsx",
  "Header.jsx",
  "PageShell.jsx",
  "DataViews.jsx",
  "FormSection.jsx",
  "States.jsx",
  "index.js",
];

test("design-system foundation files exist", () => {
  for (const file of requiredFiles) {
    assert.equal(fs.existsSync(path.join(designRoot, file)), true, `${file} must exist`);
  }
});

test("primary enterprise color is tokenized", () => {
  const tokens = fs.readFileSync(path.join(designRoot, "tokens.css"), "utf8");
  assert.match(tokens, /--vds-color-primary-600:\s*#714b67/i);
});

test("design-system index exports major primitives", () => {
  const source = fs.readFileSync(path.join(designRoot, "index.js"), "utf8");
  for (const component of [
    "Button",
    "Sidebar",
    "Breadcrumb",
    "PageShell",
    "DataTableShell",
    "KanbanBoard",
    "FormSection",
  ]) {
    assert.match(source, new RegExp(`\\b${component}\\b`));
  }
});

test("controls include accessible labels and invalid state support", () => {
  const source = fs.readFileSync(path.join(designRoot, "FormControls.jsx"), "utf8");
  assert.match(source, /htmlFor=/);
  assert.match(source, /aria-invalid/);
});