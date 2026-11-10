'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {
  fingerprint,duePlus15,validateFixture,buildExactPlan,
  protectedTransactionalApply
}=require('./gravicentra-i6-6-universales-maria-protected-cas.NOT_APPLIED.cjs');
const fixture=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_UNIVERSALES_MARIA_EXACT_CURRENT_CAS_PREVIEW_NOT_APPLIED_20261110.json','utf8'));
const pad=n=>String(n).padStart(3,'0');
const clone=x=>structuredClone(x);
function sample(){
  const f=clone(fixture);
  const policy={id:'pol_mwajp407',numero:f.policyNumber,clienteId:f.clientId,pais:'GT'};
  const prior=new Map(f.patches.receiptAndPortfolioDates.map(x=>[x.sequence,x.receiptPatchPreview.vence.before]));
  const receipts=[],portfolio=[];
  for(let i=1;i<=12;i++){
    const id='cob_pol_mwajp407_'+pad(i);
    const due=prior.get(i)||new Date(Date.UTC(2026,9+i-1,1)).toISOString().slice(0,10);
    const deadline=duePlus15(due);
    receipts.push({id,polizaId:policy.id,secuencia:i,cuota:i+'/12',monto:952.56,
      vence:due,fechaLimite:deadline,estado:i<=2?'Vencido':'Pendiente',numeroReciboFuente:null,
      pagado:false,conciliado:false,fechaPago:null});
    portfolio.push({id:'car_'+id,reciboId:id,polizaId:policy.id,monto:952.56,vence:due,
      fechaLimite:deadline,fechaVencimiento:deadline,estado:i<=2?'Vencido':'Pendiente',
      estadoOperativo:i<=2?'vencido':'futuro_pendiente',carteraActiva:true});
  }
  f.readOnlyEvidence.receiptAndPolicyBeforeDigest=fingerprint({policy,receipts});
  f.readOnlyEvidence.portfolioBeforeDigest=fingerprint(portfolio.slice().sort((a,b)=>a.id.localeCompare(b.id)));
  return{f,policy,receipts,portfolio};
}
let pass=0;
function run(name,fn){try{fn();pass++;console.log('I66_CAS_UNIT_PASS='+name)}catch(e){console.error('I66_CAS_UNIT_FAIL='+name+' '+e.message);process.exitCode=1}}
function hold(fn,token){assert.throws(fn,e=>e.message.includes('GI_I66_MARIA_CAS_HOLD:')&&e.message.includes(token))}
run('source_fixture_identity',()=>{validateFixture(fixture);assert.equal(fixture.gate.applyAllowed,false)});
run('exact_twenty_four_preimage_and_seventeen_sparse_updates',()=>{
  const a=sample(),p=buildExactPlan(a.f,a.policy,a.receipts,a.portfolio);
  assert.equal(p.receiptPatches.length,10);assert.equal(p.portfolioPatches.length,7);
  assert.equal(p.documentWritesIfApproved,18);assert.equal(p.liveDataWrites,0);
  assert.deepEqual([...new Set(p.receiptPatches.flatMap(x=>Object.keys(x.patch)))].sort(),['fechaLimite','numeroReciboFuente','vence']);
  assert.deepEqual([...new Set(p.portfolioPatches.flatMap(x=>Object.keys(x.patch)))].sort(),['fechaLimite','fechaVencimiento','vence']);
  assert.equal(p.receiptPatches[0].id,'cob_pol_mwajp407_003');
  assert.equal(p.receiptPatches[0].patch.numeroReciboFuente,'39460328');
  assert.equal(p.portfolioPatches[0].patch.vence,'2027-01-01');
  assert.match(p.expectedReceiptAndPolicyAfterDigest,/^[a-f0-9]{64}$/);
  assert.match(p.expectedPortfolioAfterDigest,/^[a-f0-9]{64}$/);
  assert.notEqual(p.expectedReceiptAndPolicyAfterDigest,p.sourceDigest);
  assert.notEqual(p.expectedPortfolioAfterDigest,p.portfolioDigest);
  assert.equal(p.rollbackSparseBeforeFields.receipts.length,10);
  assert.equal(p.rollbackSparseBeforeFields.portfolio.length,7);
  assert.deepEqual(p.rollbackSparseBeforeFields.receipts[0].fields,[{field:'numeroReciboFuente',present:true,value:null}]);
  assert.equal(p.rollbackSparseBeforeFields.portfolio[0].fields.find(x=>x.field==='vence').value,'2026-12-31');
});
run('fails_changed_receipt_amount',()=>{const a=sample();a.receipts[5].monto=952.57;hold(()=>buildExactPlan(a.f,a.policy,a.receipts,a.portfolio),'RECEIPT_PREIMAGE_DRIFT')});
run('fails_altered_unpaid_receipt',()=>{const a=sample();a.receipts[4].pagado=true;hold(()=>buildExactPlan(a.f,a.policy,a.receipts,a.portfolio),'RECEIPT_PREIMAGE_DRIFT')});
run('fails_duplicate_number_cross_policy',()=>{const a=sample();hold(()=>buildExactPlan(a.f,a.policy,a.receipts,a.portfolio,new Map([['39460333',['external_policy_receipt']]])),'DUPLICATE_SOURCE_NUMBER_8')});
run('fails_changed_contractual_date',()=>{const a=sample();a.receipts[3].vence='2026-12-30';hold(()=>buildExactPlan(a.f,a.policy,a.receipts,a.portfolio),'RECEIPT_PREIMAGE_DRIFT')});
run('fails_changed_portfolio_date',()=>{const a=sample();a.portfolio[3].fechaLimite='2027-01-17';hold(()=>buildExactPlan(a.f,a.policy,a.receipts,a.portfolio),'PORTFOLIO_PREIMAGE_DRIFT')});
run('fails_duplicate_portfolio_link',()=>{const a=sample();a.portfolio[2].reciboId=a.portfolio[3].reciboId;hold(()=>buildExactPlan(a.f,a.policy,a.receipts,a.portfolio),'PORTFOLIO_PREIMAGE_DRIFT')});
run('fails_wrong_policy_country',()=>{const a=sample();a.policy.pais='CO';hold(()=>buildExactPlan(a.f,a.policy,a.receipts,a.portfolio),'POLICY_IDENTITY')});
run('fails_wrong_source_sha',()=>{const a=sample();a.f.source.pdfSha256='unknown';hold(()=>buildExactPlan(a.f,a.policy,a.receipts,a.portfolio),'SOURCE_PDF_BOUNDARY')});
run('fails_extra_or_missing_record',()=>{const a=sample();a.receipts.pop();hold(()=>buildExactPlan(a.f,a.policy,a.receipts,a.portfolio),'CARDINALITY_12_12')});
run('protected_apply_denies_unverified_reviewer',async()=>{const a=sample();await assert.rejects(protectedTransactionalApply(null,a.f,{environment:'gravicentra-live-data-writes',reviewerEvidence:false}),/PROTECTED_REVIEWER_GATE_NOT_PROVEN/)});
console.log('I66_CAS_UNIT_PASS_COUNT='+pass);
if(pass!==12)process.exitCode=1;

