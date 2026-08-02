"""Idempotent server-side provisioning of a write-capable own-data trial principal.

Uses DATABASE_URL (server-side). Never prints secrets.
Minimum supported write role: operator (schema: owner|admin|operator|viewer|auditor|subscriber).

Examples:
  python provision_own_data_trial_principal.py --dry-run
  python provision_own_data_trial_principal.py --confirm --role operator

Refuses production APP_ENV unless --allow-production is also set.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
SUPPORTED_WRITE_ROLES = frozenset({"owner", "admin", "operator"})
AUDIT_PATH = BACKEND_DIR / "data" / "own_data_trial_principal_audit.jsonl"


def load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"\"", "'"}:
            value = value[1:-1]
        if key:
            os.environ.setdefault(key, value)


def mask(value: Any) -> str:
    text = str(value or "")
    if len(text) <= 8:
        return "***"
    return f"{text[:4]}…{text[-4:]}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Provision write-capable own-data trial membership")
    parser.add_argument("--role", default="operator", help="Supported write role: owner|admin|operator")
    parser.add_argument("--user-id", default="", help="Optional auth user UUID (otherwise resolved from TEST_USER_EMAIL)")
    parser.add_argument("--workspace-id", default="", help="Optional workspace UUID (otherwise first active membership)")
    parser.add_argument("--tenant-id", default="", help="Optional tenant id override")
    parser.add_argument("--data-scope", default="", help="Optional data_scope override")
    parser.add_argument("--dry-run", action="store_true", help="Show intended change without writing")
    parser.add_argument("--confirm", action="store_true", help="Apply membership change")
    parser.add_argument(
        "--allow-production",
        action="store_true",
        help="Required together with --confirm when APP_ENV/ENVIRONMENT is production",
    )
    return parser.parse_args()


def main() -> int:
    load_env_file(BACKEND_DIR / ".env")
    load_env_file(BACKEND_DIR / ".env.test.local")
    load_env_file(PROJECT_ROOT / ".env.local")

    args = parse_args()
    role = str(args.role or "operator").strip().lower()
    if role not in SUPPORTED_WRITE_ROLES:
        print(f"REFUSED unsupported role={role}; allowed={sorted(SUPPORTED_WRITE_ROLES)}")
        return 2

    app_env = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development")).strip().lower()
    if app_env in {"production", "prod"} and args.confirm and not args.allow_production:
        print("REFUSED production execution without --allow-production")
        return 2
    if not args.dry_run and not args.confirm:
        print("REFUSED: pass --dry-run or --confirm")
        return 2

    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        print("REFUSED: DATABASE_URL missing")
        return 2

    try:
        import psycopg
    except ImportError:
        print("REFUSED: psycopg not installed")
        return 2

    email = os.getenv("TEST_USER_EMAIL", "").strip()
    user_id = args.user_id.strip()
    workspace_id = args.workspace_id.strip()
    tenant_id = args.tenant_id.strip()
    data_scope = args.data_scope.strip()

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            if not user_id:
                if not email:
                    print("REFUSED: provide --user-id or TEST_USER_EMAIL")
                    return 2
                cur.execute("select id from auth.users where email = %s limit 1", (email,))
                row = cur.fetchone()
                if not row:
                    print("REFUSED: TEST_USER_EMAIL not found in auth.users")
                    return 2
                user_id = str(row[0])

            if not workspace_id or not tenant_id or not data_scope:
                cur.execute(
                    """
                    select workspace_id::text, tenant_id, data_scope, role, status
                    from public.workspace_memberships
                    where user_id = %s::uuid and status = 'active'
                    order by created_at asc
                    limit 5
                    """,
                    (user_id,),
                )
                memberships = cur.fetchall()
                if not memberships:
                    print("REFUSED: no active workspace membership for user")
                    return 2
                if not workspace_id:
                    workspace_id = memberships[0][0]
                if not tenant_id:
                    tenant_id = memberships[0][1]
                if not data_scope:
                    data_scope = memberships[0][2]
                print(
                    "memberships_seen=",
                    [
                        {
                            "workspaceId": mask(m[0]),
                            "tenantId": mask(m[1]),
                            "dataScope": m[2],
                            "role": m[3],
                            "status": m[4],
                        }
                        for m in memberships
                    ],
                )

            cur.execute(
                """
                select id::text, role, status, data_scope
                from public.workspace_memberships
                where workspace_id = %s::uuid and user_id = %s::uuid
                limit 1
                """,
                (workspace_id, user_id),
            )
            existing = cur.fetchone()
            plan = {
                "userId": mask(user_id),
                "workspaceId": mask(workspace_id),
                "tenantId": mask(tenant_id),
                "dataScope": data_scope,
                "requestedRole": role,
                "existingRole": existing[1] if existing else None,
                "existingStatus": existing[2] if existing else None,
                "action": "update" if existing else "insert",
                "dryRun": bool(args.dry_run),
            }
            print("plan=", json.dumps(plan, ensure_ascii=False))

            if args.dry_run:
                return 0

            now = datetime.now(timezone.utc)
            if existing:
                cur.execute(
                    """
                    update public.workspace_memberships
                    set role = %s,
                        status = 'active',
                        tenant_id = %s,
                        data_scope = %s,
                        updated_at = %s
                    where workspace_id = %s::uuid and user_id = %s::uuid
                    returning id::text, role, status
                    """,
                    (role, tenant_id, data_scope, now, workspace_id, user_id),
                )
            else:
                membership_id = str(uuid.uuid4())
                cur.execute(
                    """
                    insert into public.workspace_memberships (
                      id, workspace_id, user_id, tenant_id, data_scope, role, status, created_by, created_at, updated_at
                    ) values (
                      %s::uuid, %s::uuid, %s::uuid, %s, %s, %s, 'active', %s::uuid, %s, %s
                    )
                    returning id::text, role, status
                    """,
                    (
                        membership_id,
                        workspace_id,
                        user_id,
                        tenant_id,
                        data_scope,
                        role,
                        user_id,
                        now,
                        now,
                    ),
                )
            result = cur.fetchone()
            conn.commit()

            # Verify
            cur.execute(
                """
                select role, status
                from public.workspace_memberships
                where workspace_id = %s::uuid and user_id = %s::uuid
                """,
                (workspace_id, user_id),
            )
            verified = cur.fetchone()
            ok = bool(verified and verified[0] == role and verified[1] == "active")
            audit = {
                "timestamp": now.isoformat(),
                "ok": ok,
                "userId": mask(user_id),
                "workspaceId": mask(workspace_id),
                "tenantId": mask(tenant_id),
                "role": role,
                "membershipId": mask(result[0] if result else ""),
                "previousRole": existing[1] if existing else None,
            }
            AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
            with AUDIT_PATH.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(audit) + "\n")
            print("verified=", json.dumps({"ok": ok, "role": verified[0] if verified else None, "status": verified[1] if verified else None}))
            return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
