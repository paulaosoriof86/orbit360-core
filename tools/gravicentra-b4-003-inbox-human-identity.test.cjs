'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const index=fs.readFileSync('orbit360-platform/index.html','utf8');
const ciclo=fs.readFileSync('orbit360-platform/core/ciclo.js','utf8');
const start=index.indexOf('function inboxHumanIdentity(');
const end=index.indexOf('      function open(){',start);
assert.ok(start>=0&&end>start,'INBOX_HUMAN_IDENTITY_OWNER_NOT_FOUND');
const source=index.slice(start,end).trim();
assert.match(index,/var actor=inboxHumanIdentity\(n\.actorName,n\.actorUid\)/,'INBOX_AUTHOR_MUST_USE_SHARED_RESOLVER');
assert.match(index,/inboxHumanIdentity\(n\.resolvedByName,n\.resolvedByUid\)/,'INBOX_RESOLVER_MUST_USE_SHARED_RESOLVER');
function makeResolver(productUser={},records={}){
  const Orbit={auth:{productUser},store:{get:(coll,uid)=>records[coll+'|'+uid]||null}};
  return vm.runInNewContext('('+source+')',{Orbit},{timeout:1000});
}
const resolved=makeResolver({uid:'carlos-real',nombre:'Carlos Castro'},{
  'usuarios|paula-real':{nombre:'Paula Osorio'},
  'members|samuel-real':{displayName:'Samuel Daza'},
  'asesores|asesor-real':{nombre:'Germán Asesor'}
});
assert.equal(resolved('Orbit LAB','carlos-real'),'Carlos Castro','SESSION_UID_HUMAN_NAME');
assert.equal(resolved('Usuario autenticado','paula-real'),'Paula Osorio','AUTHORIZED_USER_NAME');
assert.equal(resolved('Orbit LAB','samuel-real'),'Samuel Daza','AUTHORIZED_MEMBER_NAME');
assert.equal(resolved('','asesor-real'),'Germán Asesor','AUTHORIZED_ADVISOR_NAME');
assert.equal(resolved('Marcela González',''), 'Marcela González','VALID_HISTORICAL_NAME_PRESERVED');
for(const name of ['Orbit LAB','Orbit360 LAB','Usuario autenticado','Usuario autorizado','Direccion','AdminTenant','QA','uid:secret','auth:mock','maria@example.test','A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6'])
  assert.equal(resolved(name,'unknown-uid'),'Usuario del equipo','INVALID_HISTORICAL_ACTOR_'+name);
const broken=vm.runInNewContext('('+source+')',{Orbit:{auth:{productUser:{uid:'x',name:'x@example.test'}},store:{get:()=>{throw new Error('not loaded');}}}},{timeout:1000});
assert.equal(broken('Orbit LAB','not-loaded'),'Usuario del equipo','NO_NETWORK_FALLBACK');
const marker='function humanCommentAuthor(c)';
const cstart=ciclo.indexOf(marker);
const nameStart=ciclo.indexOf('const validName=n=>',cstart);
const nameEnd=ciclo.indexOf('    if(uid){',nameStart);
assert.ok(cstart>=0&&nameStart>cstart&&nameEnd>nameStart,'CICLO_VALIDATOR_NOT_FOUND');
const valid=vm.runInNewContext(ciclo.slice(nameStart,nameEnd)+' validName;');
assert.equal(valid('Carlos Castro'),true,'OPS_LEADS_CARD_REAL_PERSON_PRESERVED');
assert.equal(valid('carlos@example.test'),false,'OPS_LEADS_CARD_EMAIL_REJECTED');
console.log('PASS I6.5/B4-003 transversal inbox and Ops/Leads human identities 18+ checks');
