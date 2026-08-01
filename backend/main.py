# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "asyncpg>=0.30,<1",
#   "cryptography>=44,<46",
#   "fastapi>=0.115,<1",
#   "pyjwt>=2.10,<3",
#   "pydantic>=2.10,<3",
#   "python-multipart>=0.0.20,<1",
#   "redis>=5,<7",
#   "uvicorn[standard]>=0.34,<1",
# ]
# ///

from __future__ import annotations

import hashlib
import json
import os
import secrets
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Literal
from pathlib import Path

import asyncpg
import jwt
from cryptography.fernet import Fernet, InvalidToken
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from supabase_jwt import (
    get_current_user as _get_current_user,
    get_optional_user as _get_optional_user,
    require_tenant_context,
    require_platform_owner,
    require_role,
    AuthenticatedUser,
    TenantContext,
)
async def get_current_user(request: Request) -> AuthenticatedUser:
    """Wrapper that injects settings into supabase_jwt's get_current_user."""
    return await _get_current_user(request, settings.jwt_secret, settings.jwt_audience)


async def get_optional_user(request: Request) -> AuthenticatedUser | None:
    """Wrapper that injects settings into supabase_jwt's get_optional_user."""
    return await _get_optional_user(request, settings.jwt_secret, settings.jwt_audience)


from rate_limit import create_rate_limit_adapter
from enterprise_api import build_enterprise_router
from structured_logging import configure_production_logging
from ocr_api import build_ocr_router
from vision_providers import create_vision_provider


def _load_env_file(path: Path) -> None:
    """Load simple KEY=VALUE pairs without overriding process environment."""
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
        if not key:
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"\"", "'"}:
            value = value[1:-1]
        os.environ.setdefault(key, value)


# Process variables have highest priority. Backend secrets/configuration then come
# from backend/.env, with the root .env used only as a per-key fallback.
_BACKEND_DIR = Path(__file__).resolve().parent
_load_env_file(_BACKEND_DIR / ".env")
_load_env_file(_BACKEND_DIR.parent / ".env")


Money = Decimal
WRITE_ROLES = frozenset({"owner", "admin", "operator"})
ISO_4217 = frozenset(
    {
        "AED", "AUD", "BDT", "BRL", "CAD", "CHF", "CNY", "EUR", "GBP", "HKD",
        "IDR", "INR", "JPY", "KRW", "LKR", "MXN", "MYR", "NPR", "NZD", "PHP",
        "PKR", "QAR", "RUB", "SAR", "SGD", "THB", "TRY", "USD", "VND", "ZAR",
    }
)


@dataclass(frozen=True)
class Settings:
    database_url: str
    supabase_url: str
    jwt_secret: str
    jwt_audience: str
    draw_encryption_key: str
    cors_origins: tuple[str, ...]

    @classmethod
    def from_environment(cls) -> "Settings":
        origins = tuple(
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
            if origin.strip()
        )
        return cls(
            database_url=os.getenv("DATABASE_URL", ""),
            supabase_url=(
                os.getenv("SUPABASE_URL", "")
                or os.getenv("VITE_SUPABASE_URL", "")
            ).rstrip("/"),
            jwt_secret=os.getenv("SUPABASE_JWT_SECRET", ""),
            jwt_audience=os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated"),
            draw_encryption_key=os.getenv("DRAW_ENCRYPTION_KEY", ""),
            cors_origins=origins,
        )


settings = Settings.from_environment()

RATE_LIMIT_WINDOW_SECONDS = max(1, int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60")))
RATE_LIMIT_REQUESTS = max(1, int(os.getenv("RATE_LIMIT_REQUESTS", "120")))
rate_limit_adapter = create_rate_limit_adapter()
logger = configure_production_logging(os.getenv("LOG_LEVEL", "INFO"))


def apply_security_headers(response: Response) -> Response:
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


def normalize_currency(value: str) -> str:
    currency = value.strip().upper()
    if currency not in ISO_4217:
        raise ValueError(f"Unsupported ISO 4217 currency: {currency}")
    return currency


def decimal_value(value: Any, field_name: str) -> Decimal:
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be numeric")
    try:
        result = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be numeric") from exc
    if not result.is_finite():
        raise ValueError(f"{field_name} must be finite")
    return result


def money_round(value: Decimal, precision: int = 2) -> Decimal:
    quantum = Decimal(1).scaleb(-precision)
    return value.quantize(quantum, rounding=ROUND_HALF_UP)


class RuleCondition(StrictModel):
    field: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z][A-Za-z0-9_.-]*$")
    operator: Literal["EQ", "NE", "LT", "LTE", "GT", "GTE", "IN", "BETWEEN"]
    value: Any


