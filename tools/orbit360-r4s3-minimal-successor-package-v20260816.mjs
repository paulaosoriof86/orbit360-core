import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TARGETS = ['core/access-scope.js'];
const MANIFEST = 'orbit360-package-manifest.json';
const BASE_ZIP_SHA = '580d7568d64deb0cf7b8eccdf91b99e5bdc005b6bd441c68f99ef0d36de305ca';
const BASE_SOURCE = '47249fd4d6032a2f4c09f6fbd3460d3804c199da';
const DELTA_SOURCE = '294ed22bdb564585b71fc59cefa1d04cdfa6b120';
const BASE_TARGET_SHA = {
  'core/access-scope.js': '8976ab8032f210a0f93d79f4ace037ec3b3e8fe8c1ac9e1f5a0eadd8d134fb3f'
};
const EXPECTED_REPLACEMENT_SHA = {
  'core/access-scope.js': '624f7538809dbea59294a2c94a4acce58f326b0812625754891fb7b0fa4d3e1f'
};

function sha256File(file) { const h = crypto.createHash('sha256'); h.update(fs.readFileSync(file)); return h.digest('hex'); }
function info(file) { const st = fs.statSync(file); return { bytes: st.size, sha256: sha256File(file) }; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8'); }
function fail(msg) { throw new Error(msg); }
function listFiles(root) {
  const out = [];
  function visit(rel) {
    const abs = path.join(root, rel);
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const childRel = rel ? path.posix.join(rel.replaceAll('\\','/'), ent.name) : ent.name;
      const childAbs = path.join(root, childRel);
      if (ent.isSymbolicLink()) fail(`symlink_forbidden:${childRel}`);
      if (ent.isDirectory()) visit(childRel);
      else if (ent.isFile()) out.push(childRel.replaceAll('\\','/'));
      else fail(`special_file_forbidden:${childRel}`);
    }
  }
  visit('');
  return out.sort();
}
function validateBase(baseDir) {
  const mfPath = path.join(baseDir, MANIFEST);
  if (!fs.existsSync(mfPath)) fail('base_manifest_missing');
  const mf = readJson(mfPath);
  if (mf.schemaVersion !== 'orbit360-fase-a-product-package-manifest-v1') fail('base_manifest_schema_mismatch');
  if (mf.status !== 'FASE_A_PRODUCT_R4S2_MINIMAL_SUCCESSOR_CERTIFIED') fail('base_manifest_status_mismatch');
  if (mf.sourceHead !== BASE_SOURCE) fail('base_source_head_mismatch');
  if (mf.fileCount !== 194 || !Array.isArray(mf.files) || mf.files.length !== 194) fail('base_file_count_mismatch');
  if (mf.noLabRuntime !== true || mf.noPrivateSecretMaterial !== true || mf.writeAuthorized !== false || mf.deployExecuted !== false || mf.productionTouched !== false) fail('base_safety_contract_mismatch');
  if (JSON.stringify(mf.deltaFiles) !== JSON.stringify(['core/queries.js','modules/policy-receipts-v1199-detail-guard.js'])) fail('base_r4s2_delta_contract_mismatch');
  const expected = new Set(mf.files.map(x => x.path));
  if (expected.size !== 194 || TARGETS.some(p => !expected.has(p))) fail('base_manifest_path_contract_mismatch');
  const actual = listFiles(baseDir).filter(x => x !== MANIFEST);
  if (actual.length !== 194 || actual.some(x => !expected.has(x))) fail('base_physical_tree_mismatch');
  for (const row of mf.files) {
    const abs = path.join(baseDir, row.path);
    if (!fs.existsSync(abs)) fail(`base_file_missing:${row.path}`);
    const got = info(abs);
    if (got.bytes !== row.bytes || got.sha256 !== row.sha256) fail(`base_hash_mismatch:${row.path}`);
  }
  for (const p of TARGETS) {
    const row = mf.files.find(x => x.path === p);
    if (!row || row.sha256 !== BASE_TARGET_SHA[p]) fail(`base_target_hash_mismatch:${p}`);
  }
  return mf;
}
function validateSuccessor(baseDir, successorDir, baseMf) {
  const mf = readJson(path.join(successorDir, MANIFEST));
  if (mf.schemaVersion !== baseMf.schemaVersion) fail('successor_manifest_schema_mismatch');
  if (mf.status !== 'FASE_A_PRODUCT_R4S3_MINIMAL_SUCCESSOR_CERTIFIED') fail('successor_status_mismatch');
  if (mf.sourceHead !== DELTA_SOURCE || mf.baseSourceHead !== BASE_SOURCE || mf.deltaSourceHead !== DELTA_SOURCE) fail('successor_source_identity_mismatch');
  if (mf.basePackageSha256 !== BASE_ZIP_SHA) fail('successor_base_package_mismatch');
  if (mf.fileCount !== 194 || mf.unchangedFileCount !== 193) fail('successor_count_mismatch');
  if (JSON.stringify(mf.deltaFiles) !== JSON.stringify(TARGETS)) fail('successor_delta_contract_mismatch');
  if (mf.noLabRuntime !== true || mf.noPrivateSecretMaterial !== true || mf.writeAuthorized !== false || mf.deployExecuted !== false || mf.productionTouched !== false) fail('successor_safety_contract_mismatch');
  const actual = listFiles(successorDir).filter(x => x !== MANIFEST);
  if (actual.length !== 194) fail('successor_physical_count_mismatch');
  const newRows = new Map(mf.files.map(x => [x.path, x]));
  let changed = 0, unchanged = 0;
  const targetInfo = {};
  for (const baseRow of baseMf.files) {
    const p = baseRow.path;
    const succRow = newRows.get(p);
    if (!succRow) fail(`successor_manifest_file_missing:${p}`);
    const got = info(path.join(successorDir, p));
    if (got.bytes !== succRow.bytes || got.sha256 !== succRow.sha256) fail(`successor_hash_mismatch:${p}`);
    const baseGot = info(path.join(baseDir, p));
    if (TARGETS.includes(p)) {
      if (got.sha256 === baseGot.sha256) fail(`target_not_changed:${p}`);
      if (got.sha256 !== EXPECTED_REPLACEMENT_SHA[p]) fail(`target_replacement_hash_mismatch:${p}`);
      targetInfo[p] = got;
      changed++;
    } else {
      if (got.bytes !== baseGot.bytes || got.sha256 !== baseGot.sha256) fail(`unexpected_product_delta:${p}`);
      unchanged++;
    }
  }
  if (changed !== 1 || unchanged !== 193) fail(`delta_cardinality_mismatch:${changed}:${unchanged}`);
  return { manifest: mf, targets: targetInfo, changed, unchanged };
}

