'use strict';
// Existing I6.6 GitHub protected insurer-source gate, batch driver.
// Preflight reads canonical Firestore; only the separate Environment-reviewed
// "apply" job can write. Source files stay immutable and insurer-pinned.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {planSourceBatch,canonicalPolicyNumber,policyKeys}=require('./gravicentra-i66-source-bulk-plan.cjs');
const {applyProtectedBatch}=require('./gravicentra-i66-source-bulk-apply.cjs');
const BASE=path.resolve(__dirname,'../artifacts/orbit360-recovery/source-batches');
const INTAKE=require('../artifacts/orbit360-recovery/release-control/I6_6_COBROS_CONCILIACION_SOURCE_INTAKE_20261110.json');
const TENANT='alianzas-soluciones',PROJECT='ays-orbit-360-lab';
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const str=value=>String(value==null?'':value).trim();
const internal=(name,db)=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
const output=(name,value)=>{const dest=process.env[name];assert.ok(dest&&path.isAbsolute(dest),'I66_REPORT_OUTPUT_REQUIRED_'+name);fs.writeFileSync(dest,JSON.stringify(value,null,2)+'\n',{mode:0o600});};
const listedSources=Object.values(INTAKE.sourceInventory).flatMap(group=>Array.isArray(group?.files)?group.files:[])
  .filter(row=>/^[a-f\d]{64}$/i.test(str(row.sha256))&&/VERIFIED/.test(str(row.hashStatus)));
