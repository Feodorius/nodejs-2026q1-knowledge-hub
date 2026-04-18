import prisma from '../lib/prisma';

type Role = 'viewer' | 'editor' | 'admin';

const roleMap = {
  viewer: 'VIEWER',
  editor: 'EDITOR',
  admin: 'ADMIN',
} as const;

const promoteUserRole = async (userId: string, role: Role): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { role: roleMap[role] },
  });
};

export default promoteUserRole;
