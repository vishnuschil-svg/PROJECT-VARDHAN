import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));

const AdminDashboard = lazy(() => import("../pages/platform-admin/AdminDashboard"));
const Companies = lazy(() => import("../pages/platform-admin/Companies"));
const CompanyApproval = lazy(() => import("../pages/platform-admin/CompanyApproval"));
const CustomerManagement = lazy(() => import("../pages/platform-admin/CustomerManagement"));
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

const ChitDashboard = lazy(() => import("../pages/chits/ChitDashboard"));
const ChitGroups = lazy(() => import("../pages/chits/ChitGroups"));
const Members = lazy(() => import("../pages/chits/Members"));
const Collections = lazy(() => import("../pages/chits/Collections"));
const PendingCollections = lazy(() => import("../pages/chits/PendingCollections"));
const Auctions = lazy(() => import("../pages/chits/Auctions"));
const Payouts = lazy(() => import("../pages/chits/Payouts"));
const Dividends = lazy(() => import("../pages/chits/Dividends"));
const Receipts = lazy(() => import("../pages/chits/Receipts"));
const Reports = lazy(() => import("../pages/chits/Reports"));
const ChitDocuments = lazy(() => import("../pages/chits/Documents"));
const ChitNotifications = lazy(() => import("../pages/chits/Notifications"));
const ChitSettings = lazy(() => import("../pages/chits/Settings"));

function RouteFallback() {
  return <div style={{ padding: 40 }}>Loading...</div>;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Main Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

        {/* Platform Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/companies"
          element={
            <ProtectedRoute>
              <Companies />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/company-approval"
          element={
            <ProtectedRoute>
              <CompanyApproval />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute>
              <CustomerManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute>
              <RolesPermissions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/modules"
          element={
            <ProtectedRoute>
              <ModuleManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subscription"
          element={
            <ProtectedRoute>
              <SubscriptionManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/licenses"
          element={
            <ProtectedRoute>
              <LicenseManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute>
              <SupportTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/backup"
          element={
            <ProtectedRoute>
              <BackupRestore />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <SystemSettings />
            </ProtectedRoute>
          }
        />

        {/* MITRA NIDHI CHITI PRO Routes */}
        <Route
          path="/chits"
          element={
            <ProtectedRoute>
              <ChitDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/groups"
          element={
            <ProtectedRoute>
              <ChitGroups />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/members"
          element={
            <ProtectedRoute>
              <Members />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/collections"
          element={
            <ProtectedRoute>
              <Collections />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/collections/pending"
          element={
            <ProtectedRoute>
              <PendingCollections />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/auctions"
          element={
            <ProtectedRoute>
              <Auctions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/payouts"
          element={
            <ProtectedRoute>
              <Payouts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/dividends"
          element={
            <ProtectedRoute>
              <Dividends />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/receipts"
          element={
            <ProtectedRoute>
              <Receipts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/documents"
          element={
            <ProtectedRoute>
              <ChitDocuments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/notifications"
          element={
            <ProtectedRoute>
              <ChitNotifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chits/settings"
          element={
            <ProtectedRoute>
              <ChitSettings />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default AppRouter;
