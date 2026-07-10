#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VERSION = 'p09c-v1';
const SUPPORTED_TASKS = Object.freeze({
  excel_manifest: {
    extensions: ['.xlsx', '.xlsm'],
    tool: 'orbit360-extract-excel-rule-facts-p06b.py',
    buildArgs({ input, output, purpose, hintsPath }) {
      return [input, '--output', output, '--purpose', purpose, '--hints', hintsPath];
    }
  },
  pdf_manifest: {
    extensions: ['.pdf'],
    tool: 'orbit360-extract-pdf-manifest-p07b.py',
    buildArgs({ input, output, purpose, hintsPath, directoryPath, includeSensitiveValues }) {
      const args = [input, '--output', output, '--purpose', purpose, '--hints-json', hintsPath, '--directory-json', directoryPath];
      if (includeSensitiveValues) args.push('--include-sensitive-values');
      return args;
    }
  }
});
const FORBIDDEN_KEY = /^(?:raw|raw_?bytes|bytes|binary|binary_?payload|base64|file_?bytes|full_?text|api_?key|token|access_?token|refresh_?token|secret|password|passwd|authorization|credential|credentials|private_?key|client_?secret|localPath|resolvedPath)$/i;
const MAX_REQUEST_BYTES = 512 * 1024;
const MAX_RESULT_BYTES = 64 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 120000;
const ALLOWED_PURPOSES = ['training', 'operational'];

function clean(value) { return String(value == null ? '' : value).trim(); }
function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
function sanitize(value, depth = 0) {
  if (depth > 18) return '[depth_limited]';
  if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.slice(0, 10000).map(item => sanitize(item, depth + 1));
  if (typeof value !== 'object') return String(value);
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) continue;
    out[key] = sanitize(item, depth + 1);
  }
  return out;
}
function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead);
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}
function within(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
function realAllowedRoots(values) {
  const roots = unique((values || []).map(value => clean(value)).filter(Boolean)).map(value => fs.realpathSync(value));
  if (!roots.length) throw Object.assign(new Error('ALLOWED_ROOT_REQUIRED'), { code: 'ALLOWED_ROOT_REQUIRED' });
  return roots;
}
function resolveAuthorizedLocalPath(localPath, allowedRoots) {
  const requested = clean(localPath);
  if (!requested || requested.includes('\0')) throw Object.assign(new Error('LOCAL_PATH_REQUIRED'), { code: 'LOCAL_PATH_REQUIRED' });
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(requested) && !requested.startsWith('file://')) {
    throw Object.assign(new Error('REMOTE_REFERENCE_REQUIRES_RESOLVER'), { code: 'REMOTE_REFERENCE_REQUIRES_RESOLVER' });
  }
  const rawPath = requested.startsWith('file://') ? fileURLToPath(requested) : requested;
  const resolved = fs.realpathSync(rawPath);
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) throw Object.assign(new Error('SOURCE_FILE_REQUIRED'), { code: 'SOURCE_FILE_REQUIRED' });
  if (!allowedRoots.some(root => within(root, resolved))) {
    throw Object.assign(new Error('SOURCE_OUTSIDE_ALLOWED_ROOT'), { code: 'SOURCE_OUTSIDE_ALLOWED_ROOT' });
  }
  return { resolved, stat };
}
function validateRequest(request) {
  const errors = [];
  const task = clean(request && request.task);
  const purpose = clean(request && request.purpose || 'training');
  if (!SUPPORTED_TASKS[task]) errors.push('TASK_UNSUPPORTED');
  if (!clean(request && request.tenantId)) errors.push('TENANT_REQUIRED');
  if (!clean(request && request.aseguradoraId)) errors.push('INSURER_REQUIRED');
  if (!clean(request && request.documentId)) errors.push('DOCUMENT_REQUIRED');
  if (!clean(request && request.fileRef)) errors.push('FILE_REF_REQUIRED');
  if (!clean(request && request.localPath)) errors.push('LOCAL_PATH_REQUIRED');
  if (!ALLOWED_PURPOSES.includes(purpose)) errors.push('PURPOSE_INVALID');
  if (request && request.includeSensitiveValues === true) {
    if (purpose !== 'operational') errors.push('SENSITIVE_VALUES_REQUIRE_OPERATIONAL_PURPOSE');
    if (!request.authorization || request.authorization.allowSensitiveValues !== true) errors.push('SENSITIVE_VALUES_REQUIRE_BACKEND_AUTHORIZATION');
    if (!clean(request.authorization && request.authorization.reason)) errors.push('SENSITIVE_VALUES_REASON_REQUIRED');
  }
  return { valid: errors.length === 0, errors };
}
function safeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(sanitize(value), null, 2), { encoding: 'utf8', mode: 0o600 });
}
function readJsonResult(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size > MAX_RESULT_BYTES) throw Object.assign(new Error('MANIFEST_RESULT_TOO_LARGE'), { code: 'MANIFEST_RESULT_TOO_LARGE' });
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
function forceMetadataOnly(manifest, purpose) {
  const safe = sanitize(manifest || {});
  safe.flags = Object.assign({}, safe.flags || {}, {
    containsRawPayload: false,
    containsBytes: false,
    containsBase64: false,
    containsSecrets: false,
    embeddedContentExecuted: false,
    externalLinksFollowed: false,
    macrosExecuted: false,
    formulasCalculated: false
  });
  if (purpose === 'training') safe.flags.containsCustomerPayload = false;
  safe.writeAllowed = false;
  safe.enabled = false;
  safe.enabledCotizador = false;
  safe.enabledComparativo = false;
  safe.requiresHumanValidation = true;
  return safe;
}
function executionAudit(request, startedAt, completedAt, code, sourceHash) {
  return {
    eventType: 'document_backend_runner_execution', runnerVersion: VERSION,
    tenantId: clean(request.tenantId), aseguradoraId: clean(request.aseguradoraId),
    documentId: clean(request.documentId), task: clean(request.task),
    purpose: clean(request.purpose || 'training'), fileRef: clean(request.fileRef),
    sourceHash: clean(sourceHash), code, startedAt, completedAt,
    containsRawPayload: false,
    containsCustomerPayload: clean(request.purpose || 'training') === 'operational' && request.includeSensitiveValues === true,
    containsSecrets: false, requiresHumanValidation: true
  };
}
function buildHints(request) {
  const dimensions = sanitize(request.dimensiones || request.dimensions || {});
  return Object.assign({}, dimensions, {
    tenantId: clean(request.tenantId), aseguradoraId: clean(request.aseguradoraId),
    documentId: clean(request.documentId), fileRef: clean(request.fileRef),
    version: clean(request.versionFuente || request.version || 'v1')
  });
}
function commandFailure(result, toolName) {
  const stderr = clean(result.stderr).slice(0, 4000);
  const stdout = clean(result.stdout).slice(0, 1000);
  const code = stderr ? (() => {
    try { return JSON.parse(stderr.split(/\r?\n/).filter(Boolean).at(-1)).code; } catch { return ''; }
  })() : '';
  const error = new Error(code || `EXTRACTOR_FAILED:${toolName}`);
  error.code = code || 'EXTRACTOR_FAILED';
  error.details = { status: result.status, signal: result.signal || '', stderr, stdout };
  return error;
}

