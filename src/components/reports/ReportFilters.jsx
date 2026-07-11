function ReportFilters({ filters, options, onChange }) {
  return (
    <div className="enterprise-report-filters">
      <label>
        <span>From</span>
        <input
          type="date"
          value={filters.dateRange.from}
          onChange={(event) => onChange({ dateRange: { ...filters.dateRange, from: event.target.value } })}
        />
      </label>
      <label>
        <span>To</span>
        <input
          type="date"
          value={filters.dateRange.to}
          onChange={(event) => onChange({ dateRange: { ...filters.dateRange, to: event.target.value } })}
        />
      </label>
      <label>
        <span>Group</span>
        <select value={filters.groupId} onChange={(event) => onChange({ groupId: event.target.value })}>
          <option value="all">All groups</option>
          {(options.groups || []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Member</span>
        <select value={filters.memberId} onChange={(event) => onChange({ memberId: event.target.value })}>
          <option value="all">All members</option>
          {(options.members || []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Staff</span>
        <select value={filters.staffId} onChange={(event) => onChange({ staffId: event.target.value })}>
          <option value="all">All staff</option>
          {(options.staff || []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Payment</span>
        <select value={filters.paymentMode} onChange={(event) => onChange({ paymentMode: event.target.value })}>
          <option value="all">All modes</option>
          {(options.paymentModes || []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Collection</span>
        <select value={filters.collectionStatus} onChange={(event) => onChange({ collectionStatus: event.target.value })}>
          <option value="all">All statuses</option>
          {(options.collectionStatuses || []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Receipt</span>
        <select value={filters.receiptStatus} onChange={(event) => onChange({ receiptStatus: event.target.value })}>
          <option value="all">All receipts</option>
          {(options.receiptStatuses || []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Group Status</span>
        <select value={filters.groupStatus} onChange={(event) => onChange({ groupStatus: event.target.value })}>
          <option value="all">All groups</option>
          {(options.groupStatuses || []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Min Amount</span>
        <input
          type="number"
          value={filters.amount.min}
          onChange={(event) => onChange({ amount: { ...filters.amount, min: event.target.value } })}
        />
      </label>
      <label>
        <span>Max Amount</span>
        <input
          type="number"
          value={filters.amount.max}
          onChange={(event) => onChange({ amount: { ...filters.amount, max: event.target.value } })}
        />
      </label>
    </div>
  );
}

export default ReportFilters;
