'use strict';

const C=require('./cotcomp-gravicentra-authority-contract-s481');

const VERSION='ays-cotcomp-gravicentra-provider-consumer-s484-v1.0';
const PROVIDER_CONTRACT_VERSION='gravicentra-quote-authority-v1';
const AUTHORITY='GRAVICENTRA';

const FIELD_TYPES=Object.freeze([
  'TEXT','NUMBER','INTEGER','BOOLEAN','DATE','SELECT','MULTISELECT',
  'MONEY','PERCENT','IDENTIFIER','REFERENCE'
]);

function clean(v){return String(v==null?'':v).trim();}
function upper(v){return clean(v).toUpperCase();}
function clone(v){return JSON.parse(JSON.stringify(v==null?null:v));}
function arr(v){return Array.isArray(v)?v.slice():[];}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?clone(v):{};}

function normalizeScope(input={}){
  return {
    country:upper(input.country||'*')||'*',
    lineOfBusiness:upper(input.lineOfBusiness||'*')||'*',
    productId:clean(input.productId||'*')||'*',
    riskType:upper(input.riskType||'*')||'*',
    insurerId:clean(input.insurerId||'*')||'*',
    planId:clean(input.planId||'*')||'*'
  };
}

function normalizeCondition(input={}){
  return {
    fieldKey:clean(input.fieldKey),
    operator:upper(input.operator||'EQUALS'),
    value:input.value===undefined?null:clone(input.value)
  };
}

function normalizeField(input={}){
  const type=upper(input.type||'TEXT');
  return {
    key:clean(input.key),
    label:clean(input.label),
    type:FIELD_TYPES.includes(type)?type:'TEXT',
    required:input.required===true,
    source:upper(input.source||'GRAVICENTRA_SCHEMA'),
    optionsRef:clean(input.optionsRef),
    knowledgeRef:clean(input.knowledgeRef),
    privacyClass:upper(input.privacyClass||'STANDARD'),
    helpText:clean(input.helpText),
    conditions:arr(input.conditions).map(normalizeCondition),
    ui:obj(input.ui)
  };
}

function normalizeIntakeSchema(input={}){
  return {
    schemaId:clean(input.schemaId),
    schemaVersion:clean(input.schemaVersion),
    scope:normalizeScope(input.scope||{}),
    fields:arr(input.fields).map(normalizeField),
    knowledgeRefs:arr(input.knowledgeRefs).map(clean).filter(Boolean),
    effectiveFrom:clean(input.effectiveFrom),
    effectiveTo:clean(input.effectiveTo),
    enabled:input.enabled===true
  };
}

function normalizeProviderManifest(input={}){
  const base=C.normalizeManifest(input);
  return {
    ...base,
    schemaVersion:VERSION,
    providerContractVersion:clean(input.providerContractVersion||input.contractVersion),
    providerDeploymentAuthorized:input.providerDeploymentAuthorized===true,
    cotcompRealTransportAuthorized:input.cotcompRealTransportAuthorized===true,
    capabilities:obj(input.capabilities),
    intakeSchemas:arr(input.intakeSchemas).map(normalizeIntakeSchema),
    knowledgeRefs:arr(input.knowledgeRefs).map(clean).filter(Boolean)
  };
}

function validateProviderManifest(m){
  const base=C.validateManifest(m);
  const errors=[...base.errors];
  if(clean(m&&m.providerContractVersion)!==PROVIDER_CONTRACT_VERSION){
    errors.push('PROVIDER_CONTRACT_VERSION_INVALID');
  }
  if(m&&m.providerDeploymentAuthorized===true){
    errors.push('PROVIDER_DEPLOYMENT_NOT_AUTHORIZED_FOR_S484');
  }
  if(m&&m.cotcompRealTransportAuthorized===true){
    errors.push('COTCOMP_REAL_TRANSPORT_NOT_AUTHORIZED_FOR_S484');
  }
  const ids=new Set();
  for(const s of arr(m&&m.intakeSchemas)){
    if(!clean(s.schemaId)) errors.push('INTAKE_SCHEMA_ID_REQUIRED');
    if(!clean(s.schemaVersion)) errors.push('INTAKE_SCHEMA_VERSION_REQUIRED');
    if(ids.has(s.schemaId)) errors.push('INTAKE_SCHEMA_ID_DUPLICATED');
    ids.add(s.schemaId);
    for(const f of arr(s.fields)){
      if(!clean(f.key)) errors.push('FIELD_KEY_REQUIRED');
      if(!clean(f.label)) errors.push('FIELD_LABEL_REQUIRED');
      if(!FIELD_TYPES.includes(upper(f.type))) errors.push('FIELD_TYPE_INVALID');
    }
  }
  return {ok:errors.length===0,errors};
}

