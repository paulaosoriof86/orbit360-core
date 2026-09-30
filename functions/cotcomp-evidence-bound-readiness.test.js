'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const r=require('./cotcomp-evidence-bound-readiness');
const e=require('./cotcomp-legal-validation-evidence');
const g=require('./cotcomp-governance-policy');
const s=require('./cotcomp-lab-storage-adapter-candidate');

function packet(country){
  const p=e.emptyCountryPacket(country);
  p.entityLegalName=country==='GT'?'Alianzas y Soluciones Corredores de Seguros, S.A.':'Entidad Colombia por confirmar';
  p.counselOrganization='Firma Jurídica';
  p.formalOpinionReference=country+'-OP-1';
  p.opinionDate='2026-09-30';
  p.ownerAcceptedCountryOpinion=true;
  p.decisions=p.decisions.map(x=>({
    ...x,
    decision:'COMPLIANT',
    legalSource:'Fuente legal formal',
    analysis:'Análisis jurídico formal.'
  }));
  return p;
}

function base(){
  return {
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    workflowStorageMode:'canonicalV2',
    workflowOwnerBlobDeployed:s.EXPECTED.workflowOwnerBlob,
    negativeSecurityQaPass:true,
    ownerWriteAuthorization:false,
    deployAuthorization:false
  };
}

test('current evidence status is explicitly incomplete',()=>{
  const x=r.currentEvidenceStatus();
  assert.equal(x.governancePolicyVersion,g.VERSION);
  assert.equal(x.gtLegalPacketPresent,false);
  assert.equal(x.coLegalPacketPresent,false);
  assert.equal(x.formalLegalValidationComplete,false);
});

test('no legal packets keeps readiness blocked',()=>{
  const x=r.evaluateEvidenceBoundReadiness(base());
  assert.equal(x.ok,false);
  assert.equal(x.formalLegalValidationComplete,false);
  assert.ok(x.reasons.includes('GT_LEGAL_PACKET_INCOMPLETE'));
  assert.ok(x.reasons.includes('CO_LEGAL_PACKET_INCOMPLETE'));
  assert.equal(x.effectiveRuntimeAllowed,false);
});

test('one country only is insufficient',()=>{
  const x=r.evaluateEvidenceBoundReadiness({...base(),gtLegalPacket:packet('GT')});
  assert.equal(x.formalLegalValidationComplete,false);
  assert.ok(x.reasons.includes('CO_LEGAL_PACKET_INCOMPLETE'));
});

test('complete legal evidence satisfies legal gate logically',()=>{
  const x=r.evaluateEvidenceBoundReadiness({
    ...base(),
    gtLegalPacket:packet('GT'),
    coLegalPacket:packet('CO')
  });
  assert.equal(x.formalLegalValidationComplete,true);
  assert.equal(x.legalEvidence.ok,true);
  assert.ok(x.reasons.includes('OWNER_WRITE_AUTHORIZATION_REQUIRED'));
  assert.ok(x.reasons.includes('DEPLOY_AUTHORIZATION_REQUIRED'));
});

test('full logical readiness still cannot open code locks',()=>{
  const x=r.evaluateEvidenceBoundReadiness({
    ...base(),
    gtLegalPacket:packet('GT'),
    coLegalPacket:packet('CO'),
    ownerWriteAuthorization:true,
    deployAuthorization:true
  });
  assert.equal(x.ok,true);
  assert.equal(x.runtimeEnabledByCode,false);
  assert.equal(x.writesEnabledByCode,false);
  assert.equal(x.deployAllowedByCode,false);
  assert.equal(x.effectiveRuntimeAllowed,false);
});
