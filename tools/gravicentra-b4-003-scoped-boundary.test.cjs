'use strict';
const assert = require('node:assert/strict');
const {resolve, allowRow} = require('../functions/b4-003-scoped-access-boundary');
const c={auth:{uid:'u',token:{giActiveRole:'asesor'}},tenantId:'t',activeRole:'asesor',collection:'polizas',country:'GT',member:{uid:'u',tenantId:'t',status:'active',roles:['asesor','operativo'],advisorId:'a1',countries:['GT'],dataScopes:{default:'own'}},config:{roleScopes:{asesor:'own'}}};
const ctx=resolve(c);
assert.equal(ctx.scope,'own');
assert.equal(allowRow(ctx,{pais:'GT',asesorId:'a1'}),true);
assert.throws(()=>allowRow(ctx,{pais:'GT',asesorId:'a2'}));
assert.throws(()=>resolve({...c,activeRole:'operativo'}),e=>e.code==='SIGNED_ACTIVE_ROLE_MISMATCH');
const unsigned=resolve({...c,auth:{uid:'u',token:{}}});
assert.equal(unsigned.scope,'own');
assert.throws(()=>resolve({...c,auth:{uid:'u',token:{}},member:{...c.member,roles:['operativo']}}),e=>e.code==='ROLE_DENIED');
assert.throws(()=>resolve({...c,config:{roleScopes:{asesor:'none'}}}));
const teamCase={...c,activeRole:'operativo',auth:{uid:'u',token:{}},member:{...c.member,roles:['asesor','operativo'],dataScopes:{default:'team'},roleVisibleAdvisorIds:{operativo:['a1']},teamAdvisorIds:['a2','a3']},config:{roleScopes:{asesor:'own',operativo:'team'}}};
const teamCtx=resolve(teamCase);
assert.equal(teamCtx.scope,'team');
assert.equal(allowRow(teamCtx,{pais:'GT',asesorId:'a1'}),true);
assert.throws(()=>allowRow(teamCtx,{pais:'GT',asesorId:'a2'}),e=>e.code==='FOREIGN_RECORD_DENIED');
assert.throws(()=>allowRow(teamCtx,{pais:'GT',asesorId:'a3'}),e=>e.code==='FOREIGN_RECORD_DENIED');
assert.throws(()=>resolve({...teamCase,member:{...teamCase.member,roleVisibleAdvisorIds:{operativo:'a2'}}}),e=>e.code==='ROLE_TEAM_CONFIG_INVALID');

const membershipStatusCases=[
 {name:'missing_status',patch:{status:undefined,estado:undefined},allow:false},
 {name:'suspended',patch:{status:'suspended'},allow:false},
 {name:'paused',patch:{status:'paused'},allow:false},
 {name:'invited',patch:{status:'invited'},allow:false},
 {name:'inactive',patch:{status:'inactive'},allow:false},
 {name:'conflicting_alias',patch:{status:'active',estado:'suspended'},allow:false},
 {name:'active_status',patch:{status:'active',estado:undefined},allow:true},
 {name:'active_spanish_alias',patch:{status:undefined,estado:'activo'},allow:true}
];
let membershipChecks=0;
for(const testCase of membershipStatusCases){
 const candidate={...c,member:{...c.member,...testCase.patch}};
 if(testCase.allow)assert.equal(resolve(candidate).scope,'own',testCase.name);
 else assert.throws(()=>resolve(candidate),error=>error&&error.code==='MEMBERSHIP_DENIED',testCase.name);
 membershipChecks++;
}
assert.throws(()=>resolve({...c,member:{...c.member,status:'active',active:false}}),
 error=>error&&error.code==='MEMBERSHIP_DENIED');
membershipChecks++;
console.log('B4_003_MEMBERSHIP_ACTIVE_ONLY_SCOPE_PASS checks='+membershipChecks+' staged_source_only_no_deploy');

const teamDirectoryBase={...c,collection:'asesores',
 auth:{uid:'u',token:{}},activeRole:'Admin',
 member:{...c.member,roles:['Asesor','Operativo','Admin'],
   status:'active',dataScopes:{default:'all'},modulesVisible:['equipo']},
 config:{roleScopes:{admin:'none'},rolePermissions:{admin:{equipo:{ver:true}}}}};
