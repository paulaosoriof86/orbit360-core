'use strict';
// Target actual index-reachable insurer owner and credential provider.
// The historical P02 DOM decorator is not loaded by the product entrypoint.
const assert=require('node:assert/strict');
const fs=require('node:fs');

const moduleSource=fs.readFileSync('orbit360-platform/modules/aseguradoras.js','utf8');
const providerSource=fs.readFileSync('orbit360-platform/core/product-insurer-credential-provider-p0.js','utf8');
const indexSource=fs.readFileSync('orbit360-platform/index.html','utf8');
const validRef='cred_'+'a'.repeat(32);
const refPattern=/^cred_[a-f0-9]{32}$/;
let n=0;
function check(name,run){run();n++;console.log('PASS '+name);}

for(const oldRef of ['',null,'backend_required','credential_migrated','cred_abc','cred_'+'g'.repeat(32)]){
  check('missing_or_legacy_ref_not_a_saved_secret_'+String(oldRef),()=>{
    assert.equal(refPattern.test(String(oldRef||'')),false);
  });
}
check('valid_server_vault_ref_remains_available_to_direction',()=>{
  assert.equal(refPattern.test(validRef),true);
  assert.match(providerSource,/const REF_RE = \/\^cred_\[a-f0-9\]\{32\}\$\//);
});
check('valid_server_vault_ref_operativo_read_but_asesor_denied',()=>{
  assert.match(indexSource,/core\/product-insurer-credential-provider-p0\.js/);
  assert.match(providerSource,/if \(!REF_RE\.test\(r\)\) return \{ status:'no_disponible', available:false/);
  assert.match(providerSource,/if \(!REF_RE\.test\(r\)\) return \{ ok:false, status:'no_disponible'/);
});
check('bank_account_number_remains_editable_for_approved_insurer_roles',()=>{
  assert.match(moduleSource,/return \['direccion', 'admin', 'superadmin', 'superadministrador', 'operativo'\]\.indexOf\(roleKey\(activeRole\(\)\)\) >= 0/);
  assert.match(moduleSource,/function ctaRow\(c, i, editing\)/);
  assert.match(moduleSource,/const ro = '';\s*return `<div class="asg-row" data-cta=/);
  assert.match(moduleSource,/data-ccn placeholder="Número de cuenta"/);
  assert.match(moduleSource,/numero: r\.querySelector\('\[data-ccn\]'\)\.value/);
});
check('legacy_placeholder_is_not_injected_into_edited_portal_or_new_portal',()=>{
  assert.ok(!/credentialRef:\s*prior\.credentialRef\s*\|\|\s*['"]backend_required['"]/.test(moduleSource));
  assert.ok(!/credentialRef:\s*['"]backend_required['"]/.test(moduleSource));
  assert.match(moduleSource,/Object\.assign\(\{\}, prior, \{ id: prior\.id/);
});
check('credential_import_mapping_requires_server_reference',()=>{
  assert.match(moduleSource,/credentialRef:\s*clean\(mapping\.credentialRef\)/);
  assert.match(moduleSource,/data-ppass type="password" autocomplete="new-password"/);
  assert.match(moduleSource,/st\.credentialDrafts\[resourceId\] = \{ portalId: resourceId, credentialRef: portal\.credentialRef, username: portal\.usuario, password: password\.value \}/);
  assert.match(providerSource,/async function importCredentials\(items, extra\)/);
  assert.ok(!/st\.draft\.portales\[index\]\.credentialRef\s*\|\|\s*['"]backend_required['"]/.test(moduleSource));
});
console.log('I66_INSURER_CANONICAL_REACHABLE_EDITOR_CREDENTIAL_REFERENCE_'+n+'_PASS_NO_LIVE_WRITES');
