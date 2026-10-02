'use strict';

const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w5-real-submission-s468');

test('S4.68 scope remains exact LAB GT Auto/Moto W5',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.TENANT_ID,'alianzas-soluciones');
  assert.equal(s.JOURNEY_ID,'GT_AUTO_MOTO_HYBRID');
  assert.equal(s.COUNTRY,'GT');
  assert.equal(s.OWNER_CALLABLE,'orbit360OpsLeadsCommand');
});

test('S4.68 projection carries the exact QuoteCase path into both cotcomp refs',()=>{
  const quoteCasePath='tenants/alianzas-soluciones/cotcomp/quoteCases/items/qcase_test';
  const p=s.deriveProjection('s468-test','qcase_test','corr_test',quoteCasePath);
  assert.equal(p.businessPayload.cotcompRef.quoteCasePath,quoteCasePath);
  assert.equal(p.managementPayload.cotcompRef.quoteCasePath,quoteCasePath);
  assert.equal(p.businessPayload.cotcompRef.caseId,'qcase_test');
  assert.equal(p.managementPayload.cotcompRef.caseId,'qcase_test');
});

test('S4.68 journals exactly eight temporary W2 owner side effects in either storage mode',()=>{
  const p=s.deriveProjection('s468-test','qcase_test','corr_test','case-path');
  for(const mode of ['legacyCompatible','canonicalV2']){
    const paths=s.journalPaths(p,mode);
    assert.equal(paths.length,8);
    assert.equal(new Set(paths).size,8);
    assert.equal(paths.filter(x=>x.includes('/notificationOutbox/')).length,2);
    assert.equal(paths.filter(x=>x.includes('/workflowEvents/')).length,2);
    assert.equal(paths.filter(x=>x.includes('/workflowRequests/')).length,2);
  }
  assert.match(s.workflowEntityPath('legacyCompatible','negocios','x'),/^tenantId\//);
  assert.match(s.workflowEntityPath('canonicalV2','negocios','x'),/^tenants\//);
  assert.equal(s.allPotentialJournalPaths(p).length,10);
});

test('S4.68 fails closed on health-sensitive keys without false positives on management consent',()=>{
  assert.equal(s.healthSensitiveAbsent({
    capturedFields:{brand:'A',lineModel:'B'},
    contact:{name:'x'},
    consents:{requestManagement:true,requestManagementText:'Autorizo gestionar esta solicitud y contactarme'}
  }),true);
  assert.equal(s.healthSensitiveAbsent({managementNote:'ok',capturedFields:{brand:'A',lineModel:'B'}}),true);
  assert.equal(s.healthSensitiveAbsent({capturedFields:{brand:'A',lineModel:'B',dateOfBirth:'2000-01-01'}}),false);
  assert.equal(s.healthSensitiveAbsent({capturedFields:{brand:'A',lineModel:'B',age:30}}),false);
  assert.equal(s.healthSensitiveAbsent({medical:{diagnosis:'x'}}),false);
});

test('S4.68 commitments expose only SHA-256 material',()=>{
  const c=s.caseCommitment('case-path-test');
  const a=s.actorCommitment({uid:'uid-test',advisorId:'advisor-test',memberDocId:'member-test'});
  const e=s.consentCommitment('case-test',{
    contact:{name:'Persona',whatsapp:'+502 50000000',email:'persona@example.test'},
    consents:{
      requestManagement:true,
      requestManagementText:s.CONSENT_TEXT,
      requestManagementSource:'W5_LAB_ONE_TIME_INTAKE',
      requestManagementCapturedAt:'2026-10-01T23:00:00.000Z',
      marketing:false
    },
    pilotIntake:{generalPersistenceReleased:false}
  });
  for(const value of [c,a,e]) assert.match(value,/^[a-f0-9]{64}$/);
});

test('S4.68 source contains partial-write rollback before full baseline exists',()=>{
  const source=fs.readFileSync(require.resolve('./cotcomp-w5-real-submission-s468'),'utf8');
  assert.match(source,/writeAttempted=true;/);
  assert.match(source,/cleanupCreatedSubset\(db,allPossiblePaths\)/);
  assert.match(source,/S468_PARTIAL_ROLLBACK_FINAL_ABSENCE_FAILED/);
  assert.match(source,/S468_W2_STORAGE_MODE_CHANGED_DURING_RUN/);
  assert.doesNotMatch(source,/let created=false;/);
});
