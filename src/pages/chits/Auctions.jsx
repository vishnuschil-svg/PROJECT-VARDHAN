import {
  Award,
  CalendarDays,
  ClipboardList,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import FormField from "../../components/common/FormField";
import HelpButton from "../../components/common/HelpButton";
import {
  formatCurrency,
} from "../../config/chitPhaseOneData";
import {
  AUCTION_DRAW_DURATION_MS,
  AUCTION_TYPES,
  buildAuctionReports,
  calculateAuctionFinancials,
  createAuctionAuditLog,
  getAuctionDashboardStats,
  getEligibleAuctionMembers,
  selectAuctionLuckyWinner,
} from "../../config/chitAuctionEngine";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import { listTenantGroups, listTenantMembers } from "../../services/chitDataService";
import { confirmAuctionWinner, getAuctionWorkspace } from "../../services/auctionService";
import "./Auctions.css";

const EMPTY_AUCTION = {
  chit_group_id: "",
  auction_date: new Date().toISOString().slice(0, 10),
  auction_month: new Date().toISOString().slice(0, 7),
  starting_bid: "",
  minimum_bid: "",
  bid_amount: "",
  auction_type: AUCTION_TYPES.MANUAL,
  winner_id: "",
  notes: "",
};

function Auctions() {
  const { activeTenantContext } = useAuth();
  const [auctions, setAuctions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_AUCTION);
  const [formError, setFormError] = useState("");
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawProgress, setDrawProgress] = useState(0);
  const [highlightedMember, setHighlightedMember] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    group: "",
    date: "",
    winner: "",
    auctionType: "",
  });
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

  const selectedGroup = tenantGroups.find((group) => group.id === formData.chit_group_id);
  const eligibleMembers = useMemo(
    () =>
      getEligibleAuctionMembers({
        members: tenantMembers,
        groupId: formData.chit_group_id,
        auctionHistory: auctions,
      }),
    [auctions, formData.chit_group_id, tenantMembers]
  );

  const projectedFinancials = calculateAuctionFinancials({
    group: selectedGroup,
    bidAmount: formData.bid_amount || formData.starting_bid,
    eligibleCount: eligibleMembers.length,
  });
  const dashboardStats = getAuctionDashboardStats(auctions, eligibleMembers);
  const reports = buildAuctionReports(auctions);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      const workspace = await getAuctionWorkspace({
        activeTenantContext,
        groups: tenantGroups,
        members: tenantMembers,
      });
      if (cancelled) return;
      setAuctions(
        workspace.auctions.map((auction) =>
          normalizeAuctionForUi(auction, tenantGroups, tenantMembers)
        )
      );
    }

    loadWorkspace().catch(() => {
      if (!cancelled) setAuctions([]);
    });

    return () => {
      cancelled = true;
      clearInterval(drawTimerRef.current);
      clearInterval(progressTimerRef.current);
    };
  }, [activeTenantContext, tenantGroups, tenantMembers]);

  const openStartAuction = () => {
    const group = tenantGroups[0];
    setFormData({
      ...EMPTY_AUCTION,
      chit_group_id: group?.id || "",
      starting_bid: group?.chit_value || "",
      minimum_bid: group ? Math.round(Number(group.chit_value || 0) * 0.65) : "",
      bid_amount: group ? Math.round(Number(group.chit_value || 0) * 0.9) : "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const updateForm = (field, value) => {
    setFormData((current) => {
      const next = { ...current, [field]: value };

      if (field === "chit_group_id") {
        const group = tenantGroups.find((item) => item.id === value);
        next.starting_bid = group?.chit_value || "";
        next.minimum_bid = group ? Math.round(Number(group.chit_value || 0) * 0.65) : "";
        next.bid_amount = group ? Math.round(Number(group.chit_value || 0) * 0.9) : "";
        next.winner_id = "";
      }

      if (field === "auction_type") {
        next.winner_id = "";
      }

      return next;
    });
  };

  const completeManualAuction = async () => {
    const validationError = validateAuctionForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const result = await confirmAuctionWinner({
      activeTenantContext,
      group: selectedGroup,
      members: tenantMembers,
      monthNumber: Number(String(formData.auction_month).split("-").pop() || formData.auction_month || 1),
      bidAmount: Number(formData.bid_amount || formData.starting_bid || 0),
      winnerId: formData.winner_id,
    });
    if (!result.success) {
      setFormError(result.message);
      return;
    }
    const record = normalizeAuctionForUi(result.auction, tenantGroups, tenantMembers);
    const audit = createAuctionAuditLog(record, "manual_auction_completed");

    setAuctions((current) => [record, ...current]);
    setAuditLogs((current) => [audit, ...current]);
    setSelectedAuction(record);
    setIsModalOpen(false);
  };

  const runLuckyDrawAuction = () => {
    const validationError = validateAuctionForm({ requireWinner: false });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const selection = selectAuctionLuckyWinner(eligibleMembers);
    if (!selection) {
      setFormError("No eligible members available for lucky draw.");
      return;
    }

    const startedAt = Date.now();
    setIsDrawing(true);
    setDrawProgress(0);
    setHighlightedMember(null);

    drawTimerRef.current = setInterval(() => {
      const spinSelection = selectAuctionLuckyWinner(eligibleMembers);
      setHighlightedMember(spinSelection?.winner || null);
    }, 110);

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setDrawProgress(Math.min(100, Math.round((elapsed / AUCTION_DRAW_DURATION_MS) * 100)));
    }, 120);

    setTimeout(async () => {
      clearInterval(drawTimerRef.current);
      clearInterval(progressTimerRef.current);

      const result = await confirmAuctionWinner({
        activeTenantContext,
        group: selectedGroup,
        members: tenantMembers,
        monthNumber: Number(String(formData.auction_month).split("-").pop() || formData.auction_month || 1),
        bidAmount: Number(formData.bid_amount || formData.starting_bid || 0),
        winnerId: selection.winner.id,
      });
      if (!result.success) {
        setFormError(result.message);
        setIsDrawing(false);
        return;
      }
      const record = normalizeAuctionForUi(result.auction, tenantGroups, tenantMembers);
      const audit = createAuctionAuditLog(record, "lucky_draw_auction_completed");

      setAuctions((current) => [record, ...current]);
      setAuditLogs((current) => [audit, ...current]);
      setHighlightedMember(selection.winner);
      setSelectedAuction(record);
      setDrawProgress(100);
      setIsDrawing(false);
      setIsModalOpen(false);
    }, AUCTION_DRAW_DURATION_MS);
  };

  const validateAuctionForm = ({ requireWinner = true } = {}) => {
    if (!formData.chit_group_id) return "Chit Group is required.";
    if (!formData.auction_date) return "Auction Date is required.";
    if (!formData.auction_month) return "Auction Month is required.";
    if (!Number(formData.starting_bid)) return "Starting Bid is required.";
    if (!Number(formData.minimum_bid)) return "Minimum Bid is required.";
    if (!Number(formData.bid_amount)) return "Bid Amount is required.";
    if (!eligibleMembers.length) return "No eligible members are available.";
    if (requireWinner && formData.auction_type === AUCTION_TYPES.MANUAL && !formData.winner_id) {
      return "Select a winner for manual auction.";
    }
    return "";
  };

  const filteredAuctions = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return auctions.filter((auction) => {
      const matchesSearch =
        !search ||
        [
          auction.winner_name,
          auction.winner_number,
          auction.chit_group_name,
          auction.auction_month,
          auction.auction_type,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      const matchesGroup = !filters.group || auction.chit_group_id === filters.group;
      const matchesDate = !filters.date || auction.auction_date === filters.date;
      const matchesWinner =
        !filters.winner ||
        auction.winner_name?.toLowerCase().includes(filters.winner.toLowerCase()) ||
        auction.winner_number?.toLowerCase().includes(filters.winner.toLowerCase());
      const matchesType = !filters.auctionType || auction.auction_type === filters.auctionType;

      return matchesSearch && matchesGroup && matchesDate && matchesWinner && matchesType;
    });
  }, [auctions, filters]);

  const auctionColumns = [
    { key: "auction_month", label: "Month", width: "110px" },
    {
      key: "auction_date",
      label: "Date",
      width: "120px",
      render: (value) => new Date(value).toLocaleDateString("en-IN"),
    },
    { key: "chit_group_name", label: "Chit Group", width: "190px" },
    { key: "winner_name", label: "Winner", width: "160px" },
    { key: "winner_number", label: "Member No", width: "140px" },
    {
      key: "auction_type",
      label: "Type",
      width: "110px",
      render: (value) => <Badge label={value === AUCTION_TYPES.LUCKY_DRAW ? "Lucky Draw" : "Manual"} variant="primary" size="small" />,
    },
    {
      key: "bid_amount",
      label: "Bid Amount",
      width: "130px",
      render: (value) => formatCurrency(value),
    },
    {
      key: "dividend",
      label: "Dividend",
      width: "120px",
      render: (value) => formatCurrency(value),
    },
    {
      key: "status",
      label: "Status",
      width: "110px",
      render: (value) => <Badge label={value} variant={value === "completed" ? "success" : "warning"} size="small" />,
    },
  ];

  const auctionActions = [
    { icon: "View", label: "View Winner", onClick: setSelectedAuction, variant: "primary" },
  ];

  return (
    <ChitLayout
      title="Auction & Lift Engine"
      subtitle={`${CHIT_PRODUCT_NAME} Phase 4 auction, lift and dividend management`}
      actions={
        <><Button variant="primary" icon={<Play size={16} />} onClick={openStartAuction}>Start Auction</Button><HelpButton feature="AUCTIONS" variant="secondary"/></>
      }
    >
      <div className="auction-page">
        <section className="auction-hero">
          <div>
            <span className="auction-eyebrow">Tenant isolated auction operations</span>
            <h2>{activeTenantContext?.workspace_label || "Active Tenant"}</h2>
            <p>
              Manual bidding and lucky draw auctions run independently from
              collections and member records, with full audit logs.
            </p>
          </div>
          <div className="auction-tenant-chip">
            <ShieldCheck size={18} />
            <span>{activeTenantContext?.tenant_id || "No tenant selected"}</span>
          </div>
        </section>

        <section className="auction-kpi-grid">
          <AuctionKpi icon={<CalendarDays size={20} />} label="Today's Auctions" value={dashboardStats.todays_auctions} />
          <AuctionKpi icon={<ClipboardList size={20} />} label="Upcoming Auctions" value={dashboardStats.upcoming_auctions} />
          <AuctionKpi icon={<Trophy size={20} />} label="Completed Auctions" value={dashboardStats.completed_auctions} />
          <AuctionKpi label="Current Dividend" value={formatCurrency(dashboardStats.current_dividend)} />
          <AuctionKpi label="Current Lowest Bid" value={formatCurrency(dashboardStats.current_lowest_bid)} />
          <AuctionKpi label="Eligible Members" value={dashboardStats.eligible_members} />
        </section>

        <section className={`auction-draw-stage ${isDrawing ? "is-drawing" : ""} ${selectedAuction ? "has-winner" : ""}`}>
          <div className="auction-confetti" aria-hidden="true">
            {Array.from({ length: 24 }).map((_, index) => (
              <span key={index} style={{ "--i": index }} />
            ))}
          </div>
          <div className="auction-draw-orb">
            <Sparkles size={38} />
          </div>
          <div>
            <Badge
              label={isDrawing ? "Lucky draw running" : selectedAuction ? "Winner selected" : "Ready"}
              variant={selectedAuction ? "success" : isDrawing ? "warning" : "primary"}
              size="medium"
            />
            <h2>{selectedAuction?.winner_name || highlightedMember?.member_name || "Auction engine ready"}</h2>
            <p>
              {isDrawing
                ? "Randomizing eligible members for 12 seconds..."
                : selectedAuction
                  ? `${selectedAuction.winner_number} lifted ${formatCurrency(selectedAuction.winner_payable)}`
                  : "Start a manual auction or lucky draw from the action button."}
            </p>
            <div className="auction-progress">
              <span style={{ width: `${drawProgress}%` }} />
            </div>
          </div>
        </section>

        {selectedAuction && (
          <section className="winner-details-card">
            <Award size={34} />
            <div>
              <span>Winner Details</span>
              <h2>{selectedAuction.winner_name}</h2>
              <p>
                {selectedAuction.winner_number} | Bid {formatCurrency(selectedAuction.bid_amount)} | Lift {formatCurrency(selectedAuction.winner_payable)}
              </p>
            </div>
            <div className="winner-details-grid">
              <Detail label="Dividend" value={formatCurrency(selectedAuction.dividend)} />
              <Detail label="Auction Date" value={new Date(selectedAuction.auction_date).toLocaleDateString("en-IN")} />
              <Detail label="Status" value={selectedAuction.status} />
            </div>
          </section>
        )}

        <section className="auction-panel">
          <div className="auction-section-header">
            <div>
              <h2>History</h2>
              <p>Search and filter auctions by group, date, winner and type.</p>
            </div>
          </div>
          <div className="auction-filters">
            <div className="auction-search">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search auctions"
              />
            </div>
            <select value={filters.group} onChange={(event) => setFilters((current) => ({ ...current, group: event.target.value }))}>
              <option value="">All groups</option>
              {tenantGroups.map((group) => (
                <option key={group.id} value={group.id}>{group.chit_name}</option>
              ))}
            </select>
            <input type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} />
            <input value={filters.winner} onChange={(event) => setFilters((current) => ({ ...current, winner: event.target.value }))} placeholder="Winner" />
            <select value={filters.auctionType} onChange={(event) => setFilters((current) => ({ ...current, auctionType: event.target.value }))}>
              <option value="">All types</option>
              <option value={AUCTION_TYPES.MANUAL}>Manual</option>
              <option value={AUCTION_TYPES.LUCKY_DRAW}>Lucky Draw</option>
            </select>
          </div>
          <Table columns={auctionColumns} data={filteredAuctions} actions={auctionActions} />
        </section>

        <ReportsSection reports={reports} />

        <section className="auction-panel">
          <div className="auction-section-header">
            <div>
              <h2>Audit Logs</h2>
              <p>Security trail for tenant, mode, winner and completion actions.</p>
            </div>
          </div>
          <div className="audit-log-list">
            {auditLogs.length ? (
              auditLogs.map((log) => (
                <div key={log.id} className="audit-log-item">
                  <strong>{log.action}</strong>
                  <p>{log.summary}</p>
                  <span>{log.tenant_id} / {log.data_scope} / {new Date(log.created_at).toLocaleString("en-IN")}</span>
                </div>
              ))
            ) : (
              <div className="auction-empty-state">No audit logs yet.</div>
            )}
          </div>
        </section>
      </div>

      <Modal
        isOpen={isModalOpen}
        title="Start Auction"
        size="large"
        onClose={() => !isDrawing && setIsModalOpen(false)}
        footer={
          <div className="auction-modal-actions">
            <Button variant="default" onClick={() => setIsModalOpen(false)} disabled={isDrawing}>
              Cancel
            </Button>
            {formData.auction_type === AUCTION_TYPES.LUCKY_DRAW ? (
              <Button variant="success" onClick={runLuckyDrawAuction} disabled={isDrawing}>
                {isDrawing ? "Drawing..." : "Run Lucky Draw"}
              </Button>
            ) : (
              <Button variant="primary" onClick={completeManualAuction}>
                Complete Manual Auction
              </Button>
            )}
          </div>
        }
      >
        <div className="auction-form">
          {formError && <div className="auction-form-error">{formError}</div>}
          <FormField
            label="Chit Group"
            type="select"
            value={formData.chit_group_id}
            onChange={(value) => updateForm("chit_group_id", value)}
            options={tenantGroups.map((group) => ({ value: group.id, label: group.chit_name }))}
            required
          />
          <FormField
            label="Auction Date"
            type="date"
            value={formData.auction_date}
            onChange={(value) => updateForm("auction_date", value)}
            required
          />
          <FormField
            label="Auction Month"
            type="month"
            value={formData.auction_month}
            onChange={(value) => updateForm("auction_month", value)}
            required
          />
          <FormField
            label="Auction Type"
            type="select"
            value={formData.auction_type}
            onChange={(value) => updateForm("auction_type", value)}
            options={[
              { value: AUCTION_TYPES.MANUAL, label: "Manual" },
              { value: AUCTION_TYPES.LUCKY_DRAW, label: "Lucky Draw" },
            ]}
            required
          />
          <FormField
            label="Starting Bid"
            type="number"
            value={formData.starting_bid}
            onChange={(value) => updateForm("starting_bid", value)}
            required
          />
          <FormField
            label="Minimum Bid"
            type="number"
            value={formData.minimum_bid}
            onChange={(value) => updateForm("minimum_bid", value)}
            required
          />
          <FormField
            label="Bid Amount"
            type="number"
            value={formData.bid_amount}
            onChange={(value) => updateForm("bid_amount", value)}
            required
          />
          {formData.auction_type === AUCTION_TYPES.MANUAL && (
            <FormField
              label="Eligible Winner"
              type="select"
              value={formData.winner_id}
              onChange={(value) => updateForm("winner_id", value)}
              options={eligibleMembers.map((member) => ({
                value: member.id,
                label: `${member.member_name} (${member.member_number})`,
              }))}
              required
            />
          )}
          <FormField
            label="Notes"
            type="textarea"
            value={formData.notes}
            onChange={(value) => updateForm("notes", value)}
          />
          <div className="eligible-members-panel">
            <span>Eligible Members</span>
            <strong>{eligibleMembers.length}</strong>
            <p>
              Duplicate winners are prevented within the selected chit group.
            </p>
          </div>
          <div className="auction-calculation-panel">
            <Detail label="Discount" value={formatCurrency(projectedFinancials.discount)} />
            <Detail label="Dividend" value={formatCurrency(projectedFinancials.dividend)} />
            <Detail label="Winner Payable" value={formatCurrency(projectedFinancials.winner_payable)} />
            <Detail label="Remaining Distribution" value={formatCurrency(projectedFinancials.remaining_distribution)} />
          </div>
        </div>
      </Modal>
    </ChitLayout>
  );
}