const allowedDigests=new Set(listedSources.map(row=>row.sha256));
function sealedSource(){
  const relative=str(process.env.GI_I66_BULK_SOURCE_MANIFEST);
  assert.match(relative,/^artifacts\/orbit360-recovery\/source-batches\/I6_6_SOURCE_BULK_[0-9]{8}_[A-Za-z0-9_-]+\.json$/,'I66_SOURCE_MANIFEST_PATH_NOT_PINNED');
  const filename=path.resolve(__dirname,'..',relative);
  assert.ok(filename.startsWith(BASE+path.sep),'I66_SOURCE_MANIFEST_ESCAPED_BASE');
  const bytes=fs.readFileSync(filename),data=JSON.parse(bytes);
  assert.equal(data.schema,'GRAVICENTRA_I6_6_INSURER_SOURCE_BULK_V1');
  assert.equal(data.status,'OWNER_RULES_FROZEN_SOURCE_ROWS_VERIFIED');
  assert.equal(data.tenantId,TENANT);assert.equal(data.projectId,PROJECT);
  assert.ok(str(data.ownerRuleReference).includes('2026-11-18'),'I66_OWNER_RULE_NOT_LINKED');
  assert.ok(Array.isArray(data.rows)&&data.rows.length>0&&data.rows.length<=5000,'I66_SOURCE_ROWS_BOUNDS');
  assert.ok(data.rows.every(row=>allowedDigests.has(str(row.sourceSha256))),'I66_UNPINNED_INSURER_SOURCE_HASH');
  const validTypes=new Set(['PENDING','PAID']);
  assert.ok(data.rows.every(row=>validTypes.has(row.state)),'I66_SOURCE_TYPE_NOT_DECLARED');
  return {relative,bytesSha256:sha(bytes),data};
}
async function readGroups(db,rawRows){
  const policyNumbers=[...new Set(rawRows.map(row=>str(row.policy)).filter(Boolean))];
  const groups=[];
  // Six independent policy reads at a time: no enormous global collection
  // hydration, and no materialization or mutation of source rows.
  for(let offset=0;offset<policyNumbers.length;offset+=6){
    const sets=await Promise.all(policyNumbers.slice(offset,offset+6).map(async number=>{
      const insurerRows=rawRows.filter(r=>str(r.policy)===number);
      const names=[...new Set(insurerRows.flatMap(r=>policyKeys(number,r.insurer)))];
      const snaps=await Promise.all(names.map(n=>
        internal('polizas',db).where('numero','==',n).limit(21).get()));
      const policies=new Map(snaps.flatMap(s=>s.docs).map(d=>[d.id,d]));
      assert.ok(policies.size<=20&&snaps.every(s=>s.size<=20),'I66_POLICY_EDITION_QUERY_UNBOUNDED');
      const current=[];
      for(const doc of policies.values()){
        const p={...doc.data(),id:doc.id};
        if(str(p.pais).toUpperCase()!=='GT')continue;
        const [client,insurer,receipts,portfolio,cobros]=await Promise.all([
          internal('clientes',db).doc(str(p.clienteId)).get(),
          internal('aseguradoras',db).doc(str(p.aseguradoraId)).get(),
          internal('recibosEsperados',db).where('polizaId','==',p.id).limit(121).get(),
          internal('carteraPrimas',db).where('polizaId','==',p.id).limit(121).get(),
          internal('cobros',db).where('polizaId','==',p.id).limit(121).get()]);
        if([receipts,portfolio,cobros].some(x=>x.size>120))throw Error('I66_POLICY_FINANCIAL_QUERY_UNBOUNDED');
        current.push({policy:p,clientExists:client.exists,
          insurerVerified:insurer.exists&&String(p.aseguradoraId||'')!==''&&
            insurer.data()?.activo!==false,
          insurerName:insurer.exists?str(insurer.data().nombre||insurer.data().razonSocial):'',
          receipts:receipts.docs.map(d=>({...d.data(),id:d.id})),
          portfolio:portfolio.docs.map(d=>({...d.data(),id:d.id})),
          cobros:cobros.docs.map(d=>({...d.data(),id:d.id}))});
      }
      return current;
    }));
    sets.forEach(group=>groups.push(...group));
  }
  return groups;
}
// Compare the issued term to the current Firestore editions without treating a
// similarly numbered, expired policy as the successor. Publish counts only.
function issuedTermReadback(groups) {
  const evidencePath=path.join(BASE,'I6_6_ROBLE_THREE_ISSUED_TERMS_DOCUMENTARY_CROSSCHECK_20261122.json');
  const terms=JSON.parse(fs.readFileSync(evidencePath,'utf8')).issuedExamples;
  return terms.map((term,index)=>{
    const matches=groups.filter(g=>canonicalPolicyNumber(g.policy.numero)===term.policy &&
      g.insurerVerified && /roble/i.test(g.insurerName) && g.clientExists);
    const exact=matches.filter(g=>g.policy.vigenciaInicio===term.vigenciaInicio &&
      g.policy.vigenciaFin===term.vigenciaFin);
    const references=new Set([term.issuedRequirement,term.issuedScheduleRequirements?.first,
      term.issuedScheduleRequirements?.second].filter(Boolean));
    if(term.issuedScheduleRequirements)
      for(let n=Number(term.issuedScheduleRequirements.remainingFrom);n<=Number(term.issuedScheduleRequirements.remainingTo);n++)references.add(String(n));
    const receiptMatches=exact.flatMap(g=>g.receipts.filter(r=>[
      r.numeroReciboFuente,r.numeroReciboAseguradora,r.numeroRequerimiento,r.requerimiento,
      r.numeroBoleta,r.sourceNumber,r.referenciaCobro,r.receiptNumber
    ].some(v=>references.has(str(v)))).map(r=>({r,g})));
    return {sourceOrdinal:index+1,verifiedEditions:matches.length,exactTerms:exact.length,
      priorTerms:matches.filter(g=>str(g.policy.vigenciaFin) && g.policy.vigenciaFin<=term.vigenciaInicio).length,
      exactTermReceiptCount:exact.reduce((n,g)=>n+g.receipts.length,0),
      exactTermIssuedReceiptRefMatches:receiptMatches.length,
      matchesWithOnePortfolio:receiptMatches.filter(({g,r})=>g.portfolio.filter(c=>c.reciboId===r.id&&c.carteraActiva!==false).length===1).length};
  });
}
async function main(){
  const mode=str(process.env.GI_I66_BULK_MODE);
  assert.ok(['preflight','apply'].includes(mode),'I66_BULK_MODE_MUST_BE_EXPLICIT');
  assert.equal(process.env.GCLOUD_PROJECT,PROJECT,'I66_PROJECT_NOT_EXISTING_FIREBASE');
  const source=sealedSource();
  const admin=require('firebase-admin');
  admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:PROJECT});
  const db=admin.firestore();
  if(mode==='preflight'){
    const groups=await readGroups(db,source.data.rows);
    console.log('I66_ISSUED_TERM_READBACK='+JSON.stringify(issuedTermReadback(groups)));
    const plan=planSourceBatch(source.data.rows,groups,{chunkSize:250});
    const exceptionCodes={};
    for(const row of plan.exceptions)exceptionCodes[row.code]=(exceptionCodes[row.code]||0)+1;
    const diagnostic={sourcePolicyNumbers:new Set(source.data.rows.map(r=>str(r.policy))).size,
      livePolicyEditions:groups.length,
      editionsWithReceipts:groups.filter(g=>g.receipts.length).length,
      editionsWithPortfolio:groups.filter(g=>g.portfolio.length).length,
      editionsWithCobros:groups.filter(g=>g.cobros.length).length};
    // Private, bounded per-policy evidence: distinguish an absent policy from
    // a valid policy whose source-backed receipts have not been materialized.
    const exceptionsByCase=new Set(plan.exceptions.map(e=>e.caseId));
    const affectedNumbers=new Set(source.data.rows.filter(r=>exceptionsByCase.has(r.caseId))
      .map(r=>str(r.policy)));
    const policyDiagnostics=[...affectedNumbers].map(number=>({
      policyNumber:number,
      sourceRows:source.data.rows.filter(r=>str(r.policy)===number).length,
      editions:groups.filter(g=>canonicalPolicyNumber(g.policy.numero)===
        canonicalPolicyNumber(number)).map(g=>({
        id:g.policy.id,pais:g.policy.pais,moneda:g.policy.moneda,
        insurer:g.insurerName,clientExists:g.clientExists,
        insurerVerified:g.insurerVerified,estado:g.policy.estado,
        frecuencia:g.policy.frecuencia,cuotas:g.policy.cuotas,
        vigenciaInicio:g.policy.vigenciaInicio,vigenciaFin:g.policy.vigenciaFin,
        receiptsCount:g.receipts.length,portfolioCount:g.portfolio.length,
        cobrosCount:g.cobros.length,
        receipts:g.receipts.slice(0,24).map(r=>({id:r.id,sourceRef:r.numeroReciboFuente,
          due:r.fechaVencimientoContractual||r.vence||r.fechaVencimiento,
          operationalLimit:r.fechaLimite,sequence:r.secuencia||r.numeroCuota,
          cuota:r.cuota,gross:r.primaTotal,
          grossAliases:{monto:r.monto,montoTotal:r.montoTotal,saldo:r.saldo}}))}))
    }));
    const bundle={...plan,sourceManifestSha256:source.bytesSha256,
      sourceManifestPath:source.relative};
    const planSha256=sha(Buffer.from(JSON.stringify(bundle)));
    output('GI_I66_BULK_PLAN_OUT',bundle);
    output('GI_I66_BULK_REPORT_OUT',{status:plan.readyCount?
        'BULK_SOURCE_PREFLIGHT_ONLY_NO_WRITES':'BULK_SOURCE_NO_ELIGIBLE_ROWS_DIAGNOSTIC_HOLD',
      sourceManifestSha256:source.bytesSha256,planSha256,inputRows:plan.inputRows,
      readyCount:plan.readyCount,unchangedCount:plan.unchangedCount,
      exceptionCount:plan.exceptionCount,exceptionCodes,diagnostic,
      privatePolicyDiagnostics:policyDiagnostics,
      exceptionSamples:plan.exceptions.slice(0,35),
      chunks:plan.chunks.map(c=>({sequence:c.sequence,count:c.count,sha:c.sourcePlanSha256})),writes:0});
    console.log('I66_BULK_SOURCE_PREFLIGHT_PASS input='+plan.inputRows+' eligible='+plan.readyCount+
      ' exceptions='+plan.exceptionCount+' chunks='+plan.chunks.length+
      ' codes='+JSON.stringify(exceptionCodes)+' diagnostic='+JSON.stringify(diagnostic)+' ZERO_WRITES');
    return;
  }
  assert.equal(process.env.GITHUB_REF,'refs/heads/recovery/fase-a-clean-20260831');
  assert.equal(process.env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core');
  assert.equal(process.env.GI_I66_BULK_PROTECTED_ENV,'gravicentra-live-data-writes');
  const planPath=str(process.env.GI_I66_BULK_PLAN_IN);
  assert.ok(path.isAbsolute(planPath),'I66_BULK_PREFLIGHT_PLAN_REQUIRED');
  const plan=JSON.parse(fs.readFileSync(planPath));
  assert.equal(plan.sourceManifestSha256,source.bytesSha256,'I66_BULK_SOURCE_BYTES_CHANGED');
  assert.equal(plan.sourceManifestPath,source.relative,'I66_BULK_SOURCE_FILE_CHANGED');
  assert.equal(plan.status,'BULK_SOURCE_PREFLIGHT_ONLY_NO_WRITES');
  assert.equal(plan.writes,0);
  assert.ok(Array.isArray(plan.chunks)&&plan.chunks.length>0);
  const keys=new Set(source.data.rows.map(r=>[str(r.insurer).toUpperCase(),str(r.policy),str(r.requirement),
    str(r.sourceSha256).toLowerCase()].join('|')));
  for(const c of plan.chunks)for(const row of c.rows){
    assert.ok(keys.has([row.insurer,row.policy,row.requirement,row.sourceSha256].join('|')),
      'I66_BULK_PLAN_ROW_NOT_IN_PINNED_SOURCE');
  }
  const gate={environment:'gravicentra-live-data-writes',reviewerEvidence:true,
    repository:'paulaosoriof86/orbit360-core',
    ref:process.env.GITHUB_REF,project:PROJECT,sourceManifestSha256:source.bytesSha256};
  const result=await applyProtectedBatch(db,plan,gate);
  output('GI_I66_BULK_REPORT_OUT',result);
  assert.ok(result.applied+result.alreadyApplied>0,'I66_BULK_NO_WRITES_OR_READBACK');
  console.log('I66_BULK_PROTECTED_REAL_READBACK applied='+result.applied+' already='+result.alreadyApplied+
    ' exceptions='+result.sourceExceptions+' isolatedHolds='+result.failed.length+
    ' receiptWrites='+result.receiptWrites+' carteraWrites='+result.portfolioWrites+
    ' cobroWrites='+result.cobroWrites);
}
main().catch(error=>{console.error('I66_BULK_EXECUTION_HOLD '+str(error.message));process.exitCode=1;});
