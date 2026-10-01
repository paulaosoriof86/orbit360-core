'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w5-realdata-pilot-s466');

function candidate(overrides={}){
  return {id:'qcase_real_1',data:Object.assign({
    journeyId:'GT_AUTO_MOTO_HYBRID',country:'GT',source:'PUBLIC_WEB',intent:'COTIZAR',
    riskOrProductCandidate:'AUTO',status:'SUBMITTED',
    correlationId:'corr_real_1',
    capturedFields:{brand:'Toyota',lineModel:'RAV4'},
    contact:{name:'Example',whatsapp:'55555555',email:'x@example.com'},
    consents:{requestManagement:true,marketing:false},
    createdAt:'2026-09-30T12:00:00Z'
  },overrides)};
}

test('S4.66 candidate requires real GT Auto/Moto case with request-management consent',()=>{
  assert.equal(s.isEligibleRealQuoteCase(candidate()),true);
  assert.equal(s.isEligibleRealQuoteCase(candidate({consents:{requestManagement:false}})),false);
  assert.equal(s.isEligibleRealQuoteCase(candidate({journeyId:'GT_GASTOS_MEDICOS_HYBRID'})),false);
  assert.equal(s.isEligibleRealQuoteCase(candidate({synthetic:true})),false);
});

test('S4.66 refuses already selected real cases',()=>{
  assert.equal(s.isEligibleRealQuoteCase(candidate({status:'USER_SELECTED',selectionId:'sel_x'})),false);
  assert.equal(s.isEligibleRealQuoteCase(candidate({selectedProposalId:'p_x'})),false);
});

test('S4.66 chooses one deterministic most-recent eligible candidate',()=>{
  const a=candidate({createdAt:'2026-09-29T00:00:00Z'}); a.id='a';
  const b=candidate({createdAt:'2026-10-01T00:00:00Z'}); b.id='b';
  const r=s.chooseCandidate([a,b]);
  assert.equal(r.eligibleCount,2);
  assert.equal(r.candidate.id,'b');
});

test('S4.66 commitments are hashes and do not expose consent-contact values',()=>{
  const c=candidate();
  const h=s.consentCommitment(c.id,c.data);
  assert.match(h,/^[a-f0-9]{64}$/);
  assert.doesNotMatch(h,/Example|55555555|example.com/);
});

test('S4.66 source hard-locks the approved project, journey and max discovery scope',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.TENANT_ID,'alianzas-soluciones');
  assert.equal(s.COUNTRY,'GT');
  assert.equal(s.JOURNEY_ID,'GT_AUTO_MOTO_HYBRID');
  assert.equal(s.MAX_EXISTING_RECORDS_SCANNED,8);
});