class CalculationRule(StrictModel):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z][A-Za-z0-9_.-]*$")
    operation: Literal[
        "SET", "ADD", "SUBTRACT", "MULTIPLY", "PERCENT_ADD", "PERCENT_SUBTRACT",
        "MIN", "MAX", "ROUND",
    ]
    value: Any
    when: list[RuleCondition] = Field(default_factory=list, max_length=20)
    label: str | None = Field(default=None, max_length=160)


class MonthOverride(StrictModel):
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    rules: list[CalculationRule] = Field(default_factory=list, max_length=100)


class MonthlyMultiplier(StrictModel):
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    multiplier: Decimal = Field(gt=0, le=1000)


class PenaltyAccrual(StrictModel):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z][A-Za-z0-9_.-]*$")
    principal: Decimal = Field(ge=0)
    rate_percent: Decimal = Field(default=Decimal("0"), alias="ratePercent", ge=0, le=1000)
    periods: int = Field(default=0, ge=0, le=600)
    fixed_amount: Decimal = Field(default=Decimal("0"), alias="fixedAmount", ge=0)
    aggregation: Literal["simple", "compound"] = "simple"
    cap_amount: Decimal | None = Field(default=None, alias="capAmount", ge=0)
    label: str | None = Field(default=None, max_length=160)


class PayableConfiguration(StrictModel):
    currency: str = "INR"
    base_amount: Decimal = Field(alias="baseAmount", ge=0)
    precision: int = Field(default=2, ge=0, le=4)
    rules: list[CalculationRule] = Field(default_factory=list, max_length=200)
    month_overrides: list[MonthOverride] = Field(
        default_factory=list, alias="monthOverrides", max_length=120
    )
    monthly_multipliers: list[MonthlyMultiplier] = Field(
        default_factory=list, alias="monthlyMultipliers", max_length=600
    )

    @field_validator("currency")
    @classmethod
    def currency_is_supported(cls, value: str) -> str:
        return normalize_currency(value)

    @model_validator(mode="after")
    def unique_months(self) -> "PayableConfiguration":
        override_months = [entry.month for entry in self.month_overrides]
        multiplier_months = [entry.month for entry in self.monthly_multipliers]
        if len(override_months) != len(set(override_months)):
            raise ValueError("monthOverrides contains duplicate months")
        if len(multiplier_months) != len(set(multiplier_months)):
            raise ValueError("monthlyMultipliers contains duplicate months")
        return self


class PayableRequest(StrictModel):
    member_id: uuid.UUID = Field(alias="memberId")
    chit_group_id: uuid.UUID = Field(alias="chitGroupId")
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    paid_amount: Decimal = Field(default=Decimal("0"), alias="paidAmount", ge=0)
    penalties: list[PenaltyAccrual] = Field(default_factory=list, max_length=500)
    context: dict[str, Any] = Field(default_factory=dict)
    configuration: PayableConfiguration


class CalculationStep(StrictModel):
    rule_id: str = Field(alias="ruleId")
    operation: str
    before: Decimal
    operand: Decimal
    after: Decimal
    label: str | None = None


class PayableResult(StrictModel):
    member_id: uuid.UUID = Field(alias="memberId")
    chit_group_id: uuid.UUID = Field(alias="chitGroupId")
    month: str
    currency: str
    expected_amount: Decimal = Field(alias="expectedAmount")
    fixed_monthly_amount: Decimal = Field(alias="fixedMonthlyAmount")
    applied_multiplier: Decimal = Field(alias="appliedMultiplier")
    rules_adjusted_amount: Decimal = Field(alias="rulesAdjustedAmount")
    accumulated_penalty: Decimal = Field(alias="accumulatedPenalty")
    paid_amount: Decimal = Field(alias="paidAmount")
    payable_due: Decimal = Field(alias="payableDue")
    audit: list[CalculationStep]


def context_lookup(context: dict[str, Any], path: str) -> Any:
    current: Any = context
    for segment in path.split("."):
        if not isinstance(current, dict) or segment not in current:
            return None
        current = current[segment]
    return current


def condition_matches(condition: RuleCondition, context: dict[str, Any]) -> bool:
    actual = context_lookup(context, condition.field)
    expected = condition.value
    operation = condition.operator
    if operation == "EQ":
        return actual == expected
    if operation == "NE":
        return actual != expected
    if operation == "IN":
        return isinstance(expected, list) and actual in expected
    if operation == "BETWEEN":
        if not isinstance(expected, list) or len(expected) != 2:
            raise ValueError("BETWEEN requires exactly two values")
        actual_number = decimal_value(actual, condition.field)
        return decimal_value(expected[0], condition.field) <= actual_number <= decimal_value(
            expected[1], condition.field
        )
    actual_number = decimal_value(actual, condition.field)
    expected_number = decimal_value(expected, condition.field)
    comparisons = {
        "LT": actual_number < expected_number,
        "LTE": actual_number <= expected_number,
        "GT": actual_number > expected_number,
        "GTE": actual_number >= expected_number,
    }
    return comparisons[operation]