const [mode, baseDir, successorDir, accessReplacement, certFile] = process.argv.slice(2);
if (!mode || !baseDir || !successorDir || !certFile) fail('usage: prepare|verify <baseDir> <successorDir> <accessReplacement-or-dash> <certFile>');
const baseMf = validateBase(baseDir);

if (mode === 'prepare') {
  const replacementByTarget = { 'core/access-scope.js': accessReplacement };
  for (const p of TARGETS) {
    const file = replacementByTarget[p];
    if (!file || file === '-' || !fs.existsSync(file)) fail(`replacement_missing:${p}`);
    const replacement = info(file);
    if (replacement.sha256 !== EXPECTED_REPLACEMENT_SHA[p]) fail(`replacement_unexpected:${p}`);
    if (replacement.sha256 === BASE_TARGET_SHA[p]) fail(`replacement_equals_base:${p}`);
  }
  fs.rmSync(successorDir, { recursive: true, force: true });
  fs.cpSync(baseDir, successorDir, { recursive: true, preserveTimestamps: true });
  for (const p of TARGETS) fs.copyFileSync(replacementByTarget[p], path.join(successorDir, p));
  const rows = baseMf.files.map(row => TARGETS.includes(row.path) ? { path: row.path, ...info(path.join(successorDir, row.path)) } : { ...row });
  const mf = {
    ...baseMf,
    status: 'FASE_A_PRODUCT_R4S3_MINIMAL_SUCCESSOR_CERTIFIED',
    sourceHead: DELTA_SOURCE,
    generatedAt: new Date().toISOString(),
    basePackageSha256: BASE_ZIP_SHA,
    baseSourceHead: BASE_SOURCE,
    deltaSourceHead: DELTA_SOURCE,
    deltaFiles: TARGETS,
    unchangedFileCount: 193,
    successorOrdinal: 3,
    packageLineage: 'R4S2 + proven team/own relational access index rootfix',
    files: rows,
    writeAuthorized: false,
    productionTouched: false,
    deployExecuted: false
  };
  writeJson(path.join(successorDir, MANIFEST), mf);
  const checked = validateSuccessor(baseDir, successorDir, baseMf);
  writeJson(certFile, {
    schemaVersion: 'orbit360-r4s3-minimal-successor-certification-v1',
    ok: false,
    status: 'R4S3_SUCCESSOR_STAGED_AWAITING_ZIP_VERIFY',
    classification: 'FUNCTIONAL_DEFECT_ROOTFIX_SUCCESSOR_STAGED',
    baseZipSha256: BASE_ZIP_SHA,
    baseSourceHead: BASE_SOURCE,
    deltaSourceHead: DELTA_SOURCE,
    deltaFiles: TARGETS,
    fileCount: 194,
    unchangedFileCount: checked.unchanged,
    changedProductFileCount: checked.changed,
    targetInfo: checked.targets,
    semanticRootfixCommit: DELTA_SOURCE,
    writeAuthorized: false,
    browserExecuted: false,
    secretAccess: false,
    dataAccess: false,
    deployExecuted: false,
    productionTouched: false
  });
  console.log(JSON.stringify({ status: 'PREPARED', targets: checked.targets, unchanged: checked.unchanged }));
} else if (mode === 'verify') {
  const checked = validateSuccessor(baseDir, successorDir, baseMf);
  const cert = readJson(certFile);
  const zipName = process.env.SUCCESSOR_ZIP_NAME || '';
  const zipSha256 = process.env.SUCCESSOR_ZIP_SHA256 || '';
  if (!zipName || !/^[a-f0-9]{64}$/.test(zipSha256)) fail('zip_identity_missing');
  Object.assign(cert, {
    ok: true,
    status: 'R4S3_MINIMAL_SUCCESSOR_DURABLE_CERTIFIED',
    classification: 'FUNCTIONAL_DEFECT_ROOTFIX_SUCCESSOR_CERTIFIED',
    zipName,
    zipSha256,
    manifestStatus: checked.manifest.status,
    manifestSourceHead: checked.manifest.sourceHead,
    fileCount: 194,
    unchangedFileCount: checked.unchanged,
    changedProductFileCount: checked.changed,
    targetInfo: checked.targets,
    writeAuthorized: false,
    browserExecuted: false,
    secretAccess: false,
    dataAccess: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false
  });
  writeJson(certFile, cert);
  console.log(JSON.stringify(cert));
} else {
  fail(`unknown_mode:${mode}`);
}
