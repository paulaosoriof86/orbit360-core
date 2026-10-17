'use strict';
// B4-003: isolated Inicio country/role financial projection proof, zero Firebase writes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('orbit360-platform/modules/inicio.js','utf8');
let role='Operativo',global=true,goal=true,ownId='a1',scope='GT';
const id='u1',month='2026-10',monthMap={GT:'GTQ',CO:'COP'};
const row=()=>({id:'a1',nombre:'Persona QA',activo:true,paises:['GT'],metaPrima:null,
 metas:{GT:goal?{produccion:120,recaudo:100,explicit:true}:{
 produccion:0,recaudo:0,explicit:false}}});
const ui={
 now:()=>new Date('2026-10-13T12:00:00Z'),
 currentMonthKey:()=>month,monthKey:()=>month,monthLabel:()=> 'Octubre',
 finiteNumber:x=>x==null||x===''?null:(Number.isFinite(Number(x))?Number(x):null),
 moneyShort:(n,cur)=>String(n)+' '+cur,money:(n,cur)=>String(n)+' '+cur,
 esc:x=>String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
 avatar:()=>'',daysFromNow:()=>1,fmtDate:()=>'',text:x=>String(x==null?'':x)
};
const q={
 currentMonthKey:()=>month,
 clientesScoped:()=>[],polizasScoped:()=>[],
 produccionMesPorMoneda:(_m,advisor)=>({GTQ:advisor?30:200}),
 recaudoMesPorMoneda:(_m,advisor)=>({GTQ:advisor?90:900}),
 carteraGlobalPorMoneda:()=>({byCurrency:{},currencies:[]}),
 carteraVencidaRows:()=>[],cobrosConfirmadosRows:()=>[],
 carteraPendienteRows:()=>[],renovacionesProximas:()=>[]
};
const roster={
 // This test targets the rendered own-vs-institutional split. Dashboard
 // cache-key correctness is covered independently; force a confirmed roster.
 dashboardStatus:()=>({entries:[{key:id+'|'+role.toLowerCase()+'|'+scope+'|'+month,at:'confirmed'}]}),
 dashboardList:async()=>[row()],
 dashboardPeek:()=>[row()],
 dashboardGlobalMetas:()=>global?{GT:{recaudo:1000,prima:1200,explicitPrima:true,explicitRecaudo:true}}:{},
 dashboardSelfAdvisorId:()=>ownId,dashboardPrimaryCountry:()=>scope==='TODOS'?'GT':scope
};
const Orbit={ui,q,pais:scope,route:{key:'inicio'},
 modules:{polizas:{policyMetrics:{isRenewalWithin45Days:()=>false}}},
 auth:{productUser:{uid:id}},session:{rol:()=>role},
 assignableAdvisorRoster:roster,kit:{banner:()=>'<section></section>'},
 store:{all:()=>[],get:()=>null,_ensureCollections:()=>{}}};
const context={Orbit,window:{Orbit},document:{getElementById:()=>null},location:{hash:'#/inicio'},
 setTimeout,clearTimeout,Set,Map,Date};
vm.runInNewContext(src,context,{timeout:1500});
const render=()=>{const host={innerHTML:'',isConnected:true};Orbit.modules.inicio.render(host);return host.innerHTML;};
let checks=0;
let html=render();
assert.match(html,/data-inicio-country="GT" data-goal-source="global"/);checks++;
assert.match(html,/data-inicio-own-contribution="recaudo" data-inicio-own-country="GT" data-inicio-own-amount="90" data-inicio-own-goal="100" data-inicio-own-pct="90"/);checks++;
assert.match(html,/Meta institucional: 1000 GTQ/);checks++;
assert.match(html,/Mi recaudo confirmado: 90 GTQ/);checks++;
role='Asesor';global=false;
html=render();
assert.match(html,/data-inicio-country="GT" data-goal-source="personal"/);checks++;
assert.match(html,/data-inicio-own-amount="90"/);checks++;
assert.doesNotMatch(html,/Meta institucional: 1000 GTQ/);checks++;
goal=false;
html=render();
assert.match(html,/data-inicio-own-contribution="recaudo" data-inicio-own-country="GT" data-inicio-own-amount="90" data-inicio-own-goal="" data-inicio-own-pct=""/);checks++;
assert.match(html,/Meta individual por configurar/);checks++;
ownId='';html=render();
assert.doesNotMatch(html,/data-inicio-own-contribution=/);checks++;
console.log('B4_003_INICIO_PERSONAL_RECAUDO_UI_QA_PASS checks='+checks+' mock_only no_real_writes');
assert.match(src,/data-inicio-days-left/, 'MONTH_END_COUNTDOWN_PRESERVED');
assert.doesNotMatch(src,/Doble clic para cambiar el mensaje/, 'NO_INTERNAL_INTERACTION_INSTRUCTIONS');
assert.match(src,/message\.addEventListener\('click',advance\)/, 'SINGLE_CLICK_ROTATION_WIRED');
assert.match(src,/gi-motivation-quote/, 'HIGH_CONTRAST_LEADERSHIP_QUOTE');
assert.match(src,/data-inicio-critical-analysis/, 'SOURCE_BACKED_CRITICAL_ANALYSIS_PRESENT');
assert.match(src,/data-inicio-evidence-confirmed/, 'SOURCE_READINESS_VISIBLE');
assert.match(src,/policyReadiness==='ready'\?renov.length/, 'NO_FALSE_ZERO_WHILE_LOADING');
assert.doesNotMatch(src,/const greeting=/, 'NO_TIME_DEPENDENT_GREETING');
const style=fs.readFileSync('orbit360-platform/styles/infra.css','utf8');
assert.match(style,/\.gi-motivation-quote\{[\s\S]*?color:#f1f5fb!important/, 'LEADERSHIP_CONTRAST');
assert.match(style,/@media\(max-width:500px\)/, 'PHONE_LAYOUT_REQUIRED');
assert.match(src,/align-items:start;border-top:3px/, 'CARD_NOT_STRETCHED');

assert.match(src,/data-inicio-primary-country-unresolved/, 'COUNTRY_NOT_GUESSED');
assert.match(src,/filter\(c=>c===a.primaryCountry/, 'ADVISOR_GOAL_ONLY_PRIMARY_COUNTRY');
