'use strict';
// Implements the owner's explicit 2026-11-16 decision in her signed Preview
// session. It never seeds acceptance storage, dismisses a gate or accepts for
// another actor. This decision is bound to one source successor, not future QA.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const CONTROL='artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json';
const RECEIPT='artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_PREVIEW_LEGAL_ACCEPTANCE_20261116.json';
const DECISION='DIRECTION_PREVIEW_INTERNAL_LEGAL_V2_ACCEPTED_20261116';
const SOURCE_BASE='76cb5f5182fad3c0da11aa99ac906d8bb706dc23';
// Exact technical retry; the signed run did not emit an acceptance proof.
// SOURCE_BASE remains the original consent receipt's immutable source anchor.
const SOURCE_PARENT='b28b6c2de2da30f34b0e6e6abb96b4d238d84af7';
const ORIGIN='https://ays-orbit-360-lab--gi-i66-rc-42868854629-abj14q6n.web.app';
const ADVISOR='ase-paula-osorio',TENANT='alianzas-soluciones',VERSION='2.0';
const CLAUSES=Object.freeze(['confidencialidad','tratamiento_datos','descargo_ia']);
const TERMS_SHA256='485b07887091063cc7a5d1dc8f11a9bb547f2ef059490bb04d4acee73404f6b2';
const REVIEW_SHA256='c368d591a5b533a4c047cbffa265171e464c3574a70520398b967f243588d0e9';

// Only these source-owned diagnostic codes may leave the signed session.
const LEGAL_FAILURE_CHECKS=Object.freeze([
  'DIRECTION_LEGAL_ACCEPTANCE_NOT_PERSISTED',
  'DIRECTION_LEGAL_ACCEPTANCE_TIME_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_ACTOR_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_CLAUSES_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_COUNTRY_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_ORIGIN_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_SCOPE_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_TYPE_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_VERSION_MISMATCH',
  'DIRECTION_LEGAL_CANDIDATE_DECISION_PIN_MISMATCH',
  'DIRECTION_LEGAL_CANDIDATE_NOT_AUTHORIZED',
  'DIRECTION_LEGAL_CANDIDATE_SOURCE_MISMATCH',
  'DIRECTION_LEGAL_CONSTRAINT_MISMATCH',
  'DIRECTION_LEGAL_COUNTRY_NOT_READY',
  'DIRECTION_LEGAL_COUNTRY_OPTIONS_MISMATCH',
  'DIRECTION_LEGAL_COUNTRY_SELECTION_NOT_FRESH',
  'DIRECTION_LEGAL_COUNTRY_SELECTION_NOT_REQUIRED',
  'DIRECTION_LEGAL_COUNTRY_SELECTION_TEXT_MUST_WAIT',
  'DIRECTION_LEGAL_DECISION_DATE_MISMATCH',
  'DIRECTION_LEGAL_DECISION_IS_NOT_FOR_THIS_SUCCESSOR',
  'DIRECTION_LEGAL_DECISION_MISMATCH',
  'DIRECTION_LEGAL_DECISION_NOT_IN_SOURCE',
  'DIRECTION_LEGAL_DISABLED_BUTTON_REQUIRED',
  'DIRECTION_LEGAL_DISPLAYED_TEXT_CHANGED',
  'DIRECTION_LEGAL_FABRICATED_IP_FORBIDDEN',
  'DIRECTION_LEGAL_FRESH_CONTEXT_REQUIRED',
  'DIRECTION_LEGAL_GENUINE_ACCEPTANCE_REQUIRED',
  'DIRECTION_LEGAL_HOSTED_OWNER_MISMATCH',
  'DIRECTION_LEGAL_INTERNAL_CLAUSES_ONLY',
  'DIRECTION_LEGAL_IP_PROVENANCE_REQUIRED',
  'DIRECTION_LEGAL_NORMAL_UI_REQUIRED',
  'DIRECTION_LEGAL_ONE_VISIBLE_GATE_REQUIRED',
  'DIRECTION_LEGAL_ORIGIN_MISMATCH',
  'DIRECTION_LEGAL_OTHER_ACTOR_FORBIDDEN',
  'DIRECTION_LEGAL_OTHER_ADVISOR_FORBIDDEN',
  'DIRECTION_LEGAL_OWNER_READBACK_FAILED',
  'DIRECTION_LEGAL_PACKAGE_ROOT_REQUIRED',
  'DIRECTION_LEGAL_PACKAGE_SOURCE_MISMATCH',
  'DIRECTION_LEGAL_PREVIEW_GATE_NOT_ACTIVE',
  'DIRECTION_LEGAL_PREVIEW_ONLY',
  'DIRECTION_LEGAL_RECEIPT_DIGEST_REQUIRED',
  'DIRECTION_LEGAL_RECEIPT_SCHEMA',
  'DIRECTION_LEGAL_REVIEW_DOCUMENT_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_ADVISOR_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_CLAUSE_SET_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_COUNTRY_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_ORIGIN_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_ROLE_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_SCOPE_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_TENANT_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_VERSION_MISMATCH',
  'DIRECTION_LEGAL_SCOPE_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_ACTOR_REQUIRED',
  'DIRECTION_LEGAL_SIGNED_PROOF_CLAUSES_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_DECISION_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_IDENTITY_REQUIRED',
  'DIRECTION_LEGAL_SIGNED_PROOF_NOT_ACCEPTED',
  'DIRECTION_LEGAL_SIGNED_PROOF_ORIGIN_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_RECEIPT_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_REQUIRED',
  'DIRECTION_LEGAL_SIGNED_PROOF_SCOPE_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_SOURCE_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_TERMS_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_TIME_REQUIRED',
  'DIRECTION_LEGAL_SIGNED_PROOF_VERSION_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_UID_MISMATCH',
  'DIRECTION_LEGAL_SOURCE_BASE_MISMATCH',
  'DIRECTION_LEGAL_SOURCE_REQUIRED',
  'DIRECTION_LEGAL_SUBJECT_MISMATCH',
  'DIRECTION_LEGAL_TERMS_MISMATCH',
  'DIRECTION_LEGAL_UNCHECKED_BOX_REQUIRED'
]);
const LEGAL_FAILURE_SUBSTAGES=Object.freeze(['AUTHORITY_VALIDATION','OWNER_READBACK','VISIBLE_GATE_WAIT',
  'PRE_CLICK_PRESENTATION','COUNTRY_SELECTION','CHECKBOX_ACTION','BUTTON_ACTION','POST_CLICK_GATE_CLOSE','POST_CLICK_PERSISTENCE']);
