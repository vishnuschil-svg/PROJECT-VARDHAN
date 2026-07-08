import { MEMBER_STATUS } from "./chitMemberData";

export const LUCKY_DRAW_DURATION_MS = 12000;

export function getEligibleLuckyDrawMembers(members = [], previousDraws = []) {
  const previousWinnerIds = new Set(previousDraws.map((draw) => draw.winner_id));

  return members.filter(
    (member) =>
      member.status === MEMBER_STATUS.ACTIVE &&
      member.member_number &&
      !previousWinnerIds.has(member.id)
  );
}

export function selectTransparentWinner(eligibleMembers = []) {
  if (!eligibleMembers.length) return null;

  const randomValue = getSecureRandomValue();
  const winnerIndex = Math.floor(randomValue * eligibleMembers.length);

  return {
    winner: eligibleMembers[winnerIndex],
    randomValue,
    winnerIndex,
    eligibleCount: eligibleMembers.length,
    algorithm: "crypto.getRandomValues uniform random index",
  };
}

export function createLuckyDrawRecord({ selection, activeTenantContext }) {
  const timestamp = new Date().toISOString();
  const drawNumber = timestamp.replace(/[-:.TZ]/g, "").slice(0, 14);

  return {
    id: `draw-${drawNumber}`,
    draw_number: `LD-${drawNumber}`,
    tenant_id: activeTenantContext?.tenant_id || "unknown-tenant",
    data_scope: activeTenantContext?.data_scope || "unknown-scope",
    workspace_label: activeTenantContext?.workspace_label || "Tenant",
    winner_id: selection.winner.id,
    winner_name: selection.winner.member_name,
    winner_number: selection.winner.member_number,
    winner_mobile: selection.winner.mobile_number,
    chit_group_id: selection.winner.chit_group_id,
    eligible_count: selection.eligibleCount,
    random_value: selection.randomValue.toFixed(10),
    winner_index: selection.winnerIndex,
    algorithm: selection.algorithm,
    draw_status: "completed",
    created_at: timestamp,
  };
}

export function createLuckyDrawAudit(drawRecord, action = "winner_selected") {
  return {
    id: `audit-${drawRecord.id}-${action}`,
    draw_id: drawRecord.id,
    action,
    actor: "System",
    tenant_id: drawRecord.tenant_id,
    data_scope: drawRecord.data_scope,
    summary: `${drawRecord.winner_name} selected from ${drawRecord.eligible_count} eligible members`,
    created_at: drawRecord.created_at,
  };
}

export function createCongratulationPosterSvg(drawRecord) {
  const title = escapeXml("Congratulations");
  const winner = escapeXml(drawRecord.winner_name);
  const memberNo = escapeXml(drawRecord.winner_number);
  const drawNo = escapeXml(drawRecord.draw_number);
  const tenant = escapeXml(drawRecord.workspace_label);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07111f"/>
      <stop offset="0.48" stop-color="#102044"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
    <radialGradient id="gold" cx="72%" cy="18%" r="55%">
      <stop offset="0" stop-color="#f3c969" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#d4af37" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="1600" rx="54" fill="url(#bg)"/>
  <rect width="1200" height="1600" rx="54" fill="url(#gold)"/>
  <rect x="76" y="76" width="1048" height="1448" rx="42" fill="none" stroke="#d4af37" stroke-width="4" opacity="0.72"/>
  <text x="600" y="210" text-anchor="middle" font-family="Segoe UI, Arial" font-size="42" font-weight="800" fill="#f3c969">MITRA NIDHI CHITI PRO</text>
  <text x="600" y="385" text-anchor="middle" font-family="Segoe UI, Arial" font-size="82" font-weight="900" fill="#ffffff">${title}</text>
  <text x="600" y="500" text-anchor="middle" font-family="Segoe UI, Arial" font-size="44" font-weight="700" fill="#dbeafe">Lucky Draw Winner</text>
  <circle cx="600" cy="735" r="178" fill="rgba(255,255,255,0.08)" stroke="#f3c969" stroke-width="6"/>
  <text x="600" y="762" text-anchor="middle" font-family="Segoe UI, Arial" font-size="118" font-weight="900" fill="#f3c969">WIN</text>
  <text x="600" y="1010" text-anchor="middle" font-family="Segoe UI, Arial" font-size="64" font-weight="900" fill="#ffffff">${winner}</text>
  <text x="600" y="1088" text-anchor="middle" font-family="Segoe UI, Arial" font-size="32" font-weight="700" fill="#dbeafe">Member No: ${memberNo}</text>
  <text x="600" y="1180" text-anchor="middle" font-family="Segoe UI, Arial" font-size="26" fill="#cbd5e1">${tenant}</text>
  <text x="600" y="1240" text-anchor="middle" font-family="Segoe UI, Arial" font-size="24" fill="#cbd5e1">Draw: ${drawNo}</text>
  <text x="600" y="1370" text-anchor="middle" font-family="Segoe UI, Arial" font-size="24" font-weight="700" fill="#f3c969">Transparent random selection from eligible active members</text>
</svg>`.trim();
}

function getSecureRandomValue() {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] / 2 ** 32;
  }

  return Math.random();
}

function escapeXml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
