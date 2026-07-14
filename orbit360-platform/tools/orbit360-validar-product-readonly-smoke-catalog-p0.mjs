import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

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
  vm.runInContext(fs.readFileSync(path.join(repoRoot, file), 'utf8'), sandbox, { filename: file });
}

const api = sandbox.window.Orbit.productReadOnlySmokeCatalogP0;
const baseAccess = sandbox.window.Orbit.tenantAccessPolicyP0;
const accessPolicy = sandbox.window.Orbit.tenantAccessPolicyEffectiveP0;
const queryPlanner = sandbox.window.Orbit.productQueryPlannerP0;
const direction = {tenantId:'tenant-test',roles:['Dirección','Asesor'],activeRole:'Dirección',status:'active',countries:['GT','CO'],modulesVisible:['*'],dataScopes:{default:'all',modules:{}},advisorId:'advisor-test',teamId:'team-test'};
const operativo = {tenantId:'tenant-test',roles:['Operativo','Asesor'],activeRole:'Operativo',status:'active',countries:['GT','CO'],modulesVisible:['inicio','cliente360','polizas','cobros','renovaciones','ops','leads','aseguradoras','calidad','importar','portal'],dataScopes:{default:'team',modules:{}},advisorId:'advisor-test',teamId:'team-test'};
const asesor = {tenantId:'tenant-test',roles:['Asesor'],activeRole:'Asesor',status:'active',countries:['GT','CO'],modulesVisible:['inicio','cliente360','polizas','cobros','renovaciones','ops','leads','aseguradoras','calidad','portal'],dataScopes:{default:'own',modules:{}},advisorId:'advisor-test',teamId:'team-test'};
const opts = {accessPolicy, queryPlanner};
const bankRow = {id:'bank-1',tenantId:'tenant-test',country:'GT'};

const checks = [];
function test(name, fn){ fn(); checks.push(name); }

test('api exists',()=>assert.equal(typeof api.buildCatalog,'function'));
test('effective policy exists',()=>assert.equal(typeof accessPolicy.canRead,'function'));
test('supported roles exact',()=>assert.deepEqual([...api.SUPPORTED_ROLES],['Dirección','Operativo','Asesor']));
test('direction profile valid',()=>assert.equal(api.profileFor(direction).ok,true));
test('operativo profile valid',()=>assert.equal(api.profileFor(operativo).ok,true));
test('asesor profile valid',()=>assert.equal(api.profileFor(asesor).ok,true));
test('inactive blocked',()=>assert.equal(api.profileFor({...asesor,status:'suspended'}).ok,false));
test('unassigned active role blocked',()=>assert.equal(api.profileFor({...asesor,activeRole:'Operativo'}).ok,false));
test('unsupported role blocked',()=>assert.equal(api.profileFor({...asesor,roles:['Marketing'],activeRole:'Marketing'}).ok,false));
test('base policy remains historical bank denial',()=>assert.equal(baseAccess.canRead('cuentasBancariasAseguradora',bankRow,asesor).allowed,false));
test('effective policy corrects advisor bank read',()=>assert.equal(accessPolicy.canRead('cuentasBancariasAseguradora',bankRow,asesor).allowed,true));
test('effective policy corrects operativo bank read',()=>assert.equal(accessPolicy.canRead('cuentasBancariasAseguradora',bankRow,operativo).allowed,true));

const d = api.buildCatalog(direction,opts);
const o = api.buildCatalog(operativo,opts);
const a = api.buildCatalog(asesor,opts);