function safeLegalFailureSubstage(value){return LEGAL_FAILURE_SUBSTAGES.includes(value)?value:null;}
const normalize=v=>String(v||'').replace(/\s+/g,' ').trim();
const role=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const digest=v=>hash(JSON.stringify(stable(v)));

// The digest covers all text of each displayed clause, including jurisdiction,
// framework and authority. It excludes only whitespace and presentation markup.
function projectCatalog(catalog){
  return CLAUSES.map(key=>{const c=catalog[key],m=c.meta||{},rows=[];
    for(const [field,label] of [['vigencia','Vigencia:'],['ley','Ley aplicable:'],['foro','Jurisdicción:'],['norma','Marco:'],['autoridad','Autoridad:']])
      if(m[field])rows.push(label+' '+m[field]);
    return{title:normalize(c.ic+' '+c.titulo),intro:normalize(c.intro),
      blocks:(c.bloques||[]).map(b=>({heading:normalize(b.h),paragraph:normalize(b.p),items:(b.items||[]).map(normalize)})),metadata:normalize(rows.join(' · '))};
  });
}
function validateDecision({receipt,receiptSha256,candidate,cfg,sourceParent,actor}){
  assert.match(receiptSha256,/^[a-f0-9]{64}$/,'DIRECTION_LEGAL_RECEIPT_DIGEST_REQUIRED');
  assert.equal(cfg.phase,'PREVIEW','DIRECTION_LEGAL_PREVIEW_ONLY');
  assert.equal(cfg.origin,ORIGIN,'DIRECTION_LEGAL_ORIGIN_MISMATCH');
  assert.match(cfg.source,/^[a-f0-9]{40}$/,'DIRECTION_LEGAL_SOURCE_REQUIRED');
  assert.equal(sourceParent,SOURCE_PARENT,'DIRECTION_LEGAL_DECISION_IS_NOT_FOR_THIS_SUCCESSOR');
  assert.equal(candidate?.sourceSha,cfg.source,'DIRECTION_LEGAL_CANDIDATE_SOURCE_MISMATCH');
  assert.equal(candidate?.status,'EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED','DIRECTION_LEGAL_CANDIDATE_NOT_AUTHORIZED');
  assert.deepEqual(candidate?.legalAcceptance,{receiptPath:RECEIPT,receiptSha256,decisionId:DECISION,sourceSha:cfg.source,phase:'PREVIEW',actorRole:'direccion'},'DIRECTION_LEGAL_CANDIDATE_DECISION_PIN_MISMATCH');
  assert.equal(receipt.schema,'I6_6_EXPLICIT_DIRECTION_PREVIEW_LEGAL_ACCEPTANCE_V1','DIRECTION_LEGAL_RECEIPT_SCHEMA');
  assert.equal(receipt.decisionId,DECISION,'DIRECTION_LEGAL_DECISION_MISMATCH');
  assert.equal(receipt.sourceBaseHead,SOURCE_BASE,'DIRECTION_LEGAL_SOURCE_BASE_MISMATCH');
  assert.equal(receipt.decision?.status,'EXPLICIT_ACCEPTANCE','DIRECTION_LEGAL_GENUINE_ACCEPTANCE_REQUIRED');
  assert.equal(receipt.decision?.response,'Acepto','DIRECTION_LEGAL_GENUINE_ACCEPTANCE_REQUIRED');
  assert.equal(receipt.decision?.receivedLocalDate,'2026-11-16','DIRECTION_LEGAL_DECISION_DATE_MISMATCH');
  assert.equal(receipt.decision?.reviewDocumentSha256,REVIEW_SHA256,'DIRECTION_LEGAL_REVIEW_DOCUMENT_MISMATCH');
  assert.deepEqual(receipt.subject,{advisorId:ADVISOR,role:'direccion',tenantId:TENANT,country:'GT'},'DIRECTION_LEGAL_SUBJECT_MISMATCH');
  assert.deepEqual(receipt.environment,{phase:'PREVIEW',origin:ORIGIN},'DIRECTION_LEGAL_SCOPE_MISMATCH');
  assert.deepEqual(receipt.legal,{version:VERSION,clauseIds:[...CLAUSES],termsProjectionSha256:TERMS_SHA256},'DIRECTION_LEGAL_TERMS_MISMATCH');
  assert.deepEqual(receipt.constraints,{ordinaryUiOnly:true,otherActors:false,live:false,futureSourceSuccessors:false,storageSeeding:false,gateBypass:false},'DIRECTION_LEGAL_CONSTRAINT_MISMATCH');
  assert.equal(role(actor.role),'direccion','DIRECTION_LEGAL_OTHER_ACTOR_FORBIDDEN');
  assert.equal(actor.advisorId,ADVISOR,'DIRECTION_LEGAL_OTHER_ADVISOR_FORBIDDEN');
  assert.ok(typeof actor.uid==='string'&&actor.uid.length>0,'DIRECTION_LEGAL_SIGNED_ACTOR_REQUIRED');
  return true;
}
function validateAcceptanceProof(proof,candidate){
  assert.ok(proof,'DIRECTION_LEGAL_SIGNED_PROOF_REQUIRED');
  assert.equal(proof.status,'EXPLICIT_OWNER_DECISION_APPLIED_BY_NORMAL_UI','DIRECTION_LEGAL_SIGNED_PROOF_NOT_ACCEPTED');
  assert.equal(proof.decisionId,DECISION,'DIRECTION_LEGAL_SIGNED_PROOF_DECISION_MISMATCH');
  assert.equal(proof.receiptSha256,candidate.legalAcceptance?.receiptSha256,'DIRECTION_LEGAL_SIGNED_PROOF_RECEIPT_MISMATCH');
  assert.equal(proof.sourceSha,candidate.sourceSha,'DIRECTION_LEGAL_SIGNED_PROOF_SOURCE_MISMATCH');
  assert.equal(proof.origin,ORIGIN,'DIRECTION_LEGAL_SIGNED_PROOF_ORIGIN_MISMATCH');
  assert.equal(proof.version,VERSION,'DIRECTION_LEGAL_SIGNED_PROOF_VERSION_MISMATCH');
  assert.deepEqual(proof.clauseIds,[...CLAUSES],'DIRECTION_LEGAL_SIGNED_PROOF_CLAUSES_MISMATCH');
  assert.equal(proof.termsProjectionSha256,TERMS_SHA256,'DIRECTION_LEGAL_SIGNED_PROOF_TERMS_MISMATCH');
  for(const key of ['actorUidSha256','scopeSha256'])assert.match(String(proof[key]||''),/^[a-f0-9]{64}$/,'DIRECTION_LEGAL_SIGNED_PROOF_IDENTITY_REQUIRED');
  assert.ok(Number.isFinite(Date.parse(proof.acceptedAt)),'DIRECTION_LEGAL_SIGNED_PROOF_TIME_REQUIRED');
  for(const key of ['acceptedForOtherActors','liveAcceptance','storageSeeded','gateBypassed'])assert.equal(proof[key],false,'DIRECTION_LEGAL_SIGNED_PROOF_SCOPE_MISMATCH');
  return true;
}
function validatePresentationIdentity(snapshot,actor){
  assert.equal(snapshot.origin,ORIGIN,'DIRECTION_LEGAL_RUNTIME_ORIGIN_MISMATCH');
  assert.equal(snapshot.actorUid,actor.uid,'DIRECTION_LEGAL_SIGNED_UID_MISMATCH');
  assert.equal(snapshot.advisorId,ADVISOR,'DIRECTION_LEGAL_RUNTIME_ADVISOR_MISMATCH');
  assert.equal(role(snapshot.role),'direccion','DIRECTION_LEGAL_RUNTIME_ROLE_MISMATCH');
  assert.equal(snapshot.tenantId,TENANT,'DIRECTION_LEGAL_RUNTIME_TENANT_MISMATCH');
  assert.equal(snapshot.scope,'user:'+(snapshot.email||snapshot.actorUid),'DIRECTION_LEGAL_RUNTIME_SCOPE_MISMATCH');
  assert.equal(snapshot.gateCount,1,'DIRECTION_LEGAL_ONE_VISIBLE_GATE_REQUIRED');
  assert.equal(snapshot.version,VERSION,'DIRECTION_LEGAL_RUNTIME_VERSION_MISMATCH');
  assert.equal(snapshot.type,'interno','DIRECTION_LEGAL_INTERNAL_CLAUSES_ONLY');
  assert.deepEqual(snapshot.clauseIds,[...CLAUSES],'DIRECTION_LEGAL_RUNTIME_CLAUSE_SET_MISMATCH');
  assert.equal(snapshot.previousAcceptance,null,'DIRECTION_LEGAL_FRESH_CONTEXT_REQUIRED');
  assert.equal(snapshot.checked,false,'DIRECTION_LEGAL_UNCHECKED_BOX_REQUIRED');
  assert.equal(snapshot.buttonDisabled,true,'DIRECTION_LEGAL_DISABLED_BUTTON_REQUIRED');
  return true;
}
function validatePresentation(snapshot,actor){
  validatePresentationIdentity(snapshot,actor);
  assert.equal(snapshot.country,'GT','DIRECTION_LEGAL_RUNTIME_COUNTRY_MISMATCH');
  assert.equal(digest(snapshot.terms),TERMS_SHA256,'DIRECTION_LEGAL_DISPLAYED_TEXT_CHANGED');
  if(snapshot.checkboxDisabled!==undefined)assert.equal(snapshot.checkboxDisabled,false,'DIRECTION_LEGAL_COUNTRY_NOT_READY');
  return true;
}
function validateCountrySelection(snapshot){
  assert.equal(snapshot.country,'','DIRECTION_LEGAL_COUNTRY_SELECTION_NOT_FRESH');
  assert.equal(snapshot.countrySelectionValue,'','DIRECTION_LEGAL_COUNTRY_SELECTION_NOT_FRESH');
  assert.deepEqual([...(snapshot.countryOptions||[])].sort(),['CO','GT'],'DIRECTION_LEGAL_COUNTRY_OPTIONS_MISMATCH');
  assert.equal(snapshot.checkboxDisabled,true,'DIRECTION_LEGAL_COUNTRY_SELECTION_NOT_REQUIRED');
  assert.equal(snapshot.terms.length,0,'DIRECTION_LEGAL_COUNTRY_SELECTION_TEXT_MUST_WAIT');
  return true;
}
function validateAccepted(record,actor,scope,startedAt,finishedAt){
  assert.ok(record&&record.aceptado===true,'DIRECTION_LEGAL_ACCEPTANCE_NOT_PERSISTED');
  assert.equal(record.version,VERSION,'DIRECTION_LEGAL_ACCEPTED_VERSION_MISMATCH');
  assert.equal(record.actorUid,actor.uid,'DIRECTION_LEGAL_ACCEPTED_ACTOR_MISMATCH');
  assert.equal(record.scopeId,scope,'DIRECTION_LEGAL_ACCEPTED_SCOPE_MISMATCH');
  assert.equal(record.origin,ORIGIN,'DIRECTION_LEGAL_ACCEPTED_ORIGIN_MISMATCH');
  assert.equal(record.pais,'GT','DIRECTION_LEGAL_ACCEPTED_COUNTRY_MISMATCH');
  assert.equal(record.tipo,'interno','DIRECTION_LEGAL_ACCEPTED_TYPE_MISMATCH');
  assert.deepEqual(record.clausulas,[...CLAUSES],'DIRECTION_LEGAL_ACCEPTED_CLAUSES_MISMATCH');
  assert.equal(record.acceptanceMethod,'VISIBLE_CHECKBOX_AND_BUTTON','DIRECTION_LEGAL_NORMAL_UI_REQUIRED');
  assert.equal(record.ip,null,'DIRECTION_LEGAL_FABRICATED_IP_FORBIDDEN');
  assert.equal(record.ipSource,'NOT_COLLECTED','DIRECTION_LEGAL_IP_PROVENANCE_REQUIRED');
  const at=Date.parse(record.fecha);
  assert.ok(Number.isFinite(at)&&at>=startedAt&&at<=finishedAt,'DIRECTION_LEGAL_ACCEPTANCE_TIME_MISMATCH');
  return true;
}
async function acceptDirectionPreviewLegal({page,actor,cfg}){
  let legalSubstage='AUTHORITY_VALIDATION';
  try{
  const receiptBytes=fs.readFileSync(RECEIPT),receipt=JSON.parse(receiptBytes),receiptSha256=hash(receiptBytes);
  const control=JSON.parse(fs.readFileSync(CONTROL,'utf8'));
  assert.equal(control.status,'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED','DIRECTION_LEGAL_PREVIEW_GATE_NOT_ACTIVE');
  const sourceParent=execFileSync('git',['rev-parse',cfg.source+'^'],{encoding:'utf8'}).trim();
  validateDecision({receipt,receiptSha256,candidate:control.operationalReleaseCandidate,cfg,sourceParent,actor});
  assert.equal(hash(execFileSync('git',['show',cfg.source+':'+RECEIPT])),receiptSha256,'DIRECTION_LEGAL_DECISION_NOT_IN_SOURCE');
  assert.ok(cfg.packageRoot&&path.isAbsolute(cfg.packageRoot),'DIRECTION_LEGAL_PACKAGE_ROOT_REQUIRED');
  legalSubstage='OWNER_READBACK';
  const bundled=fs.readFileSync(path.join(cfg.packageRoot,'bundle/site/core/legal.js'));
  const source=execFileSync('git',['show',cfg.source+':orbit360-platform/core/legal.js']);
  assert.equal(hash(bundled),hash(source),'DIRECTION_LEGAL_PACKAGE_SOURCE_MISMATCH');
  const response=await fetch(cfg.origin+'/core/legal.js',{headers:{'cache-control':'no-cache'}});
  assert.equal(response.status,200,'DIRECTION_LEGAL_OWNER_READBACK_FAILED');
  assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(bundled),'DIRECTION_LEGAL_HOSTED_OWNER_MISMATCH');
  legalSubstage='VISIBLE_GATE_WAIT';
  await page.waitForSelector('[data-legal-gate]',{state:'visible',timeout:10000});
  legalSubstage='PRE_CLICK_PRESENTATION';
  const readPresentation=()=>page.evaluate(()=>{
    const w=v=>String(v||'').replace(/\s+/g,' ').trim(),gates=document.querySelectorAll('[data-legal-gate]'),gate=gates[0],u=Orbit.auth.user();
    const scope=gate.getAttribute('data-legal-gate'),countrySelect=gate.querySelector('#lg-country');
    return{origin:location.origin,actorUid:u.uid,advisorId:u.advisorId,role:Orbit.session.rol(),tenantId:u.tenantId,email:u.email||'',scope,gateCount:gates.length,
      version:gate.getAttribute('data-legal-version'),type:gate.getAttribute('data-legal-type'),country:gate.getAttribute('data-legal-country'),
      clauseIds:(gate.getAttribute('data-legal-clauses')||'').split(' '),previousAcceptance:Orbit.legal.aceptaciones()[scope]||null,
      countrySelectionRequired:gate.getAttribute('data-legal-country-required')==='1',countrySelectionValue:countrySelect?.value||'',
      countryOptions:countrySelect?[...countrySelect.options].map(option=>option.value).filter(Boolean):[],
      checked:gate.querySelector('#lg-chk').checked,checkboxDisabled:gate.querySelector('#lg-chk').disabled,buttonDisabled:gate.querySelector('#lg-ok').disabled,
      terms:[...gate.querySelectorAll('.lg-clausula')].map(c=>({title:w(c.querySelector('.lg-cl-t')?.textContent),intro:w(c.querySelector('.lg-intro')?.textContent),
        blocks:[...c.querySelectorAll('.lg-bloque')].map(b=>({heading:w(b.querySelector('.lg-bl-h')?.textContent),paragraph:w(b.querySelector('p')?.textContent),items:[...b.querySelectorAll('li')].map(li=>w(li.textContent))})),
        metadata:w(c.querySelector('.lg-meta')?.textContent)}))};
  });
  let snapshot=await readPresentation();
  validatePresentationIdentity(snapshot,actor);
  if(snapshot.countrySelectionRequired){
    validateCountrySelection(snapshot);
    legalSubstage='COUNTRY_SELECTION';
    await page.locator('[data-legal-gate]').locator('#lg-country').selectOption(receipt.subject.country);
    legalSubstage='PRE_CLICK_PRESENTATION';
    snapshot=await readPresentation();
  }
  validatePresentation(snapshot,actor);
  const startedAt=Date.now(),gate=page.locator('[data-legal-gate]');
  legalSubstage='CHECKBOX_ACTION';
  await gate.locator('#lg-chk').check();
  legalSubstage='BUTTON_ACTION';
  await gate.locator('#lg-ok').click();
  legalSubstage='POST_CLICK_GATE_CLOSE';
  await page.waitForSelector('[data-legal-gate]',{state:'detached',timeout:10000});
  legalSubstage='POST_CLICK_PERSISTENCE';
  const record=await page.evaluate(scope=>Orbit.legal.aceptaciones()[scope]||null,snapshot.scope);
  validateAccepted(record,actor,snapshot.scope,startedAt,Date.now());
  return{status:'EXPLICIT_OWNER_DECISION_APPLIED_BY_NORMAL_UI',decisionId:DECISION,receiptSha256,
    sourceSha:cfg.source,origin:ORIGIN,version:VERSION,clauseIds:[...CLAUSES],termsProjectionSha256:TERMS_SHA256,
    actorUidSha256:hash(actor.uid),scopeSha256:hash(snapshot.scope),acceptedAt:record.fecha,
    acceptedForOtherActors:false,liveAcceptance:false,storageSeeded:false,gateBypassed:false};
  }catch(error){
    // The substage identifies the attempted operation. In particular a failed
    // click does not establish whether its handler ran or acceptance persisted.
    if(error&&typeof error==='object')error.directionLegalSubstage=legalSubstage;
    throw error;
  }
}
module.exports={CONTROL,RECEIPT,DECISION,SOURCE_BASE,SOURCE_PARENT,ORIGIN,ADVISOR,TENANT,VERSION,CLAUSES,TERMS_SHA256,REVIEW_SHA256,
  LEGAL_FAILURE_CHECKS,LEGAL_FAILURE_SUBSTAGES,safeLegalFailureSubstage,digest,projectCatalog,validateDecision,validatePresentationIdentity,validatePresentation,validateCountrySelection,validateAccepted,validateAcceptanceProof,acceptDirectionPreviewLegal};
