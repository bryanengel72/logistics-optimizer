// Applies every Drizzle migration in ./drizzle to the local Miniflare D1 database
// that `npm run dev` creates under .wrangler/state. Run `npm run dev` once first.
import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
if (!existsSync(dir)) {
  console.error(
    'No local D1 database yet. Start `npm run dev` once, then rerun.',
  );
  process.exit(1);
}
const dbs = readdirSync(dir).filter(
  (f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite',
);
const migrations = readdirSync('drizzle')
  .filter((f) => f.endsWith('.sql'))
  .sort();
for (const db of dbs) {
  for (const m of migrations) {
    try {
      execFileSync('sqlite3', [join(dir, db), `.read drizzle/${m}`], {
        stdio: ['ignore', 'inherit', 'pipe'],
      });
      console.log(`applied ${m} to ${db}`);
    } catch (e) {
      const msg = String(e.stderr || e.message);
      if (msg.includes('already exists'))
        console.log(`skipped ${m} (already applied)`);
      else throw e;
    }
  }
}
