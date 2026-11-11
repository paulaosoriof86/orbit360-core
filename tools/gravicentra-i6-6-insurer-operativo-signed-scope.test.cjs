'use strict';
// I6.6 regression for the real 2026-11-11 LIVE insurer SAVE failure. No Firebase,
// browser account, production records, or data mutation is used by this test.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('orbit360-platform/core/access-scope.js','utf8');
function actor({role='Operativo',countries=['GT','CO'],defaultScope='propios',moduleScope,
  roleScope='all',edit=true,view=true,restricted=false}={}){
  const advisor={id:'advisor-carlos-test',pais:'CO',paises:['CO'],dataScopes:{default:defaultScope,
    modules:moduleScope===undefined?{}:{aseguradoras:moduleScope}},
    modulesRestricted:restricted?['aseguradoras']:[]};
  const insurer={id:'gt-insurer-test',tenantId:'alianzas-soluciones',pais:'GT',nombre:'QA insurer without advisor'};
  const store={get:(c,id)=>c==='asesores'&&id===advisor.id?advisor:c==='aseguradoras'&&id===insurer.id?insurer:null,
    all:c=>c==='aseguradoras'?[insurer]:c==='asesores'?[advisor]:[]};
  const permissions={rolePermissions:{[role]:{aseguradoras:{editar:edit,ver:view}}},roleScopes:{[role]:roleScope}};
  const productUser={uid:'qa-user',tenantId:'alianzas-soluciones',productReadOnly:true,
    roles:role==='Operativo'?['Operativo','Asesor']:[role],activeRole:role,countries};
  const Orbit={store,session:{rol:()=>role,rolesAsignados:()=>productUser.roles,asesorId:()=>advisor.id,
      canSee:()=>true},auth:{productUser,user:()=>({uid:'qa-user',rol:role})},
    domainConfig:{peekReadOnly:()=>permissions,peek:()=>permissions},
    tenant:{get:()=>({tenantId:'alianzas-soluciones'}),isActive:()=>true},
    ROLES:{[role]:{modulos:['aseguradoras'],scopes:{aseguradoras:roleScope}}}};
  vm.runInNewContext(source,{Orbit,window:{Orbit},console});
  return {access:Orbit.access,insurer};
}
let passed=0;
function test(name,run){run();passed++;console.log('PASS '+name);}
test('real_signed_Carlos_Operativo_default_propios_insurer_without_advisor_can_save',()=>{
  const {access,insurer}=actor();
  assert.equal(insurer.asesorId,undefined);
  assert.equal(access.dataScope('aseguradoras'),'all');
  assert.equal(access.can('aseguradoras','edit'),true);
  assert.equal(access.canAccessRecord(insurer,'aseguradoras',{collection:'aseguradoras'}),true);
});
test('real_signed_member_country_denies_foreign_country',()=>{
  const {access,insurer}=actor({countries:['CO']});
  assert.equal(access.canAccessRecord(insurer,'aseguradoras',{collection:'aseguradoras'}),false);
});
test('explicit_none_denies_even_if_role_is_Operativo',()=>{
  const {access,insurer}=actor({moduleScope:'none'});
  assert.equal(access.dataScope('aseguradoras'),'none');
  assert.equal(access.canAccessRecord(insurer,'aseguradoras',{collection:'aseguradoras'}),false);
});
test('tenant_role_scope_team_does_not_expand',()=>{
  const {access,insurer}=actor({roleScope:'team'});
  assert.notEqual(access.dataScope('aseguradoras'),'all');
  assert.equal(access.canAccessRecord(insurer,'aseguradoras',{collection:'aseguradoras'}),false);
});
test('role_matrix_edit_denial_still_blocks_write',()=>{
  const {access,insurer}=actor({edit:false});
  assert.equal(access.canAccessRecord(insurer,'aseguradoras',{collection:'aseguradoras'}),true);
  assert.equal(access.can('aseguradoras','edit'),false);
});
test('module_visibility_denial_still_blocks_insurer',()=>{
  const {access,insurer}=actor({view:false});
  assert.equal(access.can('aseguradoras','edit'),false);
  assert.equal(access.canAccessRecord(insurer,'aseguradoras',{collection:'aseguradoras'}),false);
});
test('module_restriction_still_denies_insurer',()=>{
  const {access,insurer}=actor({restricted:true});
  assert.equal(access.canAccessRecord(insurer,'aseguradoras',{collection:'aseguradoras'}),false);
});
test('Asesor_does_not_inherit_full_insurer_directory',()=>{
  const {access,insurer}=actor({role:'Asesor',roleScope:'all'});
  assert.equal(access.dataScope('aseguradoras'),'own');
  assert.equal(access.canAccessRecord(insurer,'aseguradoras',{collection:'aseguradoras'}),false);
});
for(const role of ['Dirección','SuperAdmin','AdminTenant','Admin']){
  test(role+'_authorized_directory_role_with_own_profile',()=>{
    const {access,insurer}=actor({role});
    assert.equal(access.dataScope('aseguradoras'),'all');
    assert.equal(access.canAccessRecord(insurer,'aseguradoras',{collection:'aseguradoras'}),true);
  });
}
test('no_missing_or_unclassified_country_bypass',()=>{
  for(const country of ['', 'REQUIERE_VALIDACION', 'MX']){
    const {access,insurer}=actor();insurer.pais=country;
    assert.equal(access.canAccessRecord(insurer,'aseguradoras',{collection:'aseguradoras'}),false,country);
  }
});
console.log('I66_INSURER_SIGNED_ROLE_COUNTRY_SCOPE_'+passed+'_PASS_NO_LIVE_WRITES');
