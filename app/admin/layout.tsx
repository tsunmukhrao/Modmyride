import { AdminShell } from '../../components/admin-shell';
import { requireAdmin } from '../../lib/auth';
import { getSupabaseServer } from '../../lib/supabase-server';
import './admin-overview.css';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const identity = await requireAdmin();
  const supabase = await getSupabaseServer();
  if (supabase) await supabase.auth.getUser();
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  return <AdminShell email={identity.user.email} accessToken={session?.access_token ?? null}>{children}</AdminShell>;
}
