import { z } from 'zod';

const shippingSchema = z.object({
  recipient: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,20}$/),
  line1: z.string().trim().min(3).max(180),
  line2: z.string().trim().max(180).optional().default(''),
  city: z.string().trim().min(2).max(100),
  region: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(3).max(16),
  countryCode: z.string().trim().length(2).default('IN'),
});

export const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(50),
  })).min(1).max(50),
  shipping: shippingSchema,
  idempotencyKey: z.string().trim().min(8).max(128),
  couponCode: z.string().trim().max(64).optional(),
});
