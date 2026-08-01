import { readdir, readFile, stat } from "node:fs/promises";

const directory = new URL("../supabase/migrations/", import.meta.url);
const names = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
const findings = [];
const versions = new Map();
const files = new Map();

for (const name of names) {
  const path = new URL(name, directory);
  const sql = await readFile(path, "utf8");
  files.set(name, sql);
  const size = (await stat(path)).size;
  const version = name.match(/^(\d+)_/)?.[1];
  if (!version) findings.push(`${name}: filename has no numeric migration prefix`);
  else versions.set(version, [...(versions.get(version) || []), name]);
  if (!size || !sql.trim()) findings.push(`${name}: migration is empty`);
  if (/NON-DESTRUCTIVE DRAFT|migration draft|Do not run blindly|DRAFT \/ DO NOT EXECUTE/i.test(sql)) {
    findings.push(`${name}: draft SQL is in the executable migration directory`);
  }
  if (!hasBalancedDelimiters(sql)) findings.push(`${name}: SQL delimiters are unbalanced`);
}

for (const [version, versionFiles] of versions) {
  if (versionFiles.length > 1) findings.push(`migration version ${version} is duplicated: ${versionFiles.join(", ")}`);
}

const ordered = [...files.keys()];
for (const [index, name] of ordered.entries()) {
  const dependency = files.get(name).match(/^-- DEPENDS_ON:\s*(.+)$/mi)?.[1].trim();
  if (!dependency || dependency === "none") continue;
  const dependencyIndex = ordered.indexOf(dependency);
  if (dependencyIndex < 0) findings.push(`${name}: dependency ${dependency} does not exist`);
  else if (dependencyIndex >= index) findings.push(`${name}: dependency ${dependency} is not earlier in the chain`);
}

const schemaMarkers = markerOwners("CANONICAL_SCHEMA");
const rlsMarkers = markerOwners("CANONICAL_RLS");
if (schemaMarkers.length !== 1) findings.push(`expected exactly one CANONICAL_SCHEMA marker, found ${schemaMarkers.length}`);
if (rlsMarkers.length !== 1) findings.push(`expected exactly one CANONICAL_RLS marker, found ${rlsMarkers.length}`);

const schemaName = schemaMarkers[0];
const rlsName = rlsMarkers[0];
if (schemaName && rlsName) {
  const schemaSql = files.get(schemaName);
  const rlsSql = files.get(rlsName);
  const schema = parseCreateTables(schemaSql);
  const expectedTables = extractFirstRlsTableList(rlsSql);

  for (const table of expectedTables) {
    if (!schema.has(table)) findings.push(`${rlsName}: RLS references missing table ${table}`);
  }
  for (const table of schema.keys()) {
    if (!expectedTables.includes(table)) findings.push(`${rlsName}: schema table ${table} is missing from canonical RLS coverage`);
  }

  const genericTables = extractOperationalTableList(rlsSql);
  for (const table of genericTables) {
    assertColumns(schema, table, ["tenant_id", "data_scope", "created_by"], `${rlsName}: generic policies`);
  }
  const specialRequirements = {
    workspaces: ["id", "tenant_id", "data_scope", "created_by", "status"],
    user_profiles: ["id", "tenant_id", "data_scope", "platform_role", "is_platform_owner"],
    workspace_memberships: ["workspace_id", "user_id", "tenant_id", "data_scope", "role", "status", "created_by"],
    notifications: ["user_id", "tenant_id", "data_scope", "created_by"],
    academy_progress: ["user_id", "tenant_id", "data_scope", "created_by"],
    support_tickets: ["user_id", "tenant_id", "data_scope", "created_by"],
    security_audit_logs: ["tenant_id", "data_scope", "created_by"],
    activity_logs: ["tenant_id", "data_scope", "created_by"],
  };
  for (const [table, columns] of Object.entries(specialRequirements)) assertColumns(schema, table, columns, `${rlsName}: special policies`);

  validateQualifiedColumnReferences(schema, rlsSql, rlsName);
  for (const forbidden of [
    [/\bcompany_id\b/i, "legacy company_id model"],
    [/\bworkspace_members\b/i, "contradictory workspace_members model"],
    [/\brevoked_at\b/i, "unsupported revoked_at membership model"],
    [/auth\.jwt\(\)\s*->>?\s*'tenant_id'/i, "JWT tenant claim authorization"],
  ]) {
    if (forbidden[0].test(rlsSql)) findings.push(`${rlsName}: contains ${forbidden[1]}`);
  }
  if (!/role\s+in\s*\('owner','admin','operator','viewer','auditor','subscriber'\)/i.test(schemaSql.replace(/\s+/g, " "))) {
    findings.push(`${schemaName}: canonical membership role constraint is missing subscriber/role definitions`);
  }
  if (!/status\s+in\s*\('active','disabled','revoked'\)/i.test(schemaSql.replace(/\s+/g, " "))) {
    findings.push(`${schemaName}: canonical membership status constraint is missing disabled/revoked states`);
  }
  if (!/Subscribers are deliberately absent|subscriber is explicit and receives no broad/i.test(rlsSql)) {
    findings.push(`${rlsName}: subscriber restriction marker is missing`);
  }
  for (const functionName of ["is_platform_owner", "has_active_membership", "has_tenant_role", "can_access_tenant"]) {
    const body = extractFunction(rlsSql, functionName);
    if (!body) findings.push(`${rlsName}: required helper ${functionName} is missing`);
    else {
      if (!/security\s+definer/i.test(body)) findings.push(`${rlsName}: ${functionName} must be SECURITY DEFINER`);
      if (!/set\s+search_path\s*=\s*pg_catalog,\s*public,\s*auth/i.test(body)) findings.push(`${rlsName}: ${functionName} has no fixed canonical search_path`);
      if (!/set\s+row_security\s*=\s*off/i.test(body)) findings.push(`${rlsName}: ${functionName} must explicitly disable recursive row security`);
    }
  }
}

