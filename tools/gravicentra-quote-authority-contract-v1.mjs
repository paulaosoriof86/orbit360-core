import fs from 'node:fs';
import vm from 'node:vm';

const paths = {
  contract:'orbit360-platform/core/quote-authority-contract-v1.js',
  adapter:'orbit360-platform/core/quote-comparison-p06-runtime-adapter-v1208.js',
  quotes:'orbit360-platform/core/quote-comparison-contracts-v1203.js',
  sourceGate:'orbit360-platform/modules/cotizador-v1203-source-gate.js',
  doc:'docs/ays/GRAVICENTRA_QUOTE_AUTHORITY_CONTRACT_v1_20261003.md'
};
const src=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,fs.readFileSync(p,'utf8')]));
const sandbox={window:{Orbit:{}},console,Date,URLSearchParams,Set,Map,Array,Object,String,Number,Boolean,Math,JSON,RegExp};
vm.createContext(sandbox);
vm.runInContext(src.contract,sandbox,{filename:paths.contract});
const C=sandbox.window.Orbit.quoteAuthorityContractV1;
const assertions={};
function need(k,v){assertions[k]=!!v;if(!v)throw new Error('QUOTE_AUTHORITY_V1:'+k);}

need('contractLoaded',!!C);
need('contractVersion',C.VERSION==='gravicentra-quote-authority-v1');
need('singleAuthority',C.FIELD_AUTHORITY.tariffAndCalculationRules==='GRAVICENTRA'&&C.FIELD_AUTHORITY.comparisonPresentation==='COTCOMP');
need('amountBasisEnum',C.AMOUNT_BASES.includes('gross_includes_tax_and_fees')&&C.AMOUNT_BASES.includes('requires_validation'));
need('noWebRecalc',C.rules.noWebFinancialRecalculation===true);
need('noGenericPublicFallback',C.rules.noGenericFinancialFallbackForPublicQuotes===true);
need('noSilentP06LegacyFallback',C.rules.noSilentP06ToLegacyFallbackForCotComp===true);
need('externalFinanceSeparated',C.rules.externalFinancingSeparatedFromInsurerInstallment===true);

const request={tenantId:'alianzas-soluciones',country:'GT',journey:'auto',riskId:'risk-1',correlationId:'corr-1',idempotencyKey:'idem-1',risk:{value:100000}};
const manifest={
 authorityContractVersion:'gravicentra-quote-authority-v1',configurationVersion:'cfg-1',catalogVersion:'cat-1',
 rulesDigest:'sha256:abc',generatedAt:'2026-10-03T15:00:00Z',validityFrom:'2026-01-01',validityTo:'2026-12-31',
 capabilities:{quote:true,comparison:true,selection:true}
};
need('manifestValid',C.validateManifest(manifest,{at:'2026-10-03'}).ok===true);
need('manifestVersionMismatchFails',C.validateManifest({...manifest,authorityContractVersion:'other'},{at:'2026-10-03'}).ok===false);
need('quoteRequestAcceptsPureIntent',C.validateQuoteRequest(request).ok===true);
need('quoteRequestRejectsFinancialOverride',C.validateQuoteRequest({...request,financialOverride:{tax:12}}).ok===false);

