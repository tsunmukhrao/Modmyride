import { AdminDashboard } from '../../components/admin-dashboard';
import { requireAdmin } from '../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const identity = await requireAdmin();
  return <AdminDashboard email={identity.user.email} />;
}
