"""FastAPI routes for universal file ingestion."""

from __future__ import annotations

import os
from pathlib import PurePath
from typing import Any, Callable

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from ingestion.service import IngestionService
from ingestion.signatures import IngestionReject


class DraftEditRequest(BaseModel):
    edits: dict[str, Any] = Field(default_factory=dict)
    reason: str = ""


class ConfirmRequest(BaseModel):
    reason: str = "organizer_confirmation"


def build_ingestion_router(workspace_dependency: Callable[..., Any]) -> APIRouter:
    router = APIRouter(prefix="/v1/ingestion", tags=["ingestion"])
    service = IngestionService()

    @router.post("/jobs")
    async def create_job(
        file: UploadFile = File(...),
        language_hint: str = Form("UNKNOWN"),
        batch_id: str | None = Form(None),
        context: tuple[Any, ...] = Depends(workspace_dependency),
    ) -> dict[str, Any]:
        user, tenant = _unpack_context(context)
        validate_file_name(file.filename)
        content = await read_bounded(file)
        try:
            job = service.enqueue(
                content=content,
                filename=file.filename or "upload.bin",
                declared_mime=file.content_type or "application/octet-stream",
                tenant_id=tenant["tenant_id"],
                workspace_id=tenant["workspace_id"] or None,
                user_id=_editor_id(user),
                batch_id=batch_id,
                language_hint=(language_hint or "UNKNOWN").upper(),
            )
            return _public_job(job)
        except IngestionReject as exc:
            raise_domain(exc)
        finally:
            await file.close()

    @router.get("/jobs/{job_id}")
    async def get_job(
        job_id: str,
        context: tuple[Any, ...] = Depends(workspace_dependency),
    ) -> dict[str, Any]:
        _unpack_context(context)
        job = service.store.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail={"code": "OCR_FAILED", "message": "Job not found."})
        _assert_tenant(job, context)
        return _public_job(job)

    @router.get("/batches/{batch_id}")
    async def get_batch(
        batch_id: str,
        context: tuple[Any, ...] = Depends(workspace_dependency),
    ) -> dict[str, Any]:
        _unpack_context(context)
        jobs = service.store.list_batch(batch_id)
        jobs = [job for job in jobs if _tenant_matches(job, context)]
        counts: dict[str, int] = {}
        for job in jobs:
            counts[job["status"]] = counts.get(job["status"], 0) + 1
        return {
            "batchId": batch_id,
            "total": len(jobs),
            "counts": counts,
            "jobs": [_public_job(job) for job in jobs],
        }

    @router.post("/jobs/{job_id}/ai-reprocess")
    async def ai_reprocess(
        job_id: str,
        context: tuple[Any, ...] = Depends(workspace_dependency),
    ) -> dict[str, Any]:
        _unpack_context(context)
        job = service.store.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail={"code": "OCR_FAILED", "message": "Job not found."})
        _assert_tenant(job, context)
        try:
            updated = service.process_job(job_id, force_ai=True)
            return _public_job(updated)
        except IngestionReject as exc:
            raise_domain(exc)

    @router.patch("/jobs/{job_id}/draft")
    async def patch_draft(
        job_id: str,
        body: DraftEditRequest,
        context: tuple[Any, ...] = Depends(workspace_dependency),
    ) -> dict[str, Any]:
        user, _ = _unpack_context(context)
        job = service.store.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail={"code": "OCR_FAILED", "message": "Job not found."})
        _assert_tenant(job, context)
        try:
            updated = service.save_edits(
                job_id,
                edits=body.edits,
                editor=_editor_id(user),
                reason=body.reason,
            )
            return _public_job(updated)
        except IngestionReject as exc:
            raise_domain(exc)

    @router.post("/jobs/{job_id}/confirm")
    async def confirm_job(
        job_id: str,
        body: ConfirmRequest,
        context: tuple[Any, ...] = Depends(workspace_dependency),
    ) -> dict[str, Any]:
        user, _ = _unpack_context(context)
        job = service.store.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail={"code": "OCR_FAILED", "message": "Job not found."})
        _assert_tenant(job, context)
        try:
            updated = service.confirm(
                job_id,
                editor=_editor_id(user),
            )
            return _public_job(updated)
        except IngestionReject as exc:
            raise_domain(exc)

    return router


