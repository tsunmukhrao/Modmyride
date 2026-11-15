import { AuthCallback } from '../../../components/auth-callback';

type Props = { searchParams: Promise<{ code?: string; next?: string }> };

export default async function AuthCallbackPage({ searchParams }: Props) {
  const params = await searchParams;
  return <AuthCallback code={params.code ?? ''} next={params.next ?? '/'} />;
}
