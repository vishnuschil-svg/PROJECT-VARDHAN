import {
  CalendarDays,
  Download,
  FileText,
  MessageCircle,
  Printer,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Table from "../../components/common/Table";
import {
  buildMemberLedger,
  buildPassbookPayload,
  buildPassbookWhatsAppMessage,
  createPassbookImageFile,
  createPassbookImageUrl,
  createPassbookPdfFile,
  filterLedgerTransactions,
  formatLedgerCurrency,
  getFinancialYearOptions,
  getLedgerVisibleRecords,
} from "../../config/chitMemberLedger";
import { CHIT_PRODUCT_NAME, isPlatformOwner } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import { useTenantCollections } from "../../services/chitCollectionsStore";
import { listVisibleGroups, listVisibleMembers } from "../../services/chitDataService";
import "./MemberLedger.css";

function MemberLedger() {
  const { activeTenantContext, company, profile, role } = useAuth();
  const platformOwner = isPlatformOwner(profile, role);
  const collections = useTenantCollections(activeTenantContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [filters, setFilters] = useState({
    date: "",
    financialYear: "",
    chitGroupId: "",
  });

  const visibleRecords = useMemo(
    () =>
      getLedgerVisibleRecords({
        members: listVisibleMembers(activeTenantContext, platformOwner),
        groups: listVisibleGroups(activeTenantContext, platformOwner),
        activeTenantContext,
        platformOwner,
      }),
    [activeTenantContext, platformOwner]
  );

  const searchableMembers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return visibleRecords.members.filter((member) => {
      const matchesSearch =
        !normalizedSearch ||
        [member.member_number, member.member_name, member.mobile_number, member.whatsapp_number]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      const matchesGroup = !filters.chitGroupId || member.chit_group_id === filters.chitGroupId;
      return matchesSearch && matchesGroup;
    });
  }, [filters.chitGroupId, searchTerm, visibleRecords.members]);

  const selectedMember = useMemo(
    () => searchableMembers.find((member) => member.id === selectedMemberId) || searchableMembers[0],
    [searchableMembers, selectedMemberId]
  );
  const selectedGroup = visibleRecords.groups.find(
    (group) => group.id === selectedMember?.chit_group_id
  );
  const ledger = useMemo(
    () => buildMemberLedger({ member: selectedMember, group: selectedGroup, collections }),
    [collections, selectedGroup, selectedMember]
  );
  const financialYears = getFinancialYearOptions(ledger.transactions);
  const filteredTransactions = filterLedgerTransactions(ledger.transactions, filters);
  const passbookPayload = buildPassbookPayload({
    member: selectedMember,
    group: selectedGroup,
    ledger,
    businessName: company?.company_name || activeTenantContext?.workspace_label || "VARDHAN Chit Business",
  });
  const passbookImageUrl = createPassbookImageUrl(passbookPayload);

  const transactionColumns = [
    { key: "receipt_no", label: "Receipt No", width: "190px", sortable: true },
    {
      key: "date",
      label: "Date",
      width: "120px",
      render: (value) => new Date(value).toLocaleDateString("en-IN"),
    },
    { key: "month", label: "Month", width: "120px" },
    { key: "collection", label: "Collection", width: "120px", render: formatLedgerCurrency },
    { key: "fine", label: "Fine", width: "100px", render: formatLedgerCurrency },
    { key: "dividend", label: "Dividend", width: "110px", render: formatLedgerCurrency },
    { key: "lift", label: "Lift", width: "120px", render: formatLedgerCurrency },
    { key: "adjustment", label: "Adjustment", width: "120px", render: formatLedgerCurrency },
    { key: "balance", label: "Balance", width: "120px", render: formatLedgerCurrency },
  ];

  const printPassbook = () => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${passbookPayload.member_number} Passbook</title>
          <style>
            body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #eef3fb; }
            img { width: min(960px, 96vw); box-shadow: 0 20px 60px rgba(7, 17, 31, 0.18); }
          </style>
        </head>
        <body>
          <img src="${passbookImageUrl}" alt="Member passbook" />
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadPdf = () => {
    const file = createPassbookPdfFile(passbookPayload);
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sendWhatsApp = async (mode) => {
    const message = buildPassbookWhatsAppMessage(passbookPayload);
    const file = mode === "pdf" ? createPassbookPdfFile(passbookPayload) : createPassbookImageFile(passbookPayload);

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `${passbookPayload.member_number} Passbook`,
        text: message,
        files: [file],
      });
      return;
    }

    const phone = normalizeWhatsAppNumber(selectedMember?.whatsapp_number || selectedMember?.mobile_number);
    const target = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  return (
    <ChitLayout
      title="Member Ledger & Passbook"
      subtitle={`${CHIT_PRODUCT_NAME} complete member financial history`}
      actions={
        <Button variant="primary" icon={<Printer size={16} />} onClick={printPassbook} disabled={!selectedMember}>
          Print Passbook
        </Button>
      }
    >
      <div className="member-ledger-page">
        <section className="ledger-hero">
          <div>
            <span>Phase 7 financial command center</span>
            <h2>Complete member ledger in one screen</h2>
            <p>
              Opening balance, installments, fines, discounts, dividends, lift amount,
              outstanding balance, passbook and timeline stay tenant-aware.
            </p>
          </div>
          <div className="ledger-security-chip">
            <ShieldCheck size={18} />
            <strong>{activeTenantContext?.workspace_label || "Platform Owner"}</strong>
            <span>{activeTenantContext?.tenant_id || "All tenant data"}</span>
          </div>
        </section>

        <section className="ledger-workbench">
          <aside className="ledger-member-panel">
            <div className="ledger-search">
              <Search size={16} />
              <input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setSelectedMemberId("");
                }}
                placeholder="Search by member no, name, mobile"
              />
            </div>
            <div className="ledger-member-list">
              {searchableMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className={`ledger-member-item ${selectedMember?.id === member.id ? "active" : ""}`}
                  onClick={() => setSelectedMemberId(member.id)}
                >
                  <span><UserRound size={16} /></span>
                  <strong>{member.member_name}</strong>
                  <small>{member.member_number} / {member.mobile_number}</small>
                </button>
              ))}
              {!searchableMembers.length && (
                <div className="ledger-empty-mini">No members found.</div>
              )}
            </div>
          </aside>

          <main className="ledger-main-panel">
            <div className="ledger-member-header">
              <div>
                <span>Selected member</span>
                <h3>{selectedMember?.member_name || "No member selected"}</h3>
                <p>{selectedMember?.member_number || "-"} / {selectedGroup?.chit_name || "No chit group"}</p>
              </div>
              <Badge
                label={ledger.lift_status}
                variant={ledger.lift_status === "Lifted" ? "success" : "warning"}
                size="medium"
              />
            </div>

            <div className="ledger-summary-grid">
              <LedgerCard label="Opening Balance" value={ledger.opening_balance} />
              <LedgerCard label="Security Deposit" value={ledger.security_deposit} />
              <LedgerCard label="Total Installments Paid" value={ledger.total_installments_paid} tone="good" />
              <LedgerCard label="Pending Installments" value={ledger.pending_installments} tone="attention" />
              <LedgerCard label="Fine" value={ledger.fine} tone="risk" />
              <LedgerCard label="Discount" value={ledger.discount} tone="good" />
              <LedgerCard label="Dividend Received" value={ledger.dividend_received} tone="good" />
              <LedgerCard label="Lift Amount" value={ledger.lift_amount} />
              <LedgerCard label="Outstanding Balance" value={ledger.outstanding_balance} tone={ledger.outstanding_balance > 0 ? "risk" : "good"} />
            </div>

            <div className="ledger-filter-bar">
              <label>
                Date
                <input
                  type="date"
                  value={filters.date}
                  onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
                />
              </label>
              <label>
                Financial Year
                <select
                  value={filters.financialYear}
                  onChange={(event) => setFilters((current) => ({ ...current, financialYear: event.target.value }))}
                >
                  <option value="">All years</option>
                  {financialYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
              <label>
                Chit Group
                <select
                  value={filters.chitGroupId}
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, chitGroupId: event.target.value }));
                    setSelectedMemberId("");
                  }}
                >
                  <option value="">All groups</option>
                  {visibleRecords.groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.chit_name}</option>
                  ))}
                </select>
              </label>
            </div>

            <section className="ledger-passbook-grid">
              <div className="passbook-preview-card">
                <div className="ledger-section-header">
                  <div>
                    <h3>Member Passbook</h3>
                    <p>Professional printable and shareable passbook view.</p>
                  </div>
                </div>
                <div className="passbook-frame">
                  <img src={passbookImageUrl} alt="Member passbook preview" />
                </div>
                <div className="passbook-actions">
                  <Button variant="default" icon={<Printer size={16} />} onClick={printPassbook}>Print</Button>
                  <Button variant="default" icon={<Download size={16} />} onClick={downloadPdf}>PDF</Button>
                  <Button variant="success" icon={<MessageCircle size={16} />} onClick={() => sendWhatsApp("image")}>WhatsApp Image</Button>
                  <Button variant="success" icon={<FileText size={16} />} onClick={() => sendWhatsApp("pdf")}>WhatsApp PDF</Button>
                </div>
              </div>

              <div className="ledger-timeline-card">
                <div className="ledger-section-header">
                  <div>
                    <h3>Timeline</h3>
                    <p>Chronological member activity.</p>
                  </div>
                </div>
                <div className="ledger-timeline">
                  {ledger.timeline.map((item) => (
                    <div key={item.id} className={`ledger-timeline-item tone-${item.tone}`}>
                      <span><CalendarDays size={15} /></span>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                        <small>{new Date(item.date).toLocaleDateString("en-IN")}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="ledger-table-card">
              <div className="ledger-section-header">
                <div>
                  <h3>Transaction History</h3>
                  <p>Receipt-wise collection, fine, dividend, lift, adjustment and balance.</p>
                </div>
                <Badge label={`${filteredTransactions.length} entries`} variant="primary" size="small" />
              </div>
              <Table columns={transactionColumns} data={filteredTransactions} />
            </section>
          </main>
        </section>
      </div>
    </ChitLayout>
  );
}

function LedgerCard({ label, value, tone = "neutral" }) {
  return (
    <article className={`ledger-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{formatLedgerCurrency(value)}</strong>
    </article>
  );
}

function normalizeWhatsAppNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}

export default MemberLedger;
