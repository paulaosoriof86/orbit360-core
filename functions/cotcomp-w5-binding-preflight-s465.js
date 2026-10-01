'use strict';

const crypto=require('node:crypto');
const scope=require('./cotcomp-w5-owner-scope-approval-s463');

const VERSION='ays-cotcomp-w5-binding-preflight-s465-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const REAL_DATA_ALLOWED=false;
const PRODUCTION_ALLOWED=false;

function sha256(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function validSha(v){return /^[a-f0-9]{64}$/i.test(String(v||''));}

function buildBindingPacket({caseSelector,actorSelector,consentEvidenceSelector}={}){
  if(!caseSelector||!actorSelector||!consentEvidenceSelector){
    return {ok:false,code:'BINDING_SELECTORS_REQUIRED'};
  }
  return Object.freeze({
    ok:true,
    schemaVersion:VERSION,
    commitments:Object.freeze({
      caseSelectorSha256:sha256(caseSelector),
      actorSelectorSha256:sha256(actorSelector),
      consentEvidenceSha256:sha256(consentEvidenceSelector)
    }),
    rawSelectorsPersisted:false,
    rawSelectorsReturned:false
  });
}

function validateCommitments(input={}){
  const reasons=[];
  if(!validSha(input.caseSelectorSha256))reasons.push('W5_CASE_SELECTOR_COMMITMENT_REQUIRED');
  if(!validSha(input.actorSelectorSha256))reasons.push('W5_ACTOR_SELECTOR_COMMITMENT_REQUIRED');
  if(!validSha(input.consentEvidenceSha256))reasons.push('W5_CONSENT_EVIDENCE_COMMITMENT_REQUIRED');
  return Object.freeze({ok:reasons.length===0,reasons:Object.freeze(reasons)});
}

function preflight({commitments,finalOwnerAuthorization=false}={}){
  const approved=scope.evaluate();
  const reasons=[];
  if(!approved.ownerScopeApproved)reasons.push('OWNER_W5_PILOT_SCOPE_APPROVAL_REQUIRED');
  const c=validateCommitments(commitments||{});
  reasons.push(...c.reasons);
  if(finalOwnerAuthorization!==true)reasons.push('OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED');

  return Object.freeze({
    version:VERSION,
    approvedScope:approved.approvedScope,
    commitmentMechanismReady:true,
    selectorCommitmentsValid:c.ok,
    finalOwnerAuthorization:finalOwnerAuthorization===true,
    executionAllowed:false,
    realDataAllowed:false,
    productionAllowed:false,
    remainingBlockers:Object.freeze([...new Set(reasons)]),
    boundaries:Object.freeze({
      executionEnabled:EXECUTION_ENABLED,
      appDataReadsAllowed:APP_DATA_READS_ALLOWED,
      appDataWritesAllowed:APP_DATA_WRITES_ALLOWED,
      realDataAllowed:REAL_DATA_ALLOWED,
      productionAllowed:PRODUCTION_ALLOWED
    })
  });
}

function syntheticProof(){
  const packet=buildBindingPacket({
    caseSelector:'synthetic-case-selector',
    actorSelector:'synthetic-actor-selector',
    consentEvidenceSelector:'synthetic-consent-evidence'
  });
  const gate=preflight({commitments:packet.commitments,finalOwnerAuthorization:false});
  return Object.freeze({packet,gate});
}

module.exports=Object.freeze({
  VERSION,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,
  REAL_DATA_ALLOWED,PRODUCTION_ALLOWED,sha256,validSha,buildBindingPacket,
  validateCommitments,preflight,syntheticProof
});
