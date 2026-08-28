#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || path.join(process.cwd(), 'orbit360-platform'));
const registryPath = path.join(root, 'docs', 'orbit360-runtime-capability-registry-v20260828.json');
const preservationPath = path.join(root, 'docs', 'orbit360-certified-product-preservation-registry-v20260827.json');
const indexPath = path.join(root, 'index.html');

function die(message, details = {}) {
  console.error(JSON.stringify({ ok:false, classification:'PIPELINE_MECHANISM_FAILURE', message, ...details }, null, 2));
  process.exit(1);
}
function read(file) { return fs.readFileSync(file, 'utf8'); }
function json(file) { return JSON.parse(read(file)); }
function normalize(ref) {
  return String(ref || '').trim().replace(/^\.\//, '').split('?')[0].split('#')[0];
}
function existing(rel) { return fs.existsSync(path.join(root, normalize(rel))); }

if (!fs.existsSync(indexPath)) die('Operational entrypoint missing', { file:'index.html' });
if (!fs.existsSync(registryPath)) die('Runtime capability registry missing', { file:path.relative(root, registryPath) });
if (!fs.existsSync(preservationPath)) die('Certified product preservation registry missing', { file:path.relative(root, preservationPath) });

const runtimeRegistry = json(registryPath);
const preservation = json(preservationPath);
const index = read(indexPath);

const directScripts = new Set();
for (const match of index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) directScripts.add(normalize(match[1]));
const directStyles = new Set();
for (const match of index.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
  const rel = normalize(match[1]);
  if (rel.endsWith('.css')) directStyles.add(rel);
}

const reachable = new Set();
const queue = [...directScripts];
const literalRefRe = /["'`]((?:\.\/)?(?:modules|core|data)\/[A-Za-z0-9._\/-]+\.js)(?:\?[^"'`]*)?["'`]/g;
while (queue.length) {
  const rel = normalize(queue.shift());
  if (!rel || reachable.has(rel)) continue;
  reachable.add(rel);
  if (!existing(rel)) continue;
  const src = read(path.join(root, rel));
  for (const match of src.matchAll(literalRefRe)) {
    const child = normalize(match[1]);
    if (!reachable.has(child)) queue.push(child);
  }
}

const missingDirectFiles = [...directScripts].filter(rel => !existing(rel));
const approved = Array.isArray(preservation.approvedModuleScripts) ? preservation.approvedModuleScripts.map(normalize) : [];
const orphanedApproved = approved.filter(rel => !reachable.has(rel));
const capabilityFailures = [];
for (const capability of runtimeRegistry.capabilities || []) {
  const missingScripts = (capability.requiredReachableScripts || []).map(normalize).filter(rel => !reachable.has(rel));
  const missingStyles = (capability.requiredDirectStyles || []).map(normalize).filter(rel => !directStyles.has(rel));
  if (missingScripts.length || missingStyles.length) {
    capabilityFailures.push({ capabilityId:capability.capabilityId, missingScripts, missingStyles });
  }
}

const result = {
  ok: missingDirectFiles.length === 0 && orphanedApproved.length === 0 && capabilityFailures.length === 0,
  classification: 'PIPELINE_MECHANISM_FAILURE',
  entrypoint: 'index.html',
  directScriptCount: directScripts.size,
  reachableScriptCount: reachable.size,
  certifiedApprovedModuleScriptCount: approved.length,
  missingDirectFiles,
  orphanedApproved,
  capabilityFailures,
  rule: 'existence_in_repository_is_not_runtime_reachability'
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
