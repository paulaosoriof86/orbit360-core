'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const backend=fs.readFileSync('functions/product-ops-leads-domain.js','utf8');
const frontend=fs.readFileSync('orbit360-platform/core/ciclo.js','utf8');
const from=backend.indexOf('function canonicalizeCreationAudit(');
const to=backend.indexOf('function sanitizeManagement(',from);
assert.ok(from>0&&to>from,'CREATION_AUDIT_SERVER_OWNER_MISSING');
const scope={
  humanActorName(value){const v=String(value||'').trim();return v&&!v.includes('@')&&!/^(operativo|asesor|direccion)$/i.test(v)?v:'';},
  text(v,n){return String(v==null?'':v).trim().slice(0,n||1000);},
  norm(v){return String(v||'').trim().toLowerCase();},
  Date
};
vm.runInNewContext(backend.slice(from,to)+'\nthis.canonicalizeCreationAudit=canonicalizeCreationAudit;',scope,{timeout:1000});
const fake={origen:'Leads',bitacora:[{user:'Persona suplantada',actorUid:'forged',actorName:'Persona suplantada',campo:'Creación',a:'Alteración'}]};
const result=scope.canonicalizeCreationAudit(fake,{uid:'uid-auth-real',name:'Carlos Castro'});
assert.equal(result.bitacora.length,1);
assert.equal(result.bitacora[0].user,'Carlos Castro');
assert.equal(result.bitacora[0].actorUid,'uid-auth-real');
assert.equal(result.bitacora[0].actorName,'Carlos Castro');
assert.equal(result.bitacora[0].a,'Ingreso (Leads)');
assert.ok(!Number.isNaN(Date.parse(result.bitacora[0].ts)));
const ops=scope.canonicalizeCreationAudit({origen:'Ops',bitacora:[{user:'Otro'}]},{uid:'uid-ops',name:'operativo'});
assert.equal(ops.bitacora[0].user,'Usuario del equipo');
assert.equal(ops.bitacora[0].a,'Ingreso (Ops)');
assert.match(frontend,/const creator=currentUserIdentity\(\)/);
assert.match(frontend,/user:creator\.name,actorUid:creator\.uid,actorName:creator\.name,campo:'Creación'/);
assert.doesNotMatch(frontend,/user:\(Orbit\.session\?Orbit\.session\.rol\(\)/);
console.log('B4_003_CREATION_HUMAN_ACTOR_QA_PASS synthetic_only_no_firestore_writes');
