import { Request, Response, NextFunction } from 'express';
import { prisma } from '../auth/auth.service';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

export const TENANT_ID_HEADER = 'x-tenant-id';

/**
 * Tenant Isolation Middleware
 *
 * Parses the `x-tenant-id` header (or falls back to the `tenantId` query
 * parameter for browser-URL testing) from incoming requests, verifies the
 * tenant exists and is active in the Prisma `Tenant` model, and attaches the
 * resolved tenant id to `req.tenantId`.
 *
 * - Missing header & query -> 400 Bad Request
 * - Unknown tenant         -> 404 Not Found
 * - Inactive tenant        -> 403 Forbidden
 */
export async function tenantMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // 1. Prefer the x-tenant-id header.
  const headerTenantId = req.header(TENANT_ID_HEADER);

  // 2. Fallback to the tenantId query parameter (browser-URL testing).
  const queryTenantId = req.query.tenantId;

  const tenantId =
    headerTenantId && headerTenantId.trim() !== ''
      ? headerTenantId
      : typeof queryTenantId === 'string' && queryTenantId.trim() !== ''
        ? queryTenantId
        : undefined;

  if (!tenantId) {
    res.status(400).json({
      error: 'Tenant ID header (x-tenant-id) or query parameter (tenantId) is required',
    });
    return;
  }

  const normalizedTenantId = tenantId.trim();

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: normalizedTenantId },
      select: { id: true, status: true },
    });

    if (!tenant) {
      res.status(404).json({
        error: `Tenant not found for id: ${normalizedTenantId}`,
      });
      return;
    }

    if (tenant.status !== 'active') {
      res.status(403).json({
        error: `Tenant is not active (status: ${tenant.status})`,
      });
      return;
    }

    req.tenantId = tenant.id;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tenant verification failed';
    res.status(500).json({ error: message });
  }
}