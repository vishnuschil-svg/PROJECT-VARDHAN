import { createReceiptStyles, createReceiptTemplate } from "./ReceiptTemplate";

export function createReceiptImageLayout(receipt, template) {
  const html = `${createReceiptStyles()}${createReceiptTemplate(receipt, template)}`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="950" height="1240">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
      </foreignObject>
    </svg>
  `.trim();

  return {
    svg,
    imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    fileName: `${receipt.receiptNumber}.svg`,
  };
}
