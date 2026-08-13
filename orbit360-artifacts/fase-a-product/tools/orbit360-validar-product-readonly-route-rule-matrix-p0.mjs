import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const repoRoot = process.cwd().endsWith('orbit360-platform') ? process.cwd() : path.join(process.cwd(), 'orbit360-platform');
const files = [
  'core/tenant-canonical-paths-contract-p0.js',
  'core/tenant-access-policy-contract-p0.js',
  'core/aseguradoras-bank-account-visibility-policy-p0.js',
  'core/tenant-access-policy-effective-p0.js',
  'core/product-query-planner-contract-p0.js',
  'core/product-readonly-route-rule-matrix-p0.js'
];
const sandbox = { window: { Orbit: {} }, console };
vm.createContext(sandbox);
for (const file of files) {
  vm.runInContext(fs.readFileSync(path.join(repoRoot, file), 'utf8'), sandbox, { filename: file });
}

const api = sandbox.window.Orbit.productReadonlyRouteRuleMatrixP0;
const paths = sandbox.window.Orbit.tenantCanonicalPathsP0;
const accessPolicy = sandbox.window.Orbit.tenantAccessPolicyEffectiveP0;
const queryPlanner = sandbox.window.Orbit.productQueryPlannerP0;
const opts = { accessPolicy, queryPlanner, canonicalPaths: paths };

const direction = {uid:'uid-dir',tenantId:'tenant-test',roles:['Dirección','Asesor'],activeRole:'Dirección',status:'active',countries:['GT','CO'],modulesVisible:['*'],dataScopes:{default:'all',modules:{}},advisorId:'advisor-dir',teamId:'team-main'};
const operativo = {uid:'uid-op',tenantId:'tenant-test',roles:['Operativo','Asesor'],activeRole:'Operativo',status:'active',countries:['GT','CO'],modulesVisible:['inicio','cliente360','polizas','cobros','renovaciones','ops','leads','aseguradoras','calidad','importar','portal'],dataScopes:{default:'team',modules:{}},advisorId:'advisor-op',teamId:'team-main'};
const asesor = {uid:'uid-asesor',tenantId:'tenant-test',roles:['Asesor'],activeRole:'Asesor',status:'active',countries:['GT','CO'],modulesVisible:['inicio','cliente360','polizas','cobros','renovaciones','ops','leads','aseguradoras','calidad','portal'],dataScopes:{default:'own',modules:{}},advisorId:'advisor-1',teamId:'team-main'};
const noneAdvisor = {...asesor,dataScopes:{default:'none',modules:{}}};
const ownClient = {id:'cli-own',tenantId:'tenant-test',country:'GT',currency:'GTQ',advisorId:'advisor-1',teamId:'team-main'};
const teamClient = {id:'cli-team',tenantId:'tenant-test',country:'GT',currency:'GTQ',advisorId:'advisor-2',teamId:'team-main'};
const otherClient = {id:'cli-other',tenantId:'tenant-test',country:'GT',currency:'GTQ',advisorId:'advisor-2',teamId:'team-other'};
const bank = {id:'bank-1',tenantId:'tenant-test',country:'GT',currency:'GTQ'};
const platform = {id:'platform-1',tenantId:'tenant-test',country:'GT',currency:'GTQ'};

const checks = [];
function test(name, fn){ fn(); checks.push(name); }
function evalCase(input){ return api.evaluate(input, opts); }

