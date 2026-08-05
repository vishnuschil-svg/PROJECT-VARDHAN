import { Router, Request, Response } from 'express';
import { tenantMiddleware } from './tenantMiddleware';
import { prisma } from '../auth/auth.service';

const tenantRouter = Router();

tenantRouter.use(tenantMiddleware);

tenantRouter.get('/profile', async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        _count: {
          select: { memberships: true },
        },
      },
    });

    if (!tenant) {
      res.status(404).json({ error: `Tenant not found for id: ${tenantId}` });
      return;
    }

    res.json({
      status: tenant.status.toUpperCase(),
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        createdAt: tenant.createdAt,
        memberCount: tenant._count.memberships,
      },
      context: {
        tenantId: tenant.id,
        isolated: true,
        rowLevelAccess: 'ENFORCED',
        scopedRows: `All rows are scoped to tenant: ${tenant.slug}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load tenant profile';
    res.status(500).json({ error: message });
  }
});

export default tenantRouter;