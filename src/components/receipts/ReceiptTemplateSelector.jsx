import { RECEIPT_TEMPLATES } from "../../services/receiptService";

function ReceiptTemplateSelector({ value, onChange }) {
  return (
    <label className="receipt-template-selector">
      <span>Receipt Template</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {Object.values(RECEIPT_TEMPLATES).map((template) => (
          <option key={template} value={template}>
            {template}
          </option>
        ))}
      </select>
    </label>
  );
}

export default ReceiptTemplateSelector;
