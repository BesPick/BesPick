import { auth } from '@clerk/nextjs/server';
import { Roles } from '@/types/globals';

export const checkRole = async (role: Roles | Roles[]) => {
  const { sessionClaims } = await auth();
  const currentRole =
    typeof sessionClaims?.metadata.role === 'string'
      ? sessionClaims.metadata.role
      : '';
  const allowedRoles = Array.isArray(role) ? role : [role];
  return allowedRoles.includes(currentRole as Roles);
};
