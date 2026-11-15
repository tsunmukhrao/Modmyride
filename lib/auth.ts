import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { backendServerFetch } from './backend-api.server';

export const getCurrentIdentity = cache(async () => {
  const response = await backendServerFetch('/api/auth/me');
  if (!response?.ok) return null;
  return await response.json() as { user: { id: string; email: string }; profile: { full_name?: string; phone?: string; role?: string; vehicle_make?: string; vehicle_model?: string; vehicle_year?: number }; role: 'admin' | 'customer' };
});

export async function requireAdmin() {
  const identity = await getCurrentIdentity();
  if (!identity || identity.role !== 'admin') redirect('/account?error=admin-required');
  return identity;
}
