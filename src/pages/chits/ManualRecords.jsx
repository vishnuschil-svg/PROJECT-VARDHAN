import { useEffect, useMemo, useState } from "react";
import { ClipboardList, FileCheck2, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import ChitLayout from "../../components/chit/ChitLayout";
import Button from "../../components/common/Button";
import Table from "../../components/common/Table";
import { useAuth } from "../../hooks/useAuth";
import { listTenantGroups, listTenantMembers } from "../../services/chitDataService";
import { listDistributionRecords, listManualBidRecords, saveDistributionRecord, saveManualBidRecord } from "../../services/manualRecordsService";
import "./ManualRecords.css";

const today = () => new Date().toISOString().slice(0, 10);
const emptyBid = () => ({ groupId: "", periodId: "", memberEntries: [{ memberId: "", recordedAmount: "", notes: "" }], declaredRecipientMemberId: "", recordedDistributionAmount: "", recordDate: today(), referenceNumber: "", notes: "", attachmentPath: "", confirmedExternalDecision: false });
const emptyDistribution = () => ({ groupId: "", periodId: "", recipientMemberId: "", distributionAmount: "", distributionDate: today(), referenceNumber: "", notes: "", attachmentPath: "", sourceRecordId: "" });

export default function ManualRecords() {
  const location = useLocation();
  const { activeTenantContext, permissions, profile, role, user } = useAuth();
  const [tab, setTab] = useState(location.pathname.includes("distributions") ? "distribution" : "bid");
  const [bid, setBid] = useState(emptyBid);
  const [distribution, setDistribution] = useState(emptyDistribution);
  const [bidRows, setBidRows] = useState([]);
  const [distributionRows, setDistributionRows] = useState([]);
  const [notice, setNotice] = useState(location.state?.featureNotice || "");
  const [saving, setSaving] = useState(false);
  const groups = useMemo(() => listTenantGroups(activeTenantContext), [activeTenantContext]);
  const members = useMemo(() => listTenantMembers(activeTenantContext), [activeTenantContext]);
  const groupMembers = members.filter((member) => member.chit_group_id === bid.groupId || member.group_id === bid.groupId);
  const userId = user?.id || profile?.id || null;

  useEffect(() => {
    let active = true;
    Promise.all([listManualBidRecords(activeTenantContext), listDistributionRecords(activeTenantContext)])
      .then(([bids, distributions]) => { if (active) { setBidRows(bids); setDistributionRows(distributions); } })
      .catch((error) => active && setNotice(error.message));
    return () => { active = false; };
  }, [activeTenantContext]);

  async function submitBid(event) {
    event.preventDefault(); setSaving(true); setNotice("");
    try {
      const result = await saveManualBidRecord(bid, { activeTenantContext, userId, permissions, profile, role });
      setBidRows((rows) => [result.record, ...rows]); setBid(emptyBid());
      setNotice("Manual details saved as an organizer-entered record. No outcome was calculated by VARDHAN.");
    } catch (error) { setNotice(error.message); } finally { setSaving(false); }
  }

  async function submitDistribution(event) {
    event.preventDefault(); setSaving(true); setNotice("");
    try {
      const result = await saveDistributionRecord(distribution, { activeTenantContext, userId, permissions, profile, role });
      setDistributionRows((rows) => [result.record, ...rows]); setDistribution(emptyDistribution());
      setNotice("Distribution saved and posted to ledger/reporting from the organizer-entered final amount.");
    } catch (error) { setNotice(error.message); } finally { setSaving(false); }
  }

  return <ChitLayout title={tab === "bid" ? "Manual Bid Records" : "Distribution Records"} subtitle="Record final decisions made independently by the organizer outside VARDHAN">
    <div className="manual-records-page">
      <section className="record-safety-banner"><ShieldCheck/><div><strong>Organizer decision · VARDHAN record</strong><p>This workspace stores final details already decided outside the software. It does not rank bids, recommend recipients, or calculate outcomes.</p></div></section>
      <div className="record-tabs" role="tablist">
        <button type="button" className={tab === "bid" ? "active" : ""} onClick={() => setTab("bid")}><ClipboardList/>Manual Bid Records</button>
        <button type="button" className={tab === "distribution" ? "active" : ""} onClick={() => setTab("distribution")}><FileCheck2/>Distribution Records</button>
      </div>
      {notice && <div className="record-notice" role="status">{notice}</div>}
      {tab === "bid" ? <>
        <form className="record-card" onSubmit={submitBid}>
          <header><div><h2>Record completed bid details</h2><p>Enter the final figures exactly as declared by the organizer.</p></div></header>
          <div className="record-form-grid">
            <Select label="Group" value={bid.groupId} onChange={(value) => setBid({ ...bid, groupId: value, declaredRecipientMemberId: "", memberEntries: [{ memberId: "", recordedAmount: "", notes: "" }] })} options={groups.map(groupOption)}/>
            <Field label="Period / Month" type="month" value={bid.periodId} onChange={(value) => setBid({ ...bid, periodId: value })}/>
            <Field label="Record Date" type="date" value={bid.recordDate} onChange={(value) => setBid({ ...bid, recordDate: value })}/>
            <Field label="Reference" value={bid.referenceNumber} onChange={(value) => setBid({ ...bid, referenceNumber: value })}/>
          </div>
          <div className="member-entry-block"><div className="record-section-heading"><div><h3>Member records</h3><p>Recorded amounts are manually entered and are not ranked.</p></div><Button type="button" variant="secondary" icon={<Plus size={15}/>} onClick={() => setBid({ ...bid, memberEntries: [...bid.memberEntries, { memberId: "", recordedAmount: "", notes: "" }] })}>Add member</Button></div>
            {bid.memberEntries.map((entry, index) => <div className="member-entry-row" key={index}>
              <Select label="Member" value={entry.memberId} onChange={(value) => updateEntry(index, "memberId", value, bid, setBid)} options={groupMembers.map(memberOption)}/>
              <Field label="Recorded Amount" type="number" min="0.01" value={entry.recordedAmount} onChange={(value) => updateEntry(index, "recordedAmount", value, bid, setBid)}/>
              <Field label="Notes" value={entry.notes} onChange={(value) => updateEntry(index, "notes", value, bid, setBid)}/>
              <button type="button" className="record-remove" aria-label="Remove member record" disabled={bid.memberEntries.length === 1} onClick={() => setBid({ ...bid, memberEntries: bid.memberEntries.filter((_, i) => i !== index) })}><Trash2 size={17}/></button>
            </div>)}
          </div>
          <div className="record-form-grid final-values">
            <Select label="Recipient as Declared by Organizer" value={bid.declaredRecipientMemberId} onChange={(value) => setBid({ ...bid, declaredRecipientMemberId: value })} options={groupMembers.map(memberOption)}/>
            <Field label="Distribution Amount" type="number" min="0.01" value={bid.recordedDistributionAmount} onChange={(value) => setBid({ ...bid, recordedDistributionAmount: value })}/>
            <Field label="Attachment reference" value={bid.attachmentPath} onChange={(value) => setBid({ ...bid, attachmentPath: value })}/>
            <Field label="Notes" value={bid.notes} onChange={(value) => setBid({ ...bid, notes: value })}/>
          </div>
          <label className="record-confirm"><input type="checkbox" checked={bid.confirmedExternalDecision} onChange={(event) => setBid({ ...bid, confirmedExternalDecision: event.target.checked })}/><span>I confirm that this result was independently determined outside VARDHAN and is being recorded for bookkeeping purposes.</span></label>
          <Button type="submit" variant="primary" icon={<Save size={16}/>} loading={saving}>Save manual record</Button>
        </form>
        <RecordTable rows={bidRows} type="bid" members={members} groups={groups}/>
      </> : <>
        <form className="record-card" onSubmit={submitDistribution}>
          <header><div><h2>Record a distribution</h2><p>The recipient and amount must be entered as final organizer decisions.</p></div></header>
          <div className="record-form-grid">
            <Select label="Group" value={distribution.groupId} onChange={(value) => setDistribution({ ...distribution, groupId: value, recipientMemberId: "" })} options={groups.map(groupOption)}/>
            <Field label="Period / Month" type="month" value={distribution.periodId} onChange={(value) => setDistribution({ ...distribution, periodId: value })}/>
            <Select label="Recipient as Declared by Organizer" value={distribution.recipientMemberId} onChange={(value) => setDistribution({ ...distribution, recipientMemberId: value })} options={members.filter((m) => m.chit_group_id === distribution.groupId || m.group_id === distribution.groupId).map(memberOption)}/>
            <Field label="Distribution Amount" type="number" min="0.01" value={distribution.distributionAmount} onChange={(value) => setDistribution({ ...distribution, distributionAmount: value })}/>
            <Field label="Distribution Date" type="date" value={distribution.distributionDate} onChange={(value) => setDistribution({ ...distribution, distributionDate: value })}/>
            <Field label="Reference Number" value={distribution.referenceNumber} onChange={(value) => setDistribution({ ...distribution, referenceNumber: value })}/>
            <Select label="Source Manual Bid Record (optional)" value={distribution.sourceRecordId} onChange={(value) => setDistribution({ ...distribution, sourceRecordId: value })} options={bidRows.filter((r) => !distribution.groupId || r.group_id === distribution.groupId).map((r) => ({ value: r.id, label: `${r.period_id} · ${r.reference_number || r.id}` }))}/>
            <Field label="Attachment reference" value={distribution.attachmentPath} onChange={(value) => setDistribution({ ...distribution, attachmentPath: value })}/>
          </div>
          <label className="record-wide-field">Notes<textarea value={distribution.notes} onChange={(event) => setDistribution({ ...distribution, notes: event.target.value })}/></label>
          <Button type="submit" variant="primary" icon={<Save size={16}/>} loading={saving}>Save distribution record</Button>
        </form>
        <RecordTable rows={distributionRows} type="distribution" members={members} groups={groups}/>
      </>}
    </div>
  </ChitLayout>;
}

function Field({ label, onChange, ...props }) { return <label>{label}<input {...props} required={!["Reference", "Reference Number", "Attachment reference", "Notes"].includes(label)} onChange={(event) => onChange(event.target.value)}/></label>; }
function Select({ label, value, onChange, options }) { return <label>{label}<select value={value} required={!label.includes("optional")} onChange={(event) => onChange(event.target.value)}><option value="">Select</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function memberOption(member) { return { value: member.id, label: `${member.member_name || "Member"}${member.member_number ? ` · ${member.member_number}` : ""}` }; }
function groupOption(group) { return { value: group.id, label: group.chit_name || group.group_name || group.chit_code }; }
function updateEntry(index, key, value, bid, setBid) { setBid({ ...bid, memberEntries: bid.memberEntries.map((entry, i) => i === index ? { ...entry, [key]: value } : entry) }); }
function RecordTable({ rows, type, members, groups }) {
  const columns = [
    { key: "period_id", label: "Period" },
    { key: "group_id", label: "Group", render: (value) => groups.find((g) => g.id === value)?.chit_name || value },
    { key: type === "bid" ? "declared_recipient_member_id" : "recipient_member_id", label: "Recipient", render: (value) => members.find((m) => m.id === value)?.member_name || value },
    { key: type === "bid" ? "recorded_distribution_amount" : "distribution_amount", label: "Distribution Amount", render: (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0)) },
    { key: "reference_number", label: "Reference" },
  ];
  return <section className="record-card record-history"><header><div><h2>{type === "bid" ? "Manual record history" : "Distribution history"}</h2><p>Tenant-scoped organizer-entered records.</p></div></header><Table columns={columns} data={rows}/></section>;
}
