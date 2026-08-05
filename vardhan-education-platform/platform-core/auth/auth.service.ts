import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const connectionString = process.env.DATABASE_URL || '';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = process.env.JWT_SECRET || 'vardhan-dev-secret';
const JWT_EXPIRES_IN = '7d';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  tenantSlug: string;
  tenantName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

function signToken(userId: string, tenantId: string): string {
  return jwt.sign({ sub: userId, tenantId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const { email, password, fullName, tenantSlug, tenantName } = input;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Single Identity: create the User, the Tenant, and the TenantMembership
  // linking them in one transaction.
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: 'owner',
      },
    });

    const tenant = await tx.tenant.create({
      data: {
        name: tenantName,
        slug: tenantSlug,
        status: 'active',
      },
    });

    await tx.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: 'owner',
      },
    });

    return { user, tenant };
  });

  const token = signToken(result.user.id, result.tenant.id);

  return {
    token,
    user: {
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
    },
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
    },
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const { email, password } = input;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  const membership = user.memberships[0];
  if (!membership) {
    throw new Error('User is not associated with any tenant');
  }

  const token = signToken(user.id, membership.tenantId);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    tenant: {
      id: membership.tenant.id,
      name: membership.tenant.name,
      slug: membership.tenant.slug,
    },
  };
}

export { prisma };