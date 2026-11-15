import { describe, expect, it } from 'vitest';
import { loginSchema, passwordUpdateSchema, registrationSchema } from './auth-validation';

describe('authentication input validation', () => {
  it('requires a valid email and strong password for login', () => {
    expect(loginSchema.safeParse({ email: 'bad', password: 'short' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'driver@example.com', password: 'Garage#2026' }).success).toBe(true);
  });

  it('validates registration name, email, phone, and password strength', () => {
    expect(registrationSchema.safeParse({ name: 'A', email: 'driver@example.com', phone: '123', password: 'weak' }).success).toBe(false);
    expect(registrationSchema.safeParse({ name: 'Ari Singh', email: 'ari@example.com', phone: '+919876543210', password: 'Garage#2026' }).success).toBe(true);
  });

  it('requires matching strong passwords when setting a new password', () => {
    expect(passwordUpdateSchema.safeParse({ password: 'Garage#2026', confirmPassword: 'Garage#2025' }).success).toBe(false);
    expect(passwordUpdateSchema.safeParse({ password: 'Garage#2026', confirmPassword: 'Garage#2026' }).success).toBe(true);
  });
});