class VardhanCoreDomainEngine:
    @staticmethod
    def _apply_operation(current: Decimal, operation: str, operand: Decimal) -> Decimal:
        if operation == "SET":
            result = operand
        elif operation == "ADD":
            result = current + operand
        elif operation == "SUBTRACT":
            result = current - operand
        elif operation == "MULTIPLY":
            result = current * operand
        elif operation == "PERCENT_ADD":
            result = current + current * operand / Decimal("100")
        elif operation == "PERCENT_SUBTRACT":
            result = current - current * operand / Decimal("100")
        elif operation == "MIN":
            result = min(current, operand)
        elif operation == "MAX":
            result = max(current, operand)
        elif operation == "ROUND":
            digits = int(operand)
            if digits < 0 or digits > 4 or operand != digits:
                raise ValueError("ROUND operand must be an integer from 0 to 4")
            result = money_round(current, digits)
        else:
            raise ValueError(f"Unsupported calculation operation: {operation}")
        return max(result, Decimal("0"))

    @staticmethod
    def _penalty_amount(penalty: PenaltyAccrual) -> Decimal:
        periodic_rate = penalty.rate_percent / Decimal("100")
        if penalty.aggregation == "compound" and penalty.periods:
            variable_amount = penalty.principal * (
                (Decimal("1") + periodic_rate) ** penalty.periods - Decimal("1")
            )
        else:
            variable_amount = penalty.principal * periodic_rate * penalty.periods
        amount = variable_amount + penalty.fixed_amount
        if penalty.cap_amount is not None:
            amount = min(amount, penalty.cap_amount)
        return max(amount, Decimal("0"))

    @classmethod
    def calculate(cls, request: PayableRequest) -> PayableResult:
        configuration = request.configuration
        context = {
            **request.context,
            "month": request.month,
            "paidAmount": str(request.paid_amount),
            "memberId": str(request.member_id),
            "chitGroupId": str(request.chit_group_id),
        }
        rules = list(configuration.rules)
        override = next(
            (entry for entry in configuration.month_overrides if entry.month == request.month), None
        )
        if override:
            rules.extend(override.rules)

        fixed_monthly_amount = configuration.base_amount
        multiplier_entry = next(
            (
                entry
                for entry in configuration.monthly_multipliers
                if entry.month == request.month
            ),
            None,
        )
        applied_multiplier = (
            multiplier_entry.multiplier if multiplier_entry else Decimal("1")
        )
        current = fixed_monthly_amount * applied_multiplier
        audit: list[CalculationStep] = []
        if multiplier_entry:
            audit.append(
                CalculationStep(
                    ruleId=f"monthly-multiplier-{request.month}",
                    operation="MONTHLY_MULTIPLIER",
                    before=fixed_monthly_amount,
                    operand=applied_multiplier,
                    after=current,
                    label=f"Month-wise multiplier for {request.month}",
                )
            )
        for rule in rules:
            if not all(condition_matches(condition, context) for condition in rule.when):
                continue
            before = current
            operand = decimal_value(rule.value, rule.id)
            current = cls._apply_operation(current, rule.operation, operand)
            audit.append(
                CalculationStep(
                    ruleId=rule.id,
                    operation=rule.operation,
                    before=before,
                    operand=operand,
                    after=current,
                    label=rule.label,
                )
            )

        rules_adjusted_amount = current
        accumulated_penalty = Decimal("0")
        for penalty in request.penalties:
            before = current
            penalty_amount = cls._penalty_amount(penalty)
            accumulated_penalty += penalty_amount
            current += penalty_amount
            audit.append(
                CalculationStep(
                    ruleId=f"penalty-{penalty.id}",
                    operation=f"PENALTY_{penalty.aggregation.upper()}",
                    before=before,
                    operand=penalty_amount,
                    after=current,
                    label=penalty.label or penalty.id,
                )
            )

        expected = money_round(current, configuration.precision)
        paid = money_round(request.paid_amount, configuration.precision)
        return PayableResult(
            memberId=request.member_id,
            chitGroupId=request.chit_group_id,
            month=request.month,
            currency=configuration.currency,
            expectedAmount=expected,
            fixedMonthlyAmount=money_round(fixed_monthly_amount, configuration.precision),
            appliedMultiplier=applied_multiplier,
            rulesAdjustedAmount=money_round(rules_adjusted_amount, configuration.precision),
            accumulatedPenalty=money_round(accumulated_penalty, configuration.precision),
            paidAmount=paid,
            payableDue=money_round(max(expected - paid, Decimal("0")), configuration.precision),
            audit=audit,
        )

    @staticmethod
    def generate_presenter_narrative(payload: "NarrativeRequest") -> "NarrativeResult":
        return generate_narrative(payload)


