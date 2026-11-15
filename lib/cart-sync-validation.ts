import { z } from 'zod';

export const cartSyncSchema = z.object({
  lines: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(50) })).max(100),
});
