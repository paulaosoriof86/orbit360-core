import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const args = process.argv.slice(2);
const value = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : '';
};
const selfTest = args.includes('--self-test');
const tenantId = selfTest ? 'tenant-test' : value('--tenant');
const outPath = value('--out');
if (!tenantId) {
  console.error('Uso: node tools/orbit360-generar-product-readonly-smoke-catalog-p0.mjs --tenant <tenantId> [--out archivo.json]');
  process.exit(2);
}

const repoRoot = process.cwd().endsWith('orbit360-platform') ? process.cwd() : path.join(process.cwd(), 'orbit360-platform');
const files = [
  'core/tenant-access-policy-contract-p0.js',
  'core/aseguradoras-bank-account-visibility-policy-p0.js',
  'core/tenant-access-policy-effective-p0.js',
  'core/product-query-planner-contract-p0.js',
  'core/product-readonly-smoke-catalog-p0.js'
];
const sandbox = { window: { Orbit: {} }, console };
vm.createContext(sandbox);
for (const file of files) {
  const full = path.join(repoRoot, file);
  vm.runInContext(fs.readFileSync(full, 'utf8'), sandbox, { filename: file });
}

const api = sandbox.window.Orbit.productReadOnlySmokeCatalogP0;
const accessPolicy = sandbox.window.Orbit.tenantAccessPolicyEffectiveP0;
const roleMemberships = {
  'Dirección': {
    tenantId, roles:['Dirección','Asesor'], activeRole:'Dirección', status:'active', countries:['GT','CO'],
    modulesVisible:['*'], dataScopes:{default:'all',modules:{}}, advisorId:'advisor-template', teamId:'team-template'
  },
  'Operativo': {
    tenantId, roles:['Operativo','Asesor'], activeRole:'Operativo', status:'active', countries:['GT','CO'],
    modulesVisible:['inicio','cliente360','polizas','cobros','renovaciones','ops','leads','aseguradoras','calidad','importar','portal'],
    dataScopes:{default:'team',modules:{}}, advisorId:'advisor-template', teamId:'team-template'
  },
  'Asesor': {
    tenantId, roles:['Asesor'], activeRole:'Asesor', status:'active', countries:['GT','CO'],
    modulesVisible:['inicio','cliente360','polizas','cobros','renovaciones','ops','leads','aseguradoras','calidad','portal'],
    dataScopes:{default:'own',modules:{}}, advisorId:'advisor-template', teamId:'team-template'
  }
};

const roles = {};
const indexMap = new Map();
for (const [role, membership] of Object.entries(roleMemberships)) {
  const catalog = api.buildCatalog(membership, {
    accessPolicy,
    queryPlanner: sandbox.window.Orbit.productQueryPlannerP0
  });
  if (!catalog.ok) {
    console.error(JSON.stringify(catalog, null, 2));
    process.exit(3);
  }
  roles[role] = catalog;
  for (const idx of catalog.indexCandidates) {
    if (!indexMap.has(idx.signature)) indexMap.set(idx.signature, {...idx, logicalCollections:[...idx.logicalCollections], roles:[role]});
    else {
      const current = indexMap.get(idx.signature);
      current.logicalCollections = [...new Set([...current.logicalCollections, ...idx.logicalCollections])].sort();
      current.roles = [...new Set([...current.roles, role])].sort();
    }
  }
}

const indexCandidates = [...indexMap.values()].sort((a,b)=>a.signature.localeCompare(b.signature));
const manifest = {
  schemaVersion:'orbit360.product-readonly-smoke-catalog.v2',
  generatedAt:new Date().toISOString(),
  tenantId,
  smokePhase:'first_read_only',
  writeAuthorized:false,
  deployAuthorized:false,
  physicalCollectionGroup:api.PHYSICAL_COLLECTION_GROUP,
  systemReadsOutsideDataStore:[
    `tenants/${tenantId}/system/config`,
    `tenants/${tenantId}/members/{uid}`
  ],
  roles,
  indexCandidates,
  firestoreIndexesCandidate:{
    indexes:indexCandidates.map(x=>({collectionGroup:x.collectionGroup,queryScope:x.queryScope,fields:x.fields})),
    fieldOverrides:[],
    deployAuthorized:false
  },
  hardGuards:{
    noSystemDocumentsThroughDataStore:true,
    advisorPlatformCredentialsRestricted:true,
    bankAccountsOperationalForModuleUsers:true,
    bankEditingPermissionSeparate:true,
    noCrossTenantQuery:true,
    noWrites:true,
    noIndexDeployWithoutEmulatorOrFirestoreConfirmation:true
  }
};

const output = JSON.stringify(manifest, null, 2) + '\n';
if (outPath) {
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  const tmp = `${path.resolve(outPath)}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, output, { encoding:'utf8', mode:0o600 });
  fs.renameSync(tmp, path.resolve(outPath));
  console.log(path.resolve(outPath));
} else {
  process.stdout.write(output);
}

if (selfTest) {
  if (indexCandidates.length !== 3) process.exit(4);
  if (manifest.writeAuthorized !== false || manifest.deployAuthorized !== false) process.exit(5);
  if (!roles.Asesor.deniedCollections.some(x=>x.collection==='plataformasAseguradora')) process.exit(6);
  for (const role of ['Dirección','Operativo','Asesor']) {
    if (!roles[role].requiredCollections.some(x=>x.collection==='cuentasBancariasAseguradora')) process.exit(7);
  }
}