const directory=resolve(teamDirectoryBase);
assert.equal(directory.scope,'all');
assert.equal(allowRow(directory,{tenantId:'t',pais:'GT',id:'a2'}),true);
assert.throws(()=>resolve({...teamDirectoryBase,activeRole:'Operativo'}),
 error=>error&&error.code==='TEAM_DIRECTORY_DENIED');
assert.throws(()=>resolve({...teamDirectoryBase,activeRole:'Asesor'}),
 error=>error&&error.code==='TEAM_DIRECTORY_DENIED');
assert.throws(()=>resolve({...teamDirectoryBase,member:{...teamDirectoryBase.member,modulesVisible:[]}}),
 error=>error&&error.code==='MODULE_DENIED');
assert.throws(()=>resolve({...teamDirectoryBase,config:{rolePermissions:{admin:{equipo:{ver:false}}}}}),
 error=>error&&error.code==='MODULE_DENIED');
console.log('B4_003_TEAM_DIRECTORY_EFFECTIVE_POLICY_ALIGNMENT_PASS checks=6');
console.log('B4_003_PER_ROLE_TEAM_OVERRIDE_DENIES_GLOBAL_TEAM_PASS');
console.log('STAGED_B4_003_CONTRACT_UNIT_PASS');


// Restore every explicitly approved role ceiling without allowing scope escalation.
// These tests use only synthetic memberships and no tenant data or real users.
const roleBase={...c,auth:{uid:'u',token:{}},member:{
 ...c.member,roles:['Finanzas','Marketing','Asistente','Asesor','Operativo','Dirección'],
 dataScopes:{default:'all'},advisorId:'a1',teamAdvisorIds:['a2'],countries:['GT','CO']},
 config:{roleScopes:{Finanzas:'all',Marketing:'team',Asistente:'own',Asesor:'own',Operativo:'all',Dirección:'all'}}};
function roleCtx(role,scope,collection){
 const ctx=resolve({...roleBase,activeRole:role,collection});
 assert.equal(ctx.scope,scope,role+'_APPROVED_SCOPE');
 return ctx;
}
const finance=roleCtx('Finanzas','all','cobros');
// Role scope parity is tested on a module the role ACTUALLY owns, not Pólizas.
assert.throws(()=>resolve({...roleBase,activeRole:'Finanzas',collection:'polizas'}),e=>e.code==='MODULE_DENIED','FINANCE_POLIZAS_NOT_IN_ROLE');
assert.throws(()=>resolve({...roleBase,activeRole:'Marketing',collection:'polizas'}),e=>e.code==='MODULE_DENIED','MARKETING_POLIZAS_NOT_IN_ROLE');
assert.throws(()=>resolve({...roleBase,activeRole:'Asistente',collection:'polizas'}),e=>e.code==='MODULE_DENIED','ASSISTANT_POLIZAS_NOT_IN_ROLE');
assert.equal(allowRow(finance,{tenantId:'t',pais:'GT',asesorId:'a3'}),true);
const marketing=roleCtx('Marketing','team','negocios');
assert.equal(allowRow(marketing,{tenantId:'t',pais:'GT',asesorId:'a2'}),true);
assert.throws(()=>allowRow(marketing,{tenantId:'t',pais:'GT',asesorId:'a3'}),
 e=>e.code==='FOREIGN_RECORD_DENIED');
const assistant=roleCtx('Asistente','own','clientes');
assert.equal(allowRow(assistant,{tenantId:'t',pais:'GT',asesorId:'a1'}),true);
assert.throws(()=>allowRow(assistant,{tenantId:'t',pais:'GT',asesorId:'a2'}),
 e=>e.code==='FOREIGN_RECORD_DENIED');
for(const role of ['Asesor Sr.','Asesora Sr.','Asesor Jr.','Asesora Jr.']){
 const x={...roleBase,collection:'clientes',activeRole:role,member:{...roleBase.member,roles:[role]}};
 assert.equal(resolve(x).scope,'own',role+'_OWN_CEILING');
}
assert.throws(()=>resolve({...roleBase,activeRole:'Finanzas',collection:'aseguradoras'}),
 e=>e.code==='DIRECTORY_DENIED','FINANCE_MUST_NOT_INHERIT_INSURER_DIRECTORY_FULL');
assert.throws(()=>resolve({...roleBase,activeRole:'Marketing',collection:'negocios',country:'MX'}),
 e=>e.code==='COUNTRY_DENIED');
assert.throws(()=>resolve({...roleBase,activeRole:'Asistente',collection:'clientes',config:{roleScopes:{Asistente:'none'}}}),
 e=>e.code==='SCOPE_NONE');
