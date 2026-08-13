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
  console.error('Uso: node tools/orbit360-generar-product-readonly-route-rule-matrix-p0.mjs --tenant <tenantId> [--out archivo.json]');
  process.exit(2);
}

const repoRoot = process.cwd().endsWith('orbit360-platform') ? process.cwd() : path.join(process.cwd(), 'orbit360-platform');
const files = [
  'core/tenant-canonical-paths-contract-p0.js',
  'core/tenant-access-policy-contract-p0.js',
  'core/aseguradoras-bank-account-visibility-policy-p0.js',
  'core/tenant-access-policy-effective-p0.js',
  'core/product-query-planner-contract-p0.js',
  'core/product-readonly-smoke-catalog-p0.js',
  'core/product-readonly-route-rule-matrix-p0.js'
];
const sandbox = { window: { Orbit: {} }, console };
vm.createContext(sandbox);
for (const file of files) {
  vm.runInContext(fs.readFileSync(path.join(repoRoot, file), 'utf8'), sandbox, { filename: file });
}

const matrix = sandbox.window.Orbit.productReadonlyRouteRuleMatrixP0;
const catalogApi = sandbox.window.Orbit.productReadOnlySmokeCatalogP0;
const opts = {
  accessPolicy: sandbox.window.Orbit.tenantAccessPolicyEffectiveP0,
  queryPlanner: sandbox.window.Orbit.productQueryPlannerP0,
  canonicalPaths: sandbox.window.Orbit.tenantCanonicalPathsP0
};
const memberships = {
  'Dirección': {uid:'uid-direction',tenantId,roles:['Dirección','Asesor'],activeRole:'Dirección',status:'active',countries:['GT','CO'],modulesVisible:['*'],dataScopes:{default:'all',modules:{}},advisorId:'advisor-direction',teamId:'team-template'},
  'Operativo': {uid:'uid-operativo',tenantId,roles:['Operativo','Asesor'],activeRole:'Operativo',status:'active',countries:['GT','CO'],modulesVisible:['inicio','cliente360','polizas','cobros','renovaciones','ops','leads','aseguradoras','calidad','importar','portal'],dataScopes:{default:'team',modules:{}},advisorId:'advisor-operativo',teamId:'team-template'},
  'Asesor': {uid:'uid-asesor',tenantId,roles:['Asesor'],activeRole:'Asesor',status:'active',countries:['GT','CO'],modulesVisible:['inicio','cliente360','polizas','cobros','renovaciones','ops','leads','aseguradoras','calidad','portal'],dataScopes:{default:'own',modules:{}},advisorId:'advisor-template',teamId:'team-template'}
};

const roles = {};
for (const [role, membership] of Object.entries(memberships)) {
  const catalog = catalogApi.buildCatalog(membership, {accessPolicy:opts.accessPolicy,queryPlanner:opts.queryPlanner});
  if (!catalog.ok) process.exit(3);
  const required = {};
  const denied = {};
  for (const item of catalog.requiredCollections) {
    required[item.collection] = matrix.evaluate({operation:'list',path:`tenants/${tenantId}/data/${item.collection}/items`,membership},opts);
  }
  for (const item of catalog.deniedCollections) {
    denied[item.collection] = matrix.evaluate({operation:'list',path:`tenants/${tenantId}/data/${item.collection}/items`,membership},opts);
  }
  roles[role] = {
    config: matrix.evaluate({operation:'get',path:`tenants/${tenantId}/system/config`,membership},opts),
    membershipSelf: matrix.evaluate({operation:'get',path:`tenants/${tenantId}/members/${membership.uid}`,membership},opts),
    required,
    denied
  };
}

const manifest = {
  schemaVersion:'orbit360.product-readonly-route-rule-matrix.v1',
  generatedAt:new Date().toISOString(),
  tenantId,
  writeAuthorized:false,
  deployAuthorized:false,
  ruleMode:'proposal_only_no_firestore_execution',
  roles,
  systemRoutes:{
    config:`tenants/${tenantId}/system/config`,
    membership:`tenants/${tenantId}/members/{uid}`,
    audit:`tenants/${tenantId}/auditEvents/{eventId}`,
    importBatch:`tenants/${tenantId}/importBatches/{batchId}`,
    credentialRef:`tenants/${tenantId}/credentialRefs/{refId}`,
    academyProgress:`tenants/${tenantId}/academyProgress/{uid}`
  },
  hardGuards:{
    activeMembershipRequired:true,
    activeRoleMustBeAssigned:true,
    tenantMustMatchRoute:true,
    countryRequiredForOperationalRecords:true,
    scopeMustBeInQuery:true,
    credentialRefsProviderOnly:true,
    bankAccountsOperationalForModuleUsers:true,
    allWritesBlocked:true,
    noDeployAuthorization:true
  }
};

const output=JSON.stringify(manifest,null,2)+'\n';
if (outPath) {
  fs.mkdirSync(path.dirname(path.resolve(outPath)),{recursive:true});
  const tmp=`${path.resolve(outPath)}.tmp-${process.pid}`;
  fs.writeFileSync(tmp,output,{encoding:'utf8',mode:0o600});
  fs.renameSync(tmp,path.resolve(outPath));
  console.log(path.resolve(outPath));
} else process.stdout.write(output);

if (selfTest) {
  for (const role of ['Dirección','Operativo','Asesor']) {
    if (!roles[role].required.cuentasBancariasAseguradora?.allowed) process.exit(4);
    if (Object.values(roles[role].required).some(x=>x.writeAuthorized!==false)) process.exit(5);
  }
  if (roles.Asesor.required.plataformasAseguradora) process.exit(6);
  if (manifest.writeAuthorized!==false||manifest.deployAuthorized!==false) process.exit(7);
}
