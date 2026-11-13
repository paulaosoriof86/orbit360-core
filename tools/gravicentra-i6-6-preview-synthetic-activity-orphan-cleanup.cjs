'use strict';
// Clean only the one explicitly marked Preview activity from failed I6.6 QA
// run 43471876430. User production data and valid QA operations are excluded.
const assert=require('node:assert/strict'),admin=require('firebase-admin');
const projectId='ays-orbit-360-lab',tenantId='alianzas-soluciones';
const secret=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean)
 .map(s=>{try{return JSON.parse(s);}catch{return null;}})
 .find(s=>s?.type==='service_account'&&s.project_id===projectId&&s.private_key);
assert.ok(secret,'QA_PREVIEW_ORPHAN_CREDENTIAL_UNAVAILABLE');
admin.initializeApp({credential:admin.credential.cert(secret),projectId});
const activities=admin.firestore().collection('tenants').doc(tenantId).collection('data').doc('actividades').collection('items');
const prefix='b4003qa_newpol_operativo_';
(async()=>{
 const q=()=>activities.where('clienteId','>=',prefix).where('clienteId','<',prefix+'\uf8ff').limit(3).get();
 const snap=await q();
 assert.equal(snap.size,1,'QA_PREVIEW_ORPHAN_EXACTLY_ONE_EXPECTED');
 const doc=snap.docs[0],row=doc.data()||{};
 const match=String(row.clienteId||'').match(/^b4003qa_newpol_operativo_([a-z0-9]+_[a-f0-9]{8})_client$/);
 assert.ok(match,'QA_PREVIEW_ORPHAN_CLIENT_NOT_SYNTHETIC');
 assert.equal(row.__syntheticQa,true,'QA_PREVIEW_ORPHAN_NOT_EXPLICITLY_MARKED');
 assert.ok(['poliza','admin'].includes(String(row.tipo||'')),'QA_PREVIEW_ORPHAN_UNEXPECTED_TYPE');
 if(row.pais)assert.equal(row.pais,'GT','QA_PREVIEW_ORPHAN_WRONG_COUNTRY');
 if(row.tenantId)assert.equal(row.tenantId,tenantId,'QA_PREVIEW_ORPHAN_WRONG_TENANT');
 const op='qa_newpolicy_operativo_'+match[1];
 assert.ok(/^act_|^aud_/.test(doc.id)||String(row.operacionId||row.operationId||'')===op,
  'QA_PREVIEW_ORPHAN_NOT_SIGNED_ACTIVITY_SHAPE');
 await doc.ref.delete({lastUpdateTime:doc.updateTime});
 assert.equal((await q()).size,0,'QA_PREVIEW_ORPHAN_REMAINS');
 console.log('I66_PREVIEW_SINGLE_EXPLICITLY_MARKED_SIGNED_SYNTHETIC_ACTIVITY_CLEANUP_PASS');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
