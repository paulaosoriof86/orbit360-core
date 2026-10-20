'use strict';
// B4-003 insurer source-backed catalog regression; synthetic, no Firebase or writes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('orbit360-platform/modules/aseguradoras.js','utf8');
const start=code.indexOf('  function sameInsurerRamo(');
const end=code.indexOf('  function visibleState(',start);
assert.ok(start>0&&end>start,'INSURER_KNOWLEDGE_CATALOG_FUNCTION_BOUNDARIES');
const sourceRows=[
 {id:'gt-premium',pais:'GT',ramo:'Automóviles',producto:'Vehículos',plan:'Plan Premium',documentId:'source-gt'},
 {id:'gt-other',pais:'GT',ramo:'Gastos Médicos',producto:'Salud Integral',plan:'Plan Salud'},
 {id:'co-foreign',pais:'CO',ramo:'Automóviles',producto:'Extranjero',plan:'Plan Extranjero'}
];
const productRows=[{pais:'GT',ramo:'Vehículos',producto:'Vehículos',planes:['Plan Premium','Plan Plus']}];
const ctx={
  Orbit:{cat:{subramosDe:()=>['General catálogo'],get:()=>[]}},
  clean:v=>String(v==null?'':v).trim(),
  norm:v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase(),
  knowledgeSources:()=>sourceRows,
  knowledgeProductsFor:()=>productRows,
  Set,Array,Object,String
};
vm.runInNewContext(code.slice(start,end)+
 '\nthis.qa={sameInsurerRamo,productOptionsFor,planOptionsFor,commercialProductCatalog,commercialPlanCatalog};',
 ctx,{timeout:1000});
const a={pais:'GT',ramos:['Auto'],docs:[],docsRequeridos:[],ramosDetalle:{}};
assert.equal(ctx.qa.sameInsurerRamo('Auto','Automóviles'),true,'AUTO_ALIASES_REQUIRED');
assert.equal(ctx.qa.sameInsurerRamo('Auto','Gastos Médicos'),false,'FOREIGN_RAMO_NOT_EQUIVALENT');
assert.equal(ctx.qa.sameInsurerRamo('Auto',''),false,'EMPTY_RAMO_NOT_GRANTED');
const mapped=Array.from(ctx.qa.productOptionsFor(a,'Auto'));
assert.ok(mapped.includes('Vehículos'),'SOURCE_BACKED_VEHICLE_PRODUCT_MISSING');
assert.ok(!mapped.includes('Salud Integral'),'UNRELATED_RAMO_LEAK');
assert.ok(!mapped.includes('Extranjero'),'FOREIGN_COUNTRY_LEAK');
const candidate=Array.from(ctx.qa.commercialProductCatalog(a,'Auto'));
assert.ok(candidate.includes('General catálogo'),'TENANT_CATALOG_PRESERVED');
assert.ok(candidate.includes('Vehículos'),'DOCUMENTED_PRODUCT_AVAILABLE_WITH_EXISTING_CATALOG');
const plans=Array.from(ctx.qa.planOptionsFor(a,'Auto','Vehículos'));
assert.ok(plans.includes('Plan Premium')&&plans.includes('Plan Plus'),'VALID_SOURCE_PLAN_CANDIDATES_MISSING');
assert.ok(!plans.includes('Plan Extranjero'),'FOREIGN_COUNTRY_PLAN_LEAK');
const foreign=Array.from(ctx.qa.planOptionsFor(a,'Auto','Extranjero'));
assert.ok(!foreign.includes('Plan Extranjero'),'COUNTRY_FILTER_NOT_APPLIED');
assert.ok(code.includes('draft.ramosHabilitados')&&code.includes('cotTasasValidadas'),
 'EXPLICIT_OFFER_AND_TARIFF_GATES_MUST_REMAIN');
assert.ok(!code.includes('data-b4003-insurer-auto-enable'),'NO_IMPLICIT_RATE_ACTIVATION');
assert.match(fs.readFileSync('orbit360-platform/index.html','utf8'), /modules\\/aseguradoras\\.js\\?v=20261007-r20f4-20261020-b4003-source-catalog/, 'INSURER_NEW_SCRIPT_KEY_REQUIRED');
console.log('B4_003_INSURER_SOURCE_CATALOG_ALIAS_PRODUCT_PLAN_QA_PASS checks=13 mock_only no_rate_enable no_data_writes');
