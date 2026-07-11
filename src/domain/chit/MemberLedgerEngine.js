export const MemberLedgerEngine = {
  buildLedger({ members = [], collections = [], receipts = [], auctions = [] } = {}) {
    return members.map((member) => {
      const memberId = member.id;
      const memberCollections = collections.filter((collection) =>
        (collection.member_id || collection.memberId) === memberId
      );
      const memberReceipts = receipts.filter((receipt) =>
        (receipt.member_id || receipt.memberId) === memberId
      );
      const memberAuctions = auctions.filter((auction) =>
        (auction.winner_member_id || auction.winnerMemberId) === memberId
      );
      const paidAmount = sum(memberCollections, (collection) => collection.paid_amount || collection.paidAmount);
      const pendingAmount = sum(memberCollections, (collection) => collection.pending_amount || collection.pendingAmount);

      return {
        memberId,
        memberName: member.member_name || member.name || memberId,
        groupId: member.group_id || member.chit_group_id || member.groupId,
        paidAmount,
        pendingAmount,
        runningBalance: Math.max(0, pendingAmount),
        receiptCount: memberReceipts.length,
        wonAuction: memberAuctions.length > 0,
        lastCollectionDate: getLatestDate(memberCollections, "payment_date"),
      };
    });
  },
};

function sum(rows, getter) {
  return rows.reduce((total, row) => total + Number(getter(row) || 0), 0);
}

function getLatestDate(rows, field) {
  return rows
    .map((row) => row[field] || row.created_at || "")
    .filter(Boolean)
    .sort()
    .at(-1) || "";
}