function normalizeConsumerContext(input={}){
  return {
    tenantId:clean(input.tenantId),
    country:upper(input.country),
    journeyId:clean(input.journeyId),
    lineOfBusiness:upper(input.lineOfBusiness),
    productId:clean(input.productId),
    riskType:upper(input.riskType),
    insurerId:clean(input.insurerId),
    planId:clean(input.planId)
  };
}

function scopeMatchValue(rule,value){
  const r=clean(rule);
  if(!r||r==='*') return true;
  return upper(r)===upper(value);
}

function schemaSpecificity(scope={}){
  return ['country','lineOfBusiness','productId','riskType','insurerId','planId']
    .reduce((n,k)=>n+(clean(scope[k])&&clean(scope[k])!=='*'?1:0),0);
}

function resolveIntakeSchema(manifest,contextInput={}){
  const m=normalizeProviderManifest(manifest||{});
  const ctx=normalizeConsumerContext(contextInput);
  const candidates=m.intakeSchemas
    .filter(s=>s.enabled===true)
    .filter(s=>
      scopeMatchValue(s.scope.country,ctx.country)&&
      scopeMatchValue(s.scope.lineOfBusiness,ctx.lineOfBusiness)&&
      scopeMatchValue(s.scope.productId,ctx.productId)&&
      scopeMatchValue(s.scope.riskType,ctx.riskType)&&
      scopeMatchValue(s.scope.insurerId,ctx.insurerId)&&
      scopeMatchValue(s.scope.planId,ctx.planId)
    )
    .sort((a,b)=>schemaSpecificity(b.scope)-schemaSpecificity(a.scope)||
      a.schemaId.localeCompare(b.schemaId));

  if(!candidates.length){
    return {status:'REQUIRES_PROVIDER_SCHEMA',schema:null,context:ctx};
  }
  return {status:'SCHEMA_RESOLVED',schema:clone(candidates[0]),context:ctx};
}

function conditionSatisfied(condition,answers){
  const actual=answers[condition.fieldKey];
  const op=upper(condition.operator);
  if(op==='EQUALS') return actual===condition.value;
  if(op==='NOT_EQUALS') return actual!==condition.value;
  if(op==='IN') return Array.isArray(condition.value)&&condition.value.includes(actual);
  if(op==='NOT_IN') return Array.isArray(condition.value)&&!condition.value.includes(actual);
  if(op==='PRESENT') return actual!==undefined&&actual!==null&&clean(actual)!=='';
  if(op==='ABSENT') return actual===undefined||actual===null||clean(actual)==='';
  return false;
}

function buildCaptureState(schemaInput={},answersInput={}){
  const schema=normalizeIntakeSchema(schemaInput);
  const answers=obj(answersInput);
  const visibleFields=schema.fields.filter(f=>
    !f.conditions.length||f.conditions.every(c=>conditionSatisfied(c,answers))
  );
  const requiredMissing=visibleFields
    .filter(f=>f.required)
    .filter(f=>{
      const v=answers[f.key];
      return v===undefined||v===null||clean(v)==='';
    })
    .map(f=>f.key);
  return {
    schemaId:schema.schemaId,
    schemaVersion:schema.schemaVersion,
    visibleFields,
    requiredMissing,
    complete:requiredMissing.length===0
  };
}

