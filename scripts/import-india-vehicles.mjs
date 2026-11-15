import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const csvPath = resolve('data/vehicle-database/india-cars.csv');
const [, ...lines] = readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const vehicles = lines.flatMap((line) => {
  const [make, model, yearStartText, yearEndText] = line.split(',').map((value) => value.trim());
  const yearStart = Number(yearStartText);
  const yearTo = yearEndText ? Number(yearEndText) : null;
  if (!make || !model || !Number.isInteger(yearStart) || (yearTo !== null && !Number.isInteger(yearTo))) return [];
  return [{
    source_key: `${make.toLowerCase()}:${model}:${yearStart}:${yearTo ?? ''}`,
    make,
    model,
    year_from: yearStart,
    year_to: yearTo,
    source: 'india-curated',
  }];
});

const fordCount = vehicles.filter((vehicle) => vehicle.make === 'Ford').length;
if (process.argv.includes('--dry-run')) {
  console.log(`Prepared ${vehicles.length} India-market vehicle records (${fordCount} Ford); no database changes made.`);
  process.exit(0);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
for (let offset = 0; offset < vehicles.length; offset += 200) {
  const batch = vehicles.slice(offset, offset + 200);
  const { error } = await supabase.from('vehicles').upsert(batch, { onConflict: 'source_key' });
  if (error) throw new Error(`Vehicle import failed at record ${offset + 1}: ${error.message}`);
  console.log(`Imported ${Math.min(offset + batch.length, vehicles.length)} / ${vehicles.length}`);
}
console.log(`Done. ${vehicles.length} India-market vehicles imported; Ford models are first in the source file.`);
