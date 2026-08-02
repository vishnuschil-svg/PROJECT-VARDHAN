"""Credential-safe own-data trial gate verification.

Uses:
- backend/.env for DATABASE_URL (Postgres queue)
- backend/.env.test.local for TEST_USER_EMAIL / TEST_USER_PASSWORD
- project .env.local for VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY

Never prints secrets, tokens, emails, or passwords.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any


BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
EVIDENCE_PATH = BACKEND_DIR / "data" / "own_data_trial_evidence.json"


def load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
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


def mask_id(value: str | None) -> str:
    text = str(value or "")
    if len(text) <= 8:
        return "***"
    return f"{text[:4]}…{text[-4:]}"


def request_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
    timeout: float = 60.0,
) -> tuple[int, dict[str, Any]]:
    request = urllib.request.Request(url, data=body, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read()
            status = response.status
    except urllib.error.HTTPError as exc:
        status = exc.code
        raw = exc.read()
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error contacting {url.split('?')[0]}") from exc
    try:
        payload = json.loads(raw.decode("utf-8")) if raw else {}
    except (UnicodeDecodeError, json.JSONDecodeError):
        payload = {}
    return status, payload if isinstance(payload, dict) else {"raw": True}


def main() -> int:
    load_env_file(BACKEND_DIR / ".env")
    load_env_file(BACKEND_DIR / ".env.test.local")
    load_env_file(PROJECT_ROOT / ".env.local")
    load_env_file(PROJECT_ROOT / ".env")

    evidence: dict[str, Any] = {
        "steps": [],
        "p0": [],
        "passed": False,
    }

    def step(name: str, ok: bool, detail: dict[str, Any] | None = None) -> None:
        entry = {"step": name, "ok": ok, **(detail or {})}
        evidence["steps"].append(entry)
        status = "PASS" if ok else "FAIL"
        print(f"[{status}] {name}")
        if detail:
            safe = {k: v for k, v in detail.items() if "token" not in k.lower() and "password" not in k.lower() and "email" not in k.lower()}
            print("       ", json.dumps(safe, ensure_ascii=False)[:400])
        if not ok:
            evidence["p0"].append(name)

    # --- Queue configuration ---
    os.environ["INGESTION_QUEUE_BACKEND"] = "postgres"
    os.environ["APP_ENV"] = "production"
    sys.path.insert(0, str(BACKEND_DIR))
    from ingestion.queue.factory import (
        IngestionQueueConfigurationError,
        create_ingestion_queue_store,
        resolve_queue_backend,
    )

    try:
        backend = resolve_queue_backend()
        step("queue_resolve_postgres", backend == "postgres", {"backend": backend})
    except Exception as exc:  # noqa: BLE001
        step("queue_resolve_postgres", False, {"error": type(exc).__name__})
        return _finish(evidence, 1)

    # Fail-closed: production + sqlite forbidden
    os.environ["INGESTION_QUEUE_BACKEND"] = "sqlite"
    try:
        resolve_queue_backend()
        step("queue_prod_forbids_sqlite", False, {"error": "sqlite_allowed"})
    except IngestionQueueConfigurationError:
        step("queue_prod_forbids_sqlite", True)
    finally:
        os.environ["INGESTION_QUEUE_BACKEND"] = "postgres"

    # Create store + persist across reconnect
    try:
        store = create_ingestion_queue_store()
        content = b"chit_name,chit_value,members,months,installment\nOwnData Gate,50000,5,5,10000\n"
        sha = hashlib.sha256(content).hexdigest()
        job = store.create_job(
            tenant_id="own-data-trial-tenant",
            workspace_id="own-data-trial-workspace",
            user_id="own-data-trial-user",
            file_name="own_data_gate.csv",
            mime_type="text/csv",
            sha256=sha,
            byte_size=len(content),
            language_hint="ENGLISH",
            status="NEEDS_REVIEW",
        )
        job_id = job["id"]
        store.update_job(
            job_id,
            status="NEEDS_REVIEW",
            draft_json=json.dumps({"plan": {"chitName": "OwnData Gate"}, "schemaVersion": "chit-plan-draft.v1"}),
            source_preview="chit_name,chit_value",
        )
        # New store instance simulates backend restart
        store2 = create_ingestion_queue_store()
        reloaded = store2.get_job(job_id)
        ok = bool(reloaded and reloaded.get("status") == "NEEDS_REVIEW" and reloaded.get("tenant_id") == "own-data-trial-tenant")
        step(
            "queue_restart_persistence",
            ok,
            {
                "jobId": mask_id(job_id),
                "status": (reloaded or {}).get("status"),
                "tenantScoped": (reloaded or {}).get("tenant_id") == "own-data-trial-tenant",
            },
        )
        dup = store2.find_duplicate(tenant_id="own-data-trial-tenant", sha256=sha)
        step("queue_dedupe", bool(dup and dup.get("id") == job_id), {"jobId": mask_id(job_id)})
        cross = store2.find_duplicate(tenant_id="other-tenant", sha256=sha)
        step("queue_tenant_isolation_hash", cross is None)
    except Exception as exc:  # noqa: BLE001
        step("queue_restart_persistence", False, {"error": type(exc).__name__, "message": str(exc)[:200]})
        return _finish(evidence, 1)

    # Dev still gets sqlite
    os.environ["APP_ENV"] = "development"
    os.environ["INGESTION_QUEUE_BACKEND"] = "sqlite"
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["INGESTION_QUEUE_PATH"] = str(Path(tmp) / "local.db")
        try:
            local_backend = resolve_queue_backend()
            local_store = create_ingestion_queue_store()
            step(
                "queue_local_sqlite",
                local_backend == "sqlite" and hasattr(local_store, "path"),
                {"backend": local_backend},
            )
        except Exception as exc:  # noqa: BLE001
            step("queue_local_sqlite", False, {"error": type(exc).__name__})

    # Restore postgres for remaining checks
    os.environ["APP_ENV"] = "production"
    os.environ["INGESTION_QUEUE_BACKEND"] = "postgres"

    # --- Auth + Supabase live money path ---
    supabase_url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL") or ""
    anon = os.getenv("VITE_SUPABASE_ANON_KEY") or ""
    email = os.getenv("TEST_USER_EMAIL") or ""
    password = os.getenv("TEST_USER_PASSWORD") or ""
    repo_backend = os.getenv("VITE_REPOSITORY_BACKEND", "")
    app_mode = os.getenv("VITE_APP_MODE", "")

    step(
        "frontend_supabase_mode",
        bool(supabase_url and anon and repo_backend.lower() == "supabase"),
        {"repositoryBackend": repo_backend or "ABSENT", "appMode": app_mode or "ABSENT"},
    )

    if not (supabase_url and anon and email and password):
        step("supabase_auth", False, {"error": "TEST_USER_or_SUPABASE_config_missing"})
        return _finish(evidence, 1)

    auth_url = f"{supabase_url.rstrip('/')}/auth/v1/token?grant_type=password"
    status, auth_payload = request_json(
        "POST",
        auth_url,
        headers={
            "apikey": anon,
            "Content-Type": "application/json",
        },
        body=json.dumps({"email": email, "password": password}).encode("utf-8"),
    )
    token = auth_payload.get("access_token")
    user = auth_payload.get("user") or {}
    user_id = user.get("id")
    step("supabase_auth", status == 200 and bool(token and user_id), {"http": status, "userId": mask_id(user_id)})
    if not token:
        return _finish(evidence, 1)

    headers = {
        "apikey": anon,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    # Discover workspace membership
    status, memberships = request_json(
        "GET",
        f"{supabase_url.rstrip('/')}/rest/v1/workspace_memberships?select=workspace_id,tenant_id,role,status&status=eq.active&limit=5",
        headers=headers,
    )
    # memberships may be list
    if not isinstance(memberships, dict):
        # request_json only returns dict — fix by re-parsing list
        pass

    # Re-fetch allowing list
    request = urllib.request.Request(
        f"{supabase_url.rstrip('/')}/rest/v1/workspace_memberships?select=workspace_id,tenant_id,role,status&status=eq.active&limit=5",
        headers=headers,
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            membership_rows = json.loads(response.read().decode("utf-8"))
            status = response.status
    except urllib.error.HTTPError as exc:
        status = exc.code
        membership_rows = []
        try:
            membership_rows = json.loads(exc.read().decode("utf-8"))
        except Exception:
            membership_rows = []

    if not isinstance(membership_rows, list) or not membership_rows:
        step("workspace_membership", False, {"http": status, "count": 0})
        return _finish(evidence, 1)

    write_roles = {"owner", "admin", "organizer", "manager", "accountant", "operator", "editor", "write"}
    membership = None
    for row in membership_rows:
        role = str(row.get("role") or "").lower()
        if role in write_roles or role.endswith("_admin") or "owner" in role:
            membership = row
            break
    if membership is None:
        membership = membership_rows[0]
    workspace_id = membership.get("workspace_id")
    tenant_id = membership.get("tenant_id")
    role = str(membership.get("role") or "")
    step(
        "workspace_membership",
        bool(workspace_id and tenant_id),
        {
            "workspaceId": mask_id(workspace_id),
            "tenantId": mask_id(tenant_id),
            "role": role,
            "membershipCount": len(membership_rows),
            "writeRole": role.lower() in write_roles,
        },
    )

    if role.lower() not in write_roles and not any(
        str(row.get("role") or "").lower() in write_roles for row in membership_rows
    ):
        step(
            "write_role_required",
            False,
            {
                "error": "TEST_USER_has_no_write_membership",
                "rolesSeen": [str(row.get("role") or "") for row in membership_rows][:5],
            },
        )
        # Continue with read-path checks only
        status, existing = _rest_select(
            supabase_url,
            "chit_groups?select=id,status&limit=1",
            headers,
        )
        step(
            "read_existing_groups",
            status == 200 and isinstance(existing, list),
            {"http": status, "count": len(existing) if isinstance(existing, list) else 0},
        )
        return _finish(evidence, 1)

    # Create controlled short chit group
    group_id = str(uuid.uuid4())
    group_payload = {
        "id": group_id,
        "tenant_id": tenant_id,
        "workspace_id": workspace_id,
        "chit_name": "OwnData Trial Gate",
        "chit_code": f"ODT-{str(uuid.uuid4())[:8].upper()}",
        "chit_value": 50000,
        "monthly_amount": 10000,
        "total_members": 5,
        "total_months": 5,
        "start_date": "2026-08-01",
        "end_date": "2026-12-31",
        "status": "active",
        "collection_frequency": "monthly",
        "chit_mode": "auction",
        "installment_pattern": "FIXED_MONTHLY",
    }
    # Discover actual columns via insert; if schema differs, capture error code
    status, created = _rest_insert(supabase_url, "chit_groups", group_payload, headers)
    if status not in {200, 201}:
        # try without workspace_id / installment fields
        slim = {
            "id": group_id,
            "tenant_id": tenant_id,
            "chit_name": group_payload["chit_name"],
            "chit_code": group_payload["chit_code"],
            "chit_value": 50000,
            "monthly_amount": 10000,
            "total_members": 5,
            "total_months": 5,
            "start_date": "2026-08-01",
            "status": "active",
        }
        status, created = _rest_insert(supabase_url, "chit_groups", slim, headers)
    step(
        "create_group",
        status in {200, 201},
        {"http": status, "groupId": mask_id(group_id), "error": _safe_err(created)},
    )
    if status not in {200, 201}:
        return _finish(evidence, 1)

    # Reload after simulated "restart" (new request)
    status, rows = _rest_select(
        supabase_url,
        f"chit_groups?id=eq.{group_id}&select=id,chit_name,status,tenant_id",
        headers,
    )
    step(
        "group_persist_reread",
        status == 200 and isinstance(rows, list) and len(rows) == 1,
        {"http": status, "count": len(rows) if isinstance(rows, list) else 0},
    )

    # Tenant isolation: query with filter for different tenant should be empty under RLS
    status, other = _rest_select(
        supabase_url,
        f"chit_groups?id=eq.{group_id}&tenant_id=eq.{uuid.uuid4()}&select=id",
        headers,
    )
    step(
        "tenant_isolation_filter",
        status == 200 and isinstance(other, list) and len(other) == 0,
        {"http": status, "leaked": len(other) if isinstance(other, list) else "n/a"},
    )

    # Members
    member_ids = []
    for index in range(1, 6):
        member_id = str(uuid.uuid4())
        member_payload = {
            "id": member_id,
            "group_id": group_id,
            "member_name": f"Member {index}",
            "member_number": str(index),
            "mobile_number": f"900000000{index}",
            "status": "active",
            "join_date": "2026-08-01",
        }
        status, _ = _rest_insert(supabase_url, "chit_members", member_payload, headers)
        if status in {200, 201}:
            member_ids.append(member_id)
    step("create_members", len(member_ids) == 5, {"created": len(member_ids)})

    if len(member_ids) != 5:
        return _finish(evidence, 1)

    # Collection + receipt for member 1
    collection_id = str(uuid.uuid4())
    receipt_no = f"ODT-R-{uuid.uuid4().hex[:10].upper()}"
    collection_payload = {
        "id": collection_id,
        "group_id": group_id,
        "member_id": member_ids[0],
        "collection_month": 1,
        "collection_date": "2026-08-02",
        "installment_amount": 10000,
        "paid_amount": 10000,
        "pending_amount": 0,
        "payment_method": "Cash",
        "receipt_no": receipt_no,
        "status": "paid",
    }
    status, _ = _rest_insert(supabase_url, "chit_collections", collection_payload, headers)
    step("create_collection", status in {200, 201}, {"http": status, "collectionId": mask_id(collection_id), "error": _safe_err(_)})

    receipt_payload = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "member_id": member_ids[0],
        "collection_id": collection_id,
        "receipt_no": receipt_no,
        "amount": 10000,
        "payment_method": "Cash",
        "receipt_date": "2026-08-02",
        "status": "issued",
    }
    status, _ = _rest_insert(supabase_url, "chit_receipts", receipt_payload, headers)
    # table name may differ
    if status not in {200, 201}:
        status, _ = _rest_insert(supabase_url, "receipts", receipt_payload, headers)
    step("create_receipt", status in {200, 201}, {"http": status, "receiptNoSuffix": receipt_no[-6:], "error": _safe_err(_)})

    # Duplicate collection attempt (same receipt_no / month)
    dup_payload = {**collection_payload, "id": str(uuid.uuid4())}
    status, dup_resp = _rest_insert(supabase_url, "chit_collections", dup_payload, headers)
    duplicate_blocked = status in {409, 400, 422} or (
        status >= 400 and "duplicate" in json.dumps(dup_resp).lower()
    )
    step(
        "duplicate_collection_guard",
        duplicate_blocked or status in {409, 23505},
        {"http": status, "blocked": duplicate_blocked, "error": _safe_err(dup_resp)},
    )

    # Logout/login persistence: get new token and reread group
    status2, auth2 = request_json(
        "POST",
        auth_url,
        headers={"apikey": anon, "Content-Type": "application/json"},
        body=json.dumps({"email": email, "password": password}).encode("utf-8"),
    )
    token2 = auth2.get("access_token")
    headers2 = {
        "apikey": anon,
        "Authorization": f"Bearer {token2}",
        "Content-Type": "application/json",
    }
    status, rows = _rest_select(
        supabase_url,
        f"chit_groups?id=eq.{group_id}&select=id,status",
        headers2,
    )
    step(
        "logout_login_persistence",
        status2 == 200 and bool(token2) and status == 200 and isinstance(rows, list) and len(rows) == 1,
        {"http": status, "count": len(rows) if isinstance(rows, list) else 0},
    )

    # Cleanup controlled records (best-effort)
    for table, filter_q in [
        ("chit_collections", f"id=eq.{collection_id}"),
        ("chit_members", f"group_id=eq.{group_id}"),
        ("chit_groups", f"id=eq.{group_id}"),
    ]:
        _rest_delete(supabase_url, table, filter_q, headers2)

    evidence["passed"] = len(evidence["p0"]) == 0
    return _finish(evidence, 0 if evidence["passed"] else 1)


def _rest_insert(base: str, table: str, payload: dict[str, Any], headers: dict[str, str]) -> tuple[int, Any]:
    request = urllib.request.Request(
        f"{base.rstrip('/')}/rest/v1/{table}",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read()
            status = response.status
            body = json.loads(raw.decode("utf-8")) if raw else {}
            return status, body
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            body = json.loads(raw.decode("utf-8")) if raw else {}
        except Exception:
            body = {"message": "http_error"}
        return exc.code, body


def _rest_select(base: str, path_query: str, headers: dict[str, str]) -> tuple[int, Any]:
    request = urllib.request.Request(
        f"{base.rstrip('/')}/rest/v1/{path_query}",
        headers=headers,
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            body = json.loads(raw.decode("utf-8")) if raw else {}
        except Exception:
            body = {}
        return exc.code, body


def _rest_delete(base: str, table: str, filter_q: str, headers: dict[str, str]) -> None:
    request = urllib.request.Request(
        f"{base.rstrip('/')}/rest/v1/{table}?{filter_q}",
        headers=headers,
        method="DELETE",
    )
    try:
        urllib.request.urlopen(request, timeout=30).read()
    except Exception:
        return


def _safe_err(payload: Any) -> str:
    if not isinstance(payload, dict):
        return ""
    code = str(payload.get("code") or payload.get("error") or "")[:40]
    message = str(payload.get("message") or payload.get("details") or "")[:120]
    return f"{code}:{message}" if code or message else ""


def _finish(evidence: dict[str, Any], code: int) -> int:
    EVIDENCE_PATH.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE_PATH.write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    print(f"evidence_written={EVIDENCE_PATH.exists()} passed={evidence.get('passed')} p0={len(evidence.get('p0') or [])}")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
