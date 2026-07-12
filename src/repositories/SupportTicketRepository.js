import { listScopedRows,upsertScopedRow } from "./scopedStorageRepository.js";
const KEY="vardhan.support.tickets.v1";
export const SupportTicketRepository={list:context=>listScopedRows(KEY,context),listAll(){if(typeof window==="undefined")return[];try{const rows=JSON.parse(window.localStorage.getItem(KEY)||"[]");return Array.isArray(rows)?rows:[]}catch{return[]}},save:(ticket,context)=>upsertScopedRow(KEY,ticket,context,"ticket")};