const trace={
 configurationVersion:'cfg-1',tariffVersion:'tar-1',sourceVersion:'src-1',providerBindingVersion:'bind-1',
 catalogVersion:'cat-1',rulesDigest:'sha256:abc',calculatedAt:'2026-10-03T15:00:00Z',
 validityFrom:'2026-01-01',validityTo:'2026-12-31',sourceDocumentId:'doc-1',ruleId:'rule-1',bindingId:'binding-1'
};
const financial={
 currency:'GTQ',amountBasis:'net',netPremium:1000,minimumPremiumApplied:0,issuanceExpense:50,
 expeditionExpense:0,assistance:0,discounts:0,other:0,insurerInstallmentSurcharge:0,externalFinanceCost:0,
 taxAmount:126,totalPremium:1176,payment:{insurerSettlementMode:'cash',customerPaymentMode:'cash',insurerInstallments:1},
 paymentOptions:[]
};
const proposal={
 proposalId:'prop-1',tenantId:'alianzas-soluciones',country:'GT',currency:'GTQ',insurerId:'asg-1',
 productId:'auto',riskId:'risk-1',origin:'tariff_rule',validationState:'VALIDATED',currentVersion:true,
 financial,trace,comparisonFacts:[{key:'rc',label:'Responsabilidad civil',state:'PRESENT',value:1000000}]
};
need('validatedProposalPasses',C.validateProposal(proposal,{at:'2026-10-03'}).ok===true);
need('missingTraceFails',C.validateProposal({...proposal,trace:{...trace,rulesDigest:''}},{at:'2026-10-03'}).ok===false);
need('requiresValidationBasisFails',C.validateProposal({...proposal,financial:{...financial,amountBasis:'requires_validation'}},{at:'2026-10-03'}).ok===false);
need('quoteResultValid',C.validateQuoteResult({authorityContractVersion:'gravicentra-quote-authority-v1',tenantId:'alianzas-soluciones',correlationId:'corr-1',idempotencyKey:'idem-1',requestDigest:'sha256:req',proposals:[proposal]},{at:'2026-10-03'}).ok===true);
need('quoteResultRejectsWebPremium',C.validateQuoteResult({authorityContractVersion:'gravicentra-quote-authority-v1',tenantId:'alianzas-soluciones',correlationId:'corr-1',idempotencyKey:'idem-1',requestDigest:'sha256:req',proposals:[proposal],webCalculatedPremium:1176},{at:'2026-10-03'}).ok===false);

const cmp=C.buildComparisonProjection([proposal,{...proposal,proposalId:'prop-2',insurerId:'asg-2'}],{at:'2026-10-03'});
need('comparisonProjectionPasses',cmp.ok===true&&cmp.proposals.length===2);
need('comparisonNoRanking',cmp.defaultRanking===null&&cmp.recommendation===null&&cmp.semantics.missingIsNotNotCovered===true);
need('selectionRequiresExplicitChoice',C.validateSelectionHandoff({tenantId:'alianzas-soluciones',caseId:'c',comparisonId:'x',proposalId:'p',correlationId:'co',idempotencyKey:'i'}).ok===false);
need('selectionValidExplicit',C.validateSelectionHandoff({tenantId:'alianzas-soluciones',caseId:'c',comparisonId:'x',proposalId:'p',correlationId:'co',idempotencyKey:'i',explicitUserChoice:true,state:'USER_SELECTED_FOR_CONTINUATION'}).ok===true);
need('selectionCannotAssertIssued',C.validateSelectionHandoff({tenantId:'alianzas-soluciones',caseId:'c',comparisonId:'x',proposalId:'p',correlationId:'co',idempotencyKey:'i',explicitUserChoice:true,state:'USER_SELECTED_FOR_CONTINUATION',issued:true}).ok===false);

need('adapterStrictPathExists',src.adapter.includes('calculateAuthoritative')&&src.adapter.includes("fallbackUsed: false"));
need('adapterStrictPathRequiresContract',src.adapter.includes('QUOTE_AUTHORITY_CONTRACT_NOT_LOADED'));
need('adapterStrictPathRequiresTrace',src.adapter.includes('QUOTE_AUTHORITY_TRACE_INCOMPLETE'));
need('legacyTaxCountryFallbackRemoved',!src.quotes.includes('const countryTax ='));
need('manualNetInferenceRemoved',!src.sourceGate.includes('total / (1 + taxPct / 100)'));
need('pdfNetInferenceRemoved',!src.sourceGate.includes("total / (1 + (context.pais === 'CO' ? .19 : .12))"));
need('manualBasisRequired',src.sourceGate.includes("basis === 'requires_validation'")&&src.sourceGate.includes('La fuente validada debe indicar prima neta y prima total'));
need('contractDocFrozen',src.doc.includes('GRAVICENTRA = QUOTE DOMAIN AUTHORITY')&&src.doc.includes('CotComp no mantiene un segundo motor tarifario'));

console.log(JSON.stringify({
 schema:'GRAVICENTRA_QUOTE_AUTHORITY_CONTRACT_V1_QA',
 status:'PASS',
 contractVersion:C.VERSION,
 assertions,
 operationalWrites:0,
 dataMutation:false,
 live:false
},null,2));
