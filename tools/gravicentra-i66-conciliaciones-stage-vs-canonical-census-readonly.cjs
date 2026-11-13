'use strict';
// P0 root-cause census of visible proposals versus active ledger staging.
// Only Firestore aggregate count and control/manifest read; no customer fields.
const assert=require('node:assert/strict');
const admin=require('firebase-admin');
const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const creds=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>{try{return JSON.parse(process.env[k]||'');}catch{return null;}})
  .find(x=>x?.type==='service_account'&&x.project_id===PROJECT&&x.private_key);
assert.ok(creds,'I66_CONCILIACIONES_CENSUS_CREDENTIAL_MISSING');
admin.initializeApp({credential:admin.credential.cert(creds),projectId:PROJECT});
const db=admin.firestore();
const tenant=db.collection('tenants').doc(TENANT);
const data=(col)=>tenant.collection('data').doc(col).collection('items');
const count=async ref=>(await ref.count().get()).data().count;
async function main(){
  const required=['conciliaciones','conciliacionesPrimas','recibosEsperados','carteraPrimas','cobros'];
  const counted=await Promise.all(required.map(async key=>[key,await count(data(key))]));
  const collections=Object.fromEntries(counted);
  const p=await data('cobrosLedgerControl').doc('active').get();
  const activeRunId=String(p.data()?.activeRunId||'');
  assert.ok(!activeRunId||/^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,179}$/.test(activeRunId),'I66_CONCILIACIONES_ACTIVE_RUN_INVALID');
  let stage=null,manifestExists=false,manifestStatus='',stageProposalShape=null;
  if(activeRunId){
    const run=data('cobrosLedgerRuns').doc(activeRunId);
    const m=await run.get();manifestExists=m.exists;
    manifestStatus=String(m.data()?.status||m.data()?.estado||m.data()?.result||'').slice(0,64);
    stage=Object.fromEntries(await Promise.all(['propuestasConciliacion','evidenciasCobro','conciliacionHolds'].map(async k=>[k,await count(run.collection(k))])));
    if(stage.propuestasConciliacion>0){
      const ss=await run.collection('propuestasConciliacion').limit(250).get();
      assert.ok(stage.propuestasConciliacion<=250&&ss.size===stage.propuestasConciliacion,'I66_CONCILIACIONES_STAGE_PROPOSAL_SCAN_BOUND');
      const rows=ss.docs.map(x=>x.data()||{}), keys=new Set();
      const has=(r,fields)=>fields.some(k=>r[k]!==undefined&&r[k]!==null&&r[k]!=='');
      rows.forEach(r=>Object.keys(r).filter(k=>/^[a-zA-Z][a-zA-Z0-9_]{0,44}$/.test(k)).forEach(k=>keys.add(k)));
      stageProposalShape={sampled:rows.length,fieldNames:[...keys].sort(),
        withPolicyLink:rows.filter(r=>has(r,['polizaId','policyId','poliza_id'])).length,
        withClientLink:rows.filter(r=>has(r,['clienteId','clientId','cliente_id'])).length,
        withReceiptLink:rows.filter(r=>has(r,['reciboId','receiptId','recibo_id'])).length,
        withCountry:rows.filter(r=>has(r,['pais','country'])).length,
        withAdvisor:rows.filter(r=>has(r,['asesorId','advisorId'])).length,
        withAmount:rows.filter(r=>has(r,['monto','total','saldo','montoAplicar','importe'])).length,
        withSourceReference:rows.filter(r=>has(r,['source_ref','sourceRef','fuente','sourceId'])).length};
    }
  }
  const verdict=!activeRunId?'HOLD_NO_ACTIVE_LEDGER_POINTER':!manifestExists?'HOLD_ACTIVE_LEDGER_RUN_MISSING':
    (collections.conciliaciones+collections.conciliacionesPrimas===0&&stage.propuestasConciliacion>0)?'MISMATCH_STAGE_PROPOSALS_NOT_CANONICAL_VISIBLE':
    (collections.conciliaciones+collections.conciliacionesPrimas===0&&stage.propuestasConciliacion===0)?'NO_PROPOSALS_IN_EITHER_STORE':
    'CANONICAL_PROPOSALS_PRESENT_REQUIRE_SIGNED_UI_READBACK';
  console.log('I66_CONCILIACIONES_LIVE_CANONICAL_VS_STAGE_COUNTS_READONLY='+JSON.stringify({
    collections,activeLedgerPointerPresent:!!activeRunId,manifestExists,manifestStatus,
    stage,stageProposalShape,verdict,writes:0,guaranteedNoImports:true
  }));
  assert.ok(p.exists,'I66_CONCILIACIONES_CENSUS_LEDGER_POINTER_ABSENT_HOLD');
}
main().catch(e=>{console.error(String(e.message||e).replace(/[^\w.:-]+/g,'_').slice(0,180));process.exitCode=1;})
  .finally(()=>admin.app().delete());
