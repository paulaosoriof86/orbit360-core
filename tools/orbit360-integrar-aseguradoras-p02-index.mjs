import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REQUIRED_BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const CORE_TAG = '<script src="core/aseguradoras-sensitive-p02.js?v=p02-20260710"></script>';
const MODULE_TAG = '<script src="modules/aseguradoras-p02-sensitive.js?v=p02-20260710"></script>';
const CORE_ANCHORS = [
  '<script src="core/legal.js?v1291"></script>',
  '<script src="core/auth.js?v1295-labfix-20260703"></script>'
];
const MODULE_ANCHOR = '<script src="modules/aseguradoras.js?v1291"></script>';
const PROTECTED_MARKERS = [
  'core/backend-lab-loader.js',
  'core/backend-lab-init.js',
  'data/store.js',
  'data/store-firestore-lab.local.js',
  'modules/aseguradoras.js'
];

function countOf(text, needle) {
  return text.split(needle).length - 1;
}

function newlineOf(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

export function validateIndex(text, options = {}) {
  const errors = [];
  const warnings = [];
  if (!text || !text.includes('<!DOCTYPE html>')) errors.push('INDEX_INVALIDO');
  if (text.includes('\uFFFD')) errors.push('MOJIBAKE_REPLACEMENT_CHAR');
  PROTECTED_MARKERS.forEach(marker => {
    if (!text.includes(marker)) errors.push(`MARCADOR_PROTEGIDO_AUSENTE:${marker}`);
  });
  if (countOf(text, CORE_TAG) > 1) errors.push('CORE_TAG_DUPLICADO');
  if (countOf(text, MODULE_TAG) > 1) errors.push('MODULE_TAG_DUPLICADO');
  if (text.includes(CORE_TAG) !== text.includes(MODULE_TAG)) warnings.push('EMPALME_PARCIAL_P02');
  if (text.includes(CORE_TAG) && text.indexOf(CORE_TAG) > text.indexOf(MODULE_ANCHOR)) errors.push('CORE_P02_DESPUES_DEL_MODULO');
  if (text.includes(MODULE_TAG) && text.indexOf(MODULE_TAG) < text.indexOf(MODULE_ANCHOR)) errors.push('PATCH_P02_ANTES_DEL_MODULO');
  if (options.requireIntegrated && (!text.includes(CORE_TAG) || !text.includes(MODULE_TAG))) errors.push('P02_NO_INTEGRADO');
  return { valid: errors.length === 0, errors, warnings, integrated: text.includes(CORE_TAG) && text.includes(MODULE_TAG) };
}

function insertAfter(text, anchor, addition) {
  const nl = newlineOf(text);
  const index = text.indexOf(anchor);
  if (index < 0) return null;
  const end = index + anchor.length;
  return text.slice(0, end) + nl + '  ' + addition + text.slice(end);
}

export function transformIndex(text) {
  const pre = validateIndex(text);
  if (!pre.valid) return { changed: false, text, pre, post: pre, error: 'PREFLIGHT_FAILED' };
  let output = text;
  if (!output.includes(CORE_TAG)) {
    let inserted = null;
    for (const anchor of CORE_ANCHORS) {
      inserted = insertAfter(output, anchor, CORE_TAG);
      if (inserted) break;
    }
    if (!inserted) return { changed: false, text, pre, post: pre, error: 'CORE_ANCHOR_NOT_FOUND' };
    output = inserted;
  }
  if (!output.includes(MODULE_TAG)) {
    const inserted = insertAfter(output, MODULE_ANCHOR, MODULE_TAG);
    if (!inserted) return { changed: false, text, pre, post: pre, error: 'MODULE_ANCHOR_NOT_FOUND' };
    output = inserted;
  }
  const post = validateIndex(output, { requireIntegrated: true });
  return {
    changed: output !== text,
    text: post.valid ? output : text,
    pre,
    post,
    error: post.valid ? '' : 'POST_VALIDATION_FAILED'
  };
}

function currentBranch(repoRoot) {
  try {
    return execFileSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, '..');
  const indexPath = path.join(repoRoot, 'orbit360-platform', 'index.html');
  const apply = process.argv.includes('--apply');
  const branch = currentBranch(repoRoot);
  const original = fs.readFileSync(indexPath, 'utf8');
  const transformed = transformIndex(original);
  const report = {
    date: new Date().toISOString(),
    repoRoot,
    indexPath,
    branch,
    requiredBranch: REQUIRED_BRANCH,
    mode: apply ? 'apply' : 'check',
    changed: transformed.changed,
    error: transformed.error,
    preflight: transformed.pre,
    postflight: transformed.post,
    writesPerformed: false,
    commitPerformed: false,
    deployPerformed: false
  };

  if (!transformed.pre.valid || transformed.error) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }

  if (!apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (branch !== REQUIRED_BRANCH) {
    report.error = 'WRONG_BRANCH';
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }

  if (!transformed.changed) {
    report.writesPerformed = false;
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const backupDir = path.join(repoRoot, '_backups', `aseguradoras-p02-index-${timestamp()}`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(indexPath, path.join(backupDir, 'index.html'));
  fs.writeFileSync(indexPath, transformed.text, 'utf8');

  const after = fs.readFileSync(indexPath, 'utf8');
  const finalValidation = validateIndex(after, { requireIntegrated: true });
  if (!finalValidation.valid) {
    fs.copyFileSync(path.join(backupDir, 'index.html'), indexPath);
    report.error = 'FINAL_VALIDATION_FAILED_ROLLED_BACK';
    report.finalValidation = finalValidation;
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }

  report.writesPerformed = true;
  report.backupDir = backupDir;
  report.finalValidation = finalValidation;
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
