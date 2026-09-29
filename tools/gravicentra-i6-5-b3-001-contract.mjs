import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const need=(v,c)=>{if(!v)throw new Error(c);};
const shell=read('orbit360-platform/modules/cobros.js');
const bridge=read('orbit360-platform/modules/cobros-cartera-i65-closure-bridge.js');
const queries=read('orbit360-platform/core/queries.js');
const index=read('orbit360-platform/index.html');

need(shell.includes('Orbit.modules.cobros = (function ()'),'B3_001_APPROVED_SHELL_OWNER_MISSING');
need(shell.includes("K.bannerFor('cobros'"),'B3_001_APPROVED_BANNER_MISSING');
need(shell.includes('K.kpis(['),'B3_001_APPROVED_KPIS_MISSING');
need(shell.includes('K.filterBar(FDEFS(), st)'),'B3_001_APPROVED_FILTERS_MISSING');
need(shell.includes('function detalle(cobroId)'),'B3_001_APPROVED_DETAIL_MISSING');
need(shell.includes('function aplicarPago(cobroId)'),'B3_001_APPROVED_PAYMENT_ACTION_MISSING');
need(shell.includes('function validarReporte(cobroId)'),'B3_001_APPROVED_REPORTED_PAYMENT_ACTION_MISSING');
need(shell.includes('function lote()'),'B3_001_APPROVED_BATCH_ACTION_MISSING');

need(!/\bmod\.render\s*=\s*[^=]/.test(bridge),'B3_001_BRIDGE_REPLACES_RENDERER');
need(!bridge.includes('host.innerHTML'),'B3_001_BRIDGE_WRITES_SHELL_DOM');
need(!bridge.includes('__i65GlobalPortfolioOwner'),'B3_001_OBSOLETE_RENDER_OWNER_MARKER_PRESENT');
need(bridge.includes('__i65GlobalPortfolioAdapter'),'B3_001_PROJECTION_ADAPTER_MISSING');
need(bridge.includes("rendererOwner:'modules/cobros.js'"),'B3_001_RENDERER_OWNER_NOT_DECLARED');
need(bridge.includes('replacesRenderer:false'),'B3_001_ADAPTER_RENDERER_BOUNDARY_MISSING');
need(bridge.includes('portfolioRows:portfolioRows')&&bridge.includes('reportedPaymentRows:reportedPaymentRows'),'B3_001_ADAPTER_PROJECTIONS_MISSING');

need(queries.includes("const car = (S().all('carteraPrimas') || [])"),'B3_001_CARTERA_PRIMAS_KPI_AUTHORITY_MISSING');
need(queries.includes('const alDia = cob.filter(confirmedCobro)'), 'B3_001_CONFIRMED_COBRO_KPI_AUTHORITY_MISSING');
need(queries.includes("function agingVencido()"),'B3_001_AGING_OWNER_MISSING');
need(queries.includes("(S().all('carteraPrimas') || []).filter(portfolioIsOverdue)"),'B3_001_AGING_NOT_CARTERA_PRIMAS');

const shellPos=index.indexOf('modules/cobros.js');
const bridgePos=index.indexOf('modules/cobros-cartera-i65-closure-bridge.js');
need(shellPos>=0&&bridgePos>shellPos,'B3_001_SCRIPT_ORDER_INVALID');

const evidence={
  schema:'GRAVICENTRA_I6_5_B3_001_COBROS_SHELL_CONTRACT_V1',
  status:'PASS',
  shellOwner:'orbit360-platform/modules/cobros.js',
  adapterOwner:'orbit360-platform/modules/cobros-cartera-i65-closure-bridge.js',
  rendererReplacement:false,
  canonicalSemantics:{
    pendingAndOverdue:'carteraPrimas',
    confirmedCollections:'cobros',
    reportedEvidence:'recibosEsperados/pago_reportado',
    aging:'carteraPrimas'
  },
  preservedShell:['banner','kpis','aging','filters','table','detail','validate-reported','apply-payment','batch-reminders'],
  boundaries:{noBusinessWrite:true,noReimport:true,noLive:true}
};
console.log('B3_001_CONTRACT='+JSON.stringify(evidence));