function AuctionKpi({ icon = null, label, value }) {
  return (
    <div className="auction-kpi-card">
      {icon && <div className="auction-kpi-icon">{icon}</div>}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="auction-detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ReportsSection({ reports }) {
  return (
    <section className="auction-reports-grid">
      <ReportCard
        title="Monthly Auction Report"
        rows={reports.monthly}
        empty="No monthly report yet."
        renderRow={(row) => (
          <>
            <strong>{row.month}</strong>
            <span>{row.auctions} auctions / Bid {formatCurrency(row.total_bid)} / Dividend {formatCurrency(row.total_dividend)}</span>
          </>
        )}
      />
      <ReportCard
        title="Winner History"
        rows={reports.winners}
        empty="No winner history yet."
        renderRow={(row) => (
          <>
            <strong>{row.winner_name}</strong>
            <span>{row.winner_number} / {row.chit_group_name} / {formatCurrency(row.winner_payable)}</span>
          </>
        )}
      />
      <ReportCard
        title="Dividend History"
        rows={reports.dividends}
        empty="No dividend history yet."
        renderRow={(row) => (
          <>
            <strong>{row.chit_group_name}</strong>
            <span>{row.auction_month} / Dividend {formatCurrency(row.dividend)} / Distribution {formatCurrency(row.remaining_distribution)}</span>
          </>
        )}
      />
    </section>
  );
}

function ReportCard({ title, rows, empty, renderRow }) {
  return (
    <div className="auction-report-card">
      <h3>{title}</h3>
      <div className="auction-report-list">
        {rows.length ? (
          rows.map((row) => (
            <div key={row.id || row.month} className="auction-report-row">
              {renderRow(row)}
            </div>
          ))
        ) : (
          <div className="auction-empty-state">{empty}</div>
        )}
      </div>
    </div>
  );
}

function normalizeAuctionForUi(auction, groups, members) {
  const group = groups.find((item) => item.id === (auction.group_id || auction.chit_group_id));
  const member = members.find((item) => item.id === (auction.winner_member_id || auction.memberId || auction.member_id));
  return {
    ...auction,
    chit_group_id: auction.chit_group_id || auction.group_id,
    chit_group_name: group?.chit_name || "Chit Group",
    winner_name: member?.member_name || "Winner",
    winner_number: member?.member_number || "",
    auction_type: auction.winner_mode || auction.winnerMode || auction.auction_type || AUCTION_TYPES.MANUAL,
    winner_payable: auction.payout_amount || auction.payoutAmount || auction.prize_amount || 0,
    dividend: auction.dividend_amount || auction.dividend || 0,
    remaining_distribution: auction.payout_amount || auction.prize_amount || 0,
    status: String(auction.status || "completed").toLowerCase(),
  };
}

export default Auctions;
