#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const relativePath = String(process.env.ORBIT360_INTEGRITY_SCRIPT_PATH || 'orbit360-platform/modules/ia.js').replace(/^\/+/, '');
const localPath = path.join(ROOT, relativePath);
const publicPath = '/' + relativePath.replace(/^orbit360-platform\//, '');
const localOnly = process.argv.includes('--local-only');
const baseUrl = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const outPath = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/script-integrity-sanitized.json');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function parseScript(buffer, filename) {
  const source = buffer.toString('utf8');
  new vm.Script(source, { filename });
  return {
    bytes: buffer.length,
    lines: source.split(/\r?\n/).length,
    sha256: sha256(buffer),
    endsWithOwnerClosure: /\}\)\(\);\s*$/.test(source),
    syntaxOk: true
  };
}

function write(payload) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

const report = {
  schemaVersion: 'orbit360-hosting-script-integrity-v1',
  generatedAt: new Date().toISOString(),
  scriptPath: publicPath,
  localOnly,
  local: null,
  remote: null,
  exactMatch: localOnly ? null : false,
  ok: false,
  writesExecuted: false,
  firestoreRead: false,
  vaultRead: false,
  browserExecuted: false,
  deployExecuted: false,
  containsPII: false,
  containsSecrets: false
};

try {
  if (!fs.existsSync(localPath)) throw new Error(`LOCAL_SCRIPT_MISSING:${relativePath}`);
  const localBuffer = fs.readFileSync(localPath);
  report.local = parseScript(localBuffer, relativePath);
  if (!report.local.endsWithOwnerClosure) throw new Error(`LOCAL_SCRIPT_OWNER_CLOSURE_MISSING:${relativePath}`);

  if (!localOnly) {
    if (!/^https:\/\//.test(baseUrl)) throw new Error('PREVIEW_URL_REQUIRED_FOR_REMOTE_INTEGRITY');
    const url = `${baseUrl}${publicPath}?orbitIntegrity=${encodeURIComponent(process.env.GITHUB_RUN_ID || Date.now())}`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' }
    });
    if (!response.ok) throw new Error(`REMOTE_SCRIPT_HTTP_${response.status}:${publicPath}`);
    const remoteBuffer = Buffer.from(await response.arrayBuffer());
    report.remote = parseScript(remoteBuffer, publicPath);
    if (!report.remote.endsWithOwnerClosure) throw new Error(`REMOTE_SCRIPT_OWNER_CLOSURE_MISSING:${publicPath}`);
    report.exactMatch = report.local.sha256 === report.remote.sha256 && report.local.bytes === report.remote.bytes;
    if (!report.exactMatch) {
      throw new Error(`REMOTE_SCRIPT_INTEGRITY_MISMATCH:${publicPath}:local=${report.local.bytes}:${report.local.sha256}:remote=${report.remote.bytes}:${report.remote.sha256}`);
    }
  }

  report.ok = true;
  write(report);
  console.log(JSON.stringify({ ok: true, scriptPath: publicPath, local: report.local, remote: report.remote, exactMatch: report.exactMatch }));
} catch (error) {
  report.errorCode = String(error && error.message || error).split(':')[0];
  report.error = String(error && error.message || error).slice(0, 600);
  write(report);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
