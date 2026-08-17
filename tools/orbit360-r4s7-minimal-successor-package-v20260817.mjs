import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TARGET = 'core/client-insurer-visual-contract-v20260720.js';
const MANIFEST = 'orbit360-package-manifest.json';
const BASE_ZIP_SHA = '00b283a69511735dbcd8d662b5d95ab0d02895a38fbf90770590754f253f3d2c';
const BASE_SOURCE = '395f15d9c2e1fac2949763947834b88a9b521207';
const DELTA_SOURCE = 'ce9792e3e4e37b298d2eda6f65983c683d66a3a3';
const EXPECTED_BASE_TARGET_SHA = '5493a18acba2d2055c301bf576c46050959ddb6b2f74e7ca4293ee77f815604f';
const EXPECTED_REPLACEMENT_SHA = '573a45da2f7dae3803e8dff86ff651ba58f5be507cf85b04a80863ac15bb4390';
const EXPECTED_CLIENT360_SHA = '5ac3f042add37ea45582cc88c670c5bcff139937dac406d9561e25f1b9962f9e';
const EXPECTED_QUERIES_SHA = 'b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b';

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
  if (mf.status !== 'FASE_A_PRODUCT_R4S6_MINIMAL_SUCCESSOR_CERTIFIED') fail('base_manifest_status_mismatch');
  if (mf.sourceHead !== BASE_SOURCE) fail('base_source_head_mismatch');
  if (mf.fileCount !== 194 || !Array.isArray(mf.files) || mf.files.length !== 194) fail('base_file_count_mismatch');
  if (mf.noLabRuntime !== true || mf.noPrivateSecretMaterial !== true || mf.writeAuthorized !== false || mf.deployExecuted !== false || mf.productionTouched !== false) fail('base_safety_contract_mismatch');
  if (JSON.stringify(mf.deltaFiles) !== JSON.stringify(['core/client-insurer-visual-contract-v20260720.js','modules/cliente360.js'])) fail('base_r4s6_delta_contract_mismatch');
  const expected = new Set(mf.files.map(x => x.path));
  if (expected.size !== 194 || !expected.has(TARGET) || !expected.has('modules/cliente360.js') || !expected.has('core/queries.js')) fail('base_manifest_path_contract_mismatch');
  const actual = listFiles(baseDir).filter(x => x !== MANIFEST);
  if (actual.length !== 194 || actual.some(x => !expected.has(x))) fail('base_physical_tree_mismatch');
  for (const row of mf.files) {
    const abs = path.join(baseDir, row.path);
    if (!fs.existsSync(abs)) fail(`base_file_missing:${row.path}`);
    const got = info(abs);
    if (got.bytes !== row.bytes || got.sha256 !== row.sha256) fail(`base_hash_mismatch:${row.path}`);
  }
  if (info(path.join(baseDir, TARGET)).sha256 !== EXPECTED_BASE_TARGET_SHA) fail('base_core_hash_mismatch');
  if (info(path.join(baseDir, 'modules/cliente360.js')).sha256 !== EXPECTED_CLIENT360_SHA) fail('base_cliente360_hash_mismatch');
  if (info(path.join(baseDir, 'core/queries.js')).sha256 !== EXPECTED_QUERIES_SHA) fail('base_queries_hash_mismatch');
  return mf;
}
function validateSuccessor(baseDir, successorDir, baseMf) {
  const mf = readJson(path.join(successorDir, MANIFEST));
  if (mf.schemaVersion !== baseMf.schemaVersion) fail('successor_manifest_schema_mismatch');
  if (mf.status !== 'FASE_A_PRODUCT_R4S7_MINIMAL_SUCCESSOR_CERTIFIED') fail('successor_status_mismatch');
  if (mf.sourceHead !== DELTA_SOURCE || mf.baseSourceHead !== BASE_SOURCE || mf.deltaSourceHead !== DELTA_SOURCE) fail('successor_source_identity_mismatch');
  if (mf.basePackageSha256 !== BASE_ZIP_SHA) fail('successor_base_package_mismatch');
  if (mf.fileCount !== 194 || mf.unchangedFileCount !== 193) fail('successor_count_mismatch');
  if (JSON.stringify(mf.deltaFiles) !== JSON.stringify([TARGET])) fail('successor_delta_contract_mismatch');
  if (mf.noLabRuntime !== true || mf.noPrivateSecretMaterial !== true || mf.writeAuthorized !== false || mf.deployExecuted !== false || mf.productionTouched !== false) fail('successor_safety_contract_mismatch');
  const actual = listFiles(successorDir).filter(x => x !== MANIFEST);
  if (actual.length !== 194) fail('successor_physical_count_mismatch');
  const newRows = new Map(mf.files.map(x => [x.path, x]));
  let changed = 0, unchanged = 0;
  let targetInfo = null;
  for (const baseRow of baseMf.files) {
    const p = baseRow.path;
    const succRow = newRows.get(p);
    if (!succRow) fail(`successor_manifest_file_missing:${p}`);
    const got = info(path.join(successorDir, p));
    if (got.bytes !== succRow.bytes || got.sha256 !== succRow.sha256) fail(`successor_hash_mismatch:${p}`);
    const baseGot = info(path.join(baseDir, p));
    if (p === TARGET) {
      if (got.sha256 === baseGot.sha256) fail('target_not_changed');
      if (got.sha256 !== EXPECTED_REPLACEMENT_SHA) fail('target_replacement_hash_mismatch');
      targetInfo = { ...got, baseSha256: baseGot.sha256, baseBytes: baseGot.bytes };
      changed++;
    } else {
      if (got.bytes !== baseGot.bytes || got.sha256 !== baseGot.sha256) fail(`unexpected_product_delta:${p}`);
      unchanged++;
    }
  }
  if (changed !== 1 || unchanged !== 193) fail(`delta_cardinality_mismatch:${changed}:${unchanged}`);
  if (info(path.join(successorDir, 'modules/cliente360.js')).sha256 !== EXPECTED_CLIENT360_SHA) fail('successor_cliente360_changed');
  if (info(path.join(successorDir, 'core/queries.js')).sha256 !== EXPECTED_QUERIES_SHA) fail('successor_queries_changed');
  return { manifest: mf, target: targetInfo, changed, unchanged };
}

