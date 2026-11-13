'use strict';
// Real LIVE-data readback of the new SOURCE projection, before any Preview deploy.
// This job does not authenticate through the Preview callable and therefore is
// NOT signed UI acceptance or permission to promote to LIVE.
const assert=require('node:assert/strict');
const admin=require('firebase-admin');
const {readActiveLedgerProposalPage}=require('../functions/i66-conciliaciones-active-ledger-projection');
const {readScopedRelatedList}=require('../functions/b4-003-scoped-related-reader');
const {Denied}=require('../functions/b4-003-scoped-access-boundary');
const TENANT='alianzas-soluciones',PROJECT='ays-orbit-360-lab';
const cred=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>{
 try{return JSON.parse(process.env[k]||'');}catch{return null;}
}).find(x=>x&&x.type==='service_account'&&x.project_id===PROJECT&&x.private_key);
assert.ok(cred,'I66_CONCILIACIONES_STAGE_CREDENTIAL_MISSING');
admin.initializeApp({credential:admin.credential.cert(cred),projectId:PROJECT});
const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT);
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9]+/g,'');
async function direct(country){
 const ctx={tenantId:TENANT,role:'direccion',country,collection:'conciliaciones',scope:'all',
  advisorId:'',team:[]};
 return readActiveLedgerProposalPage({db,tenant,tenantId:TENANT,ctx,pageSize:200,cursor:''});
}
async function main(){
 const [gt,co]=await Promise.all([direct('GT'),direct('CO')]);
 const rows=gt.rows.concat(co.rows);
 assert.equal(rows.length,52,'I66_REAL_STAGE_VERIFIED_UNIQUE_POLICY_COUNT_DRIFT_HOLD');
 assert.equal(new Set(rows.map(x=>x.canonicalDocumentId)).size,52,'I66_REAL_STAGE_DUPLICATE_DOC_ID');
 assert.equal(new Set(rows.map(x=>x.proposalIdentity)).size,52,'I66_REAL_STAGE_DUPLICATE_SOURCE_HASH');
 assert.ok(rows.every(x=>x.readOnly===true&&x.applicationPermitted===false&&
   x.polizaId&&x.clienteId&&['GT','CO'].includes(x.pais)&&x.moneda&&x.monto>=0),
   'I66_REAL_STAGE_PROJECTION_INCOMPLETE');
 const members=await tenant.collection('members').limit(200).get();
 assert.ok(members.size<200,'I66_STAFF_MEMBER_CATALOG_BOUND_HOLD');
 const directors=members.docs.filter(d=>{
   const m=d.data()||{},roles=[...(m.roles||[]),...(m.rolesAsignados||[]),m.activeRole,m.rol,m.role].map(norm);
   return roles.includes('direccion')&&m.active!==false&&m.activo!==false&&
    ['active','activo'].includes(norm(m.status||m.estado))&&
    [].concat(m.countries||m.paises||[]).map(x=>String(x).toUpperCase()).includes('GT');
 });
 assert.ok(directors.length>0,'I66_REAL_ACTIVE_DIRECTION_MEMBERSHIP_MISSING_HOLD');
 let verified=0;
 for(const d of directors){
   const person=await auth.getUser(d.id);
   if(person.disabled||!person.emailVerified)continue;
   const request={tenantId:TENANT,collection:'conciliaciones',country:'GT',activeRole:'Dirección',pageSize:200};
   const result=await readScopedRelatedList({db,auth:{uid:d.id,token:{}},request});
   assert.equal(result.serverScoped,true,'I66_REAL_DIRECTION_SERVER_SCOPE_REQUIRED');
   assert.equal(result.scope,'all','I66_REAL_DIRECTION_EXPECTED_ALL_SCOPE');
   assert.equal(result.rows.length,gt.rows.length,'I66_REAL_DIRECTION_CANONICAL_COUNTRY_LIST_PARITY');
   assert.ok(result.rows.every(x=>x.pais==='GT'&&x.readOnly===true));
   await assert.rejects(()=>readScopedRelatedList({db,auth:{uid:d.id,token:{}},
     request:{...request,country:'SV'}}),e=>e instanceof Denied,'I66_CROSS_COUNTRY_DENIAL_REQUIRED');
   verified++;
 }
 assert.ok(verified>0,'I66_REAL_DIRECTION_AUTH_NOT_READY_HOLD');
 console.log('I66_REAL_SOURCE_STAGE_READONLY_VERIFIED '+JSON.stringify({
  activeProposals:132,uniquePolicyMatches:rows.length,ambiguousHeld:80,
  authorizedProjectionByCountry:{GT:gt.rows.length,CO:co.rows.length},
  activeVerifiedDirectionMembers:verified,indexedLookup:true,scopedReads:true,
  previewCallableDeployed:false,liveCodeDeployed:false,realBusinessWrites:0}));
}
main().catch(e=>{console.error('I66_REAL_SOURCE_STAGE_HOLD '+String(e.code||e.message||e)
  .replace(/[^\w.:/-]+/g,'_').slice(0,230));process.exitCode=1;})
  .finally(()=>admin.app().delete());