test('api exists',()=>assert.equal(typeof api.evaluate,'function'));
test('parse config',()=>assert.equal(api.parseRoute('tenants/tenant-test/system/config').kind,'config'));
test('parse member',()=>assert.equal(api.parseRoute('tenants/tenant-test/members/uid-asesor').kind,'member'));
test('parse data collection',()=>assert.equal(api.parseRoute('tenants/tenant-test/data/clientes/items').kind,'dataCollection'));
test('parse data document',()=>assert.equal(api.parseRoute('tenants/tenant-test/data/clientes/items/cli-own').kind,'dataDocument'));
test('parse audit',()=>assert.equal(api.parseRoute('tenants/tenant-test/auditEvents/a1').kind,'auditEvent'));
test('parse credential',()=>assert.equal(api.parseRoute('tenants/tenant-test/credentialRefs/ref1').kind,'credentialRef'));
test('invalid route blocked',()=>assert.equal(evalCase({operation:'get',path:'unknown/path',membership:asesor}).allowed,false));
test('inactive membership blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/system/config',membership:{...asesor,status:'suspended'}}).allowed,false));
test('unassigned role blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/system/config',membership:{...asesor,activeRole:'Operativo'}}).allowed,false));
test('cross tenant blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/other-tenant/system/config',membership:asesor}).allowed,false));
test('tenant root blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test',membership:asesor}).allowed,false));

test('config get advisor allowed sanitized',()=>{
  const r=evalCase({operation:'get',path:'tenants/tenant-test/system/config',membership:asesor});
  assert.equal(r.allowed,true); assert.equal(r.requiresSanitizedConfig,true);
});
test('config list blocked',()=>assert.equal(evalCase({operation:'list',path:'tenants/tenant-test/system/config',membership:asesor}).allowed,false));
test('config update blocked',()=>assert.equal(evalCase({operation:'update',path:'tenants/tenant-test/system/config',membership:direction}).allowed,false));

test('membership self allowed',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/members/uid-asesor',membership:asesor}).allowed,true));
test('membership other advisor blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/members/uid-other',membership:asesor}).allowed,false));
test('membership other direction allowed',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/members/uid-other',membership:direction}).allowed,true));
test('membership list advisor blocked',()=>assert.equal(evalCase({operation:'list',path:'tenants/tenant-test/members',membership:asesor}).allowed,false));
test('membership list direction allowed',()=>assert.equal(evalCase({operation:'list',path:'tenants/tenant-test/members',membership:direction}).allowed,true));

const ownList = evalCase({operation:'list',path:'tenants/tenant-test/data/clientes/items',membership:asesor});
const teamList = evalCase({operation:'list',path:'tenants/tenant-test/data/clientes/items',membership:operativo});
const allList = evalCase({operation:'list',path:'tenants/tenant-test/data/clientes/items',membership:direction});
const noneList = evalCase({operation:'list',path:'tenants/tenant-test/data/clientes/items',membership:noneAdvisor});

test('own list allowed',()=>assert.equal(ownList.allowed,true));
test('own list tenant constraint',()=>assert.ok(ownList.requiredConstraints.some(x=>x.field==='tenantId')));
test('own list country constraint',()=>assert.ok(ownList.requiredConstraints.some(x=>x.field==='country')));
test('own list advisor constraint',()=>assert.ok(ownList.requiredConstraints.some(x=>x.field==='advisorId'&&x.value==='advisor-1')));
test('team list allowed',()=>assert.equal(teamList.allowed,true));
test('team list team constraint',()=>assert.ok(teamList.requiredConstraints.some(x=>x.field==='teamId'&&x.value==='team-main')));
test('all list allowed',()=>assert.equal(allList.allowed,true));
test('all list no owner constraint',()=>assert.equal(allList.requiredConstraints.some(x=>['advisorId','teamId'].includes(x.field)),false));
test('none list blocked',()=>assert.equal(noneList.allowed,false));
test('data collection get blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/clientes/items',membership:asesor}).allowed,false));

