import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import {
  authenticate,
  requireRole,
  requireMinRole,
  requirePermission,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  ALL_ROLES,
  type Role,
} from './src/middleware/rbacMiddleware';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    platform: 'VARDHAN EDUCATION PLATFORM (Ed-OS)',
    version: '1.0.0',
    coreEngines: ['Auth', 'Tenancy', 'Single Identity', 'RBAC', 'Hostel/PG SaaS'],
  });
});

// ---------------------------------------------------------------------------
// Static dashboard
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// RBAC demo endpoints
// ---------------------------------------------------------------------------

// Any authenticated user (SUPER_ADMIN, ADMIN, TEACHER, STUDENT)
app.get('/api/v1/rbac/me', authenticate, (req, res) => {
  res.json({
    user: req.user,
    permissions: ROLE_PERMISSIONS[req.user!.role as Role],
    hierarchyLevel: ROLE_HIERARCHY[req.user!.role as Role],
  });
});

// Only SUPER_ADMIN
app.get('/api/v1/rbac/super-admin-only', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  res.json({ message: 'SUPER_ADMIN access granted', user: req.user });
});

// ADMIN or above (SUPER_ADMIN, ADMIN)
app.get('/api/v1/rbac/admin-only', authenticate, requireMinRole('ADMIN'), (req, res) => {
  res.json({ message: 'ADMIN+ access granted', user: req.user });
});

// TEACHER or above (SUPER_ADMIN, ADMIN, TEACHER)
app.get('/api/v1/rbac/teacher-only', authenticate, requireMinRole('TEACHER'), (req, res) => {
  res.json({ message: 'TEACHER+ access granted', user: req.user });
});

// Permission-based: only roles holding 'reports:read'
app.get('/api/v1/rbac/reports', authenticate, requirePermission('reports:read'), (req, res) => {
  res.json({ message: 'reports:read permission granted', user: req.user });
});

// Role matrix (public)
app.get('/api/v1/rbac/matrix', (req, res) => {
  res.json({
    roles: ALL_ROLES,
    hierarchy: ROLE_HIERARCHY,
    permissions: ROLE_PERMISSIONS,
  });
});

// ---------------------------------------------------------------------------
// Tenant profile (demo — requires x-tenant-id header or tenantId query)
// ---------------------------------------------------------------------------
app.get('/api/v1/tenant/profile', (req, res) => {
  const tenantId =
    (req.header('x-tenant-id') || '').trim() ||
    (typeof req.query.tenantId === 'string' ? req.query.tenantId.trim() : '');

  if (!tenantId) {
    res.status(400).json({
      error: 'Tenant ID header (x-tenant-id) or query parameter (tenantId) is required',
    });
    return;
  }

  res.json({
    status: 'ACTIVE',
    tenant: {
      id: tenantId,
      name: 'Demo School',
      slug: 'demo-school-001',
      status: 'active',
      createdAt: new Date().toISOString(),
      memberCount: 1,
    },
    context: {
      tenantId,
      isolated: true,
      rowLevelAccess: 'ENFORCED',
      scopedRows: `All rows are scoped to tenant: demo-school-001`,
    },
  });
});

// ---------------------------------------------------------------------------
// Auth (demo login/register)
// ---------------------------------------------------------------------------
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  res.json({
    token: 'demo-token',
    user: { id: 'demo-user', email, fullName: 'Demo User', role: 'ADMIN' },
    tenant: { id: 'demo-tenant', name: 'Demo School', slug: 'demo-school-001' },
  });
});

app.post('/api/v1/auth/register', (req, res) => {
  const { email, password, fullName, tenantSlug, tenantName } = req.body;
  if (!email || !password || !fullName || !tenantSlug || !tenantName) {
    res.status(400).json({ error: 'email, password, fullName, tenantSlug and tenantName are required' });
    return;
  }
  res.status(201).json({
    token: 'demo-token',
    user: { id: 'demo-user', email, fullName, role: 'owner' },
    tenant: { id: 'demo-tenant', name: tenantName, slug: tenantSlug },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 VARDHAN Ed-OS Engine running on http://localhost:${PORT}`);
});