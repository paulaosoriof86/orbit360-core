#!/usr/bin/env node
'use strict';

import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const groupIndex = args.indexOf('--group');
const group = groupIndex >= 0 ? String(args[groupIndex + 1] || '') : '';
const root = path.resolve(args.find((value, index) => value !== '--group' && index !== groupIndex + 1) || path.join(process.cwd(), 'orbit360-platform'));
const allowed = new Set(['access','import','copy','quarantine','alias','ux','migration','academy','technical']);
if (!allowed.has(group)) {
  console.error(JSON.stringify({ validator:'orbit360-validar-aseguradoras-op2-group-v1220', error:'grupo_invalido', group }));
  process.exit(2);
}

const validator = path.join(path.resolve(root, '..'), 'tools', 'orbit360-validar-aseguradoras-op2-v1220.mjs');
const run = spawnSync(process.execPath, [validator, root], { encoding:'utf8' });
let payload;
try { payload = JSON.parse(String(run.stdout || '').trim()); }
catch (error) {
  console.error(JSON.stringify({
    validator:'orbit360-validar-aseguradoras-op2-group-v1220', group,
    error:'salida_no_json', stderr:String(run.stderr || '').trim(), stdout:String(run.stdout || '').slice(-2000)
  }, null, 2));
  process.exit(2);
}

function groupFor(id) {
  const value = String(id || '');
  if (/^(?:FILE_(?:ACCESS|VISIBILITY|OPERATIONALACCESS)|ACCESS_|ROLE_|BANK_POLICY|CREDENTIAL_POLICY|RESTRICTIONS_)/.test(value)) return 'access';
  if (/^(?:FILE_IMPORTER$|IMPORT_)/.test(value)) return 'import';
  if (/^(?:FILE_IMPORTERSECURITY|WRITE_GUARD|FRIENDLY_ERRORS|SAFE_VISIBLE_COPY|NO_HTML_INJECTION)/.test(value)) return 'copy';
  if (/^(?:FILE_QUARANTINE|QUARANTINE_)/.test(value)) return 'quarantine';
  if (/^(?:FILE_(?:SOURCEGUARD|IMPORTUI)|ALIAS_|PROBABLE_UPDATE|UI_)/.test(value)) return 'alias';
  if (/^(?:FILE_(?:UX|RESOURCES|OPERATIONALRESOURCES)|UX_|DOCUMENT_VIEWER|RATE_HONESTY|BANK_OPERATIONAL|CREDENTIAL_OPERATIONAL|CREDENTIAL_TEMPORARY|PROVIDER_CONTEXT)/.test(value)) return 'ux';
  if (/^(?:FILE_(?:CLOSURE|PERMISSION)|STORE_GUARD|NEW_RESOURCES_SANITIZED|LEGACY_NON_DESTRUCTIVE|NO_PREMATURE_MIGRATION|DIRECT_ENTRY_GUARD)/.test(value)) return 'migration';
  if (/^(?:FILE_(?:ACADEMY|STYLES)|ACADEMY_|RESPONSIVE)/.test(value)) return 'academy';
  return 'technical';
}

const allFailures = Array.isArray(payload.fail) ? payload.fail : [];
const failures = allFailures.filter(item => groupFor(item.id) === group);
const result = {
  validator:'orbit360-validar-aseguradoras-op2-group-v1220',
  generatedAt:new Date().toISOString(),
  group,
  root,
  canonicalSummary:payload.summary || {},
  summary:{ fail:failures.length },
  fail:failures
};
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
