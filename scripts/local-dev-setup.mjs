import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { demoUsers, parseSupabaseStatus, renderLocalEnv } from './local-supabase-utils.mjs';

const statusOutput = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});
const local = parseSupabaseStatus(statusOutput);
writeFileSync('.env.development.local', renderLocalEnv(local), { mode: 0o600 });

const supabase = createClient(local.apiUrl, local.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw new Error(`Could not inspect local demo accounts: ${listError.message}`);

for (const demo of demoUsers) {
  const existing = listed.users.find((user) => user.email?.toLowerCase() === demo.email);
  const result = existing
    ? await supabase.auth.admin.updateUserById(existing.id, {
      password: demo.password,
      email_confirm: true,
      user_metadata: { full_name: demo.fullName },
    })
    : await supabase.auth.admin.createUser({
      email: demo.email,
      password: demo.password,
      email_confirm: true,
      user_metadata: { full_name: demo.fullName },
    });

  if (result.error) throw new Error(`Could not prepare local ${demo.role} account: ${result.error.message}`);
  const user = result.data.user;
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    full_name: demo.fullName,
    role: demo.role,
  }, { onConflict: 'id' });
  if (profileError) throw new Error(`Could not assign local ${demo.role} profile: ${profileError.message}`);
}

const importOutput = execFileSync('node', ['scripts/import-india-vehicles.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    SUPABASE_URL: local.apiUrl,
    NEXT_PUBLIC_SUPABASE_URL: local.apiUrl,
    SUPABASE_SERVICE_ROLE_KEY: local.serviceRoleKey,
  },
});

console.log('Local Supabase env written to ignored .env.development.local.');
console.log(importOutput.trim());
console.log('Local demo accounts (these credentials are for this local database only):');
for (const demo of demoUsers) {
  console.log(`  ${demo.role}: ${demo.email} / ${demo.password}`);
}
