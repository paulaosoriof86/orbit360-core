import fs from 'node:fs';
import vm from 'node:vm';
function assert(c,m){if(!c)throw new Error(m)}
const Orbit={};
Orbit.tenantInsurerConfigP10={
 resolveInsurer:()=>({resolved:true,insurerId:'dir-aseguate',canonicalKey:'gt_aseguate',displayName:'AseGuate',pais:'GT'}),
 applyFinancialProfile:(rule)=>({rule:{...rule,components:[...(rule.components||[]),{id:'ge',tipo:'issuance_expense'},{id:'iva',tipo:'tax'}]}})
};
Orbit.tariffQuoteReconciliationP06c={reconcile:(rule,sample)=>({ruleId:rule.id,sampleId:sample.id,status:'reconciled_within_tolerance'})};
Orbit.knowledgeBindingGateP08={buildBindings:({rules,profiles})=>({bindings:profiles.map((p,i)=>({id:`b${i+1}`,dimensiones:p.dimensiones,status:'complete_requires_gate',ruleIds:[rules[i].id]})),summary:{total:profiles.length,complete:profiles.length,conflicts:0}})};
const context={window:{Orbit,OrbitTenantBindingPlansP10c:[]},Orbit,console,Date,Math,Set,Array,String,Object,JSON,Number,Promise};context.window.window=context.window;vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/data/tenant-alianzas-soluciones-binding-plan-p10c.js','utf8'),context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/tenant-binding-plan-p10c.js','utf8'),context);
const api=Orbit.tenantBindingPlanP10c;
const plan=api.getPlan('alianzas-soluciones','ays_aseguate_vehiculos_binding_v1');
assert(plan&&plan.variants.length===2,'debe registrar auto y microbus');
const dimsAuto={pais:'GT',moneda:'GTQ',ramo:'Vehículos',producto:'Seguro de vehículo',tipoVehiculo:'Automóvil'};
const dimsMicro={pais:'GT',moneda:'GTQ',ramo:'Vehículos',producto:'Seguro de vehículo',tipoVehiculo:'Microbús'};
const result=api.build({tenantId:'alianzas-soluciones',planId:plan.id,directory:[],rules:[{id:'r-auto',dimensiones:dimsAuto},{id:'r-micro',dimensiones:dimsMicro}],profiles:[{id:'p-auto',dimensiones:dimsAuto},{id:'p-micro',dimensiones:dimsMicro}],validationCases:[{id:'s-auto',dimensiones:dimsAuto},{id:'s-micro',dimensiones:dimsMicro}]});
assert(result.ok&&result.variants.every(v=>v.status==='ready_for_second_gate'),'ambas variantes deben quedar listas solo para segundo gate');
assert(result.bindings.every(b=>b.enabled===false&&b.enabledComparativo===false),'bindings deben quedar deshabilitados');
const incomplete=api.build({tenantId:'alianzas-soluciones',planId:plan.id,rules:[{id:'r-auto',dimensiones:dimsAuto}],profiles:[{id:'p-auto',dimensiones:dimsAuto},{id:'p-micro',dimensiones:dimsMicro}],validationCases:[{id:'s-auto',dimensiones:dimsAuto},{id:'s-micro',dimensiones:dimsMicro}]});
assert(!incomplete.ok&&incomplete.variants.find(v=>v.id.includes('microbus')).blockers.includes('RULE_REQUIRED'),'microbus sin regla debe bloquearse');
console.log('OK orbit360-test-tenant-binding-plan-p10c');