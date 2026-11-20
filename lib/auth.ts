import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from './supabase-server';

export const getCurrentIdentity = cache(async () => {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name,phone,role,vehicle_make,vehicle_model,vehicle_year')
    .eq('id', user.id)
    .maybeSingle();
  const safeProfile = profile ?? {
    full_name: null,
    phone: null,
    role: 'customer' as const,
    vehicle_make: null,
    vehicle_model: null,
    vehicle_year: null,
  };

  return {
    user: { id: user.id, email: user.email ?? '' },
    profile: safeProfile,
    role: safeProfile.role === 'admin' ? 'admin' as const : 'customer' as const,
  };
});

export async function requireAdmin() {
  const identity = await getCurrentIdentity();
  if (!identity || identity.role !== 'admin') redirect('/account?error=admin-required');
  return identity;
}