// Every CREATE TABLE IF NOT EXISTS must have a complete additive legacy-column audit before
// an index can depend on its production columns. This prevents an existing partial table from
// silently bypassing the canonical CREATE TABLE definition.
for (const [name, sql] of files) {
  const tableSchemas = parseCreateTables(sql);
  for (const [table, columns] of tableSchemas) {
    const compatibility = extractCompatibilityColumns(sql, table);
    if (!compatibility) {
      findings.push(`${name}: ${table} has no additive legacy compatibility audit`);
      continue;
    }
    for (const column of columns) {
      if (!compatibility.has(column)) findings.push(`${name}: ${table}.${column} is missing from the legacy compatibility audit`);
    }
    const compatibilityPosition = sql.toLowerCase().indexOf(`vardhan_add_missing_columns('public.${table}'::regclass`);
    const firstIndexPosition = sql.search(new RegExp(`create\\s+(?:unique\\s+)?index[^;]*?on\\s+public\\.${table}\\s*\\(`, "i"));
    if (firstIndexPosition >= 0 && compatibilityPosition > firstIndexPosition) findings.push(`${name}: ${table} compatibility runs after a dependent index`);
  }
}

const allSql = [...files.values()].join("\n");
if (/drop\s+table\s+(?:if\s+exists\s+)?public\.support_tickets/i.test(allSql)) findings.push("support_tickets must never be dropped");
if (/alter\s+table\s+public\.support_tickets\s+rename/i.test(allSql)) findings.push("support_tickets must never be renamed or recreated");
if (!/alter table %s add column if not exists %I %s/i.test(allSql)) findings.push("additive ADD COLUMN IF NOT EXISTS compatibility helper is missing");
for (const marker of [
  "drop trigger if exists %I on public.%I', 'set_'",
  "drop policy if exists %I on public.%I', table_name || '_select'",
  "drop trigger if exists restore_audit_logs_append_only",
]) if (!allSql.includes(marker)) findings.push(`idempotence marker is missing: ${marker}`);

const result = { ok: findings.length === 0, files: names, canonicalSchema: schemaName || null, canonicalRls: rlsName || null, findings };
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;

function markerOwners(marker) {
  return [...files].filter(([, sql]) => new RegExp(`^-- ${marker}:`, "mi").test(sql)).map(([name]) => name);
}

