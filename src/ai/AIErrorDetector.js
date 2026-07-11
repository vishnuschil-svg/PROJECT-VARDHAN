import { createAssistantResponse } from "./AIContext.js";

export function detectBusinessAnomalies(context) {
  const groups = context.source.groups || [];
  const collections = context.source.collections || [];
  const anomalies = [];
  const negativeCollections = collections.filter((collection) => Number(collection.paid_amount || 0) < 0);
  const highPendingGroups = groups.filter((group) =>
    Number(group.pending_collections || 0) > Number(group.monthly_amount || 0) * 2
  );

  if (negativeCollections.length) {
    anomalies.push(createAssistantResponse({
      id: "anomaly-negative-collections",
      type: "BUSINESS_ANOMALY",
      title: "Invalid collection amount detected",
      message: `${negativeCollections.length} collection records have negative paid amounts.`,
      action: { label: "Open collections", route: "/chits/collections" },
      confidence: 0.95,
      severity: "critical",
    }));
  }

  if (highPendingGroups.length) {
    anomalies.push(createAssistantResponse({
      id: "anomaly-high-pending-groups",
      type: "BUSINESS_ANOMALY",
      title: "High pending exposure detected",
      message: `${highPendingGroups.length} chit groups have pending amounts above two monthly installments.`,
      action: { label: "Open pending", route: "/chits/collections/pending" },
      confidence: 0.84,
      severity: "warning",
    }));
  }

  return anomalies;
}

export function detectDuplicateData(context) {
  const members = context.source.members || [];
  const duplicates = findDuplicates(members, (member) => member.mobile_number || member.whatsapp_number);

  if (!duplicates.length) {
    return [
      createAssistantResponse({
        id: "duplicates-clean",
        type: "DUPLICATE_DETECTION",
        title: "No duplicate members detected",
        message: "Member phone signals do not show likely duplicates.",
        action: { label: "Open members", route: "/chits/members" },
        confidence: 0.78,
        severity: "success",
      }),
    ];
  }

  return duplicates.map((duplicate, index) =>
    createAssistantResponse({
      id: `duplicate-member-${index + 1}`,
      type: "DUPLICATE_DETECTION",
      title: "Possible duplicate member",
      message: `${duplicate.count} member records share contact signal ${duplicate.key}.`,
      action: { label: "Review members", route: "/chits/members" },
      confidence: 0.88,
      severity: "warning",
    })
  );
}

function findDuplicates(records, getKey) {
  const counts = records.reduce((acc, record) => {
    const key = String(getKey(record) || "").trim();
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }));
}
