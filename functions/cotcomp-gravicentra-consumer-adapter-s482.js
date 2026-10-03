'use strict';

const C=require('./cotcomp-gravicentra-authority-contract-s481');

const VERSION='ays-cotcomp-gravicentra-consumer-adapter-v1.0';

function clean(v){return String(v==null?'':v).trim();}
function clone(v){return JSON.parse(JSON.stringify(v==null?null:v));}
function stableJson(v){
  if(v===null||typeof v!=='object') return JSON.stringify(v);
  if(Array.isArray(v)) return '['+v.map(stableJson).join(',')+']';
  return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stableJson(v[k])).join(',')+'}';
}
function sha256(text){
  const crypto=require('crypto');
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function createConsumerAdapter(transport){
  if(!transport||typeof transport.getManifest!=='function'||typeof transport.quote!=='function'){
    throw new Error('S482_TRANSPORT_CONTRACT_REQUIRED');
  }

  async function loadManifest(ctx={}){
    const raw=await transport.getManifest(clone(ctx));
    const manifest=C.normalizeManifest(raw);
    const v=C.validateManifest(manifest);
    if(!v.ok){
      const e=new Error('S482_MANIFEST_INVALID');
      e.details=v.errors;
      throw e;
    }
    return manifest;
  }

  async function requestQuote(input={}){
    const req=C.normalizeQuoteRequest(input);
    const qv=C.validateQuoteRequest(req);
    if(!qv.ok){
      const e=new Error('S482_QUOTE_REQUEST_INVALID');
      e.details=qv.errors;
      throw e;
    }

    const requestDigest=sha256(stableJson(req));
    const raw=await transport.quote(clone(req));

    if(!raw||raw.authority!=='GRAVICENTRA'){
      throw new Error('S482_QUOTE_RESPONSE_AUTHORITY_INVALID');
    }
    if(clean(raw.correlationId)!==req.correlationId){
      throw new Error('S482_CORRELATION_MISMATCH');
    }
    if(clean(raw.idempotencyKey)!==req.idempotencyKey){
      throw new Error('S482_IDEMPOTENCY_MISMATCH');
    }

    const proposals=(Array.isArray(raw.proposals)?raw.proposals:[]).map(C.normalizeProposalProjection);
    const proposalValidation=proposals.map(p=>C.validateProposalProjection(p));
    if(proposalValidation.some(v=>!v.ok)){
      const e=new Error('S482_PROPOSAL_CONTRACT_INVALID');
      e.details=proposalValidation;
      throw e;
    }

    const facts=(Array.isArray(raw.comparisonFacts)?raw.comparisonFacts:[]).map(C.normalizeComparisonFact);
    const factValidation=facts.map(f=>C.validateComparisonFact(f));
    if(factValidation.some(v=>!v.ok)){
      const e=new Error('S482_COMPARISON_FACT_INVALID');
      e.details=factValidation;
      throw e;
    }

    return {
      schemaVersion:VERSION,
      authority:'GRAVICENTRA',
      correlationId:req.correlationId,
      idempotencyKey:req.idempotencyKey,
      requestDigestSha256:requestDigest,
      executionMode:clean(raw.executionMode).toUpperCase(),
      status:clean(raw.status).toUpperCase(),
      blockers:Array.isArray(raw.blockers)?clone(raw.blockers):[],
      proposals,
      comparisonFacts:facts,
      eligibleProposalIds:proposals.filter(p=>C.eligibleForComparison(p).eligible).map(p=>p.proposalId),
      responseTrace:clone(raw.responseTrace||{})
    };
  }

  function prepareSelection(input={}){
    const handoff=C.normalizeSelectionHandoff(input);
    const v=C.validateSelectionHandoff(handoff);
    if(!v.ok){
      const e=new Error(v.errors.includes('EXPLICIT_USER_CHOICE_REQUIRED')
        ?'EXPLICIT_USER_CHOICE_REQUIRED'
        :'S482_SELECTION_HANDOFF_INVALID');
      e.details=v.errors;
      throw e;
    }
    return handoff;
  }

  function reconcileConfigurationTransition(previousManifest,nextManifest,existingProposal){
    const prev=C.normalizeManifest(previousManifest);
    const next=C.normalizeManifest(nextManifest);
    const pv=C.validateManifest(prev);
    const nv=C.validateManifest(next);
    if(!pv.ok||!nv.ok) throw new Error('S482_MANIFEST_TRANSITION_INVALID');

    const proposal=C.normalizeProposalProjection(existingProposal);
    const pp=C.validateProposalProjection(proposal);
    if(!pp.ok) throw new Error('S482_EXISTING_PROPOSAL_INVALID');

    return {
      changed:prev.configurationVersion!==next.configurationVersion || prev.digestSha256!==next.digestSha256,
      newQuoteConfigurationVersion:next.configurationVersion,
      existingProposalConfigurationVersion:proposal.trace.configurationVersion,
      existingProposalTariffVersion:proposal.trace.tariffVersion,
      existingProposalRulesDigest:proposal.trace.rulesDigest,
      existingProposalRecalculated:false,
      webRedeployRequired:false
    };
  }

  return Object.freeze({loadManifest,requestQuote,prepareSelection,reconcileConfigurationTransition});
}

module.exports=Object.freeze({VERSION,createConsumerAdapter,stableJson,sha256});
