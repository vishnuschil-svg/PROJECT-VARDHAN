import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getChitMenu } from "../../components/chit/ChitNavigation.menu.js";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("ChitLayout delegates to the Group Manager Natural UI shell", async () => {
  const source = await read("src/components/chit/ChitLayout.jsx");
  assert.match(source, /import GroupManagerShell/);
  assert.match(source, /<GroupManagerShell/);
  assert.doesNotMatch(source, /ChitNavigation/);
});

test("Group Manager shell composes the design-system foundation", async () => {
  const source = await read("src/components/chit/GroupManagerShell.jsx");
  for (const component of ["AppShell", "Sidebar", "Header", "PageShell"]) {
    assert.match(source, new RegExp(`\\b${component}\\b`));
  }
  assert.match(source, /getChitMenu\(\{ permissions, profile, role \}\)/);
  assert.match(source, /VARDHAN Group Manager/);
});

test("registered-operation links remain hidden through the permission-safe menu source", () => {
  const paths = getChitMenu({
    permissions: { isPlatformOwner: true, REGISTERED_OPERATIONS_ACCESS: true },
    profile: { is_platform_owner: true },
    role: { id: "PLATFORM_OWNER" },
  }).map((item) => item.path);

  assert.equal(paths.includes("/chits/auctions"), false);
  assert.equal(paths.includes("/chits/lucky-draw"), false);
  assert.equal(paths.includes("/chits/payouts"), false);
  assert.equal(paths.includes("/chits/manual-records"), true);
});

test("Group Manager shell does not render school-specific Odoo prototypes", async () => {
  const [shell, layout] = await Promise.all([
    read("src/components/chit/GroupManagerShell.jsx"),
    read("src/components/chit/ChitLayout.jsx"),
  ]);
  const activeShellSource = `${shell}\n${layout}`;
  assert.doesNotMatch(activeShellSource, /OdooLayout|OdooNavbar|OdooAppSwitcher/);
  assert.doesNotMatch(activeShellSource, /SCHOOL OS|Academics|Students \(SIS\)/);
});