def _unpack_context(context: Any) -> tuple[Any, dict[str, str]]:
    """workspace_context returns (workspace_id, tenant_id, data_scope, role, principal)."""
    if isinstance(context, tuple) and len(context) >= 5:
        workspace_id, tenant_id, _scope, _role, principal = context[:5]
        return principal, {
            "tenant_id": str(tenant_id),
            "workspace_id": str(workspace_id),
        }
    if isinstance(context, tuple) and len(context) >= 2:
        return context[0], {
            "tenant_id": str(getattr(context[1], "tenant_id", context[1])),
            "workspace_id": str(getattr(context[1], "workspace_id", "")),
        }
    return context, {"tenant_id": "", "workspace_id": ""}


def _tenant_id(context: Any) -> str:
    _, tenant = _unpack_context(context)
    return str(tenant.get("tenant_id") or "")


def _tenant_matches(job: dict[str, Any], context: Any) -> bool:
    return str(job.get("tenant_id") or "") == _tenant_id(context)


def _assert_tenant(job: dict[str, Any], context: Any) -> None:
    if not _tenant_matches(job, context):
        raise HTTPException(status_code=404, detail={"code": "OCR_FAILED", "message": "Job not found."})


def _editor_id(user: Any) -> str:
    return str(
        getattr(user, "user_id", None)
        or getattr(user, "sub", None)
        or getattr(user, "id", None)
        or "organizer"
    )


def _public_job(job: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": job.get("id"),
        "batchId": job.get("batch_id"),
        "status": job.get("status"),
        "fileName": job.get("file_name"),
        "mimeType": job.get("mime_type"),
        "sha256": job.get("sha256"),
        "byteSize": job.get("byte_size"),
        "parserVersion": job.get("parser_version"),
        "schemaVersion": job.get("schema_version"),
        "languageHint": job.get("language_hint"),
        "errorCode": job.get("error_code"),
        "errorMessage": job.get("error_message"),
        "sourcePreview": job.get("source_preview"),
        "draft": job.get("draft"),
        "audit": job.get("audit") or [],
        "deduplicated": job.get("deduplicated", False),
        "confirmation": job.get("confirmation"),
        "createdAt": job.get("created_at"),
        "updatedAt": job.get("updated_at"),
        "message": job.get("message"),
    }


def validate_file_name(filename: str | None) -> None:
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"code": "UNSUPPORTED_DOCUMENT", "message": "Filename required."},
        )
    path = PurePath(filename)
    if path.name != filename or ".." in path.parts:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"code": "UNSUPPORTED_DOCUMENT", "message": "Invalid filename."},
        )


async def read_bounded(file: UploadFile) -> bytes:
    max_mb = max(1.0, float(os.getenv("INGESTION_MAX_FILE_MB", os.getenv("OCR_MAX_FILE_MB", "15"))))
    max_bytes = int(max_mb * 1024 * 1024)
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"code": "FILE_TOO_LARGE", "message": "File exceeds configured size limit."},
            )
        chunks.append(chunk)
    return b"".join(chunks)


def raise_domain(exc: IngestionReject) -> None:
    code_map = {
        "FILE_TOO_LARGE": status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        "UNSUPPORTED_DOCUMENT": status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        "DOCUMENT_UNREADABLE": status.HTTP_422_UNPROCESSABLE_CONTENT,
        "PDF_PAGE_LIMIT_EXCEEDED": status.HTTP_422_UNPROCESSABLE_CONTENT,
        "OCR_NOT_CONFIGURED": status.HTTP_503_SERVICE_UNAVAILABLE,
        "OCR_RATE_LIMIT": status.HTTP_429_TOO_MANY_REQUESTS,
        "OCR_TIMEOUT": status.HTTP_504_GATEWAY_TIMEOUT,
        "OCR_SCHEMA_INVALID": status.HTTP_422_UNPROCESSABLE_CONTENT,
    }
    raise HTTPException(
        status_code=code_map.get(exc.code, status.HTTP_502_BAD_GATEWAY),
        detail={"code": exc.code, "message": exc.message, "retryable": False},
    )
