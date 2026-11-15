import { z } from 'zod';

export const emailSchema = z.string().trim().email('Enter a valid email address.').max(254);
export const passwordSchema = z.string()
  .min(10, 'Use at least 10 characters.')
  .max(128, 'Password must be 128 characters or fewer.')
  .regex(/[a-z]/, 'Add a lowercase letter.')
  .regex(/[A-Z]/, 'Add an uppercase letter.')
  .regex(/[0-9]/, 'Add a number.')
  .regex(/[^A-Za-z0-9]/, 'Add a symbol.');

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password.').max(128) });

export const registrationSchema = z.object({
  name: z.string().trim().min(2, 'Name must contain at least 2 characters.').max(80),
  email: emailSchema,
  phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Enter a phone number with country code.'),
  password: passwordSchema,
});

export const resetSchema = z.object({ email: emailSchema });
export const passwordUpdateSchema = z.object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
