#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import { firebaseDefaultAppAuthReadyState, syntheticBootstrapNavigationContract } from '../orbit360-block1-final-native-matrix-v20260811.mjs';

const FILE='tools/orbit360-block1-final-native-matrix-v20260811.mjs';
const src=fs.readFileSync(FILE,'utf8');
const fail=message=>{throw new Error(message);};
const assert=(condition,message)=>{if(!condition)fail(message);};

const performancePass=metric=>Number(metric.observerElapsedMs)>0&&Number(metric.observerElapsedMs)<=30000;
assert(performancePass({observerElapsedMs:23762.5,renderObserverWaitMs:31772})===true,'PERF_FIX_REJECTS_BROWSER_PASS_WITH_CHANNEL_OVERHEAD');
assert(performancePass({observerElapsedMs:31001,renderObserverWaitMs:24000})===false,'PERF_FIX_ALLOWS_REAL_BROWSER_TIMEOUT');
assert(src.includes("routePerformanceOwner:'browserObserverElapsedMs'"),'PERF_OWNER_NOT_BROWSER_OBSERVER');
assert(src.includes('c360.observerElapsedMs>0&&c360.observerElapsedMs<=30000'),'CLIENT_PERF_CHECK_NOT_BROWSER_OBSERVER');
assert(src.includes('insurers.observerElapsedMs>0&&insurers.observerElapsedMs<=30000'),'INSURER_PERF_CHECK_NOT_BROWSER_OBSERVER');
assert(!src.includes('c360.renderWaitMs<=30000'),'STALE_CLIENT_CHANNEL_WAIT_BLOCKER_REMAINS');
assert(!src.includes('insurers.renderWaitMs<=30000'),'STALE_INSURER_CHANNEL_WAIT_BLOCKER_REMAINS');

const routerReadyIndex=src.indexOf('await waitRouterReady(page,role)');
const mobileIndex=src.indexOf("add('mobile-burger-present'");
assert(routerReadyIndex>=0&&mobileIndex>routerReadyIndex,'MOBILE_MENU_EXECUTED_BEFORE_ROUTER_READY');
assert(src.includes("mobileMenuOwner:'router-ready-before-burger'"),'MOBILE_MENU_OWNER_NOT_DECLARED');
assert(src.includes("Orbit.route.key==='inicio'"),'ROUTER_READY_DOES_NOT_REQUIRE_INICIO');
assert(src.includes("s.ready===true"),'ROUTER_READY_DOES_NOT_REQUIRE_HYDRATION');

const detailStateReady=state=>state.route==='cliente360'&&state.paramPresent===true&&state.header===true&&state.tabs===true&&state.body===true;
assert(detailStateReady({route:'cliente360',paramPresent:true,header:true,tabs:true,body:true})===true,'DETAIL_CANONICAL_STATE_FALSE_NEGATIVE');
assert(detailStateReady({route:'cliente360',paramPresent:false,header:true,tabs:true,body:true})===false,'DETAIL_ACCEPTS_MISSING_ROUTE_PARAM');
assert(src.includes("page.locator('.tbl tbody tr.clickable').first()"),'DETAIL_DOES_NOT_USE_RENDERED_ROW');
assert(src.includes("await row.click({timeout:12000})"),'DETAIL_DOES_NOT_EXERCISE_USER_CLICK');
assert(src.includes("Orbit.route&&Orbit.route.key==='cliente360'"),'DETAIL_DOES_NOT_REQUIRE_ROUTER_OWNER');
assert(src.includes("Orbit.route.params&&Orbit.route.params.c"),'DETAIL_DOES_NOT_REQUIRE_ROUTE_PARAM');
assert(src.includes("sameRouteDetailOwner:'rendered-row-user-flow-plus-route-param-dom'"),'DETAIL_OWNER_NOT_UPDATED');

assert(src.includes("String(Orbit.route.params&&Orbit.route.params.c||'')!==String(clientId)"),'EMPTY_RELATION_STILL_DEPENDS_ON_RAW_HASH');
assert(src.includes("FUNCTIONAL_CLIENT_ROUTE_TIMEOUT"),'EMPTY_RELATION_LACKS_FUNCTIONAL_FAIL_CLOSED');
assert(src.includes('failureClassifications'),'CHECK_LEVEL_CLASSIFICATION_MISSING');
assert(src.includes('function classifyFailures()'),'MATRIX_ROOT_CAUSE_CLASSIFICATION_MISSING');

// Run 31512995513: SDK cargado sin app [DEFAULT] no debe habilitar Auth.
const sdkOnly={sdkLoaded:true,appsCount:0,defaultAppName:'',authAppName:''};
const ready={sdkLoaded:true,appsCount:1,defaultAppName:'[DEFAULT]',authAppName:'[DEFAULT]'};
assert(firebaseDefaultAppAuthReadyState(sdkOnly)===false,'FIREBASE_SDK_ONLY_FALSE_POSITIVE');
assert(firebaseDefaultAppAuthReadyState(ready)===true,'FIREBASE_DEFAULT_APP_AUTH_FALSE_NEGATIVE');
assert(src.includes("firebaseDefaultAppOwner:'firebase-default-app-initialized'"),'FIREBASE_DEFAULT_APP_OWNER_MISSING');
assert(src.includes("firebaseAuthOwner:'firebase-default-app-auth-instance-ready'"),'FIREBASE_AUTH_OWNER_MISSING');
assert(src.includes('_BOOTSTRAP_FIREBASE_DEFAULT_APP_WAIT'),'FIREBASE_DEFAULT_APP_WAIT_CHECKPOINT_MISSING');
assert(src.includes('_BOOTSTRAP_FIREBASE_DEFAULT_APP_PASS'),'FIREBASE_DEFAULT_APP_PASS_CHECKPOINT_MISSING');
assert(src.includes("app.name==='[DEFAULT]'"),'FIREBASE_DEFAULT_APP_NAME_NOT_REQUIRED');
assert(src.includes("auth.app.name==='[DEFAULT]'"),'FIREBASE_AUTH_APP_NOT_BOUND_TO_DEFAULT');
const bootstrap=syntheticBootstrapNavigationContract();
assert(bootstrap.sdkWithoutDefaultAppBlocked===true,'BOOTSTRAP_SYNTHETIC_DOES_NOT_BLOCK_SDK_WITHOUT_APP');
assert(bootstrap.defaultAppAuthReady===true,'BOOTSTRAP_SYNTHETIC_DOES_NOT_PASS_DEFAULT_APP_AUTH');
assert(bootstrap.ok===true,'BOOTSTRAP_SYNTHETIC_NOT_OK');

console.log(JSON.stringify({
  status:'PASS_BLOCK1_VISUAL_ANTIBUCLE_SYNTHETIC_V20260811',
  ok:true,
  reproducedFamilies:['RUN_31502845695_VALIDATOR_STALE_PIPELINE_MECHANISM','RUN_31512995513_FIREBASE_DEFAULT_APP_READINESS_FALSE_POSITIVE'],
  performanceFixture:true,
  routerReadyBeforeMobile:true,
  renderedRowDetailUserFlow:true,
  canonicalRouteParamDetail:true,
  rawHashEqualityNotUsedForClientDetail:true,
  firebaseSdkWithoutDefaultAppBlocked:true,
  firebaseDefaultAppAuthReady:true,
  runtime:false,
  secrets:false,
  firebase:false,
  hosting:false,
  browser:false,
  writes:0
},null,2));
