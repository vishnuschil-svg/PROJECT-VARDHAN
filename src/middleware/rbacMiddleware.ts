/**
 * Vardhan ERP — RBAC (Role-Based Access Control) Middleware
 *
 * Enforces permissions across four platform roles:
 *   SUPER_ADMIN · ADMIN · TEACHER · STUDENT
 *
 * Provides:
 *   - `authenticate`        : verifies the JWT Bearer token and attaches `req.user`
 *   - `requireRole(...)`    : allows only the listed roles
 *   - `requireMinRole(...)` : allows roles at or above a hierarchy level
 *   - `requirePermission()` : allows roles that hold a specific permission
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Role model
// ---------------------------------------------------------------------------

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  tenantId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const JWT_SECRET = process.env.JWT_SECRET || 'vardhan-dev-secret';

// ---------------------------------------------------------------------------
// Permission matrix
// ---------------------------------------------------------------------------

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'dashboard:read',
    'tenant:read',
    'users:manage',
    'reports:read',
    'settings:write',
  ],
  TEACHER: [
    'dashboard:read',
    'courses:read',
    'courses:write',
    'students:read',
    'attendance:write',
  ],
  STUDENT: ['dashboard:read', 'courses:read'],
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  TEACHER: 2,
  STUDENT: 1,
};

export const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT'];

// ---------------------------------------------------------------------------
// authenticate — verifies the JWT and attaches req.user
// ---------------------------------------------------------------------------

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authorization header with a Bearer token is required',
    });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Empty Bearer token' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & {
      sub?: string;
      email?: string;
      fullName?: string;
      role?: Role;
      tenantId?: string;
    };

    const role: Role = payload.role && ALL_ROLES.includes(payload.role) ? payload.role : 'STUDENT';

    req.user = {
      id: payload.sub || '',
      email: payload.email || '',
      fullName: payload.fullName || '',
      role,
      tenantId: payload.tenantId,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ---------------------------------------------------------------------------
// requireRole — allow only the listed roles
// ---------------------------------------------------------------------------

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: requires one of roles [${roles.join(', ')}]`,
        currentRole: req.user.role,
      });
      return;
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// authorizeRoles — validates req.user.role against the allowed list
// Returns 403 Forbidden if the authenticated user's role is not allowed.
// ---------------------------------------------------------------------------

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: requires one of roles [${allowedRoles.join(', ')}]`,
        currentRole: req.user.role,
      });
      return;
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// requireMinRole — allow roles at or above a hierarchy level
// ---------------------------------------------------------------------------

export function requireMinRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY[minRole]) {
      res.status(403).json({
        error: `Forbidden: requires at least ${minRole} role`,
        currentRole: req.user.role,
      });
      return;
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// requirePermission — allow roles that hold a specific permission
// ---------------------------------------------------------------------------

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const allowed = ROLE_PERMISSIONS[req.user.role];
    if (allowed.includes('*') || allowed.includes(permission)) {
      next();
      return;
    }
    res.status(403).json({
      error: `Forbidden: missing permission '${permission}'`,
      currentRole: req.user.role,
    });
  };
}