PayableDomainEngine = VardhanCoreDomainEngine


class ExchangeRateQuote(StrictModel):
    base_currency: str = Field(alias="baseCurrency")
    quote_currency: str = Field(alias="quoteCurrency")
    rate: Decimal = Field(gt=0)
    provider: str = Field(min_length=2, max_length=80)
    observed_at: datetime = Field(alias="observedAt")

    @field_validator("base_currency", "quote_currency")
    @classmethod
    def currencies_are_supported(cls, value: str) -> str:
        return normalize_currency(value)

    @model_validator(mode="after")
    def pair_is_not_identity(self) -> "ExchangeRateQuote":
        if self.base_currency == self.quote_currency:
            raise ValueError("baseCurrency and quoteCurrency must differ")
        return self


class ConsolidationRequest(StrictModel):
    target_currency: str = Field(alias="targetCurrency")
    quotes: list[ExchangeRateQuote] = Field(min_length=1, max_length=1000)

    @field_validator("target_currency")
    @classmethod
    def target_is_supported(cls, value: str) -> str:
        return normalize_currency(value)


class ConsolidatedRate(StrictModel):
    currency: str
    target_currency: str = Field(alias="targetCurrency")
    rate: Decimal
    observed_at: datetime = Field(alias="observedAt")
    sources: list[str]


class CurrencyEngine:
    @staticmethod
    def consolidate(request: ConsolidationRequest) -> list[ConsolidatedRate]:
        target = request.target_currency
        direct: dict[str, list[ExchangeRateQuote]] = {}
        for quote in request.quotes:
            if quote.quote_currency == target:
                direct.setdefault(quote.base_currency, []).append(quote)
            elif quote.base_currency == target:
                inverted = quote.model_copy(
                    update={
                        "base_currency": quote.quote_currency,
                        "quote_currency": target,
                        "rate": Decimal("1") / quote.rate,
                    }
                )
                direct.setdefault(inverted.base_currency, []).append(inverted)

        results = [
            ConsolidatedRate(
                currency=target,
                targetCurrency=target,
                rate=Decimal("1"),
                observedAt=max(quote.observed_at for quote in request.quotes),
                sources=["identity"],
            )
        ]
        for currency, quotes in sorted(direct.items()):
            latest_by_provider: dict[str, ExchangeRateQuote] = {}
            for quote in quotes:
                current = latest_by_provider.get(quote.provider)
                if current is None or quote.observed_at > current.observed_at:
                    latest_by_provider[quote.provider] = quote
            selected = list(latest_by_provider.values())
            average = sum((quote.rate for quote in selected), Decimal("0")) / Decimal(len(selected))
            results.append(
                ConsolidatedRate(
                    currency=currency,
                    targetCurrency=target,
                    rate=average.quantize(Decimal("0.000000000001"), rounding=ROUND_HALF_UP),
                    observedAt=min(quote.observed_at for quote in selected),
                    sources=sorted(latest_by_provider),
                )
            )
        return results


class NarrativeMetric(StrictModel):
    label: str = Field(min_length=1, max_length=100)
    value: str = Field(min_length=1, max_length=100)
    movement: Literal["up", "down", "flat"] = "flat"


class NarrativeRequest(StrictModel):
    locale: Literal["en-IN", "te-IN"] = "en-IN"
    workspace_name: str = Field(alias="workspaceName", min_length=2, max_length=120)
    period_label: str = Field(alias="periodLabel", min_length=1, max_length=80)
    metrics: list[NarrativeMetric] = Field(default_factory=list, max_length=20)
    alerts: list[str] = Field(default_factory=list, max_length=20)


class NarrativeResult(StrictModel):
    locale: str
    text: str
    ssml: str
    speech_dictionary: dict[str, dict[str, str]] = Field(alias="speechDictionary")
    renderer_metadata: dict[str, str] = Field(alias="rendererMetadata")


