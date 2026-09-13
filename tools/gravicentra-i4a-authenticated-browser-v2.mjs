import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// I5 versioned LIVE credential harness binding: provider-boundary-trace-v2.
const here = path.dirname(fileURLToPath(import.meta.url));
const harness = path.join(here, 'gravicentra-i5-credential-live-v1.mjs');
const run = spawnSync(process.execPath, [harness], { stdio: 'inherit', env: process.env });
process.exitCode = Number.isInteger(run.status) ? run.status : 1;
