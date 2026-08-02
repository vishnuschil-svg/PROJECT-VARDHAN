import { Award, Download, History, Play, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Table from "../../components/common/Table";
import { getMemberGroupName } from "../../config/chitMemberData";
import {
  LUCKY_DRAW_DURATION_MS,
  createCongratulationPosterSvg,
  createLuckyDrawAudit,
  createLuckyDrawRecord,
  getEligibleLuckyDrawMembers,
  selectTransparentWinner,
} from "../../config/chitLuckyDraw";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import { listTenantGroups, listTenantMembers } from "../../services/chitDataService";
import { confirmLuckyDrawWinner, listLuckyDrawResults } from "../../services/luckyDrawService";
import "./LuckyDraw.css";

function LuckyDraw() {
  const { activeTenantContext } = useAuth();
  const [drawHistory, setDrawHistory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [highlightedMember, setHighlightedMember] = useState(null);
  const [winner, setWinner] = useState(null);
  const [drawProgress, setDrawProgress] = useState(0);
  const drawTimerRef = useRef(null);
  const progressTimerRef = useRef(null);

  const tenantGroups = useMemo(
    () => listTenantGroups(activeTenantContext),
    [activeTenantContext]
  );

  const tenantMembers = useMemo(
    () => listTenantMembers(activeTenantContext),
    [activeTenantContext]
  );

  const eligibleMembers = useMemo(
    () => getEligibleLuckyDrawMembers(tenantMembers, drawHistory),
    [drawHistory, tenantMembers]
  );

  useEffect(() => {
    setDrawHistory(listLuckyDrawResults(activeTenantContext).map((draw) => normalizeDrawForUi(draw, tenantGroups, tenantMembers)));
    return () => {
      clearInterval(drawTimerRef.current);
      clearInterval(progressTimerRef.current);
    };
  }, [activeTenantContext, tenantGroups, tenantMembers]);

  const startDraw = () => {
    if (!eligibleMembers.length || isDrawing) return;

    const selection = selectTransparentWinner(eligibleMembers);
    const startedAt = Date.now();

    setWinner(null);
    setIsDrawing(true);
    setDrawProgress(0);

    drawTimerRef.current = setInterval(() => {
      const randomSelection = selectTransparentWinner(eligibleMembers);
      setHighlightedMember(randomSelection?.winner || null);
    }, 110);

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setDrawProgress(Math.min(100, Math.round((elapsed / LUCKY_DRAW_DURATION_MS) * 100)));
    }, 120);

    setTimeout(async () => {
      clearInterval(drawTimerRef.current);
      clearInterval(progressTimerRef.current);

      const group = tenantGroups.find((item) => item.id === selection.winner?.chit_group_id) || tenantGroups[0];
      const result = await confirmLuckyDrawWinner({
        activeTenantContext,
        group,
        members: tenantMembers,
        monthNumber: 1,
        deterministicSeed: selection.randomValue,
      });
      const record = result.success
        ? normalizeDrawForUi(result.draw, tenantGroups, tenantMembers)
        : createLuckyDrawRecord({ selection, activeTenantContext });
      const audit = createLuckyDrawAudit(record);

      setHighlightedMember(selection.winner);
      setWinner(record);
      setDrawHistory((current) => [record, ...current]);
      setAuditLogs((current) => [audit, ...current]);
      setDrawProgress(100);
      setIsDrawing(false);
    }, LUCKY_DRAW_DURATION_MS);
  };

  const downloadPoster = () => {
    if (!winner) return;

    const svg = createCongratulationPosterSvg(winner);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${winner.draw_number}-${winner.winner_number}-poster.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const historyColumns = [
    { key: "draw_number", label: "Draw No", width: "150px" },
    { key: "winner_name", label: "Winner", width: "180px" },
    { key: "winner_number", label: "Member No", width: "140px" },
    {
      key: "chit_group_id",
      label: "Chit Group",
      width: "190px",
      render: (_, row) => getMemberGroupName({ chit_group_id: row.chit_group_id }, tenantGroups),
    },
    { key: "eligible_count", label: "Eligible", width: "90px" },
    { key: "random_value", label: "Random Seed", width: "140px" },
    {
      key: "created_at",
      label: "Draw Time",
      width: "180px",
      render: (value) => new Date(value).toLocaleString(),
    },
  ];

  const auditColumns = [
    { key: "action", label: "Action", width: "150px" },
    { key: "summary", label: "Audit Summary", width: "320px" },
    { key: "tenant_id", label: "Tenant", width: "170px" },
    { key: "data_scope", label: "Data Scope", width: "130px" },
    {
      key: "created_at",
      label: "Logged At",
      width: "180px",
      render: (value) => new Date(value).toLocaleString(),
    },
  ];

  return (
    <ChitLayout
      title="Lucky Draw Engine"
      subtitle={`${CHIT_PRODUCT_NAME} transparent winner selection`}
      actions={
        <Button
          variant="primary"
          icon={<Play size={16} />}
          onClick={startDraw}
          disabled={!eligibleMembers.length || isDrawing}
        >
          {isDrawing ? "Drawing..." : "Start Lucky Draw"}
        </Button>
      }
    >
      <div className="lucky-draw-page">
        <section className="lucky-draw-hero">
          <div>
            <span className="lucky-draw-eyebrow">Tenant-aware transparent draw</span>
            <h2>{activeTenantContext?.workspace_label || "Active Tenant"}</h2>
            <p>
              Winner selection uses eligible active members only and records an
              audit trail separate from the auction workflow.
            </p>
          </div>
          <div className="lucky-draw-kpis">
            <div>
              <span>Total Members</span>
              <strong>{tenantMembers.length}</strong>
            </div>
            <div>
              <span>Eligible Now</span>
              <strong>{eligibleMembers.length}</strong>
            </div>
            <div>
              <span>Draws Done</span>
              <strong>{drawHistory.length}</strong>
            </div>
          </div>
        </section>

        <section className={`draw-stage ${isDrawing ? "is-drawing" : ""} ${winner ? "has-winner" : ""}`}>
          <div className="confetti-layer" aria-hidden="true">
            {Array.from({ length: 28 }).map((_, index) => (
              <span key={index} style={{ "--i": index }} />
            ))}
          </div>

          <div className="draw-orb">
            <Sparkles size={42} />
          </div>

          <div className="draw-stage-content">
            <Badge
              label={isDrawing ? "Draw in progress" : winner ? "Winner selected" : "Ready"}
              variant={winner ? "success" : isDrawing ? "warning" : "primary"}
              size="medium"
            />
            <h2>
              {winner
                ? winner.winner_name
                : highlightedMember?.member_name || "Ready for transparent selection"}
            </h2>
            <p>
              {winner
                ? `${winner.winner_number} has won ${winner.draw_number}`
                : isDrawing
                  ? "Randomizing eligible members..."
                  : "Start the draw to run a 12-second animated selection."}
            </p>
            <div className="draw-progress">
              <span style={{ width: `${drawProgress}%` }} />
            </div>
          </div>
        </section>

        {winner && (
          <section className="winner-announcement">
            <div className="winner-card">
              <Award size={44} />
              <div>
                <span>Winner Announcement</span>
                <h2>{winner.winner_name}</h2>
                <p>
                  Member {winner.winner_number} selected from {winner.eligible_count} eligible members.
                </p>
              </div>
            </div>
            <div className="poster-preview">
              <div>
                <span>Congratulations</span>
                <strong>{winner.winner_name}</strong>
                <p>{winner.draw_number}</p>
              </div>
              <Button variant="success" icon={<Download size={16} />} onClick={downloadPoster}>
                Download Poster
              </Button>
            </div>
          </section>
        )}

        <section className="draw-integrity-grid">
          <div className="draw-integrity-card">
            <ShieldCheck size={22} />
            <div>
              <strong>Transparent selection</strong>
              <p>Winner index is calculated using a uniform random value and stored in history.</p>
            </div>
          </div>
          <div className="draw-integrity-card">
            <History size={22} />
            <div>
              <strong>Audit logs</strong>
              <p>Every completed draw writes tenant, scope, algorithm and winner summary.</p>
            </div>
          </div>
        </section>

        <section className="draw-table-section">
          <div className="section-title-row">
            <div>
              <h2>Draw History</h2>
              <p>Completed lucky draws for the active tenant only.</p>
            </div>
          </div>
          <Table columns={historyColumns} data={drawHistory} />
        </section>

        <section className="draw-table-section">
          <div className="section-title-row">
            <div>
              <h2>Audit Logs</h2>
              <p>Transparent draw audit trail for compliance review.</p>
            </div>
          </div>
          <Table columns={auditColumns} data={auditLogs} />
        </section>
      </div>
    </ChitLayout>
  );
}

function normalizeDrawForUi(draw, groups, members) {
  const member = members.find((item) => item.id === (draw.memberId || draw.member_id));
  const group = groups.find((item) => item.id === (draw.groupId || draw.group_id));
  return {
    ...draw,
    draw_number: draw.draw_number || `LD-${draw.id}`,
    winner_name: member?.member_name || "Winner",
    winner_number: member?.member_number || "",
    chit_group_id: group?.id || draw.groupId || draw.group_id,
    eligible_count: draw.eligible_count || 0,
    random_value: draw.random_value || draw.randomValue || "",
    created_at: draw.created_at || draw.createdAt || new Date().toISOString(),
  };
}

export default LuckyDraw;