test('own document allowed advisor',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/clientes/items/cli-own',membership:asesor,record:ownClient}).allowed,true));
test('team document allowed operativo',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/clientes/items/cli-team',membership:operativo,record:teamClient}).allowed,true));
test('other document blocked advisor',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/clientes/items/cli-other',membership:asesor,record:otherClient}).allowed,false));
test('other team blocked operativo',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/clientes/items/cli-other',membership:operativo,record:otherClient}).allowed,false));
test('other document allowed direction',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/clientes/items/cli-other',membership:direction,record:otherClient}).allowed,true));
test('record tenant mismatch blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/clientes/items/cli-own',membership:asesor,record:{...ownClient,tenantId:'other-tenant'}}).allowed,false));
test('record id mismatch blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/clientes/items/cli-own',membership:asesor,record:{...ownClient,id:'wrong'}}).allowed,false));
test('record missing country blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/clientes/items/cli-own',membership:asesor,record:{...ownClient,country:''}}).allowed,false));
test('record wrong country blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/clientes/items/cli-own',membership:{...asesor,countries:['CO']},record:ownClient}).allowed,false));
test('data document list blocked',()=>assert.equal(evalCase({operation:'list',path:'tenants/tenant-test/data/clientes/items/cli-own',membership:asesor,record:ownClient}).allowed,false));

test('advisor bank document allowed',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/cuentasBancariasAseguradora/items/bank-1',membership:asesor,record:bank}).allowed,true));
test('operativo bank document allowed',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/cuentasBancariasAseguradora/items/bank-1',membership:operativo,record:bank}).allowed,true));
test('direction bank document allowed',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/cuentasBancariasAseguradora/items/bank-1',membership:direction,record:bank}).allowed,true));
test('advisor bank list allowed',()=>assert.equal(evalCase({operation:'list',path:'tenants/tenant-test/data/cuentasBancariasAseguradora/items',membership:asesor}).allowed,true));
test('advisor platform document blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/data/plataformasAseguradora/items/platform-1',membership:asesor,record:platform}).allowed,false));

test('audit advisor blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/auditEvents/a1',membership:asesor}).allowed,false));
test('audit direction allowed',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/auditEvents/a1',membership:direction}).allowed,true));
test('audit list direction allowed',()=>assert.equal(evalCase({operation:'list',path:'tenants/tenant-test/auditEvents',membership:direction}).allowed,true));
test('imports advisor blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/importBatches/b1',membership:asesor}).allowed,false));
test('imports direction allowed',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/importBatches/b1',membership:direction}).allowed,true));
test('credential direct advisor blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/credentialRefs/ref1',membership:asesor}).allowed,false));
test('credential direct direction blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/credentialRefs/ref1',membership:direction}).allowed,false));
test('credential provider required',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/credentialRefs/ref1',membership:direction}).providerRequired,true));

test('academy self allowed',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/academyProgress/uid-asesor',membership:asesor}).allowed,true));
test('academy other advisor blocked',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/academyProgress/uid-other',membership:asesor}).allowed,false));
test('academy other direction allowed',()=>assert.equal(evalCase({operation:'get',path:'tenants/tenant-test/academyProgress/uid-other',membership:direction}).allowed,true));
test('academy list advisor blocked',()=>assert.equal(evalCase({operation:'list',path:'tenants/tenant-test/academyProgress',membership:asesor}).allowed,false));
test('academy list direction allowed',()=>assert.equal(evalCase({operation:'list',path:'tenants/tenant-test/academyProgress',membership:direction}).allowed,true));

for (const operation of ['create','update','delete']) {
  test(`${operation} data blocked`,()=>assert.equal(evalCase({operation,path:'tenants/tenant-test/data/clientes/items/cli-own',membership:direction,record:ownClient}).allowed,false));
  test(`${operation} audit blocked`,()=>assert.equal(evalCase({operation,path:'tenants/tenant-test/auditEvents/a1',membership:direction}).allowed,false));
}

test('evaluateMany no writes',()=>{
  const result=api.evaluateMany([
    {id:'config',operation:'get',path:'tenants/tenant-test/system/config',membership:asesor},
    {id:'write',operation:'update',path:'tenants/tenant-test/system/config',membership:direction}
  ],opts);
  assert.equal(result.writeAuthorized,false); assert.equal(result.deployAuthorized,false); assert.equal(result.results.length,2);
});
test('no execution functions',()=>assert.equal(Object.keys(api).some(k=>['attach','query','write','deploy','insert','update','remove'].includes(k)),false));

console.log(JSON.stringify({ok:true,tests:checks.length,version:api.VERSION,checks},null,2));