def escape_ssml(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _localized_narrative_dictionary(
    payload: NarrativeRequest,
) -> dict[str, dict[str, str]]:
    localized_templates = {
        "en-IN": {
            "title": "Verified financial summary",
            "opening": f"Financial summary for {payload.workspace_name}, {payload.period_label}.",
            "attention": "Items requiring attention",
            "noAlerts": "There are no active financial alerts.",
            "closing": "This presentation is based on verified ledger data.",
            "up": "increased",
            "down": "decreased",
            "flat": "remained stable",
        },
        "te-IN": {
            "title": "ధృవీకరించిన ఆర్థిక సారాంశం",
            "opening": f"{payload.workspace_name} కోసం {payload.period_label} ఆర్థిక సారాంశం.",
            "attention": "దృష్టి అవసరమైన అంశాలు",
            "noAlerts": "ప్రస్తుతం ఆర్థిక హెచ్చరికలు లేవు.",
            "closing": "ధృవీకరించిన లెడ్జర్ డేటా ఆధారంగా ఈ నివేదిక రూపొందించబడింది.",
            "up": "పెరిగింది",
            "down": "తగ్గింది",
            "flat": "స్థిరంగా ఉంది",
        },
    }
    dictionary: dict[str, dict[str, str]] = {}
    for locale, template in localized_templates.items():
        metric_text = " ".join(
            f"{item.label}: {item.value}; {template[item.movement]}."
            for item in payload.metrics
        )
        if payload.alerts:
            alert_text = f"{template['attention']}: {'; '.join(payload.alerts)}."
        else:
            alert_text = template["noAlerts"]
        full_text = " ".join(
            segment
            for segment in (
                template["opening"],
                metric_text,
                alert_text,
                template["closing"],
            )
            if segment
        )
        dictionary[locale] = {
            "title": template["title"],
            "opening": template["opening"],
            "metrics": metric_text,
            "alerts": alert_text,
            "closing": template["closing"],
            "fullText": full_text,
        }
    return dictionary


def generate_narrative(payload: NarrativeRequest) -> NarrativeResult:
    speech_dictionary = _localized_narrative_dictionary(payload)
    text = speech_dictionary[payload.locale]["fullText"]
    ssml = f'<speak><prosody rate="92%">{escape_ssml(text)}</prosody></speak>'
    return NarrativeResult(
        locale=payload.locale,
        text=text,
        ssml=ssml,
        speechDictionary=speech_dictionary,
        rendererMetadata={
            "contentType": "application/ssml+xml",
            "locale": payload.locale,
            "voiceClass": "neural-presenter",
            "streamMode": "low-latency",
        },
    )


class Principal(StrictModel):
    user_id: uuid.UUID
    claims: dict[str, Any]


class DrawPrepareRequest(StrictModel):
    chit_group_id: uuid.UUID = Field(alias="chitGroupId")
    eligible_member_ids: list[uuid.UUID] = Field(alias="eligibleMemberIds", min_length=1, max_length=10000)
    countdown_seconds: int = Field(default=10, alias="countdownSeconds", ge=5, le=300)

    @model_validator(mode="after")
    def members_are_unique(self) -> "DrawPrepareRequest":
        if len(self.eligible_member_ids) != len(set(self.eligible_member_ids)):
            raise ValueError("eligibleMemberIds contains duplicates")
        return self


class DrawCommitment(StrictModel):
    draw_id: uuid.UUID = Field(alias="drawId")
    commitment_hash: str = Field(alias="commitmentHash")
    reveal_not_before: datetime = Field(alias="revealNotBefore")
    eligible_count: int = Field(alias="eligibleCount")


class DrawRevealRequest(StrictModel):
    client_entropy: str = Field(alias="clientEntropy", min_length=32, max_length=512)


class DrawResult(StrictModel):
    draw_id: uuid.UUID = Field(alias="drawId")
    winner_member_id: uuid.UUID = Field(alias="winnerMemberId")
    commitment_hash: str = Field(alias="commitmentHash")
    revealed_server_seed: str = Field(alias="revealedServerSeed")
    result_entropy_hash: str = Field(alias="resultEntropyHash")
    completed_at: datetime = Field(alias="completedAt")


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def canonical_members(member_ids: list[uuid.UUID]) -> str:
    return ",".join(sorted(str(member_id) for member_id in member_ids))


def database_pool(request: Request) -> asyncpg.Pool:
    pool = getattr(request.app.state, "pool", None)
    if pool is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Database connection is not configured")
    return pool


def draw_cipher() -> Fernet:
    if not settings.draw_encryption_key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Draw encryption is not configured")
    try:
        return Fernet(settings.draw_encryption_key.encode("ascii"))
    except (ValueError, UnicodeEncodeError) as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Draw encryption key is invalid") from exc


async def authenticated_principal(request: Request) -> Principal:
    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "A bearer token is required")

    try:
        header = jwt.get_unverified_header(token)
        algorithm = str(header.get("alg", "")).upper()
        decode_options = {"require": ["exp", "sub", "aud"]}

        if algorithm == "HS256":
            if not settings.jwt_secret:
                raise HTTPException(
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    "Legacy HS256 JWT verification is not configured",
                )
            claims = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=["HS256"],
                audience=settings.jwt_audience,
                options=decode_options,
            )
        elif algorithm in {"ES256", "RS256"}:
            if not settings.supabase_url:
                raise HTTPException(
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    "Supabase URL is required for JWKS verification",
                )
            issuer = f"{settings.supabase_url}/auth/v1"
            jwks_client = jwt.PyJWKClient(
                f"{issuer}/.well-known/jwks.json",
                cache_keys=True,
                lifespan=600,
            )
            signing_key = await __import__("asyncio").to_thread(
                jwks_client.get_signing_key_from_jwt, token
            )
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=[algorithm],
                audience=settings.jwt_audience,
                issuer=issuer,
                options=decode_options,
            )
        else:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                f"Unsupported JWT signing algorithm: {algorithm or 'unknown'}",
            )

        user_id = uuid.UUID(claims["sub"])
    except HTTPException:
        raise
    except (jwt.PyJWTError, ValueError, KeyError) as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "The bearer token is invalid"
        ) from exc
    return Principal(user_id=user_id, claims=claims)


