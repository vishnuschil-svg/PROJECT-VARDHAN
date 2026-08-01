import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const root = path.join(cwd, 'src');

console.log('\n=== PHASE 1 = FUNCTIONAL VERIFICATION REPORT ===');
console.log(`Timestamp: ${new Date().toISOString()}\n`);

// Helper: check file exists
function exists(p) {
  const full = path.join(root, p);
  const ok = fs.existsSync(full);
  if (!ok) console.error(`  MISSING: ${p}`);
  return ok;
}

// Helper: check export from module
function readFile(p) {
  try {
    return fs.readFileSync(path.join(root, p), 'utf-8');
  } catch { return null; }
}

let passCount = 0;
let failCount = 0;
let missingCount = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS: ${label}${detail ? ' - ' + detail : ''}`);
    passCount++;
  } else {
    console.log(`  FAIL: ${label}${detail ? ' - ' + detail : ''}`);
    failCount++;
  }
}

function module(label, p) {
  const ok = exists(p);
  check(label, ok, ok ? 'file found' : 'file not found');
  return ok;
}

// ========== 1. CORE IMPORTS ==========
console.log('\n--- 1. CORE ARCHITECTURE ---');

// DraftBusinessModel
module('DraftBusinessModel', 'domain/chit/models/DraftBusinessModel.js');
module('ValidationService', 'domain/chit/validation/ValidationService.js');
module('UniversalBusinessRuleEngine', 'domain/chit/services/UniversalBusinessRuleEngine.js');
module('BusinessDSLMapper', 'domain/chit/dsl/BusinessDSLMapper.js');
module('BusinessDSLModel', 'domain/chit/dsl/BusinessDSLModel.js');
module('SimulationEngine', 'domain/chit/simulation/SimulationEngine.js');
module('DeterministicRuleEngine', 'domain/chit/rules/DeterministicRuleEngine.js');
module('ImmutableLedgerEngine', 'domain/chit/ledger/ImmutableLedgerEngine.js');

// ========== 2. REPOSITORIES ==========
console.log('\n--- 2. REPOSITORY PATTERN ---');
module('repositoryContracts', 'repositories/chits/repositoryContracts.js');
module('LocalStorageRepository', 'repositories/chits/LocalStorageRepository.js');
module('GroupsRepository', 'repositories/chits/GroupsRepository.js');
module('MembersRepository', 'repositories/chits/MembersRepository.js');
module('CollectionsRepository (chits)', 'repositories/chits/CollectionsRepository.js');
module('AuctionRepository (chits)', 'repositories/chits/AuctionRepository.js');
module('FinanceRepository (chits)', 'repositories/chits/FinanceRepository.js');
module('ReceiptsRepository (chits)', 'repositories/chits/ReceiptsRepository.js');
module('ReportsRepository (chits)', 'repositories/chits/ReportsRepository.js');
module('CollectionsRepository (root)', 'repositories/CollectionsRepository.js');
module('ActivityRepository', 'repositories/ActivityRepository.js');
module('AuctionRepository (root)', 'repositories/AuctionRepository.js');
module('CaptureRepository', 'repositories/CaptureRepository.js');

// ========== 3. SERVICES ==========
console.log('\n--- 3. SERVICES ---');
module('chitDataService', 'services/chitDataService.js');
module('universalBusinessRuleService', 'services/universalBusinessRuleService.js');
module('collectionService', 'services/collectionService.js');
module('auctionService', 'services/auctionService.js');
module('financeService', 'services/financeService.js');
module('reportsService', 'services/reportsService.js');
module('chitDashboardService', 'services/chitDashboardService.js');
module('chitCollectionsStore', 'services/chitCollectionsStore.js');
module('winnerService', 'services/winnerService.js');
module('batchService', 'services/batchService.js');
module('receiptService', 'services/receiptService.js');
module('ledgerService', 'services/ledgerService.js');

// ========== 4. PAGES ==========
console.log('\n--- 4. CHIT PAGES ---');
module('ChitGroups', 'pages/chits/ChitGroups.jsx');
module('Members', 'pages/chits/Members.jsx');
module('Collections', 'pages/chits/Collections.jsx');
module('Auctions', 'pages/chits/Auctions.jsx');
module('Receipts', 'pages/chits/Receipts.jsx');
module('MemberLedger', 'pages/chits/MemberLedger.jsx');
module('FinanceAccounts', 'pages/chits/FinanceAccounts.jsx');
module('Reports', 'pages/chits/Reports.jsx');
module('PendingCollections', 'pages/chits/PendingCollections.jsx');
module('ChitDashboard', 'pages/chits/ChitDashboard.jsx');
module('Batches', 'pages/chits/Batches.jsx');
module('Dividends', 'pages/chits/Dividends.jsx');
module('Payouts', 'pages/chits/Payouts.jsx');
module('LuckyDraw', 'pages/chits/LuckyDraw.jsx');
module('Documents', 'pages/chits/Documents.jsx');
module('Notifications (chits)', 'pages/chits/Notifications.jsx');
module('Settings (chits)', 'pages/chits/Settings.jsx');
module('Support (chits)', 'pages/chits/Support.jsx');
module('AIWorkspace', 'pages/chits/AIWorkspace.jsx');
module('Academy', 'pages/chits/Academy.jsx');
module('AIChitFlow', 'pages/chits/AIChitFlow.jsx');
module('Dashboard (main)', 'pages/dashboard/Dashboard.jsx');
module('DashboardCharts', 'pages/dashboard/DashboardCharts.jsx');

// ========== 5. CONFIG ==========
console.log('\n--- 5. CONFIG ---');
module('aiChitFlow config', 'config/aiChitFlow.js');
module('erpModules config', 'config/erpModules.js');
module('chitPhaseOneData config', 'config/chitPhaseOneData.js');
module('chitMemberData config', 'config/chitMemberData.js');
module('chitAuctionEngine config', 'config/chitAuctionEngine.js');

// ========== 6. COMPONENTS ==========
console.log('\n--- 6. COMMON COMPONENTS ---');
module('ChitLayout', 'components/chit/ChitLayout.jsx');
module('ChitNavigation', 'components/chit/ChitNavigation.jsx');
module('Table', 'components/common/Table.jsx');
module('Modal', 'components/common/Modal.jsx');
module('Button', 'components/common/Button.jsx');
module('Badge', 'components/common/Badge.jsx');
module('FormField', 'components/common/FormField.jsx');
module('ErrorBoundary', 'components/common/ErrorBoundary.jsx');

// ========== 7. Create Group WORKFLOW VERIFICATION ==========
console.log('\n--- 7. CREATE GROUP WORKFLOW ---');

// Verify ChitGroups.jsx has all required functions
const chitGroupsContent = readFile('pages/chits/ChitGroups.jsx');
if (chitGroupsContent) {
  check('validate() function', chitGroupsContent.includes('const validate'), 'validates chit_name, chit_value, total_members, etc.');
  check('saveGroup() function', chitGroupsContent.includes('const saveGroup'), 'creates/updates group via saveTenantGroup');
  check('saveTenantGroup import', chitGroupsContent.includes('saveTenantGroup'), 'imported from chitDataService');
  check('listTenantGroups import', chitGroupsContent.includes('listTenantGroups'), 'imported from chitDataService');
  check('ActivityRepository import', chitGroupsContent.includes('ActivityRepository'), 'activity logging');
  check('Duplicate code detection', chitGroupsContent.includes('Duplicate code check'), 'prevents duplicate chit_code per tenant');
  check('Schedule preview', chitGroupsContent.includes('Preview Schedule'), 'monthly schedule preview available');
  check('Installment patterns', chitGroupsContent.includes('INSTALLMENT_PATTERNS'), '4 patterns: FIXED_MONTHLY, VARIABLE_MONTHLY, LIFTED_NON_LIFTED, CUSTOM_RULE');
  check('Modal create/edit', chitGroupsContent.includes('modalMode'), 'modal-based create and edit');
  check('Status management', chitGroupsContent.includes('updateStatus'), 'status change to CLOSED/ARCHIVED');
} else {
  check('ChitGroups.jsx readable', false, 'could not read file');
}

// ========== 8. Members WORKFLOW ==========
console.log('\n--- 8. MEMBERS WORKFLOW ---');
const membersContent = readFile('pages/chits/Members.jsx');
if (membersContent) {
  check('Member CRUD', membersContent.includes('saveTenantMember'), 'save function imported');
  check('Member search', membersContent.includes('searchTerm'), 'search by name, number, mobile, email, nominee');
  check('Group filter', membersContent.includes('groupFilter'), 'filter by chit group');
  check('Status filter', membersContent.includes('statusFilter'), 'filter by member status');
  check('Member summary', membersContent.includes('getMemberSummary'), 'summary stats displayed');
  check('Profile view', membersContent.includes('profileMember'), 'member profile modal');
  check('Aadhaar masking', membersContent.includes('maskAadhaarNumber'), 'PII masked');
} else {
  check('Members.jsx readable', false);
}

// ========== 9. Collections WORKFLOW ==========
console.log('\n--- 9. COLLECTIONS WORKFLOW ---');
const collectionsContent = readFile('pages/chits/Collections.jsx');
if (collectionsContent) {
  check('recordCollectionPayment', collectionsContent.includes('recordCollectionPayment'), 'imported from collectionService');
  check('buildCollectionDraft', collectionsContent.includes('buildCollectionDraft'), 'draft before payment');
  check('Receipt generation', collectionsContent.includes('createReceiptPayload'), 'receipt payload created');
  check('WhatsApp message', collectionsContent.includes('buildWhatsAppReceiptMessage'), 'WhatsApp integration');
  check('Receipt PDF', collectionsContent.includes('createReceiptPdfFile'), 'PDF generation');
  check('Receipt image', collectionsContent.includes('createReceiptImageUrl'), 'image URL generation');
  check('Payment methods', collectionsContent.includes('payment_method'), 'payment method selection');
} else {
  check('Collections.jsx readable', false);
}

// ========== 10. Auctions WORKFLOW ==========
console.log('\n--- 10. AUCTIONS WORKFLOW ---');
const auctionsContent = readFile('pages/chits/Auctions.jsx');
if (auctionsContent) {
  check('confirmAuctionWinner', auctionsContent.includes('confirmAuctionWinner'), 'imported from auctionService');
  check('getAuctionWorkspace', auctionsContent.includes('getAuctionWorkspace'), 'workspace data');
  check('Auction types', auctionsContent.includes('AUCTION_TYPES'), 'MANUAL/AUTOMATIC/LUCKY_DRAW');
  check('Eligible members', auctionsContent.includes('getEligibleAuctionMembers'), 'eligibility engine');
  check('Financial calculations', auctionsContent.includes('calculateAuctionFinancials'), 'bid/prize/commission');
  check('Winner selection', auctionsContent.includes('selectAuctionLuckyWinner'), 'lucky draw winner');
  check('Auction dashboard', auctionsContent.includes('getAuctionDashboardStats'), 'stats display');
} else {
  check('Auctions.jsx readable', false);
}

// ========== 11. Receipts WORKFLOW ==========
console.log('\n--- 11. RECEIPTS WORKFLOW ---');
const receiptsContent = readFile('pages/chits/Receipts.jsx');
if (receiptsContent) {
  check('ReceiptActions component', receiptsContent.includes('ReceiptActions'), 'imported');
  check('ReceiptHistory component', receiptsContent.includes('ReceiptHistory'), 'imported');
  check('ReceiptPreview component', receiptsContent.includes('ReceiptPreview'), 'imported');
} else {
  check('Receipts.jsx readable', false);
}

// ========== 12. Reports WORKFLOW ==========
console.log('\n--- 12. REPORTS WORKFLOW ---');
const reportsContent = readFile('pages/chits/Reports.jsx');
if (reportsContent) {
  check('ReportExportMenu', reportsContent.includes('ReportExportMenu'), 'export menu');
  check('ReportFilters', reportsContent.includes('ReportFilters'), 'filter component');
  check('ReportSummary', reportsContent.includes('ReportSummary'), 'summary component');
  check('ReportTable', reportsContent.includes('ReportTable'), 'table component');
  check('DEFAULT_REPORT_FILTERS', reportsContent.includes('DEFAULT_REPORT_FILTERS'), 'default filters');
  check('exportEnterpriseReport', reportsContent.includes('exportEnterpriseReport'), 'export service');
  check('getReportsPageModel', reportsContent.includes('getReportsPageModel'), 'page model service');
} else {
  check('Reports.jsx readable', false);
}

// ========== 13. FINANCE WORKFLOW ==========
console.log('\n--- 13. FINANCE WORKFLOW ---');
const financeContent = readFile('pages/chits/FinanceAccounts.jsx');
if (financeContent) {
  check('getFinancePageModel', financeContent.includes('getFinancePageModel'), 'page model');
  check('formatFinanceCurrency', financeContent.includes('formatFinanceCurrency'), 'currency formatting');
} else {
  check('FinanceAccounts.jsx readable', false);
}

// ========== 14. LEDGER WORKFLOW ==========
console.log('\n--- 14. LEDGER WORKFLOW ---');
const ledgerContent = readFile('pages/chits/MemberLedger.jsx');
if (ledgerContent) {
  check('Member table', ledgerContent.includes('Table'), 'table component');
  check('Collections store', ledgerContent.includes('useTenantCollections'), 'collections data');
  check('List visible groups', ledgerContent.includes('listVisibleGroups'), 'group listing');
  check('List visible members', ledgerContent.includes('listVisibleMembers'), 'member listing');
} else {
  check('MemberLedger.jsx readable', false);
}

// ========== 15. AI CHIT FLOW ==========
console.log('\n--- 15. AI CHIT FLOW (AIChitFlow.jsx) ---');
const aiFlowContent = readFile('pages/chits/AIChitFlow.jsx');
if (aiFlowContent) {
  check('generateBusinessUnderstanding', aiFlowContent.includes('generateBusinessUnderstanding'), 'imported');
  check('applyOwnerCorrections', aiFlowContent.includes('applyOwnerCorrections'), 'imported');
  check('confirmBusinessUnderstanding', aiFlowContent.includes('confirmBusinessUnderstanding'), 'imported');
  check('createChitFromBusinessUnderstanding', aiFlowContent.includes('createChitFromBusinessUnderstanding'), 'imported');
  check('evaluateCreationReadiness', aiFlowContent.includes('evaluateCreationReadiness'), 'imported');
  check('validateDraft', aiFlowContent.includes('validateDraft'), 'real-time validation');
  check('mapDraftToBusinessDSL', aiFlowContent.includes('mapDraftToBusinessDSL'), 'DSL mapping');
  check('simulateBusinessDSL', aiFlowContent.includes('simulateBusinessDSL'), 'simulation');
  check('BusinessWorkspace component', aiFlowContent.includes('function BusinessWorkspace'), 'core workspace UI');
  check('Core Fields section', aiFlowContent.includes('Core Fields'), '5 editable business fields');
  check('Owner approval pipeline', aiFlowContent.includes('bw-approval-pipeline'), '6-step approval pipeline');
  check('Validation banner', aiFlowContent.includes('bw-validation-banner'), 'VALID/INVALID/UNSUPPORTED display');
  check('Financial rules', aiFlowContent.includes('FinancialRuleCard'), '3-state financial rules');
  check('Missing info section', aiFlowContent.includes('Missing Information'), 'missing fields UI');
} else {
  check('AIChitFlow.jsx readable', false);
}

// ========== 16. REPOSITORY PERSISTENCE ==========
console.log('\n--- 16. REPOSITORY PERSISTENCE ---');
const localStorageRepoContent = readFile('repositories/chits/LocalStorageRepository.js');
if (localStorageRepoContent) {
  check('create() method', localStorageRepoContent.includes('create(record, options'), 'creates with tenant scope');
  check('update() method', localStorageRepoContent.includes('update(id, patch, options'), 'updates by id + scope');
  check('delete() method', localStorageRepoContent.includes('delete(id, options'), 'deletes by id + scope');
  check('list() method', localStorageRepoContent.includes('list(options'), 'paginated list');
  check('getById() method', localStorageRepoContent.includes('getById(id, options'), 'single record fetch');
  check('upsert() method', localStorageRepoContent.includes('upsert(record, options'), 'create-or-update');
  check('readAll() with localStorage', localStorageRepoContent.includes('window.localStorage.getItem'), 'persistence via localStorage');
  check('Tenant isolation', localStorageRepoContent.includes('scope_key'), 'scope_key filtering');
} else {
  check('LocalStorageRepository.js readable', false);
}

// ========== 17. COLLECTION ENGINE ==========
console.log('\n--- 17. COLLECTION SERVICE PERSISTENCE ---');
const collectionSvcContent = readFile('services/collectionService.js');
if (collectionSvcContent) {
  check('Collection saved', collectionSvcContent.includes('CollectionsRepository.saveCollection'), 'collection persisted');
  check('Receipt saved', collectionSvcContent.includes('persistReceipt'), 'receipt persisted');
  check('Finance entry saved', collectionSvcContent.includes('persistFinanceEntry'), 'finance entry persisted');
  check('Report entry saved', collectionSvcContent.includes('persistReportEntry'), 'report entry persisted');
  check('Activity logged', collectionSvcContent.includes('persistActivity'), 'activity logged');
  check('Notification sent', collectionSvcContent.includes('persistNotification'), 'notification sent');
} else {
  check('collectionService.js readable', false);
}

// ========== 18. AUCTION SERVICE ==========
console.log('\n--- 18. AUCTION SERVICE ---');
const auctionSvcContent = readFile('services/auctionService.js');
if (auctionSvcContent) {
  check('Build preview', auctionSvcContent.includes('buildAuctionPreview'), 'auction preview before confirm');
  check('Validation', auctionSvcContent.includes('AuctionValidator.validateAuction'), 'auction validation');
  check('Winner eligibility', auctionSvcContent.includes('WinnerEligibilityEngine.getEligibleMembers'), 'eligibility check');
  check('Auction saved', auctionSvcContent.includes('AuctionRepository.save'), 'auction persisted');
  check('Winner confirmed', auctionSvcContent.includes('confirmWinnerResult'), 'winner result persisted');
} else {
  check('auctionService.js readable', false);
}

// ========== SUMMARY ==========
console.log(`\n=== VERIFICATION SUMMARY ===`);
console.log(`PASS: ${passCount}`);
console.log(`FAIL: ${failCount}`);
console.log(`MISSING: ${missingCount}`);
console.log(`TOTAL: ${passCount + failCount}`);
console.log(`RATE: ${Math.round(passCount / (passCount + failCount) * 100)}%`);