'use strict';
// No Firebase, secrets, real insurer reads or writes. A backend_required
// placeholder must never masquerade as a server-issued vault reference.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const coreSource=fs.readFileSync('orbit360-platform/core/aseguradoras-sensitive-p02.js','utf8');
const moduleSource=fs.readFileSync('orbit360-platform/modules/aseguradoras.js','utf8');
const sensitiveModuleSource=fs.readFileSync('orbit360-platform/modules/aseguradoras-p02-sensitive.js','utf8');
const Orbit={},window={Orbit};
vm.runInNewContext(coreSource,{Orbit,window,console});
const api=Orbit.aseguradorasSensitiveP02;
const direction={id:'signed-direction-qa',activeRole:'Dirección',assignedRoles:['Dirección']};
const operative={id:'signed-operative-qa',activeRole:'Operativo',assignedRoles:['Operativo','Asesor']};
const adviser={id:'signed-adviser-qa',activeRole:'Asesor',assignedRoles:['Asesor']};
const validRef='cred_'+'a'.repeat(32);
let n=0;
function check(name,run){run();n++;console.log('PASS '+name);}

for(const oldRef of ['',null,'backend_required','credential_migrated','cred_abc','cred_'+'g'.repeat(32)]){
  check('missing_or_legacy_ref_not_a_saved_secret_'+String(oldRef),()=>{
    const portal=api.normalizePortal({id:'p1',nombre:'Portal QA',usuario:'qa-user',credentialRef:oldRef});
    assert.equal(portal.credentialRef,'');
    assert.equal(portal.estadoCredencial,'sin_credencial');
    for(const actor of [direction,operative]){
      const view=api.credentialView(portal,actor);
      assert.equal(view.allowed,true);
      assert.equal(view.canReveal,false);
      assert.equal(view.canCopyPassword,false);
      assert.equal(view.canCopyUser,true);
    }
  });
}
check('valid_server_vault_ref_remains_available_to_direction',()=>{
  const p=api.normalizePortal({id:'p2',credentialRef:validRef,estadoCredencial:'registrada'});
  assert.equal(p.credentialRef,validRef);
  const view=api.credentialView(p,direction);
  assert.equal(view.canReveal,true);
  assert.equal(view.canCopyPassword,true);
});
check('valid_server_vault_ref_operativo_read_but_asesor_denied',()=>{
  const p={credentialRef:validRef};
  assert.equal(api.credentialView(p,operative).canReveal,true);
  assert.equal(api.credentialView(p,adviser).canReveal,false);
});
check('bank_account_number_remains_editable_for_approved_insurer_roles',()=>{
  for(const role of ['Dirección','SuperAdmin','Admin','AdminTenant','Operativo']){
    const actor={id:'signed-'+role.toLowerCase(),activeRole:role,roles:[role]};
    assert.equal(api.canEditSensitive(actor),true,'Expected bank edit for '+role);
    assert.equal(api.canViewSensitive(actor),true,'Expected bank read for '+role);
  }
  assert.equal(api.canEditSensitive({id:'advisor',activeRole:'Asesor',roles:['Asesor']}),false);
  assert.match(sensitiveModuleSource,/if \(editing && A\.canEditSensitive\(actor\(\)\)\) \{\s*input\.value = raw;/);
});
check('legacy_placeholder_is_not_injected_into_edited_portal_or_new_portal',()=>{
  assert.ok(!/credentialRef:\s*prior\.credentialRef\s*\|\|\s*['"]backend_required['"]/.test(moduleSource));
  assert.ok(!/credentialRef:\s*['"]backend_required['"]/.test(moduleSource));
  assert.match(moduleSource,/Object\.assign\(\{\}, prior, \{ id: prior\.id/);
});
check('credential_import_mapping_requires_server_reference',()=>{
  assert.match(moduleSource,/credentialRef:\s*clean\(mapping\.credentialRef\)/);
  assert.ok(!/st\.draft\.portales\[index\]\.credentialRef\s*\|\|\s*['"]backend_required['"]/.test(moduleSource));
});
console.log('I66_INSURER_CREDENTIAL_REFERENCE_INTEGRITY_'+n+'_PASS_NO_LIVE_WRITES');