async def workspace_context(
    request: Request,
    principal: Principal = Depends(authenticated_principal),
    x_workspace_id: str = Header(alias="X-Workspace-Id"),
) -> tuple[uuid.UUID, str, str, str, Principal]:
    try:
        workspace_id = uuid.UUID(x_workspace_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "X-Workspace-Id must be a UUID") from exc
    pool = database_pool(request)
    row = await pool.fetchrow(
        """
        select wm.tenant_id, wm.data_scope, wm.role
        from public.workspace_memberships wm
        where wm.workspace_id = $1 and wm.user_id = $2 and wm.status = 'active'
        """,
        workspace_id,
        principal.user_id,
    )
    if row is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Workspace access denied")
    return workspace_id, row["tenant_id"], row["data_scope"], row["role"], principal


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = None
    if settings.database_url:
        app.state.pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=1,
            max_size=int(os.getenv("DATABASE_POOL_MAX", "10")),
            command_timeout=20,
            server_settings={"application_name": "vardhan-os-api"},
        )
    try:
        yield
    finally:
        await rate_limit_adapter.close()
        if app.state.pool is not None:
            await app.state.pool.close()


app = FastAPI(
    title="VARDHAN OS Domain API",
    version="3.0.0",
    docs_url="/docs" if os.getenv("ENABLE_API_DOCS", "false").lower() == "true" else None,
    redoc_url=None,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Workspace-Id", "X-Request-Id"],
)
app.include_router(build_enterprise_router(workspace_context, database_pool))
app.include_router(build_ocr_router(workspace_context), prefix="/api")


@app.middleware("http")
async def request_identity(request: Request, call_next: Any) -> Response:
    request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    started_at = datetime.now(UTC)
    rate_decision = None
    if request.method != "OPTIONS" and request.url.path != "/health":
        client_key = request.client.host if request.client else "unknown"
        rate_decision = await rate_limit_adapter.check(client_key, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_SECONDS, request.headers)
        if not rate_decision.allowed:
            limited_response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Request rate limit exceeded", "requestId": request_id},
                headers={
                    "Retry-After": str(rate_decision.retry_after),
                    "X-Request-Id": request_id,
                    "X-RateLimit-Limit": str(rate_decision.limit),
                    "X-RateLimit-Remaining": str(rate_decision.remaining),
                    "X-RateLimit-Backend": rate_decision.backend,
                },
            )
            return apply_security_headers(limited_response)
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("request_failed", extra={"context": {"requestId": request_id, "method": request.method, "path": request.url.path}})
        raise
    response.headers["X-Request-Id"] = request_id
    if rate_decision:
        response.headers["X-RateLimit-Limit"] = str(rate_decision.limit)
        response.headers["X-RateLimit-Remaining"] = str(rate_decision.remaining)
        response.headers["X-RateLimit-Backend"] = rate_decision.backend
    logger.info("request_completed", extra={"context": {"requestId": request_id, "method": request.method, "path": request.url.path, "status": response.status_code, "durationMs": int((datetime.now(UTC) - started_at).total_seconds() * 1000)}})
    return apply_security_headers(response)


