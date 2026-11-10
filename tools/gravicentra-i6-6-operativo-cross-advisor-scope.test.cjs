'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const backend=fs.readFileSync('functions/product-operational-domain.js','utf8');
const frontend=fs.readFileSync('orbit360-platform/core/access-scope.js','utf8');
const facade=fs.readFileSync('orbit360-platform/data/store-firestore-product-operational-p0.js','utf8');

function scopeDomain(){
  const fakeApp={options:{projectId:'synthetic_qa'}};
  const mocks={
    'node:crypto':crypto,
    'firebase-admin/app':{getApps:()=>[fakeApp],initializeApp:()=>fakeApp},
    'firebase-admin/firestore':{getFirestore:()=>({}),FieldValue:{serverTimestamp:()=>new Date(0)}},
    'firebase-admin/storage':{getStorage:()=>({})},
    'firebase-functions/v2/https':{HttpsError:class HttpsError extends Error{constructor(code,message){super(message||code);this.code=code;}},onCall:()=>()=>{}},
    './product-active-role-contract':{resolveProductActiveRole:()=>({activeRole:'Operativo'})},
    './goal-participation-contract':{validarCambioParticipacion:()=>null},
    './b4-003-scoped-bootstrap-reader':{projectInsurerActivity:()=>[]}
  };
  const sandbox={require:name=>{if(!mocks[name])throw Error('Unexpected dependency '+name);return mocks[name];},
    process:{env:{}},exports:{},console,Buffer,Date,Set,Map,JSON,Object,Array,String,Number,RegExp,Boolean};
  vm.runInNewContext(backend+'\nthis.scopeTest={effectiveScope,withinScope,roleScope,countryAllowed,normalizeMutation};',sandbox,{filename:'functions/product-operational-domain.js'});
  return sandbox.scopeTest;
}

function actor(role, countries=['CO'],defaultScope='propios',roleScope='todos'){
  return {uid:'carlos_uid',activeRole:role,member:{tenantId:'tenant_co',countries,advisorId:'advisor_carlos',
      dataScopes:{default:defaultScope},modulesRestricted:[]},
    accessConfig:{roleScopes:{[role]:roleScope}},teamAdvisorIds:new Set(['advisor_carlos'])};
}

test('Operativo CO explicitly granted all may edit other advisor policy and linked activity/cobro',()=>{
  const d=scopeDomain(),a=actor('Operativo'),row={id:'pol_existing',pais:'CO',asesorId:'advisor_otro'};
  assert.equal(d.effectiveScope(a.member,a.accessConfig,a.activeRole,'polizas'),'all');
  for(const [collection,moduleKey] of [['polizas','polizas'],['actividades','cliente360'],['recibosEsperados','cobros']])
    assert.equal(d.withinScope(a,collection,moduleKey,row),true,`${collection} should be cross-advisor`);
});
test('Same Operativo CO cannot edit GT, unknown country or zero-country records',()=>{
  const d=scopeDomain(),a=actor('Operativo');
  for(const pais of ['GT','', 'pendiente'])
    assert.equal(d.withinScope(a,'polizas','polizas',{pais,asesorId:'advisor_otro'}),false);
  assert.equal(d.withinScope(actor('Operativo',[]),'polizas','polizas',{pais:'CO',asesorId:'advisor_otro'}),false);
});
test('Symmetric Operativo GT can edit another GT advisor but not CO',()=>{
  const d=scopeDomain(),a=actor('Operativo',['GT']);
  assert.equal(d.withinScope(a,'polizas','polizas',{pais:'GT',asesorId:'advisor_gt_otro'}),true);
  assert.equal(d.withinScope(a,'polizas','polizas',{pais:'CO',asesorId:'advisor_co_otro'}),false);
});
test('Asesor remains own-only even if tenant configuration accidentally says all',()=>{
  const d=scopeDomain(),a=actor('Asesor',['CO'],'propios','todos');
  assert.equal(d.withinScope(a,'polizas','polizas',{pais:'CO',asesorId:'advisor_otro'}),false);
  assert.equal(d.withinScope(a,'polizas','polizas',{pais:'CO',asesorId:'advisor_carlos'}),true);
});
test('Operativo explicit module/data none or restricted tenant role scope stays fail-closed',()=>{
  const d=scopeDomain();
  assert.equal(d.withinScope(actor('Operativo',['CO'],'ninguno'),'polizas','polizas',{pais:'CO',asesorId:'advisor_otro'}),false);
  assert.equal(d.withinScope(actor('Operativo',['CO'],'propios','propios'),'polizas','polizas',{pais:'CO',asesorId:'advisor_otro'}),false);
});
test('Tenant and country signed boundary remains server-owned and client wide role explicit',()=>{
  assert.match(backend,/memberRef\(tenantId,request\.auth\.uid\)/);
  assert.match(backend,/text\(member\.tenantId,160\)!==tenantId/);
  assert.match(backend,/countryAllowed\(actor\.member,row\)/);
  assert.match(backend,/explicitRoleScope==='all'&&requested!=='none'/);
  assert.match(frontend,/roleWidePortfolioScope\(moduleKey\)/);
  assert.match(frontend,/normalizeScope\(scopes\[role\]\) === 'all'/);
});
test('CAS expected-before valid only for exact one-field policy renewability',()=>{
  const d=scopeDomain(),m=d.normalizeMutation({action:'update',collection:'polizas',id:'pol_001',
    payload:{renovable:false},expectedBefore:{renovable:true}});
  assert.equal(m.payload.renovable,false);
  assert.equal(m.expectedBefore.renovable,true);
  const invalid=[
    {action:'update',collection:'polizas',id:'pol_001',payload:{renovable:false,primaTotal:0},expectedBefore:{renovable:true}},
    {action:'update',collection:'clientes',id:'cli_001',payload:{renovable:false},expectedBefore:{renovable:true}},
    {action:'insert',collection:'polizas',id:'pol_001',payload:{renovable:false},expectedBefore:{renovable:true}},
    {action:'update',collection:'polizas',id:'pol_001',payload:{renovable:false},expectedBefore:{primaTotal:123}}
  ];
  for(const input of invalid)assert.throws(()=>d.normalizeMutation(input),/Precondición de renovabilidad inválida/);
  assert.match(backend,/La renovabilidad cambió desde la lectura anterior/);
  assert.match(facade,/mutation\.expectedBefore=\{renovable:/);
});
