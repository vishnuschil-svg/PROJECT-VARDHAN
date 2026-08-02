import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "../components/common/ErrorBoundary";
import ProtectedRoute from "./ProtectedRoute";
import { CHIT_MANAGEMENT_ERP } from "../config/erpModules";

const AuthLayout = lazy(() => import("../layouts/AuthLayout"));
const PremiumLogin = lazy(() => import("../pages/auth/PremiumLogin"));
const Register = lazy(() => import("../pages/auth/Register"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const Logout = lazy(() => import("../pages/auth/Logout"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const ProductCatalog = lazy(() => import("../pages/products/ProductCatalog"));
const ProductWorkspace = lazy(() => import("../pages/products/ProductWorkspace"));
const UpgradeSubscription = lazy(() => import("../pages/products/UpgradeSubscription"));

const AdminDashboard = lazy(() => import("../pages/platform-admin/AdminDashboard"));
const Companies = lazy(() => import("../pages/platform-admin/Companies"));
const CompanyApproval = lazy(() => import("../pages/platform-admin/CompanyApproval"));
const CustomerManagement = lazy(() => import("../pages/platform-admin/CustomerManagement"));
const BranchManagement = lazy(() => import("../pages/platform-admin/BranchManagement"));
const DepartmentManagement = lazy(() => import("../pages/platform-admin/DepartmentManagement"));
const DesignationManagement = lazy(() => import("../pages/platform-admin/DesignationManagement"));
const EmployeeManagement = lazy(() => import("../pages/platform-admin/EmployeeManagement"));
const UserManagement = lazy(() => import("../pages/platform-admin/UserManagement"));
const RolesPermissions = lazy(() => import("../pages/platform-admin/RolesPermissions"));
const ModuleManagement = lazy(() => import("../pages/platform-admin/ModuleManagement"));
const SubscriptionManagement = lazy(() => import("../pages/platform-admin/SubscriptionManagement"));
const LicenseManagement = lazy(() => import("../pages/platform-admin/LicenseManagement"));
const SupportTickets = lazy(() => import("../pages/platform-admin/SupportTickets"));
const Notifications = lazy(() => import("../pages/platform-admin/NotificationsPage"));
const AuditLogs = lazy(() => import("../pages/platform-admin/AuditLogs"));
const BackupRestore = lazy(() => import("../pages/platform-admin/BackupRestore"));
const SystemSettings = lazy(() => import("../pages/platform-admin/SystemSettings"));
const ProductionHealth = lazy(() => import("../pages/platform-admin/ProductionHealth"));

const ChitDashboard = lazy(() => import("../pages/chits/ChitDashboard"));
const ChitGroups = lazy(() => import("../pages/chits/ChitGroups"));
const Batches = lazy(() => import("../pages/chits/Batches"));
const Members = lazy(() => import("../pages/chits/Members"));
const MemberLedger = lazy(() => import("../pages/chits/MemberLedger"));
const Collections = lazy(() => import("../pages/chits/Collections"));
const PendingCollections = lazy(() => import("../pages/chits/PendingCollections"));
const Auctions = lazy(() => import("../pages/chits/Auctions"));
const FinanceAccounts = lazy(() => import("../pages/chits/FinanceAccounts"));
const LuckyDraw = lazy(() => import("../pages/chits/LuckyDraw"));
const Payouts = lazy(() => import("../pages/chits/Payouts"));
const Dividends = lazy(() => import("../pages/chits/Dividends"));
const Receipts = lazy(() => import("../pages/chits/Receipts"));
const Reports = lazy(() => import("../pages/chits/Reports"));
const ChitDocuments = lazy(() => import("../pages/chits/Documents"));
const ChitNotifications = lazy(() => import("../pages/chits/Notifications"));
const ChitSettings = lazy(() => import("../pages/chits/Settings"));
const ChitSupport = lazy(() => import("../pages/chits/Support"));
const AIWorkspace = lazy(() => import("../pages/chits/AIWorkspace"));
const Academy = lazy(() => import("../pages/chits/Academy"));
const AIChitFlow = lazy(() => import("../pages/chits/AIChitFlow"));
const SmartChitCapturePage = lazy(() => import("../pages/chits/SmartChitCapturePage"));
const PublicSite = lazy(() => import("../pages/public/PublicSite"));

function RouteFallback() {
  return <div className="route-fallback">Loading…</div>;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          <Route path="/" element={<PublicSite />} />
          {['vardhan-os','features','how-it-works','pricing','demo','trial','videos','tutorials','documentation','blogs','customer-stories','security','contact'].map((path) => <Route key={path} path={`/${path}`} element={<PublicSite />} />)}
          <Route path="/products/mitra-nidhi-chiti-pro" element={<PublicSite />} />
          <Route path="/products/school-erp" element={<PublicSite />} />
          <Route path="/products/college-erp" element={<PublicSite />} />
          <Route path="/products/private-hostels-erp" element={<PublicSite />} />
          <Route path="/products/insurance-crm" element={<PublicSite />} />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<PremiumLogin />} />
          </Route>
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/logout" element={<Logout />} />
          
          {/* Main Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/catalog"
            element={
              <ProtectedRoute>
                <ProductCatalog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:productId"
            element={
              <ProtectedRoute>
                <ProductWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upgrade-subscription/:productId"
            element={
              <ProtectedRoute>
                <UpgradeSubscription />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upgrade-subscription"
            element={
              <ProtectedRoute>
                <UpgradeSubscription />
              </ProtectedRoute>
            }
          />

        {/* Platform Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute platformOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/companies"
          element={
            <ProtectedRoute platformOnly>
              <Companies />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/company-approval"
          element={
            <ProtectedRoute platformOnly>
              <CompanyApproval />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute platformOnly>
              <CustomerManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/branches"
          element={
            <ProtectedRoute platformOnly>
              <BranchManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <ProtectedRoute platformOnly>
              <DepartmentManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/designations"
          element={
            <ProtectedRoute platformOnly>
              <DesignationManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/employees"
          element={
            <ProtectedRoute platformOnly>
              <EmployeeManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute platformOnly>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute platformOnly>
              <RolesPermissions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute platformOnly>
              <ProductCatalog platformMode />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/modules"
          element={
            <ProtectedRoute platformOnly>
              <ModuleManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subscription"
          element={
            <ProtectedRoute platformOnly>
              <SubscriptionManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/licenses"
          element={
            <ProtectedRoute platformOnly>
              <LicenseManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute platformOnly>
              <SupportTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute platformOnly>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute platformOnly>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/backup"
          element={
            <ProtectedRoute platformOnly>
              <BackupRestore />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/health"
          element={
            <ProtectedRoute platformOnly>
              <ProductionHealth />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute platformOnly>
              <SystemSettings />
            </ProtectedRoute>
          }
        />

        {/* MITRA NIDHI CHITI PRO Routes */}
        <Route
          path="/chits"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <ChitDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/groups"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <ChitGroups />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/batches"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <Batches />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/members"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <Members />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/member-ledger"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <MemberLedger />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/collections"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <Collections />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/collections/pending"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <PendingCollections />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/auctions"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <Auctions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/finance"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <FinanceAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/lucky-draw"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <LuckyDraw />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/payouts"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <Payouts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/dividends"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <Dividends />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/receipts"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <Receipts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/reports"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/documents"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <ChitDocuments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/notifications"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <ChitNotifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/ai-chit/*"
          element={<ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}><AIChitFlow /></ProtectedRoute>}
        />
        <Route
          path="/chits/smart-capture"
          element={<ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}><SmartChitCapturePage /></ProtectedRoute>}
        />
        <Route
          path="/chits/academy"
          element={<ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}><Academy /></ProtectedRoute>}
        />
        <Route
          path="/chits/ai"
          element={<ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}><AIWorkspace /></ProtectedRoute>}
        />
        <Route
          path="/chits/support"
          element={<ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}><ChitSupport /></ProtectedRoute>}
        />
        <Route
          path="/chits/settings"
          element={
            <ProtectedRoute moduleId={CHIT_MANAGEMENT_ERP}>
              <ChitSettings />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default AppRouter;