assert.throws(()=>resolve({...roleBase,activeRole:'Finanzas',member:{...roleBase.member,status:'invited'}}),
 e=>e.code==='MEMBERSHIP_DENIED');
assert.throws(()=>resolve({...roleBase,activeRole:'Finanzas',collection:'cobros',
 config:{roleScopes:{Finanzas:'all'},rolePermissions:{Finanzas:{cobros:{ver:false}}}}}),
 e=>e.code==='MODULE_DENIED');
console.log('B4_003_APPROVED_ROLE_SCOPE_PARITY_PASS Finance Marketing Assistant and advisor tiers; negative country role module insurer denied');

// Exercise the existing writer regression as well as the protected read boundary.
// This test only reads repository files and runs the committed in-memory harness.
// The vulnerable baseline remains an explicit release HOLD, never a product PASS.
{
 const fs=require('node:fs'),child=require('node:child_process'),crypto=require('node:crypto');
 const root='artifacts/orbit360-recovery/release-control/';
 const proof=JSON.parse(fs.readFileSync(root+'I6_5_B4_003_C03_04_LOCAL_PROOF_20261016.json','utf8'));
 const control=JSON.parse(fs.readFileSync(root+'CONTROL_PLANE.json','utf8'));
 const owner=fs.readFileSync(proof.owner);
 const blob=crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+owner.length+'\0'),owner])).digest('hex');
 const harness='tools/gravicentra-b4-003-before-image-regression.test.cjs';
 const qa=fs.readFileSync(harness);
 assert.equal(crypto.createHash('sha256').update(qa).digest('hex'),proof.qaSha256,'Recorded writer regression must not drift silently');
 const run=child.spawnSync(process.execPath,[harness,'functions'],{encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
 if(run.error)throw run.error;
 assert.equal(run.signal,null,'Writer regression was interrupted');
 const result=JSON.parse(run.stdout);
 assert.equal(result.sourceBlob,blob);
 assert.equal(result.syntheticOnly,true);
 assert.equal(result.externalRequests,0);
 assert.equal(result.releaseAccepted,false);
 assert.equal(result.total,12);
 if(blob===proof.baseBlob){
  assert.equal(run.status,1);
  assert.equal(result.passed,8);
  assert.equal(result.failed,4);
  assert.deepEqual(result.tests.filter(t=>!t.pass).map(t=>t.id).sort(),[...proof.reproducedFailureIds].sort());
  assert.equal(control.b4003SecurityReleaseHold.livePromotionAuthorized,false);
  assert.equal(control.b4003SecurityReleaseHold.firestoreRulesDeployAuthorized,false);
  assert.equal(control.i6Execution.livePromotionAuthorized,false);
  console.log('C03_04_WRITER_PRODUCT_STATUS=DEFECT_REPRODUCED_INTEGRATION_PENDING');
  console.log('C03_04_BASELINE_CONTROLS=8/12; KNOWN_FAILURES=4; PRODUCT_PASS=false');
 }else{
  const binding=control.b4003C0304BeforeImageSourceIntegration;
  assert.ok(binding,'Changed writer source requires a current Control Plane binding');
  assert.equal(binding.owner,proof.owner);
  // The Oct-16 C03 source binding remains historic. A later, narrowly scoped
  // fail-closed country successor may bind a newer physical writer without
  // rewriting its earlier evidence or claiming a production security PASS.
  if(binding.candidateBlob!==blob){
   const successor=control.b4003WriterCountryFailClosedSuccessor20261023;
   assert.ok(successor,'New writer bytes require an explicit successor');
   assert.equal(successor.sourceBlobSha,blob);
   assert.equal(successor.status,'SOURCE_STAGED_SYNTHETIC_QA_PASS_SECURITY_HOLD');
   assert.equal(successor.operationalWriterDeploymentAuthorized,false);
   assert.equal(successor.livePromotionAuthorized,false);
  }else assert.equal(binding.candidateBlob,blob);
  assert.equal(binding.sourceChangeAuthorized,true);
  assert.equal(run.status,0);
  assert.equal(result.passed,12);
  assert.equal(result.failed,0);
  console.log('C03_04_WRITER_REGRESSION=12/12; PREVIEW_AND_LIVE_ACCEPTANCE_NOT_PROVEN_BY_UNIT_TEST');
 }
}
