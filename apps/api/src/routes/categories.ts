import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';

export default async function categoryRoutes(app: FastifyInstance) {
  // Kompletter Kategoriebaum (flach, mit parentId — Client baut den Baum)
  app.get('/', async () => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, parentId: true, sortOrder: true },
    });
    return { categories };
  });
}
