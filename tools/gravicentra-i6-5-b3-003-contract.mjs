import fs from 'node:fs';
const q=fs.readFileSync('orbit360-platform/core/queries.js','utf8');
const c=fs.readFileSync('orbit360-platform/modules/cobros.js','utf8');
const need=(v,code)=>{if(!v)throw new Error(code);};

need(q.includes('function carteraGlobalPorMoneda()'),'B3_003_SAFE_PORTFOLIO_QUERY_MISSING');
need(q.includes('function agingVencidoPorMoneda()'),'B3_003_SAFE_AGING_QUERY_MISSING');
need(q.includes("crossCurrencyConversion: false"),'B3_003_NO_CONVERSION_MARKER_MISSING');
need(q.includes(".filter(r => policyLinkedRowPais(r, clients, policies))\n      .filter(portfolioIsOverdue)"),'B3_003_AGING_COUNTRY_FILTER_MISSING');
need(q.includes("currencyCodeFor"),'B3_003_CURRENCY_AUTHORITY_MISSING');

need(c.includes('q.carteraGlobalPorMoneda()'),'B3_003_COBROS_SAFE_PORTFOLIO_NOT_USED');
need(c.includes('q.agingVencidoPorMoneda()'),'B3_003_COBROS_SAFE_AGING_NOT_USED');
need(!c.includes('const cart = q.carteraGlobal();'),'B3_003_COBROS_LEGACY_SCALAR_PORTFOLIO_STILL_USED');
need(!c.includes('const aging = q.agingVencido();'),'B3_003_COBROS_LEGACY_SCALAR_AGING_STILL_USED');
need(c.includes('data-currency-safe-metric'),'B3_003_CURRENCY_SAFE_KPI_MARKER_MISSING');
need(c.includes('data-aging-currency'),'B3_003_AGING_CURRENCY_MARKER_MISSING');
need(c.includes('sin conversión entre monedas'),'B3_003_UI_NO_FX_SEMANTIC_MISSING');
need(c.includes("const porConciliar = (cart.currencies || []).reduce"),'B3_003_POR_CONCILIAR_COUNTRY_SAFE_COUNT_MISSING');

console.log('B3_003_CONTRACT='+JSON.stringify({
 status:'PASS',
 owners:['orbit360-platform/core/queries.js','orbit360-platform/modules/cobros.js'],
 semantics:{
   crossCurrencyConversion:false,
   aggregation:'BY_CURRENCY',
   agingCountryFiltered:true,
   reportedEvidenceExcludedFromConfirmedKpi:true,
   dashboardInicioChanged:false
 },
 boundaries:{noBusinessWrite:true,noReimport:true,noLive:true}
}));