test('direction catalog ok',()=>assert.equal(d.ok,true));
test('operativo catalog ok',()=>assert.equal(o.ok,true));
test('asesor catalog ok',()=>assert.equal(a.ok,true));
test('no writes direction',()=>assert.equal(d.writeAuthorized,false));
test('no deploy direction',()=>assert.equal(d.deployAuthorized,false));
test('physical group items',()=>assert.equal(d.physicalCollectionGroup,'items'));
test('system reads outside store',()=>assert.equal(d.systemReadsOutsideStore.length,2));
test('advisor platforms denied',()=>assert.ok(a.deniedCollections.some(x=>x.collection==='plataformasAseguradora')));
test('advisor bank required',()=>assert.ok(a.requiredCollections.some(x=>x.collection==='cuentasBancariasAseguradora')));
test('operativo bank required',()=>assert.ok(o.requiredCollections.some(x=>x.collection==='cuentasBancariasAseguradora')));
test('direction bank required',()=>assert.ok(d.requiredCollections.some(x=>x.collection==='cuentasBancariasAseguradora')));
test('bank not denied advisor',()=>assert.equal(a.deniedCollections.some(x=>x.collection==='cuentasBancariasAseguradora'),false));
test('bank not denied operativo',()=>assert.equal(o.deniedCollections.some(x=>x.collection==='cuentasBancariasAseguradora'),false));
test('operativo finance denied',()=>assert.ok(o.deniedCollections.some(x=>x.collection==='financiero_historico')));
test('direction finance required',()=>assert.ok(d.requiredCollections.some(x=>x.collection==='financiero_historico')));
test('advisor required no platforms',()=>assert.equal(a.requiredCollections.some(x=>x.collection==='plataformasAseguradora'),false));
test('advisor bank compile direct allowed',()=>assert.equal(api.compileCollection('cuentasBancariasAseguradora',asesor,opts).ok,true));
test('operativo bank compile direct allowed',()=>assert.equal(api.compileCollection('cuentasBancariasAseguradora',operativo,opts).ok,true));
test('advisor own constraint',()=>assert.ok(a.requiredCollections.find(x=>x.collection==='clientes').constraints.some(x=>x.field==='advisorId')));
test('operativo team constraint',()=>assert.ok(o.requiredCollections.find(x=>x.collection==='clientes').constraints.some(x=>x.field==='teamId')));
test('direction no scope field',()=>assert.equal(d.requiredCollections.find(x=>x.collection==='clientes').constraints.some(x=>['advisorId','teamId'].includes(x.field)),false));
test('all required have tenant',()=>assert.ok([...d.requiredCollections,...o.requiredCollections,...a.requiredCollections].every(x=>x.constraints.some(c=>c.field==='tenantId'))));
test('all required have country',()=>assert.ok([...d.requiredCollections,...o.requiredCollections,...a.requiredCollections].every(x=>x.constraints.some(c=>c.field==='country'))));
test('index signatures deduped direction',()=>assert.equal(new Set(d.indexCandidates.map(x=>x.signature)).size,d.indexCandidates.length));
test('index signatures deduped operativo',()=>assert.equal(new Set(o.indexCandidates.map(x=>x.signature)).size,o.indexCandidates.length));
test('index signatures deduped asesor',()=>assert.equal(new Set(a.indexCandidates.map(x=>x.signature)).size,a.indexCandidates.length));
test('direction single global signature',()=>assert.equal(d.indexCandidates.length,1));
test('operativo global plus team signatures',()=>assert.equal(o.indexCandidates.length,2));
test('asesor global plus own signatures',()=>assert.equal(a.indexCandidates.length,2));
test('hard guard banks operational',()=>assert.equal(a.hardGuards.bankAccountsOperationalForModuleUsers,true));
test('hard guard advisor platform restricted',()=>assert.equal(a.hardGuards.advisorPlatformCredentialsRestricted,true));
test('index candidate no deploy',()=>assert.ok(a.indexCandidates.every(x=>x.deployAuthorized===false)));
test('firestore json no deploy',()=>assert.equal(api.toFirestoreIndexes(a).deployAuthorized,false));
test('firestore collection group items',()=>assert.ok(api.toFirestoreIndexes(a).indexes.every(x=>x.collectionGroup==='items')));
test('firestore query scope collection',()=>assert.ok(api.toFirestoreIndexes(a).indexes.every(x=>x.queryScope==='COLLECTION')));
test('advisor compile direct platform blocked',()=>assert.equal(api.compileCollection('plataformasAseguradora',asesor,opts).ok,false));
test('unknown collection blocked',()=>assert.equal(api.compileCollection('inventada',asesor,opts).ok,false));
test('none scope required fails',()=>assert.equal(api.buildCatalog({...asesor,dataScopes:{default:'none',modules:{}}},opts).ok,false));
test('no execution functions',()=>assert.equal(Object.keys(api).some(k=>['attach','query','write','deploy','insert','update','remove'].includes(k)),false));

console.log(JSON.stringify({ok:true,tests:checks.length,version:api.VERSION,checks},null,2));
