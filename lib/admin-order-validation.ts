import { z } from 'zod';

const httpUrl = z.string().trim().url().refine((value) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}, 'Tracking URL must use http or https.');

export const adminOrderUpdateSchema = z.object({
  status: z.enum(['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']),
  courier: z.string().trim().max(120).optional(),
  trackingNumber: z.string().trim().max(160).optional(),
  trackingUrl: httpUrl.optional().or(z.literal('')),
  eta: z.string().datetime().optional().or(z.literal('')),
}).superRefine((value, context) => {
  if (value.status === 'shipped' && !value.trackingNumber) {
    context.addIssue({ code: 'custom', path: ['trackingNumber'], message: 'A tracking number is required before marking an order shipped.' });
  }
});

export type AdminOrderUpdate = z.infer<typeof adminOrderUpdateSchema>;