function parseCreateTables(sql) {
  const tables = new Map();
  const pattern = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_][\w]*)\s*\(/ig;
  let match;
  while ((match = pattern.exec(sql))) {
    let cursor = pattern.lastIndex;
    let depth = 1;
    let quote = null;
    while (cursor < sql.length && depth) {
      const char = sql[cursor];
      if (quote) {
        if (char === quote && sql[cursor - 1] !== "\\") quote = null;
      } else if (char === "'" || char === '"') quote = char;
      else if (char === "(") depth += 1;
      else if (char === ")") depth -= 1;
      cursor += 1;
    }
    const body = sql.slice(pattern.lastIndex, cursor - 1);
    const columns = new Set();
    for (const part of splitTopLevel(body)) {
      const column = part.trim().match(/^([a-z_][\w]*)\s+/i)?.[1]?.toLowerCase();
      if (column && !["constraint", "primary", "foreign", "unique", "check"].includes(column)) columns.add(column);
    }
    tables.set(match[1].toLowerCase(), columns);
    pattern.lastIndex = cursor;
  }
  return tables;
}

function splitTopLevel(value) {
  const parts = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (char === quote && value[index - 1] !== "\\") quote = null;
    } else if (char === "'" || char === '"') quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function extractFirstRlsTableList(sql) {
  const block = sql.match(/foreach\s+v_table\s+in\s+array\s+array\[([\s\S]*?)\]\s+loop/i)?.[1] || "";
  return [...block.matchAll(/'([a-z_][\w]*)'/g)].map((match) => match[1]);
}

function extractOperationalTableList(sql) {
  const marker = sql.indexOf("-- Standard operational tables");
  const block = sql.slice(marker).match(/foreach\s+v_table\s+in\s+array\s+array\[([\s\S]*?)\]\s+loop/i)?.[1] || "";
  return [...block.matchAll(/'([a-z_][\w]*)'/g)].map((match) => match[1]);
}

function assertColumns(schema, table, columns, context) {
  const actual = schema.get(table);
  if (!actual) return;
  for (const column of columns) if (!actual.has(column)) findings.push(`${context} reference missing column ${table}.${column}`);
}

function validateQualifiedColumnReferences(schema, sql, file) {
  const aliases = new Map();
  for (const match of sql.matchAll(/(?:from|join)\s+public\.([a-z_][\w]*)\s+([a-z_][\w]*)/ig)) aliases.set(match[2].toLowerCase(), match[1].toLowerCase());
  for (const match of sql.matchAll(/\b([a-z_][\w]*)\.([a-z_][\w]*)\b/ig)) {
    const table = aliases.get(match[1].toLowerCase());
    if (table && schema.has(table) && !schema.get(table).has(match[2].toLowerCase())) findings.push(`${file}: reference missing column ${table}.${match[2]}`);
  }
}

function extractFunction(sql, name) {
  const start = sql.search(new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\s*\\(`, "i"));
  if (start < 0) return "";
  const end = sql.indexOf("$$;", start);
  return end < 0 ? sql.slice(start) : sql.slice(start, end + 3);
}

function extractCompatibilityColumns(sql, table) {
  const marker = `vardhan_add_missing_columns('public.${table}'::regclass, '`;
  const start = sql.toLowerCase().indexOf(marker);
  if (start < 0) return null;
  const valueStart = start + marker.length;
  const valueEnd = sql.indexOf("'::jsonb)", valueStart);
  if (valueEnd < 0) { findings.push(`legacy compatibility JSON for ${table} has no terminator`); return new Set(); }
  try { return new Set(Object.keys(JSON.parse(sql.slice(valueStart, valueEnd).replaceAll("''", "'"))).map((column) => column.toLowerCase())); }
  catch { findings.push(`legacy compatibility JSON for ${table} is invalid`); return new Set(); }
}

function hasBalancedDelimiters(sql) {
  const dollarQuotes = sql.match(/\$\$|\$[a-z_][\w]*\$/ig) || [];
  const dollarCounts = new Map();
  for (const quote of dollarQuotes) dollarCounts.set(quote, (dollarCounts.get(quote) || 0) + 1);
  if ([...dollarCounts.values()].some((count) => count % 2)) return false;
  let depth = 0;
  let quote = null;
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    if (quote) {
      if (char === quote && sql[index - 1] !== "\\") quote = null;
    } else if (char === "'" || char === '"') quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0 && quote === null;
}
