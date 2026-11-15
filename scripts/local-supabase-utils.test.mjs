import { describe, expect, it } from 'vitest';
import {
  demoUsers,
  parseSupabaseStatus,
  renderLocalEnv,
} from './local-supabase-utils.mjs';

describe('local Supabase setup helpers', () => {
  it('extracts local API keys without exposing arbitrary status lines', () => {
    const status = parseSupabaseStatus(`API_URL="http://127.0.0.1:54321"\nANON_KEY="local-anon"\nSERVICE_ROLE_KEY="local-service"\nDB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"`);
    expect(status).toEqual({
      apiUrl: 'http://127.0.0.1:54321',
      anonKey: 'local-anon',
      serviceRoleKey: 'local-service',
    });
  });

  it('rejects a hosted Supabase URL before producing an env file', () => {
    expect(() => renderLocalEnv({
      apiUrl: 'https://example.supabase.co',
      anonKey: 'anon',
      serviceRoleKey: 'service',
    })).toThrow(/local Supabase URL/);
  });

  it('provides distinct customer and admin demo accounts', () => {
    expect(demoUsers.map(({ role }) => role)).toEqual(['customer', 'admin']);
    expect(new Set(demoUsers.map(({ email }) => email)).size).toBe(2);
    expect(demoUsers.every(({ email, password }) => email.endsWith('.test') && password.length >= 12)).toBe(true);
  });

  it('writes frontend and Python settings that both target the local stack', () => {
    const envText = renderLocalEnv({
      apiUrl: 'http://127.0.0.1:54321',
      anonKey: 'local-anon',
      serviceRoleKey: 'local-service',
    });
    expect(envText).toContain('NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321');
    expect(envText).toContain('SUPABASE_URL=http://127.0.0.1:54321');
    expect(envText).toContain('SUPABASE_SERVICE_ROLE_KEY=local-service');
    expect(envText).not.toContain('supabase.co');
  });
});
