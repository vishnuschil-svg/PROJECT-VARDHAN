import { listScopedRows, upsertScopedRow, deleteScopedRow } from "./scopedStorageRepository.js";

const PRACTICE_KEY = "vardhan.academy.practice.v1";
const PRACTICE_PREFIX = "practice-";

export const PracticeRepository = {
  list: (context) => {
    const practiceRows = listScopedRows(PRACTICE_KEY, context);
    return practiceRows.filter((row) => row.id?.startsWith(PRACTICE_PREFIX));
  },

  save: (row, context) => {
    const practiceRow = {
      ...row,
      id: row.id?.startsWith(PRACTICE_PREFIX) ? row.id : `${PRACTICE_PREFIX}${row.id}`,
      isPractice: true,
      practiceCreatedAt: row.practiceCreatedAt || new Date().toISOString(),
    };
    return upsertScopedRow(PRACTICE_KEY, practiceRow, context, PRACTICE_PREFIX);
  },

  delete: (id, context) => {
    const practiceId = id?.startsWith(PRACTICE_PREFIX) ? id : `${PRACTICE_PREFIX}${id}`;
    return deleteScopedRow(PRACTICE_KEY, practiceId, context);
  },

  resetAll: (context) => {
    const practiceRows = listScopedRows(PRACTICE_KEY, context);
    const practiceIds = practiceRows
      .filter((row) => row.id?.startsWith(PRACTICE_PREFIX))
      .map((row) => row.id);

    practiceIds.forEach((id) => {
      deleteScopedRow(PRACTICE_KEY, id, context);
    });

    return { deleted: practiceIds.length };
  },

  getPracticeState: (context) => {
    const practiceRows = listScopedRows(PRACTICE_KEY, context);
    const practiceData = practiceRows.filter((row) => row.id?.startsWith(PRACTICE_PREFIX));

    return {
      hasPracticeData: practiceData.length > 0,
      practiceRecordCount: practiceData.length,
      lastReset: practiceData.length > 0
        ? practiceData.reduce((latest, row) => {
            const rowTime = new Date(row.practiceCreatedAt || row.created_at).getTime();
            return rowTime > latest ? rowTime : latest;
          }, 0)
        : null,
    };
  },
};