@app.get("/health")
@app.get("/api/health")
async def health(request: Request) -> dict[str, Any]:
    pool = getattr(request.app.state, "pool", None)
    database_ready = False
    if pool is not None:
        try:
            database_ready = await pool.fetchval("select true")
        except asyncpg.PostgresError:
            database_ready = False
    provider_ready = create_vision_provider().isConfigured()
    jwt_ready = bool(settings.jwt_secret or settings.supabase_url)
    return {
        "status": "ok" if database_ready and jwt_ready and provider_ready else "degraded",
        "database": database_ready,
        "jwt": jwt_ready,
        "ocrProvider": provider_ready,
    }


@app.post("/v1/payables/calculate", response_model=PayableResult, response_model_by_alias=True)
async def calculate_payable(
    payload: PayableRequest,
    _: tuple[uuid.UUID, str, str, str, Principal] = Depends(workspace_context),
) -> PayableResult:
    try:
        return VardhanCoreDomainEngine.calculate(payload)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


@app.post(
    "/v1/exchange-rates/consolidate",
    response_model=list[ConsolidatedRate],
    response_model_by_alias=True,
)
async def consolidate_rates(
    payload: ConsolidationRequest,
    request: Request,
    context: tuple[uuid.UUID, str, str, str, Principal] = Depends(workspace_context),
) -> list[ConsolidatedRate]:
    _, _, _, role, _ = context
    if role not in WRITE_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "A write role is required")
    rates = CurrencyEngine.consolidate(payload)
    pool = database_pool(request)
    records = [
        (quote.base_currency, quote.quote_currency, quote.rate, quote.provider, quote.observed_at)
        for quote in payload.quotes
    ]
    await pool.executemany(
        """
        insert into public.exchange_rates
          (base_currency, quote_currency, rate, provider, observed_at)
        values ($1, $2, $3, $4, $5)
        on conflict (base_currency, quote_currency, provider, observed_at)
        do update set rate = excluded.rate, received_at = now()
        """,
        records,
    )
    return rates


@app.post("/v1/presentations/narrative", response_model=NarrativeResult)
async def presentation_narrative(
    payload: NarrativeRequest,
    _: tuple[uuid.UUID, str, str, str, Principal] = Depends(workspace_context),
) -> NarrativeResult:
    return VardhanCoreDomainEngine.generate_presenter_narrative(payload)


@app.post("/v1/draws/prepare", response_model=DrawCommitment, response_model_by_alias=True)
async def prepare_draw(
    payload: DrawPrepareRequest,
    request: Request,
    context: tuple[uuid.UUID, str, str, str, Principal] = Depends(workspace_context),
) -> DrawCommitment:
    workspace_id, tenant_id, _, role, principal = context
    if role not in WRITE_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "A write role is required")
    pool = database_pool(request)
    eligible = sorted(payload.eligible_member_ids, key=str)
    valid_count = await pool.fetchval(
        """
        select count(*)
        from public.group_memberships
        where workspace_id = $1 and tenant_id = $2 and chit_group_id = $3
          and status = 'active' and member_id = any($4::uuid[])
        """,
        workspace_id,
        tenant_id,
        payload.chit_group_id,
        eligible,
    )
    if valid_count != len(eligible):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Eligible members must be active group members")

    draw_id = uuid.uuid4()
    server_seed = secrets.token_hex(32)
    commitment = sha256(f"{draw_id}|{server_seed}|{canonical_members(eligible)}")
    ciphertext = draw_cipher().encrypt(server_seed.encode("ascii"))
    reveal_at = datetime.now(UTC) + timedelta(seconds=payload.countdown_seconds)
    await pool.execute(
        """
        insert into public.lucky_draw_sessions
          (id, workspace_id, tenant_id, chit_group_id, eligible_member_ids, commitment_hash,
           server_seed_ciphertext, reveal_not_before, created_by)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """,
        draw_id,
        workspace_id,
        tenant_id,
        payload.chit_group_id,
        eligible,
        commitment,
        ciphertext,
        reveal_at,
        principal.user_id,
    )
    return DrawCommitment(
        drawId=draw_id,
        commitmentHash=commitment,
        revealNotBefore=reveal_at,
        eligibleCount=len(eligible),
    )


# ============================================================================
# SUPABASE AUTH INTEGRATION ENDPOINTS
# ============================================================================

@app.get("/v3/auth/verify", response_model=dict, response_model_by_alias=True)
async def verify_auth(
    principal: Principal = Depends(authenticated_principal),
) -> dict:
    """Verify the same Supabase bearer token path used by protected APIs."""
    claims = principal.claims
    user_metadata = claims.get("user_metadata") or {}
    app_metadata = claims.get("app_metadata") or {}
    tenant_id = user_metadata.get("tenant_id") or app_metadata.get("tenant_id")
    tenant_context = None
    if tenant_id:
        tenant_context = {
            "tenant_id": tenant_id,
            "data_scope": (
                user_metadata.get("data_scope")
                or app_metadata.get("data_scope")
                or "real_tenant"
            ),
            "workspace_id": (
                user_metadata.get("workspace_id")
                or app_metadata.get("workspace_id")
            ),
        }
    return {
        "authenticated": True,
        "user_id": str(principal.user_id),
        "email": claims.get("email"),
        "role": claims.get("role"),
        "tenant_context": tenant_context,
    }


