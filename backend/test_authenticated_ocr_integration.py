"""Credential-safe authenticated OCR integration verification.

Credentials are read only from backend/.env.test.local. Authentication
responses and bearer tokens are never printed or persisted.
"""

from __future__ import annotations

import asyncio
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any


BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
TEST_ENV_FILE = BACKEND_DIR / ".env.test.local"
FIXTURE = BACKEND_DIR / "tests" / "fixtures" / "synthetic_chit_receipt.png"
API_BASE = os.getenv("TEST_API_BASE", "http://127.0.0.1:8000").rstrip("/")
REQUEST_TIMEOUT_SECONDS = max(
    1.0, float(os.getenv("TEST_REQUEST_TIMEOUT_SECONDS", "180"))
)


class VerificationError(RuntimeError):
    pass


def load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        if key:
            os.environ.setdefault(key, value)


def request_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
    expected: set[int] | None = None,
) -> tuple[int, dict[str, Any]]:
    request = urllib.request.Request(url, data=body, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(
            request, timeout=REQUEST_TIMEOUT_SECONDS
        ) as response:
            status_code = response.status
            raw = response.read()
    except urllib.error.HTTPError as exc:
        status_code = exc.code
        raw = exc.read()
    except urllib.error.URLError as exc:
        raise VerificationError("The local backend or authentication provider is unreachable.") from exc

    try:
        payload = json.loads(raw.decode("utf-8")) if raw else {}
    except (UnicodeDecodeError, json.JSONDecodeError):
        payload = {}
    if expected is not None and status_code not in expected:
        raise VerificationError(
            f"Unexpected HTTP {status_code}: {sanitized_error(payload)}"
        )
    return status_code, payload


def sanitized_error(payload: dict[str, Any]) -> str:
    detail = payload.get("detail", {})
    if isinstance(detail, dict):
        code = str(detail.get("code", "UNKNOWN"))[:80]
        message = str(detail.get("message", "Request failed"))[:240]
        return f"{code}: {message}"
    if isinstance(detail, str):
        return detail[:240]
    error = payload.get("error", {})
    if isinstance(error, dict):
        code = str(error.get("code") or error.get("status") or "UNKNOWN")[:80]
        message = str(error.get("message", "Request failed"))[:240]
        return f"{code}: {message}"
    return "Request failed (response redacted)"


def multipart_body(
    file_path: Path,
    *,
    document_type: str = "CHIT_REGISTER",
    content_override: bytes | None = None,
    filename_override: str | None = None,
    mime_override: str | None = None,
) -> tuple[bytes, str]:
    boundary = f"----vardhan-ocr-{uuid.uuid4().hex}"
    filename = filename_override or file_path.name
    mime_type = mime_override or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    content = file_path.read_bytes() if content_override is None else content_override
    pieces = [
        f"--{boundary}\r\n".encode(),
        b'Content-Disposition: form-data; name="document_type"\r\n\r\n',
        document_type.encode(),
        b"\r\n",
        f"--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode(),
        f"Content-Type: {mime_type}\r\n\r\n".encode(),
        content,
        b"\r\n",
        f"--{boundary}--\r\n".encode(),
    ]
    return b"".join(pieces), f"multipart/form-data; boundary={boundary}"


def login() -> tuple[str, str]:
    email = os.getenv("TEST_USER_EMAIL", "").strip()
    password = os.getenv("TEST_USER_PASSWORD", "")
    if not email or not password:
        raise VerificationError(
            "Local test credentials are missing. Fill TEST_USER_EMAIL and "
            "TEST_USER_PASSWORD manually in backend/.env.test.local, then rerun this test. "
            "Do not paste credentials into Codex chat."
        )

    supabase_url = (
        os.getenv("SUPABASE_URL", "") or os.getenv("VITE_SUPABASE_URL", "")
    ).rstrip("/")
    anon_key = os.getenv("VITE_SUPABASE_ANON_KEY", "")
    if not supabase_url or not anon_key:
        raise VerificationError("Supabase URL or anonymous client key is not configured locally.")

    body = json.dumps({"email": email, "password": password}).encode("utf-8")
    status_code, payload = request_json(
        "POST",
        f"{supabase_url}/auth/v1/token?grant_type=password",
        headers={
            "apikey": anon_key,
            "Content-Type": "application/json",
        },
        body=body,
        expected={200, 400, 401},
    )
    if status_code != 200:
        raise VerificationError(
            f"Supabase password login failed with HTTP {status_code}: {sanitized_error(payload)}"
        )
    token = payload.get("access_token")
    user_id = (payload.get("user") or {}).get("id")
    if not isinstance(token, str) or not token or not isinstance(user_id, str):
        raise VerificationError("Supabase login succeeded but returned an incomplete redacted session.")
    return token, user_id


async def resolve_workspace_id(database_url: str, user_id: str) -> str:
    try:
        import asyncpg
    except ImportError as exc:
        raise VerificationError("asyncpg is required for the membership verification.") from exc

    connection = await asyncpg.connect(database_url, command_timeout=20)
    try:
        workspace_id = await connection.fetchval(
            """
            select workspace_id
            from public.workspace_memberships
            where user_id = $1 and status = 'active'
            order by created_at
            limit 1
            """,
            uuid.UUID(user_id),
        )
    finally:
        await connection.close()
    if workspace_id is None:
        raise VerificationError("The authenticated user has no active workspace membership.")
    return str(workspace_id)


def auth_headers(token: str, workspace_id: str | None = None) -> dict[str, str]:
    headers = {"Authorization": f"Bearer {token}"}
    if workspace_id:
        headers["X-Workspace-Id"] = workspace_id
    return headers


async def verify() -> None:
    # Mirror backend precedence: process -> backend/.env -> root .env.
    load_env_file(BACKEND_DIR / ".env")
    load_env_file(PROJECT_ROOT / ".env")
    # Frontend-only local values may supply the public Supabase client settings.
    load_env_file(PROJECT_ROOT / ".env.local")
    load_env_file(TEST_ENV_FILE)

    if not os.getenv("TEST_USER_EMAIL", "").strip() or not os.getenv("TEST_USER_PASSWORD", ""):
        raise VerificationError(
            "Local test credentials are missing. Fill TEST_USER_EMAIL and "
            "TEST_USER_PASSWORD manually in backend/.env.test.local, then rerun this test. "
            "Do not paste credentials into Codex chat."
        )

    status_code, health = request_json("GET", f"{API_BASE}/api/health", expected={200})
    required_health = {
        "status": "ok",
        "database": True,
        "jwt": True,
        "ocrProvider": True,
    }
    missing = [key for key, value in required_health.items() if health.get(key) != value]
    if missing:
        raise VerificationError(
            "Health verification failed: "
            f"HTTP {status_code}, status={health.get('status')}, "
            f"database={bool(health.get('database'))}, jwt={bool(health.get('jwt'))}, "
            f"ocrProvider={bool(health.get('ocrProvider'))}, missing={missing}"
        )
    print("health: HTTP 200, database=true, jwt=true, ocrProvider=true")
    if isinstance(health.get("ingestionQueue"), dict):
        print(
            "ingestionQueue:",
            f"backend={health['ingestionQueue'].get('backend')},",
            f"ready={bool(health['ingestionQueue'].get('ready'))}",
        )

    if not FIXTURE.is_file():
        raise VerificationError(f"OCR fixture is missing: {FIXTURE}")
    body, content_type = multipart_body(FIXTURE)
    unauth_status, _ = request_json(
        "POST",
        f"{API_BASE}/api/v1/ocr/extract",
        headers={"Content-Type": content_type},
        body=body,
        expected={401},
    )
    print(f"unauthenticated OCR: HTTP {unauth_status}")

    invalid_status, _ = request_json(
        "POST",
        f"{API_BASE}/api/v1/ocr/extract",
        headers={
            "Authorization": "Bearer invalid-integration-test-token",
            "X-Workspace-Id": str(uuid.uuid4()),
            "Content-Type": content_type,
        },
        body=body,
        expected={401},
    )
    print(f"invalid-token OCR: HTTP {invalid_status}")

    token, user_id = login()
    verify_status, verify_payload = request_json(
        "GET",
        f"{API_BASE}/v3/auth/verify",
        headers=auth_headers(token),
        expected={200},
    )
    if verify_payload.get("authenticated") is not True:
        raise VerificationError("Authentication verification did not confirm the user.")
    print(f"authentication: HTTP {verify_status}, authenticated=true")

    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise VerificationError(
            "DATABASE_URL is missing. Add it manually to backend/.env without sharing it in chat."
        )
    workspace_id = await resolve_workspace_id(database_url, user_id)
    print("workspace authorization: active membership found")

    ocr_status, result = request_json(
        "POST",
        f"{API_BASE}/api/v1/ocr/extract",
        headers={
            **auth_headers(token, workspace_id),
            "Content-Type": content_type,
        },
        body=body,
        expected={200},
    )
    extraction = result.get("extraction") or {}
    raw_text = result.get("rawText") or ""
    summary = {
        "provider": result.get("provider"),
        "documentType": result.get("documentType"),
        "rawTextLength": len(raw_text),
        "memberRows": len(extraction.get("members") or []),
        "scheduleRows": len(extraction.get("installmentSchedule") or []),
        "warningCount": len(result.get("warnings") or []),
    }
    if not raw_text.strip():
        raise VerificationError("OCR returned HTTP 200 but no genuine extracted text.")
    print(f"authenticated OCR: HTTP {ocr_status}, summary={json.dumps(summary, sort_keys=True)}")

    empty_body, empty_type = multipart_body(FIXTURE, content_override=b"")
    empty_status, _ = request_json(
        "POST",
        f"{API_BASE}/api/v1/ocr/extract",
        headers={**auth_headers(token, workspace_id), "Content-Type": empty_type},
        body=empty_body,
        expected={422},
    )
    print(f"empty upload: HTTP {empty_status}")

    unsupported_body, unsupported_type = multipart_body(
        FIXTURE,
        content_override=b"plain text is unsupported",
        filename_override="unsupported.txt",
        mime_override="text/plain",
    )
    unsupported_status, _ = request_json(
        "POST",
        f"{API_BASE}/api/v1/ocr/extract",
        headers={**auth_headers(token, workspace_id), "Content-Type": unsupported_type},
        body=unsupported_body,
        expected={415},
    )
    print(f"unsupported upload: HTTP {unsupported_status}")


if __name__ == "__main__":
    try:
        asyncio.run(verify())
    except VerificationError as exc:
        print(f"VERIFICATION BLOCKED: {exc}", file=sys.stderr)
        raise SystemExit(2) from None