export function runnerStatus(options = {}) {
  const toolsRoot = path.resolve(options.toolsRoot || path.join(process.cwd(), 'tools'));
  const tasks = Object.entries(SUPPORTED_TASKS).filter(([, spec]) => fs.existsSync(path.join(toolsRoot, spec.tool))).map(([task]) => task);
  return {
    connected: tasks.length > 0, tasks, deterministic: true, externalAi: false,
    version: VERSION, region: clean(options.region || process.env.ORBIT_DOCUMENT_RUNNER_REGION || ''),
    metadataOnly: true, writeAllowed: false
  };
}

export async function runAuthorizedDocumentTask(request, options = {}) {
  request = request || {};
  const validation = validateRequest(request);
  const startedAt = new Date().toISOString();
  if (!validation.valid) {
    return { ok: false, code: validation.errors[0], errors: validation.errors, writeAllowed: false, audit: executionAudit(request, startedAt, new Date().toISOString(), validation.errors[0], '') };
  }
  let tempDir = '';
  try {
    const allowedRoots = realAllowedRoots(options.allowedRoots || []);
    const { resolved, stat } = resolveAuthorizedLocalPath(request.localPath, allowedRoots);
    const task = clean(request.task);
    const spec = SUPPORTED_TASKS[task];
    const ext = path.extname(resolved).toLowerCase();
    if (!spec.extensions.includes(ext)) throw Object.assign(new Error('TASK_FILE_TYPE_MISMATCH'), { code: 'TASK_FILE_TYPE_MISMATCH' });
    const sourceHash = sha256File(resolved);
    if (clean(request.sourceHash) && clean(request.sourceHash).toLowerCase() !== sourceHash) {
      throw Object.assign(new Error('SOURCE_HASH_MISMATCH'), { code: 'SOURCE_HASH_MISMATCH' });
    }
    const toolsRoot = path.resolve(options.toolsRoot || path.join(process.cwd(), 'tools'));
    const toolPath = path.join(toolsRoot, spec.tool);
    if (!fs.existsSync(toolPath)) throw Object.assign(new Error('EXTRACTOR_TOOL_NOT_FOUND'), { code: 'EXTRACTOR_TOOL_NOT_FOUND' });
    tempDir = fs.mkdtempSync(path.join(options.tempRoot || os.tmpdir(), 'orbit-document-runner-'));
    fs.chmodSync(tempDir, 0o700);
    const output = path.join(tempDir, 'manifest.json');
    const hintsPath = path.join(tempDir, 'hints.json');
    const directoryPath = path.join(tempDir, 'directory.json');
    safeJsonFile(hintsPath, buildHints(request));
    safeJsonFile(directoryPath, Array.isArray(request.directory) ? request.directory.slice(0, 5000) : []);
    const purpose = clean(request.purpose || 'training');
    const includeSensitiveValues = purpose === 'operational' && request.includeSensitiveValues === true && request.authorization && request.authorization.allowSensitiveValues === true;
    const args = spec.buildArgs({ input: resolved, output, purpose, hintsPath, directoryPath, includeSensitiveValues });
    const python = clean(options.pythonExecutable || process.env.ORBIT_PYTHON || 'python3');
    const timeout = Math.max(1000, Math.min(Number(options.timeoutMs || DEFAULT_TIMEOUT_MS), 10 * 60 * 1000));
    const result = spawnSync(python, [toolPath, ...args], {
      encoding: 'utf8', shell: false, timeout, maxBuffer: 4 * 1024 * 1024,
      env: Object.assign({}, process.env, { PYTHONNOUSERSITE: '1', PYTHONDONTWRITEBYTECODE: '1' })
    });
    if (result.error) {
      const error = result.error;
      error.code = error.code === 'ETIMEDOUT' ? 'EXTRACTOR_TIMEOUT' : (error.code || 'EXTRACTOR_PROCESS_FAILED');
      throw error;
    }
    if (result.status !== 0) throw commandFailure(result, spec.tool);
    if (!fs.existsSync(output)) throw Object.assign(new Error('EXTRACTOR_OUTPUT_MISSING'), { code: 'EXTRACTOR_OUTPUT_MISSING' });
    let manifest = forceMetadataOnly(readJsonResult(output), purpose);
    const manifestHash = clean(manifest.sourceHash || manifest.document && manifest.document.sourceHash || manifest.file && manifest.file.sourceHash);
    if (manifestHash && manifestHash.toLowerCase() !== sourceHash) throw Object.assign(new Error('MANIFEST_SOURCE_HASH_MISMATCH'), { code: 'MANIFEST_SOURCE_HASH_MISMATCH' });
    manifest = Object.assign({}, manifest, {
      tenantId: clean(manifest.tenantId || manifest.document && manifest.document.tenantId || request.tenantId),
      aseguradoraId: clean(manifest.aseguradoraId || manifest.document && manifest.document.aseguradoraId || request.aseguradoraId),
      documentId: clean(manifest.documentId || manifest.document && manifest.document.id || request.documentId),
      sourceHash, fileRef: clean(request.fileRef),
      runner: { name: 'orbit360_document_backend_runner', version: VERSION, task, deterministic: true, externalAi: false }
    });
    const completedAt = new Date().toISOString();
    return {
      ok: true,
      code: task === 'excel_manifest' ? 'EXCEL_MANIFEST_READY_FOR_REVIEW' : 'PDF_MANIFEST_READY_FOR_REVIEW',
      task, documentId: clean(request.documentId), sourceHash, sourceSizeBytes: stat.size,
      result: manifest, audit: executionAudit(request, startedAt, completedAt, 'READY_FOR_REVIEW', sourceHash),
      writeAllowed: false, requiresHumanValidation: true, enablesCotizador: false, enablesComparativo: false
    };
  } catch (error) {
    const completedAt = new Date().toISOString();
    return {
      ok: false, code: clean(error && error.code) || clean(error && error.message) || 'DOCUMENT_RUNNER_FAILED',
      errors: [clean(error && error.message) || 'Document runner failed'],
      details: sanitize(error && error.details || {}),
      audit: executionAudit(request, startedAt, completedAt, clean(error && error.code) || 'DOCUMENT_RUNNER_FAILED', ''),
      writeAllowed: false, enablesCotizador: false, enablesComparativo: false
    };
  } finally {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const out = { allowedRoots: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--request') out.request = argv[++i];
    else if (arg === '--output') out.output = argv[++i];
    else if (arg === '--allowed-root') out.allowedRoots.push(argv[++i]);
    else if (arg === '--tools-root') out.toolsRoot = argv[++i];
    else if (arg === '--python') out.pythonExecutable = argv[++i];
    else if (arg === '--timeout-ms') out.timeoutMs = Number(argv[++i]);
    else if (arg === '--status') out.status = true;
    else throw new Error(`UNKNOWN_ARGUMENT:${arg}`);
  }
  return out;
}
async function cli() {
  const args = parseArgs(process.argv);
  if (args.status) { process.stdout.write(JSON.stringify(runnerStatus(args), null, 2) + '\n'); return 0; }
  if (!args.request) throw new Error('REQUEST_FILE_REQUIRED');
  const stat = fs.statSync(args.request);
  if (stat.size > MAX_REQUEST_BYTES) throw new Error('REQUEST_TOO_LARGE');
  const request = JSON.parse(fs.readFileSync(args.request, 'utf8'));
  const result = await runAuthorizedDocumentTask(request, args);
  const payload = JSON.stringify(result, null, 2);
  if (args.output) fs.writeFileSync(args.output, payload, { encoding: 'utf8', mode: 0o600 });
  else process.stdout.write(payload + '\n');
  return result.ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli().then(code => { process.exitCode = code; }).catch(error => {
    process.stderr.write(JSON.stringify({ ok: false, code: clean(error.code || error.message), writeAllowed: false }) + '\n');
    process.exitCode = 1;
  });
}