@app.get("/v3/auth/tenant-context", response_model=TenantContext, response_model_by_alias=True)
async def get_user_tenant_context(
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
) -> TenantContext:
    """Get user's tenant context from JWT token"""
    return require_tenant_context(user)


@app.get("/v3/auth/platform-owner-check", response_model=dict, response_model_by_alias=True)
async def check_platform_owner(
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """Check if user is a platform owner"""
    is_owner = user.user_metadata.get("is_platform_admin", False) if user.user_metadata else False
    return {
        "is_platform_owner": is_owner,
        "user_id": str(user.user_id),
    }


@app.post("/v1/draws/{draw_id}/reveal", response_model=DrawResult, response_model_by_alias=True)
async def reveal_draw(
    draw_id: uuid.UUID,
    payload: DrawRevealRequest,
    request: Request,
    context: tuple[uuid.UUID, str, str, str, Principal] = Depends(workspace_context),
) -> DrawResult:
    workspace_id, tenant_id, _, role, principal = context
    if role not in WRITE_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "A write role is required")
    pool = database_pool(request)
    async with pool.acquire() as connection, connection.transaction():
        row = await connection.fetchrow(
            """
            select * from public.lucky_draw_sessions
            where id = $1 and workspace_id = $2 and tenant_id = $3
            for update
            """,
            draw_id,
            workspace_id,
            tenant_id,
        )
        if row is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Draw not found")
        if row["status"] == "completed":
            return DrawResult(
                drawId=draw_id,
                winnerMemberId=row["winner_member_id"],
                commitmentHash=row["commitment_hash"],
                revealedServerSeed=row["revealed_server_seed"],
                resultEntropyHash=row["result_entropy_hash"],
                completedAt=row["completed_at"],
            )
        if row["status"] != "committed":
            raise HTTPException(status.HTTP_409_CONFLICT, "Draw is not revealable")
        now = datetime.now(UTC)
        if now < row["reveal_not_before"]:
            retry_after = max(1, int((row["reveal_not_before"] - now).total_seconds()))
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Countdown is active; retry after {retry_after} seconds",
                headers={"Retry-After": str(retry_after)},
            )
        try:
            server_seed = draw_cipher().decrypt(bytes(row["server_seed_ciphertext"])).decode("ascii")
        except (InvalidToken, UnicodeDecodeError) as exc:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Draw seed verification failed") from exc

        members = list(row["eligible_member_ids"])
        if sha256(f"{draw_id}|{server_seed}|{canonical_members(members)}") != row["commitment_hash"]:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Draw commitment verification failed")
        client_hash = sha256(payload.client_entropy)
        result_hash = sha256(
            f"{draw_id}|{server_seed}|{client_hash}|{canonical_members(members)}"
        )
        winner_id = sorted(members, key=str)[int(result_hash, 16) % len(members)]
        await connection.execute(
            """
            update public.lucky_draw_sessions
            set status = 'completed', client_entropy_hash = $2, result_entropy_hash = $3,
                winner_member_id = $4, revealed_server_seed = $5, completed_at = $6
            where id = $1
            """,
            draw_id,
            client_hash,
            result_hash,
            winner_id,
            server_seed,
            now,
        )
        await connection.execute(
            """
            insert into public.dynamic_ledgers
              (workspace_id, tenant_id, occurred_at, ledger_type, reference_type, reference_id,
               chit_group_id, currency, amount, direction, payload, created_by)
            values ($1, $2, $3, 'lucky_draw.completed', 'lucky_draw', $4, $5, 'INR', 0,
                    'debit', $6::jsonb, $7)
            """,
            workspace_id,
            tenant_id,
            now,
            draw_id,
            row["chit_group_id"],
            json.dumps(
                {
                    "winnerMemberId": str(winner_id),
                    "commitmentHash": row["commitment_hash"],
                    "clientEntropyHash": client_hash,
                    "resultEntropyHash": result_hash,
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            principal.user_id,
        )
    return DrawResult(
        drawId=draw_id,
        winnerMemberId=winner_id,
        commitmentHash=row["commitment_hash"],
        revealedServerSeed=server_seed,
        resultEntropyHash=result_hash,
        completedAt=now,
    )
