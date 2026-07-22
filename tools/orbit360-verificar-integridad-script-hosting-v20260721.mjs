#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const MANIFEST_REL = String(process.env.ORBIT360_INTEGRITY_MANIFEST_PATH || 'tools/orbit360-critical-runtime-integrity-manifest-v20260721.json').replace(/^\/+/, '');
const manifestPath = path.join(ROOT, MANIFEST_REL);
const localOnly = process.argv.includes('--local-only');
const baseUrl = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const outPath = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/script-integrity-sanitized.json');
const OWNER_CLOSURE_POLICY = 'iife_before_trailing_comments';

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function withoutTrailingComments(source) {
  let value = String(source || '').trimEnd();
  let changed = true;
  while (changed) {
    changed = false;
    if (value.endsWith('*/')) {
      const start = value.lastIndexOf('/*');
      if (start >= 0) {
        value = value.slice(0, start).trimEnd();
        changed = true;
        continue;
      }
    }
    const lines = value.split(/\r?\n/);
    if (lines.length && lines[lines.length - 1].trim().startsWith('//')) {
      lines.pop();
      value = lines.join('\n').trimEnd();
      changed = true;
    }
  }
  return value;
}

function ownerClosure(source) {
  return /\}\)\(\);$/.test(withoutTrailingComments(source));
}

function inspectBuffer(buffer, asset) {
  const source = buffer.toString('utf8');
  const result = {
    bytes: buffer.length,
    lines: source.split(/\r?\n/).length,
    sha256: sha256(buffer),
    syntaxOk: null,
    endsWithOwnerClosure: null
  };
  if (asset.syntaxRequired === true) {
    new vm.Script(source, { filename: asset.localPath || asset.publicPath || asset.id });
    result.syntaxOk = true;
  }
  if (asset.ownerClosureRequired === true) {
    result.endsWithOwnerClosure = ownerClosure(source);
    if (!result.endsWithOwnerClosure) throw new Error(`LOCAL_OR_REMOTE_OWNER_CLOSURE_MISSING:${asset.id}`);
  }
  return result;
}

function write(payload) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

const report = {
  schemaVersion: 'orbit360-hosting-critical-integrity-manifest-v2',
  generatedAt: new Date().toISOString(),
  manifestPath: MANIFEST_REL,
  releaseId: '',
  gateId: '',
  contractVersion: '',
  ownerClosurePolicy: OWNER_CLOSURE_POLICY,
  localOnly,
  assetCount: 0,
  checkedAssets: [],
  localAllPresent: false,
  localSyntaxOk: false,
  remoteAllExact: localOnly ? null : false,
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
  if (!fs.existsSync(manifestPath)) throw new Error(`INTEGRITY_MANIFEST_MISSING:${MANIFEST_REL}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 'orbit360-critical-runtime-integrity-manifest-v1') throw new Error(`INTEGRITY_MANIFEST_SCHEMA_INVALID:${manifest.schemaVersion || 'missing'}`);
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  if (assets.length < 7) throw new Error(`INTEGRITY_MANIFEST_ASSET_COUNT_INVALID:${assets.length}`);
  const ids = new Set();
  const publicPaths = new Set();
  for (const asset of assets) {
    if (!asset || !asset.id || !asset.localPath || !asset.publicPath) throw new Error('INTEGRITY_MANIFEST_ASSET_INVALID');
    if (ids.has(asset.id)) throw new Error(`INTEGRITY_MANIFEST_DUPLICATE_ID:${asset.id}`);
    if (publicPaths.has(asset.publicPath)) throw new Error(`INTEGRITY_MANIFEST_DUPLICATE_PUBLIC_PATH:${asset.publicPath}`);
    if (!asset.publicPath.startsWith('/')) throw new Error(`INTEGRITY_MANIFEST_PUBLIC_PATH_INVALID:${asset.id}`);
    ids.add(asset.id);
    publicPaths.add(asset.publicPath);
  }

  report.releaseId = String(manifest.releaseId || '');
  report.gateId = String(manifest.gateId || '');
  report.contractVersion = String(manifest.contractVersion || '');
  report.assetCount = assets.length;

  if (!localOnly && !/^https:\/\//.test(baseUrl)) throw new Error('PREVIEW_URL_REQUIRED_FOR_REMOTE_INTEGRITY');

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    const localPath = path.join(ROOT, String(asset.localPath).replace(/^\/+/, ''));
    if (!fs.existsSync(localPath)) throw new Error(`LOCAL_CRITICAL_ASSET_MISSING:${asset.id}`);
    const localBuffer = fs.readFileSync(localPath);
    const local = inspectBuffer(localBuffer, asset);
    const item = {
      id: asset.id,
      kind: asset.kind || 'text',
      localPath: asset.localPath,
      publicPath: asset.publicPath,
      syntaxRequired: asset.syntaxRequired === true,
      ownerClosureRequired: asset.ownerClosureRequired === true,
      local,
      remote: null,
      exactMatch: localOnly ? null : false
    };

    if (!localOnly) {
      const separator = asset.publicPath.includes('?') ? '&' : '?';
      const url = `${baseUrl}${asset.publicPath}${separator}orbitIntegrity=${encodeURIComponent(process.env.GITHUB_RUN_ID || Date.now())}&asset=${encodeURIComponent(asset.id)}&release=${encodeURIComponent(report.releaseId)}`;
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' }
      });
      if (!response.ok) throw new Error(`REMOTE_CRITICAL_ASSET_HTTP_${response.status}:${asset.id}`);
      const remoteBuffer = Buffer.from(await response.arrayBuffer());
      item.remote = inspectBuffer(remoteBuffer, asset);
      item.exactMatch = local.sha256 === item.remote.sha256 && local.bytes === item.remote.bytes;
      if (!item.exactMatch) {
        throw new Error(`REMOTE_CRITICAL_ASSET_INTEGRITY_MISMATCH:${asset.id}:local=${local.bytes}:${local.sha256}:remote=${item.remote.bytes}:${item.remote.sha256}`);
      }
    }
    report.checkedAssets.push(item);
  }

  report.localAllPresent = report.checkedAssets.length === report.assetCount;
  report.localSyntaxOk = report.checkedAssets.every(item => item.syntaxRequired !== true || item.local.syntaxOk === true);
  if (!localOnly) report.remoteAllExact = report.checkedAssets.every(item => item.exactMatch === true);
  report.exactMatch = localOnly ? null : report.remoteAllExact;
  report.ok = report.localAllPresent && report.localSyntaxOk && (localOnly || report.remoteAllExact === true);
  if (!report.ok) throw new Error('CRITICAL_RUNTIME_INTEGRITY_NOT_PROVEN');
  write(report);
  console.log(JSON.stringify({
    ok: report.ok,
    schemaVersion: report.schemaVersion,
    releaseId: report.releaseId,
    ownerClosurePolicy: report.ownerClosurePolicy,
    assetCount: report.assetCount,
    localSyntaxOk: report.localSyntaxOk,
    exactMatch: report.exactMatch,
    assets: report.checkedAssets.map(item => ({ id: item.id, bytes: item.local.bytes, sha256: item.local.sha256, exactMatch: item.exactMatch }))
  }));
} catch (error) {
  report.errorCode = String(error && error.message || error).split(':')[0];
  report.error = String(error && error.message || error).slice(0, 900);
  write(report);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