const [mode, baseDir, successorDir, replacementFile, certFile] = process.argv.slice(2);
if (!mode || !baseDir || !successorDir || !certFile) fail('usage: prepare|verify <baseDir> <successorDir> <replacement-or-dash> <certFile>');
const baseMf = validateBase(baseDir);

if (mode === 'prepare') {
  if (!replacementFile || replacementFile === '-' || !fs.existsSync(replacementFile)) fail('replacement_missing');
  const replacement = info(replacementFile);
  if (replacement.sha256 !== EXPECTED_REPLACEMENT_SHA) fail('replacement_unexpected');
  const baseRow = baseMf.files.find(x => x.path === TARGET);
  if (!baseRow || replacement.sha256 === baseRow.sha256) fail('replacement_equals_base');
  fs.rmSync(successorDir, { recursive: true, force: true });
  fs.cpSync(baseDir, successorDir, { recursive: true, preserveTimestamps: true });
  fs.copyFileSync(replacementFile, path.join(successorDir, TARGET));
  const rows = baseMf.files.map(row => row.path === TARGET ? { path: row.path, ...info(path.join(successorDir, row.path)) } : { ...row });
  const mf = {
    ...baseMf,
    status: 'FASE_A_PRODUCT_R4S7_MINIMAL_SUCCESSOR_CERTIFIED',
    sourceHead: DELTA_SOURCE,
    generatedAt: new Date().toISOString(),
    basePackageSha256: BASE_ZIP_SHA,
    baseSourceHead: BASE_SOURCE,
    deltaSourceHead: DELTA_SOURCE,
    deltaFiles: [TARGET],
    unchangedFileCount: 193,
    successorOrdinal: 7,
    packageLineage: 'R4S6 + bounded invalidable consecutive projected-client snapshot cache rootfix',
    files: rows,
    writeAuthorized: false,
    productionTouched: false,
    deployExecuted: false
  };
  writeJson(path.join(successorDir, MANIFEST), mf);
  const checked = validateSuccessor(baseDir, successorDir, baseMf);
  writeJson(certFile, {
    schemaVersion: 'orbit360-r4s7-minimal-successor-certification-v1',
    ok: false,
    status: 'R4S7_SUCCESSOR_STAGED_AWAITING_ZIP_VERIFY',
    classification: 'FUNCTIONAL_DEFECT_ROOTFIX_SUCCESSOR_STAGED',
    baseZipSha256: BASE_ZIP_SHA,
    baseSourceHead: BASE_SOURCE,
    deltaSourceHead: DELTA_SOURCE,
    deltaFiles: [TARGET],
    fileCount: 194,
    unchangedFileCount: checked.unchanged,
    changedProductFileCount: checked.changed,
    targetInfo: checked.target,
    semanticRootfixCommit: DELTA_SOURCE,
    staticCertification: {
      baseManifestExact: true,
      basePhysicalTreeExact: true,
      successorManifestExact: true,
      successorPhysicalTreeExact: true,
      unchangedFilesHashExact: checked.unchanged === 193,
      targetHashExact: true,
      noLabRuntime: true,
      noPrivateSecretMaterial: true
    },
    writeAuthorized: false,
    browserExecuted: false,
    runtimeExecuted: false,
    secretAccess: false,
    dataAccess: false,
    deployExecuted: false,
    productionTouched: false
  });
  console.log(JSON.stringify({ status: 'PREPARED', target: checked.target, unchanged: checked.unchanged }));
} else if (mode === 'verify') {
  const checked = validateSuccessor(baseDir, successorDir, baseMf);
  const cert = readJson(certFile);
  const zipName = process.env.SUCCESSOR_ZIP_NAME || '';
  const zipSha256 = process.env.SUCCESSOR_ZIP_SHA256 || '';
  if (!zipName || !/^[a-f0-9]{64}$/.test(zipSha256)) fail('zip_identity_missing');
  Object.assign(cert, {
    ok: true,
    status: 'R4S7_MINIMAL_SUCCESSOR_DURABLE_CERTIFIED',
    classification: 'FUNCTIONAL_DEFECT_ROOTFIX_SUCCESSOR_CERTIFIED',
    zipName,
    zipSha256,
    manifestStatus: checked.manifest.status,
    manifestSourceHead: checked.manifest.sourceHead,
    fileCount: 194,
    unchangedFileCount: checked.unchanged,
    changedProductFileCount: checked.changed,
    targetInfo: checked.target,
    staticCertification: {
      baseManifestExact: true,
      basePhysicalTreeExact: true,
      successorManifestExact: true,
      successorPhysicalTreeExact: true,
      allManifestHashesVerified: true,
      unchangedFilesHashExact: checked.unchanged === 193,
      targetHashExact: true,
      noLabRuntime: checked.manifest.noLabRuntime === true,
      noPrivateSecretMaterial: checked.manifest.noPrivateSecretMaterial === true,
      browserExecuted: false,
      runtimeExecuted: false,
      deployExecuted: false,
      productionTouched: false
    },
    writeAuthorized: false,
    browserExecuted: false,
    runtimeExecuted: false,
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
