'use strict';

const storage = require('./cotcomp-lab-storage-adapter-candidate');
const workflow = require('./cotcomp-workflow-extension-contract');
const caseAccess = require('./cotcomp-case-access-contract');
const proposal = require('./cotcomp-proposal-contracts');
const transport = require('./cotcomp-transport-contract');
const runtimeData = require('./cotcomp-runtime-data-contract');
const persistenceAdapter = require('./cotcomp-persistence-adapter-candidate');
const writer = require('./cotcomp-persistence-writer-interface');
const security = require('./cotcomp-negative-security-contract');

const VERSION = 'ays-cotcomp-negative-security-harness-s424-v0.1';
const SIDE_EFFECTS_ALLOWED = false;

function validProposal(id='p1',state='VALIDATED'){
  return {
    proposalId:id,
    quoteCaseId:'qcase_1',
    insurerId:'ins_1',
    sourceId:'src_1',
    country:'GT',
    product:'AUTO',
    currency:'GTQ',
    premium:2100,
    coverages:{rc:'COVERED'},
    limits:{},
    sublimits:{},
    deductibles:{},
    assistance:{},
    conditions:[],
    exclusions:[],
    validity:{},
    provenance:{source:'manual'},
    validationState:state,
    validatedBy:state==='VALIDATED'?'user_1':'',
    validatedAt:state==='VALIDATED'?'2026-09-30T10:00:00Z':''
  };
}

function dryRunSample(){
  return {
    tenantId:'alianzas-soluciones',
    idempotencyKey:'idem-sec-1',
    journeyId:'GT_AUTO_MOTO_HYBRID',
    country:'GT',
    product:'AUTO',
    capturedFields:{brand:'Toyota',lineModel:'Corolla'},
    missingFields:[],
    contact:{name:'Paula',whatsapp:'+50255555555',email:'paula@example.com'},
    consents:{requestManagement:true},
    caseAccessToken:'opaque-case-token',
    caseAccessExpiresAt:'2026-10-01T12:00:00Z',
    gate:{}
  };
}

function pass(id,control,evidence){
  return {id,ok:true,control,evidence};
}
function fail(id,control,evidence){
  return {id,ok:false,control,evidence};
}

