import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('work/model', { recursive: true });
writeFileSync('work/model/package.json', '{"type":"commonjs"}');
const compile = spawnSync(
  './node_modules/.bin/tsc',
  [
    'lib/model.ts',
    'lib/validation.ts',
    'lib/hos.ts',
    'lib/ifta.ts',
    '--outDir',
    'work/model',
    '--module',
    'commonjs',
    '--target',
    'ES2022',
    '--esModuleInterop',
    '--skipLibCheck',
  ],
  { stdio: 'inherit' },
);
if (compile.status) process.exit(compile.status);
process.exit(
  spawnSync(process.execPath, ['--test', 'tests/model.test.mjs'], {
    stdio: 'inherit',
  }).status ?? 1,
);