function normalizeSchemaDrivenQuoteRequest(input={}){
  const context=normalizeConsumerContext(input.context||input);
  return {
    schemaVersion:VERSION,
    providerContractVersion:PROVIDER_CONTRACT_VERSION,
    authorityTarget:AUTHORITY,
    tenantId:context.tenantId,
    country:context.country,
    journeyId:context.journeyId,
    correlationId:clean(input.correlationId),
    idempotencyKey:clean(input.idempotencyKey),
    manifestConfigurationVersion:clean(input.manifestConfigurationVersion),
    intakeSchemaRef:{
      schemaId:clean(input.intakeSchemaRef&&input.intakeSchemaRef.schemaId),
      schemaVersion:clean(input.intakeSchemaRef&&input.intakeSchemaRef.schemaVersion)
    },
    domainContext:{
      lineOfBusiness:context.lineOfBusiness,
      productId:context.productId,
      riskType:context.riskType,
      insurerId:context.insurerId,
      planId:context.planId
    },
    answers:obj(input.answers),
    coveragePreferences:obj(input.coveragePreferences),
    paymentPreference:obj(input.paymentPreference),
    consentRefs:arr(input.consentRefs).map(clean).filter(Boolean),
    knowledgeRefs:arr(input.knowledgeRefs).map(clean).filter(Boolean)
  };
}

function validateSchemaDrivenQuoteRequest(q){
  const errors=[];
  if(!q||q.providerContractVersion!==PROVIDER_CONTRACT_VERSION) errors.push('PROVIDER_CONTRACT_VERSION_INVALID');
  if(!q||q.authorityTarget!==AUTHORITY) errors.push('AUTHORITY_TARGET_INVALID');
  if(!clean(q&&q.tenantId)) errors.push('TENANT_REQUIRED');
  if(!clean(q&&q.country)) errors.push('COUNTRY_REQUIRED');
  if(!clean(q&&q.journeyId)) errors.push('JOURNEY_REQUIRED');
  if(!clean(q&&q.correlationId)) errors.push('CORRELATION_REQUIRED');
  if(!clean(q&&q.idempotencyKey)) errors.push('IDEMPOTENCY_REQUIRED');
  if(!clean(q&&q.intakeSchemaRef&&q.intakeSchemaRef.schemaId)) errors.push('INTAKE_SCHEMA_ID_REQUIRED');
  if(!clean(q&&q.intakeSchemaRef&&q.intakeSchemaRef.schemaVersion)) errors.push('INTAKE_SCHEMA_VERSION_REQUIRED');
  if(!clean(q&&q.domainContext&&q.domainContext.lineOfBusiness) &&
     !clean(q&&q.domainContext&&q.domainContext.productId)){
    errors.push('PRODUCT_OR_LINE_CONTEXT_REQUIRED');
  }
  if(!q||!q.answers||typeof q.answers!=='object'||Array.isArray(q.answers)) errors.push('ANSWERS_OBJECT_REQUIRED');
  for(const forbidden of ['premium','tax','taxes','tariffRate','installmentValue','totalPremium']){
    if(Object.prototype.hasOwnProperty.call(q.answers||{},forbidden)){
      errors.push('FINANCIAL_AUTHORITY_FIELD_FORBIDDEN_IN_ANSWERS');
    }
  }
  return {ok:errors.length===0,errors};
}

function normalizeProviderQuoteResponse(raw={},request={}){
  const proposals=arr(raw.proposals).map(C.normalizeProposalProjection);
  const comparisonFacts=arr(raw.comparisonFacts).map(C.normalizeComparisonFact);
  return {
    schemaVersion:VERSION,
    providerContractVersion:clean(raw.providerContractVersion||raw.contractVersion),
    authority:upper(raw.authority),
    correlationId:clean(raw.correlationId),
    idempotencyKey:clean(raw.idempotencyKey),
    status:upper(raw.status),
    executionMode:upper(raw.executionMode),
    blockers:arr(raw.blockers).map(clone),
    proposals,
    comparisonFacts,
    eligibleProposalIds:proposals.filter(p=>C.eligibleForComparison(p).eligible).map(p=>p.proposalId),
    responseTrace:obj(raw.responseTrace),
    requestRef:{
      correlationId:clean(request.correlationId),
      idempotencyKey:clean(request.idempotencyKey)
    }
  };
}

