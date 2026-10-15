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
function roleCtx(role,scope){
 const ctx=resolve({...roleBase,activeRole:role});
 assert.equal(ctx.scope,scope,role+'_APPROVED_SCOPE');
 return ctx;
}
const finance=roleCtx('Finanzas','all');
assert.equal(allowRow(finance,{tenantId:'t',pais:'GT',asesorId:'a3'}),true);
const marketing=roleCtx('Marketing','team');
assert.equal(allowRow(marketing,{tenantId:'t',pais:'GT',asesorId:'a2'}),true);
assert.throws(()=>allowRow(marketing,{tenantId:'t',pais:'GT',asesorId:'a3'}),
 e=>e.code==='FOREIGN_RECORD_DENIED');
const assistant=roleCtx('Asistente','own');
assert.equal(allowRow(assistant,{tenantId:'t',pais:'GT',asesorId:'a1'}),true);
assert.throws(()=>allowRow(assistant,{tenantId:'t',pais:'GT',asesorId:'a2'}),
 e=>e.code==='FOREIGN_RECORD_DENIED');
for(const role of ['Asesor Sr.','Asesora Sr.','Asesor Jr.','Asesora Jr.']){
 const x={...roleBase,activeRole:role,member:{...roleBase.member,roles:[role]}};
 assert.equal(resolve(x).scope,'own',role+'_OWN_CEILING');
}
assert.throws(()=>resolve({...roleBase,activeRole:'Finanzas',collection:'aseguradoras'}),
 e=>e.code==='DIRECTORY_DENIED','FINANCE_MUST_NOT_INHERIT_INSURER_DIRECTORY_FULL');
assert.throws(()=>resolve({...roleBase,activeRole:'Marketing',country:'MX'}),
 e=>e.code==='COUNTRY_DENIED');
assert.throws(()=>resolve({...roleBase,activeRole:'Asistente',config:{roleScopes:{Asistente:'none'}}}),
 e=>e.code==='SCOPE_NONE');
assert.throws(()=>resolve({...roleBase,activeRole:'Finanzas',member:{...roleBase.member,status:'invited'}}),
 e=>e.code==='MEMBERSHIP_DENIED');
assert.throws(()=>resolve({...roleBase,activeRole:'Finanzas',
 config:{roleScopes:{Finanzas:'all'},rolePermissions:{Finanzas:{polizas:{ver:false}}}}}),
 e=>e.code==='MODULE_DENIED');
console.log('B4_003_APPROVED_ROLE_SCOPE_PARITY_PASS Finance Marketing Assistant and advisor tiers; negative country role module insurer denied');
