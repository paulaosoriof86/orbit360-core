#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const FILE='tools/orbit360-block1-final-native-matrix-v20260811.mjs';
const src=fs.readFileSync(FILE,'utf8');
const fail=message=>{throw new Error(message);};
const assert=(condition,message)=>{if(!condition)fail(message);};

// 1) Rendimiento: el contrato mide el intervalo del observer en el navegador,
// no latencia del canal Node/Playwright. Reproduce exactamente la familia del run 31502845695.
const performancePass=metric=>Number(metric.observerElapsedMs)>0&&Number(metric.observerElapsedMs)<=30000;
assert(performancePass({observerElapsedMs:23762.5,renderObserverWaitMs:31772})===true,'PERF_FIX_REJECTS_BROWSER_PASS_WITH_CHANNEL_OVERHEAD');
assert(performancePass({observerElapsedMs:31001,renderObserverWaitMs:24000})===false,'PERF_FIX_ALLOWS_REAL_BROWSER_TIMEOUT');
assert(src.includes("routePerformanceOwner:'browserObserverElapsedMs'"),'PERF_OWNER_NOT_BROWSER_OBSERVER');
assert(src.includes('c360.observerElapsedMs>0&&c360.observerElapsedMs<=30000'),'CLIENT_PERF_CHECK_NOT_BROWSER_OBSERVER');
assert(src.includes('insurers.observerElapsedMs>0&&insurers.observerElapsedMs<=30000'),'INSURER_PERF_CHECK_NOT_BROWSER_OBSERVER');
assert(!src.includes('c360.renderWaitMs<=30000'),'STALE_CLIENT_CHANNEL_WAIT_BLOCKER_REMAINS');
assert(!src.includes('insurers.renderWaitMs<=30000'),'STALE_INSURER_CHANNEL_WAIT_BLOCKER_REMAINS');

// 2) Menú móvil: el click solo puede probarse después de readiness real de Router+Inicio.
const routerReadyIndex=src.indexOf('await waitRouterReady(page,role)');
const mobileIndex=src.indexOf("add('mobile-burger-present'");
assert(routerReadyIndex>=0&&mobileIndex>routerReadyIndex,'MOBILE_MENU_EXECUTED_BEFORE_ROUTER_READY');
assert(src.includes("mobileMenuOwner:'router-ready-before-burger'"),'MOBILE_MENU_OWNER_NOT_DECLARED');
assert(src.includes("Orbit.route.key==='inicio'"),'ROUTER_READY_DOES_NOT_REQUIRE_INICIO');
assert(src.includes("s.ready===true"),'ROUTER_READY_DOES_NOT_REQUIRE_HYDRATION');

// 3) Cliente 360 detalle: prueba el flujo real de usuario (click de fila) y valida
// el estado canónico del Router (route+params+DOM), no igualdad textual de location.hash.
const detailStateReady=state=>state.route==='cliente360'&&state.paramPresent===true&&state.header===true&&state.tabs===true&&state.body===true;
assert(detailStateReady({route:'cliente360',paramPresent:true,header:true,tabs:true,body:true})===true,'DETAIL_CANONICAL_STATE_FALSE_NEGATIVE');
assert(detailStateReady({route:'cliente360',paramPresent:false,header:true,tabs:true,body:true})===false,'DETAIL_ACCEPTS_MISSING_ROUTE_PARAM');
assert(src.includes("page.locator('.tbl tbody tr.clickable').first()"),'DETAIL_DOES_NOT_USE_RENDERED_ROW');
assert(src.includes("await row.click({timeout:12000})"),'DETAIL_DOES_NOT_EXERCISE_USER_CLICK');
assert(src.includes("Orbit.route&&Orbit.route.key==='cliente360'"),'DETAIL_DOES_NOT_REQUIRE_ROUTER_OWNER');
assert(src.includes("Orbit.route.params&&Orbit.route.params.c"),'DETAIL_DOES_NOT_REQUIRE_ROUTE_PARAM');
assert(src.includes("sameRouteDetailOwner:'rendered-row-user-flow-plus-route-param-dom'"),'DETAIL_OWNER_NOT_UPDATED');

// 4) Relaciones vacías: la navegación compara el parámetro canónico ya parseado,
// no el hash serializado, evitando diferencias de encoding sin ocultar una ficha que realmente no renderiza.
assert(src.includes("String(Orbit.route.params&&Orbit.route.params.c||'')!==String(clientId)"),'EMPTY_RELATION_STILL_DEPENDS_ON_RAW_HASH');
assert(src.includes("FUNCTIONAL_CLIENT_ROUTE_TIMEOUT"),'EMPTY_RELATION_LACKS_FUNCTIONAL_FAIL_CLOSED');

// 5) Clasificación: un timeout no vuelve automáticamente FUNCTIONAL_DEFECT a toda la matriz.
assert(src.includes('failureClassifications'),'CHECK_LEVEL_CLASSIFICATION_MISSING');
assert(src.includes('function classifyFailures()'),'MATRIX_ROOT_CAUSE_CLASSIFICATION_MISSING');

console.log(JSON.stringify({
  status:'PASS_BLOCK1_VISUAL_ANTIBUCLE_SYNTHETIC_V20260811',
  ok:true,
  reproducedFamily:'RUN_31502845695_VALIDATOR_STALE_PIPELINE_MECHANISM',
  performanceFixture:true,
  routerReadyBeforeMobile:true,
  renderedRowDetailUserFlow:true,
  canonicalRouteParamDetail:true,
  rawHashEqualityNotUsedForClientDetail:true,
  runtime:false,
  secrets:false,
  firebase:false,
  hosting:false,
  browser:false,
  writes:0
},null,2));