function validateProviderQuoteResponse(r,request={}){
  const errors=[];
  if(!r||r.providerContractVersion!==PROVIDER_CONTRACT_VERSION) errors.push('PROVIDER_CONTRACT_VERSION_INVALID');
  if(!r||r.authority!==AUTHORITY) errors.push('QUOTE_RESPONSE_AUTHORITY_INVALID');
  if(clean(r&&r.correlationId)!==clean(request&&request.correlationId)) errors.push('CORRELATION_MISMATCH');
  if(clean(r&&r.idempotencyKey)!==clean(request&&request.idempotencyKey)) errors.push('IDEMPOTENCY_MISMATCH');
  for(const p of arr(r&&r.proposals)){
    const v=C.validateProposalProjection(p);
    if(!v.ok) errors.push(...v.errors.map(x=>'PROPOSAL_'+x));
  }
  for(const f of arr(r&&r.comparisonFacts)){
    const v=C.validateComparisonFact(f);
    if(!v.ok) errors.push(...v.errors.map(x=>'FACT_'+x));
  }
  return {ok:errors.length===0,errors};
}

function prepareSelectionHandoff(input={}){
  const s=C.normalizeSelectionHandoff(input);
  const v=C.validateSelectionHandoff(s);
  if(!v.ok){
    const e=new Error(v.errors.includes('EXPLICIT_USER_CHOICE_REQUIRED')
      ?'EXPLICIT_USER_CHOICE_REQUIRED'
      :'S484_SELECTION_INVALID');
    e.details=v.errors;
    throw e;
  }
  return {
    ...s,
    providerContractVersion:PROVIDER_CONTRACT_VERSION
  };
}

function createSourceOnlyConsumer(transport){
  if(!transport||transport.mode!=='FIXTURE_SOURCE_ONLY'){
    throw new Error('S484_REAL_TRANSPORT_FAIL_CLOSED');
  }
  for(const fn of ['getManifest','quote']){
    if(typeof transport[fn]!=='function') throw new Error('S484_FIXTURE_TRANSPORT_CONTRACT_REQUIRED');
  }

  return Object.freeze({
    async loadManifest(ctx={}){
      const m=normalizeProviderManifest(await transport.getManifest(clone(ctx)));
      const v=validateProviderManifest(m);
      if(!v.ok){
        const e=new Error('S484_PROVIDER_MANIFEST_INVALID');
        e.details=v.errors;
        throw e;
      }
      return m;
    },
    resolveSchema(manifest,ctx={}){
      return resolveIntakeSchema(manifest,ctx);
    },
    captureState(schema,answers={}){
      return buildCaptureState(schema,answers);
    },
    async requestQuote(input={}){
      const req=normalizeSchemaDrivenQuoteRequest(input);
      const qv=validateSchemaDrivenQuoteRequest(req);
      if(!qv.ok){
        const e=new Error('S484_QUOTE_REQUEST_INVALID');
        e.details=qv.errors;
        throw e;
      }
      const raw=await transport.quote(clone(req));
      const out=normalizeProviderQuoteResponse(raw,req);
      const rv=validateProviderQuoteResponse(out,req);
      if(!rv.ok){
        const e=new Error('S484_QUOTE_RESPONSE_INVALID');
        e.details=rv.errors;
        throw e;
      }
      return out;
    },
    prepareSelection:prepareSelectionHandoff
  });
}

function sourceOnlyPolicy(){
  return Object.freeze({
    providerContractVersion:PROVIDER_CONTRACT_VERSION,
    authority:AUTHORITY,
    schemaDriven:true,
    multiproduct:true,
    localTariffEngine:false,
    localFinancialRecalculation:false,
    localTaxOrFinanceDefaults:false,
    silentRanking:false,
    missingImpliesNotCovered:false,
    historicalProposalRecalculation:false,
    directBrowserProviderCalls:false,
    duplicatedKnowledgeBase:false,
    providerDeploymentAuthorized:false,
    cotcompRealTransportAuthorized:false,
    realTransport:'FAIL_CLOSED_UNTIL_LAB_TRANSPORT_PASS'
  });
}

module.exports=Object.freeze({
  VERSION,PROVIDER_CONTRACT_VERSION,AUTHORITY,FIELD_TYPES,
  normalizeScope,normalizeField,normalizeIntakeSchema,
  normalizeProviderManifest,validateProviderManifest,
  normalizeConsumerContext,resolveIntakeSchema,buildCaptureState,
  normalizeSchemaDrivenQuoteRequest,validateSchemaDrivenQuoteRequest,
  normalizeProviderQuoteResponse,validateProviderQuoteResponse,
  prepareSelectionHandoff,createSourceOnlyConsumer,sourceOnlyPolicy
});
