'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const e=require('./cotcomp-legal-validation-evidence');
const g=require('./cotcomp-governance-policy');

function compliant(country){
  const p=e.emptyCountryPacket(country);
  p.entityLegalName=country==='GT'?'Alianzas y Soluciones Corredores de Seguros, S.A.':'Entidad Colombia por confirmar';
  p.counselOrganization='Firma Jurídica';
  p.formalOpinionReference='OP-2026-001';
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

test('contract stays source-only and hard-locked',()=>{
  assert.equal(e.RUNTIME_ENABLED,false);
  assert.equal(e.WRITES_ENABLED,false);
  assert.equal(e.DEPLOY_ALLOWED,false);
});

test('empty packet contains all required policy items',()=>{
  const p=e.emptyCountryPacket('GT');
  assert.equal(p.reviewedPolicyVersion,g.VERSION);
  assert.equal(p.decisions.length,e.POLICY_ITEMS.length);
  assert.deepEqual(p.decisions.map(x=>x.policyItem),e.POLICY_ITEMS);
});

test('incomplete packet fails closed',()=>{
  const r=e.validateCountryPacket(e.emptyCountryPacket('GT'));
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('ENTITY_LEGAL_NAME_REQUIRED'));
  assert.ok(r.reasons.includes('LEGAL_DECISIONS_INVALID'));
});

test('compliant packet passes when complete',()=>{
  const r=e.validateCountryPacket(compliant('GT'));
  assert.equal(r.ok,true);
  assert.equal(r.country,'GT');
  assert.equal(r.packet.decisions.length,e.POLICY_ITEMS.length);
});

test('ADJUST requires owner acceptance and policy application',()=>{
  const p=compliant('GT');
  p.decisions[0]={
    ...p.decisions[0],
    decision:'ADJUST',
    requiredAdjustment:'Cambiar plazo.',
    ownerAcceptedAdjustment:false,
    appliedToPolicyVersion:''
  };
  const r=e.validateCountryPacket(p);
  assert.equal(r.ok,false);
  assert.ok(r.invalid[0].reasons.includes('OWNER_ACCEPTED_ADJUSTMENT_REQUIRED'));
  assert.ok(r.invalid[0].reasons.includes('ADJUSTMENT_NOT_APPLIED_TO_CURRENT_POLICY'));
});

test('NOT_APPLICABLE requires explanation',()=>{
  const p=compliant('CO');
  p.decisions[0]={
    ...p.decisions[0],
    decision:'NOT_APPLICABLE',
    notApplicableReason:''
  };
  const r=e.validateCountryPacket(p);
  assert.equal(r.ok,false);
  assert.ok(r.invalid[0].reasons.includes('NOT_APPLICABLE_REASON_REQUIRED'));
});

test('both countries and owner acceptance are required for formal validation',()=>{
  const r=e.evaluateFormalValidation({gt:compliant('GT')});
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('CO_LEGAL_PACKET_INCOMPLETE'));
  assert.equal(r.formalLegalValidationComplete,false);
});

test('complete accepted GT+CO packets can complete legal evidence logically but do not enable runtime',()=>{
  const r=e.evaluateFormalValidation({gt:compliant('GT'),co:compliant('CO')});
  assert.equal(r.ok,true);
  assert.equal(r.formalLegalValidationComplete,true);
  assert.equal(r.runtimeEnabled,false);
  assert.equal(r.writesEnabled,false);
  assert.equal(r.deployAllowed,false);
  assert.equal(r.effectiveRuntimeAllowed,false);
});
