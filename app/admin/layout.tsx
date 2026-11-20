import { AdminShell } from '../../components/admin-shell';
import { requireAdmin } from '../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const identity = await requireAdmin();
  return <AdminShell email={identity.user.email}>{children}</AdminShell>;
}
