'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../orbit360-platform/modules/polizas.js'), 'utf8');
const state = {
  tenant: 'tenant-a', uid: 'user-a', role: 'Dirección', country: 'GT',
  advisor: 'adv-a', scope: 'all', teams: ['adv-a'], countries: ['GT','CO'],
  records: ['gt-1']
};
const listeners = {};
const access = {
  tenantId: () => state.tenant,
  activeRole: () => state.role,
  dataScope: () => state.scope,
  actorAdvisorId: () => state.advisor,
  assignedRoles: () => [state.role],
  actorAdvisor: () => ({ countries: state.countries }),
  teamAdvisorIds: () => state.teams
};
const Orbit = {
  modules: {}, ui: {}, q: {}, kit: {}, access,
  session: { rol: () => state.role },
  auth: { user: () => ({ uid: state.uid }) },
  get pais() { return state.country; },
  store: { all: kind => kind === 'polizas'
    ? state.records.map(id => ({ id, clienteId: 'c-'+id, pais: state.country, estado:'Vigente', primaNeta:1 }))
    : kind === 'clientes' ? state.records.map(id => ({ id: 'c-'+id, pais: state.country }))
    : [] }
};
const context = {
  Orbit, window: { Orbit, addEventListener: (name, fn) => { listeners[name] = fn; } },
  document: { addEventListener: (name, fn) => { listeners[name] = fn; } },
  setTimeout, clearTimeout
};
vm.runInNewContext(source, context, { filename:'polizas.js', timeout:3000 });
const build = Orbit.modules.polizas.buildIndexes;
const ids = () => build().policies.map(p => p.id).join(',');
let checks = 0;
function check(expected, reason) { assert.equal(ids(), expected, reason); checks++; }
check('gt-1','base GT');
const original = build();
assert.strictEqual(build(), original, 'same scope must reuse index'); checks++;
state.country = 'CO'; state.records = ['co-1'];
check('co-1','country switch invalidates without an event');
state.role = 'Asesor'; state.scope = 'own'; state.records = ['co-own'];
check('co-own','role switch cannot reuse broader policy index');
state.advisor = 'adv-b'; state.records = ['co-adv-b'];
check('co-adv-b','advisor change cannot reuse another advisor index');
state.scope = 'team'; state.teams = ['adv-b','adv-c']; state.records = ['co-team-1'];
check('co-team-1','scope change invalidates');
state.teams = ['adv-b']; state.records = ['co-team-2'];
check('co-team-2','team roster change invalidates');
state.countries = ['CO']; state.records = ['co-country-grant'];
check('co-country-grant','country grant change invalidates');
state.uid = 'user-b'; state.records = ['co-other-user'];
check('co-other-user','identity change invalidates');
state.tenant = 'tenant-b'; state.records = ['co-other-tenant'];
check('co-other-tenant','tenant change invalidates');
state.records = ['fresh-on-store'];
listeners['orbit:store:emit']({ detail:{ collection:'polizas' } });
check('fresh-on-store','store event still invalidates the index');
state.records = ['fresh-on-session'];
listeners['orbit:session']();
check('fresh-on-session','session event still invalidates the index');

