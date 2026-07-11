export const MonthClosingEngine = {
  canCloseMonth({ group, lifecycleMonth, collections = [], auctions = [], receipts = [] } = {}) {
    const errors = [];
    const monthCollections = filterByMonth(collections, lifecycleMonth);
    const expectedMembers = Number(group?.total_members || group?.totalMembers || 0);
    const uniqueCollectedMembers = new Set(
      monthCollections.map((collection) => collection.member_id || collection.memberId).filter(Boolean)
    );
    const monthAuctions = auctions.filter((auction) =>
      Number(auction.auction_month || auction.month || 0) === Number(lifecycleMonth || 0)
    );
    const duplicateReceipts = findDuplicateReceipts(receipts);

    if (!group?.id) errors.push("Chit group is required to close a month.");
    if (monthAuctions.length > 1) errors.push("Cannot declare two winners in same month.");
    if (duplicateReceipts.length) errors.push("Cannot close month with duplicate receipts.");
    if (expectedMembers > 0 && uniqueCollectedMembers.size < expectedMembers) {
      errors.push("Cannot close month if pending validation fails.");
    }

    return {
      canClose: errors.length === 0,
      errors,
      month: Number(lifecycleMonth || 0),
      collectedMembers: uniqueCollectedMembers.size,
      expectedMembers,
      receiptValidation: duplicateReceipts.length ? "failed" : "passed",
    };
  },

  buildMonthCloseResult(input = {}) {
    const validation = this.canCloseMonth(input);

    return {
      ...validation,
      status: validation.canClose ? "ready_to_close" : "validation_pending",
      closedAt: validation.canClose ? new Date().toISOString() : "",
    };
  },
};

function filterByMonth(collections, month) {
  return collections.filter((collection) =>
    Number(collection.installment_month || collection.installmentNumber || 0) === Number(month || 0)
  );
}

function findDuplicateReceipts(receipts) {
  const seen = new Set();
  const duplicates = new Set();

  receipts.forEach((receipt) => {
    const receiptNumber = receipt.receipt_number || receipt.receiptNumber;
    if (!receiptNumber) return;
    if (seen.has(receiptNumber)) duplicates.add(receiptNumber);
    seen.add(receiptNumber);
  });

  return [...duplicates];
}