function runMatrix(){
  const results=[];

  const crossTenant=storage.classifyPath('tenants/otro-tenant/cotcomp/quoteCases/items/qcase_1');
  results.push(!crossTenant.ok
    ? pass('SEC-01','CROSS_TENANT_PATH_DENY',crossTenant.code)
    : fail('SEC-01','CROSS_TENANT_PATH_DENY',crossTenant));

  const legacy=storage.classifyPath('tenantId/alianzas-soluciones/quoteCases/qcase_1');
  results.push(!legacy.ok
    ? pass('SEC-02','LEGACY_PATH_BYPASS_DENY',legacy.code)
    : fail('SEC-02','LEGACY_PATH_BYPASS_DENY',legacy));

  const browser=storage.validateServerContext({
    actorType:'SERVER_COTCOMP_WRITER',
    tenantId:'alianzas-soluciones',
    publicBrowser:true
  });
  results.push(!browser.ok && browser.reasons.includes('PUBLIC_BROWSER_FORBIDDEN')
    ? pass('SEC-03','PUBLIC_BROWSER_WRITE_DENY',browser.reasons)
    : fail('SEC-03','PUBLIC_BROWSER_WRITE_DENY',browser));

  const partialRef=workflow.cotcompRef({
    caseId:'qcase_1',
    journeyId:'GT_AUTO_MOTO_HYBRID'
  },'LEAD_PROJECTION');
  results.push(!partialRef.ok && partialRef.code==='COTCOMP_REF_REQUIRED_FIELDS'
    ? pass('SEC-04','PARTIAL_CORRELATION_DENY',partialRef.missing)
    : fail('SEC-04','PARTIAL_CORRELATION_DENY',partialRef));

  const firstReplay=security.evaluateIdempotencyReplay({
    existingRequestDigest:'',
    incomingRequestDigest:'digest-A'
  });
  const safeReplay=security.evaluateIdempotencyReplay({
    existingRequestDigest:'digest-A',
    incomingRequestDigest:'digest-A'
  });
  const conflictingReplay=security.evaluateIdempotencyReplay({
    existingRequestDigest:'digest-A',
    incomingRequestDigest:'digest-B'
  });
  results.push(firstReplay.ok && safeReplay.ok && !conflictingReplay.ok &&
    conflictingReplay.code==='IDEMPOTENCY_PAYLOAD_CONFLICT'
    ? pass('SEC-05','IDEMPOTENCY_REPLAY_CONFLICT_DENY',{
        new:firstReplay.code,retry:safeReplay.code,conflict:conflictingReplay.code
      })
    : fail('SEC-05','IDEMPOTENCY_REPLAY_CONFLICT_DENY',{firstReplay,safeReplay,conflictingReplay}));

  const accessRecord=caseAccess.buildCaseAccessRecord({
    quoteCaseId:'qcase_1',
    rawToken:'qca_secret',
    expiresAt:'2026-09-30T12:00:00Z',
    createdAt:'2026-09-30T09:00:00Z'
  });
  const expired=caseAccess.verifyCaseAccessRecord({
    quoteCaseId:'qcase_1',
    rawToken:'qca_secret',
    now:'2026-09-30T12:00:00Z',
    record:accessRecord.record
  });
  const invalid=caseAccess.verifyCaseAccessRecord({
    quoteCaseId:'qcase_1',
    rawToken:'bad',
    now:'2026-09-30T10:00:00Z',
    record:accessRecord.record
  });
  results.push(!expired.ok && expired.code==='CASE_ACCESS_EXPIRED' &&
    !invalid.ok && invalid.code==='CASE_ACCESS_TOKEN_INVALID'
    ? pass('SEC-06','INVALID_OR_EXPIRED_CASE_ACCESS_DENY',{expired:expired.code,invalid:invalid.code})
    : fail('SEC-06','INVALID_OR_EXPIRED_CASE_ACCESS_DENY',{expired,invalid}));

  const received=proposal.evaluateComparisonEligibility(validProposal('p_received','RECEIVED'),{
    currentValidityConfirmed:true
  });
  const stale=proposal.evaluateComparisonEligibility(validProposal('p_stale','VALIDATED'),{
    currentValidityConfirmed:false
  });
  results.push(!received.eligible && received.reason==='NOT_VALIDATED' &&
    !stale.eligible && stale.reason==='CURRENT_VALIDITY_NOT_CONFIRMED'
    ? pass('SEC-07','UNVALIDATED_OR_STALE_PROPOSAL_DENY',{received:received.reason,stale:stale.reason})
    : fail('SEC-07','UNVALIDATED_OR_STALE_PROPOSAL_DENY',{received,stale}));

  const noChoice=transport.buildTransportPlan({
    operation:transport.OPERATIONS.SELECT_PROPOSAL,
    requestId:'req-sec-1',
    auth:{channel:'PUBLIC_WEB',appCheckVerified:true,caseAccessVerified:true},
    quoteCaseId:'qcase_1',
    proposalId:'p1',
    explicitUserChoice:false
  });
  results.push(!noChoice.transportAllowed && noChoice.errors.includes('EXPLICIT_USER_CHOICE_REQUIRED')
    ? pass('SEC-08','IMPLICIT_SELECTION_DENY',noChoice.errors)
    : fail('SEC-08','IMPLICIT_SELECTION_DENY',noChoice));

  const notCovered=proposal.validateComparisonSemantic(proposal.COMPARISON_SEMANTICS.NOT_COVERED,{
    explicitSourceDeclaration:false
  });
  results.push(!notCovered.ok && notCovered.code==='NOT_COVERED_REQUIRES_EXPLICIT_SOURCE_DECLARATION'
    ? pass('SEC-09','MISSING_NEVER_SILENTLY_NOT_COVERED',notCovered.code)
    : fail('SEC-09','MISSING_NEVER_SILENTLY_NOT_COVERED',notCovered));

  const set=runtimeData.buildComparisonSet({
    tenantId:'alianzas-soluciones',
    caseId:'qcase_1',
    proposalIds:['p1']
  });
  const dto=runtimeData.buildPublicComparisonDto({
    caseId:'qcase_1',
    comparisonSet:set.value,
    proposals:[{
      ...validProposal('p1'),
      contact:{email:'secret@example.com'},
      tokenHash:'internal-hash',
      sourceDiagnostics:{private:true},
      internalNotes:'private'
    }]
  });
  const dtoSafety=security.validatePublicPayload(dto);
  results.push(dtoSafety.ok
    ? pass('SEC-10','PUBLIC_DTO_PII_INTERNAL_FIELD_DENY','PUBLIC_PAYLOAD_SAFE')
    : fail('SEC-10','PUBLIC_DTO_PII_INTERNAL_FIELD_DENY',dtoSafety));

  const dryRun=persistenceAdapter.compileInitialHandoff(dryRunSample());
  const summarySafety=security.validateDryRunSummary(dryRun);
  results.push(summarySafety.ok && dryRun.commands.every(x=>!Object.prototype.hasOwnProperty.call(x,'payload'))
    ? pass('SEC-11','DRY_RUN_SUMMARY_NO_RAW_PII',{code:summarySafety.code,commandCount:dryRun.commands.length})
    : fail('SEC-11','DRY_RUN_SUMMARY_NO_RAW_PII',{summarySafety,dryRun}));

  let writerClosed=false;
  try{
    writer.assertExecutionClosed();
  }catch(error){
    writerClosed=error && error.code==='COTCOMP_WRITER_EXECUTION_DISABLED';
  }
  results.push(writerClosed
    ? pass('SEC-12','WRITER_EXECUTION_FAIL_CLOSED','COTCOMP_WRITER_EXECUTION_DISABLED')
    : fail('SEC-12','WRITER_EXECUTION_FAIL_CLOSED','writer did not fail closed'));

  let storageClosed=false;
  try{
    storage.assertClosed();
  }catch(error){
    storageClosed=error && error.code==='COTCOMP_LAB_STORAGE_ADAPTER_NOT_READY';
  }
  results.push(storageClosed
    ? pass('SEC-13','STORAGE_ADAPTER_EXECUTION_FAIL_CLOSED','COTCOMP_LAB_STORAGE_ADAPTER_NOT_READY')
    : fail('SEC-13','STORAGE_ADAPTER_EXECUTION_FAIL_CLOSED','storage did not fail closed'));

  const readiness=storage.evaluateReadiness({
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    workflowStorageMode:'canonicalV2',
    workflowOwnerBlobDeployed:storage.EXPECTED.workflowOwnerBlob,
    retentionPolicyApproved:true,
    caseAccessPersistenceApproved:true,
    negativeSecurityQaPass:true,
    ownerWriteAuthorization:true,
    deployAuthorization:true
  });
  results.push(readiness.ok && readiness.effectiveReady===false && readiness.readyByCode===false
    ? pass('SEC-14','LOGICAL_READINESS_CANNOT_ENABLE_CODE_GATE',{
        logicalReady:readiness.ok,effectiveReady:readiness.effectiveReady
      })
    : fail('SEC-14','LOGICAL_READINESS_CANNOT_ENABLE_CODE_GATE',readiness));

  return {
    version:VERSION,
    sideEffectsAllowed:SIDE_EFFECTS_ALLOWED,
    total:results.length,
    passed:results.filter(x=>x.ok).length,
    failed:results.filter(x=>!x.ok).length,
    results
  };
}

module.exports=Object.freeze({
  VERSION,
  SIDE_EFFECTS_ALLOWED,
  validProposal,
  dryRunSample,
  runMatrix
});