// B4-003 country/client parity is read-only and must not change country,
// canonical relation, source data or the restricted advisor universe.
const parityStart=source.indexOf('  function countryClientJoinGap(');
const parityEnd=source.indexOf('  function clientCell(',parityStart);
assert.ok(parityStart>0&&parityEnd>parityStart,'PARITY_OWNER_MISSING'); checks++;
const parityContext={Set,Map,Number,String,Array,Object};
vm.runInNewContext(`
  const countryCode=v=>String(v==null?'':v).trim().toUpperCase();
  const isActivePolicy=p=>!!p&&['Vigente','Por renovar'].includes(p.estado);
  const policyPremiumNet=p=>p.primaNeta!=null?Number(p.primaNeta):p.prima!=null?Number(p.prima):null;
  ${source.slice(parityStart,parityEnd)}
  this.parity=countryClientJoinGap;
`,parityContext);
const parityClients=new Map([
  ['co',{id:'co',pais:'CO'}],['gt',{id:'gt',pais:'GT'}],
  ['merged',{id:'merged',pais:'CO',mergedIntoClientId:'co'}],['unknown',{id:'unknown',pais:''}]
]);
const parityPolicies=[
  {id:'co-ok',clienteId:'co',pais:'CO',estado:'Vigente',primaNeta:500,moneda:'COP'},
  {id:'cross',clienteId:'gt',pais:'CO',estado:'Vigente',primaNeta:240423,moneda:'COP'},
  {id:'not-visible',clienteId:'hidden',pais:'CO',estado:'Por renovar',primaNeta:170,moneda:'COP'},
  {id:'merged',clienteId:'merged',pais:'CO',estado:'Vigente',primaNeta:30,moneda:'COP'},
  {id:'unknown',clienteId:'unknown',pais:'CO',estado:'Vigente',primaNeta:10,moneda:'COP'},
  {id:'historical',clienteId:'gt',pais:'CO',estado:'Vencida',primaNeta:999,moneda:'COP'}
];
const parity=parityContext.parity(parityPolicies,parityClients,'CO');
assert.equal(parity.total,5,'PARITY_MISSING_CLIENT_COUNTRY_ROWS'); checks++;
assert.equal(parity.active,4,'PARITY_ACTIVE_ROWS'); checks++;
assert.equal(parity.netByCurrency.COP,240633,'PARITY_ACTIVE_COP_ONLY'); checks++;
assert.equal(parity.reasons.otherCountry,2,'PARITY_FOREIGN_CLIENT'); checks++;
assert.equal(parity.reasons.unavailable,1,'PARITY_CLIENT_UNAVAILABLE_NOT_DELETED'); checks++;
assert.equal(parity.reasons.merged,1,'PARITY_MERGED_CLIENT'); checks++;
assert.equal(parity.reasons.unknownCountry,1,'PARITY_UNKNOWN_COUNTRY'); checks++;
assert.equal(parity.policyIds.has('co-ok'),false,'PARITY_VALID_CO_CLIENT_NOT_FLAGGED'); checks++;
assert.equal(parity.policyIds.has('cross'),true,'PARITY_CROSS_COUNTRY_DRILLDOWN'); checks++;
assert.equal(parityContext.parity(parityPolicies,parityClients,'TODOS').total,0,'PARITY_TODOS_NOT_FALSE_FLAGGED'); checks++;
assert.ok(source.includes("st.fkind === 'countryClientGap'"),'PARITY_FILTER_AVAILABLE'); checks++;
assert.ok(source.includes('data-polizas-client-country-gap'),'PARITY_VISIBLE_READONLY_NOTE'); checks++;
assert.ok(source.includes("st.fkind==='countryClientGap'?'Orbit.modules.polizas.verDesglose'"),'PARITY_DRILLDOWN_CANNOT_FORCE_INACCESSIBLE_CLIENT_ROUTE'); checks++;
assert.ok(source.includes('Esta diferencia de criterio no acredita pérdida'),'PARITY_NO_INVENTED_DATA_LOSS'); checks++;

// Reproduce only the numeric shape seen in the authenticated Asesor/CO UAT.
// These are artificial records; they do not prove which real IDs caused it.
const uatClients=new Map([['co-authorized',{id:'co-authorized',pais:'CO'}],['gt-linked',{id:'gt-linked',pais:'GT'}]]);
const uatLinked=Array.from({length:76},(_,i)=>({
  id:'linked-'+i,clienteId:'co-authorized',pais:'CO',estado:i<9?'Vigente':'Vencida',
  primaNeta:i===8?73912141:i<8?1000:0,moneda:'COP'
}));
const uatCross=Array.from({length:16},(_,i)=>({
  id:'cross-'+i,clienteId:'gt-linked',pais:'CO',estado:i===0?'Vigente':'Vencida',
  primaNeta:i===0?240423:0,moneda:'COP'
}));
const uatAll=[...uatLinked,...uatCross];
const uatGap=parityContext.parity(uatAll,uatClients,'CO');
assert.equal(uatAll.length,92,'UAT_SHAPE_POLICY_TOTAL'); checks++;
assert.equal(uatLinked.length,76,'UAT_SHAPE_CLIENT_LINKED_TOTAL'); checks++;
assert.equal(uatGap.total,16,'UAT_SHAPE_COUNTRY_CLIENT_GAP'); checks++;
assert.equal(uatGap.active,1,'UAT_SHAPE_GAP_ACTIVE_COUNT'); checks++;
assert.equal(uatGap.netByCurrency.COP,240423,'UAT_SHAPE_GAP_NET_COP'); checks++;
assert.equal(uatAll.filter(p=>p.estado==='Vigente').reduce((sum,p)=>sum+p.primaNeta,0),74160564,'UAT_SHAPE_GLOBAL_NET_COP'); checks++;
assert.equal(uatLinked.filter(p=>p.estado==='Vigente').reduce((sum,p)=>sum+p.primaNeta,0),73920141,'UAT_SHAPE_CLIENT_NET_COP'); checks++;
console.log('PASS polizas context-index regression: '+checks+' assertions (synthetic, no Firebase writes)');
