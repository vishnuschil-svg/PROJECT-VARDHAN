import { ChitDataService } from "./chitDataService.js";
import { getBusinessHealthDashboardModel } from "./businessHealthService.js";
import { getFinanceDashboardSummary } from "./financeService.js";
import { getActivityTimeline } from "./activityService.js";
import { getAIInsights } from "./aiInsightsService.js";
import { getNotificationCenter } from "./notificationService.js";

const ALL = Number.MAX_SAFE_INTEGER;

export function getChitCommandDashboard(context, now = new Date()) {
  const options = { activeTenantContext: context, pageSize: ALL };
  const groups = ChitDataService.groups.list(options).data;
  const members = ChitDataService.members.list(options).data;
  const collections = ChitDataService.collections.list(options).data;
  const health = getBusinessHealthDashboardModel(context);
  const finance = getFinanceDashboardSummary(context);
  const insights = getAIInsights(context).map((item) => ({
    ...item,
    reason: item.message,
    evidence: evidenceForInsight(item, { groups, members, collections }),
    safeAction: item.actionLabel,
  }));
  const today = localDate(now);
  const month = today.slice(0, 7);
  const todayRows = collections.filter((row) => recordDate(row) === today);
  const monthRows = collections.filter((row) => recordDate(row).startsWith(month));
  const kpis = health.kpis.map((item) => ({ ...item, route: routeForKpi(item.label), evidence: item.helper || "Tenant repository" }));
  const netProfit = finance.metrics.find((item) => item.key === "netProfit");
  kpis.push({ label: "Monthly Profit / Loss", value: netProfit?.displayValue || formatMoney(0), helper: netProfit?.helper || "Finance repository has no entries", evidence: "Finance domain summary", route: "/chits/finance" });

  return {
    generatedAt: now.toISOString(), today, month, groups, members, collections, health: health.health, finance,
    kpis, activities: getActivityTimeline(context).slice(0, 7), insights: insights.slice(0, 4),
    notifications: getNotificationCenter(context),
    collectionTrend: actualTrend(monthRows), paymentModes: paymentModes(monthRows),
    todayCollection: sum(todayRows, "paid_amount"), monthlyCollection: sum(monthRows, "paid_amount"),
    reminders: reminders(groups, collections, now), hasBusinessData: groups.length + members.length + collections.length > 0,
  };
}

function actualTrend(rows) {
  const buckets = new Map();
  for (const row of rows) { const date = recordDate(row); buckets.set(date, (buckets.get(date) || 0) + Number(row.paid_amount || 0)); }
  return [...buckets.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([date,value]) => ({ date, label: date.slice(8), value }));
}
function paymentModes(rows) {
  const modes = new Map([["Cash",0],["UPI",0],["Bank",0],["Other",0]]);
  for (const row of rows) { const raw=String(row.payment_method||row.payment_mode||"").toLowerCase(); const key=raw.includes("cash")?"Cash":raw.includes("upi")?"UPI":raw.includes("bank")||raw.includes("cheque")?"Bank":"Other"; modes.set(key,modes.get(key)+Number(row.paid_amount||0)); }
  return [...modes].map(([name,value])=>({name,value}));
}
function reminders(groups, collections, now) {
  const today=localDate(now); const future=groups.filter(x=>x.next_auction_date&&x.next_auction_date>=today).sort((a,b)=>String(a.next_auction_date).localeCompare(String(b.next_auction_date))).slice(0,3).map(x=>({id:`auction-${x.id}`,type:"Auction",title:x.chit_name||x.chit_code,date:x.next_auction_date,route:"/chits/auctions"}));
  const pending=collections.filter(x=>Number(x.pending_amount||0)>0).slice(0,3).map(x=>({id:`pending-${x.id}`,type:"Follow-up",title:`${formatMoney(x.pending_amount)} pending`,date:recordDate(x),route:"/chits/collections/pending"}));
  return [...future,...pending].slice(0,5);
}
function evidenceForInsight(item, source) { if(item.type==="PENDING_RISK")return `${source.collections.filter(x=>Number(x.pending_amount||0)>0).length} collection records with pending balance`;if(item.type==="AUCTION_REMINDER")return `${source.groups.filter(x=>x.next_auction_date).length} groups with auction dates`;if(item.type==="DATA_QUALITY")return `${source.members.length} tenant member profiles reviewed`;return `${source.groups.length} groups, ${source.members.length} members, ${source.collections.length} collections`; }
function routeForKpi(label){return label.includes("Chit")?"/chits/groups":label.includes("Member")?"/chits/members":label.includes("Pending")?"/chits/collections/pending":label.includes("Profit")?"/chits/finance":"/chits/collections";}
function recordDate(row){return String(row.payment_date||row.collection_date||row.created_at||"").slice(0,10);}
function localDate(date){return new Date(date).toISOString().slice(0,10);}
function sum(rows,key){return rows.reduce((total,row)=>total+Number(row[key]||0),0);}
function formatMoney(value){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(value||0));}
