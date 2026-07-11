import ConfidenceBadge from "./ConfidenceBadge";
import { useRef, useState } from "react";
import { ScheduleEngine } from "../../domain/chit/services/ScheduleEngine.js";

function ScheduleEditor({ schedule = [], onChange }) {
  const [bulk, setBulk] = useState({ field: "nonLiftedPayment", value: "", startMonth: 1, endMonth: schedule.length || 1, percentage: 0 });
  const [history, setHistory] = useState([]);
  const fileRef = useRef(null);
  const commit = (next) => {
    setHistory((current) => [schedule, ...current].slice(0, 10));
    onChange(next);
  };
  const updateRow = (index, field, value) => {
    commit(schedule.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: numericFields.has(field) ? Number(value || 0) : value, isManuallyOverridden: true } : row));
  };
  const undo = () => {
    const [previous, ...rest] = history;
    if (previous) {
      setHistory(rest);
      onChange(previous);
    }
  };
  const exportCsv = () => {
    const header = ["monthNumber", "nonLiftedPayment", "liftedPayment", "payoutAmount", "bidPercentage", "dividendPerMember", "winnerSelectionMode"];
    const csv = [header.join(","), ...schedule.map((row) => header.map((field) => row[field] ?? "").join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "chit-schedule.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const importCsv = async (file) => {
    if (!file) return;
    const text = await file.text();
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const headers = headerLine.split(",").map((item) => item.trim());
    const next = lines.map((line, index) => {
      const values = line.split(",");
      const row = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex]]));
      return {
        ...(schedule[index] || {}),
        ...row,
        monthNumber: Number(row.monthNumber || index + 1),
        monthLabel: `Month ${Number(row.monthNumber || index + 1)}`,
        nonLiftedPayment: Number(row.nonLiftedPayment || 0),
        liftedPayment: Number(row.liftedPayment || 0),
        payoutAmount: Number(row.payoutAmount || 0),
        bidPercentage: Number(row.bidPercentage || 0),
        dividendPerMember: Number(row.dividendPerMember || 0),
        confidence: "MEDIUM",
        isUserConfirmed: false,
      };
    });
    commit(next);
  };
  return (
    <div className="chit-studio-card">
      <div className="chit-studio-section-head">
        <h3>Month-wise Schedule</h3>
        <span>{schedule.length} rows</span>
      </div>
      <div className="schedule-bulk-toolbar">
        <select value={bulk.field} onChange={(event) => setBulk((current) => ({ ...current, field: event.target.value }))}>
          {Array.from(numericFields).map((field) => <option key={field}>{field}</option>)}
        </select>
        <input type="number" value={bulk.value} onChange={(event) => setBulk((current) => ({ ...current, value: event.target.value }))} placeholder="Value" />
        <input type="number" value={bulk.startMonth} onChange={(event) => setBulk((current) => ({ ...current, startMonth: event.target.value }))} />
        <input type="number" value={bulk.endMonth} onChange={(event) => setBulk((current) => ({ ...current, endMonth: event.target.value }))} />
        <button type="button" onClick={() => commit(ScheduleEngine.copyValueToAll(schedule, bulk.field, bulk.value))}>Apply All</button>
        <button type="button" onClick={() => commit(ScheduleEngine.applyRange(schedule, { startMonth: bulk.startMonth, endMonth: bulk.endMonth, patch: { [bulk.field]: Number(bulk.value || 0) } }))}>Apply Range</button>
        <input type="number" value={bulk.percentage} onChange={(event) => setBulk((current) => ({ ...current, percentage: event.target.value }))} placeholder="%" />
        <button type="button" onClick={() => commit(ScheduleEngine.applyPercentageChange(schedule, bulk.field, bulk.percentage))}>Step %</button>
        <button type="button" onClick={() => commit(ScheduleEngine.copyPreviousMonth(schedule, bulk.startMonth))}>Copy Previous</button>
        <button type="button" onClick={() => commit(ScheduleEngine.markSpecialMonth(schedule, bulk.startMonth))}>Company Month</button>
        <button type="button" onClick={undo} disabled={!history.length}>Undo</button>
        <button type="button" onClick={() => commit(schedule.map((row) => ({ ...row, isUserConfirmed: false, isManuallyOverridden: false })))}>Reset Unconfirmed</button>
        <button type="button" onClick={exportCsv}>Export</button>
        <button type="button" onClick={() => fileRef.current?.click()}>Import</button>
        <input ref={fileRef} type="file" accept=".csv" hidden onChange={(event) => importCsv(event.target.files?.[0])} />
      </div>
      <div className="chit-studio-table-wrap">
        <table>
          <thead><tr><th>Month</th><th>Non-lifted</th><th>Lifted</th><th>Payout</th><th>Bid %</th><th>Dividend</th><th>Mode</th><th>Confidence</th></tr></thead>
          <tbody>
            {schedule.map((row, index) => (
              <tr key={row.id || row.monthNumber}>
                <td className="sticky-month">{row.monthLabel || `Month ${row.monthNumber}`}</td>
                <td><input type="number" value={row.nonLiftedPayment || 0} onChange={(event) => updateRow(index, "nonLiftedPayment", event.target.value)} /></td>
                <td><input type="number" value={row.liftedPayment || 0} onChange={(event) => updateRow(index, "liftedPayment", event.target.value)} /></td>
                <td><input type="number" value={row.payoutAmount || 0} onChange={(event) => updateRow(index, "payoutAmount", event.target.value)} /></td>
                <td><input type="number" value={row.bidPercentage || 0} onChange={(event) => updateRow(index, "bidPercentage", event.target.value)} /></td>
                <td><input type="number" value={row.dividendPerMember || 0} onChange={(event) => updateRow(index, "dividendPerMember", event.target.value)} /></td>
                <td><select value={row.winnerSelectionMode || "AUCTION"} onChange={(event) => updateRow(index, "winnerSelectionMode", event.target.value)}><option>AUCTION</option><option>LUCKY_DRAW</option><option>COMPANY</option><option>MANUAL</option><option>NONE</option></select></td>
                <td><ConfidenceBadge value={row.confidence || "HIGH"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="schedule-mobile-cards">
        {schedule.map((row) => (
          <article key={`mobile-${row.id || row.monthNumber}`}>
            <strong>{row.monthLabel || `Month ${row.monthNumber}`}</strong>
            <span>Non-lifted: {row.nonLiftedPayment || 0}</span>
            <span>Lifted: {row.liftedPayment || 0}</span>
            <span>Payout: {row.payoutAmount || 0}</span>
            <span>Winner: {row.winnerSelectionMode || "AUCTION"}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

const numericFields = new Set(["nonLiftedPayment", "liftedPayment", "payoutAmount", "bidPercentage", "dividendPerMember"]);

export default ScheduleEditor;
