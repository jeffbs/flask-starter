import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export function toSkipTake(p: { page: number; limit: number }) {
  return { skip: (p.page - 1) * p.limit, take: p.limit };
}
