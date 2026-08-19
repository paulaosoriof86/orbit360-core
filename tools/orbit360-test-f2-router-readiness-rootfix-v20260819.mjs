import fs from 'node:fs';
import vm from 'node:vm';

const must=(v,code)=>{if(!v)throw new Error(code);};
const app=fs.readFileSync('orbit360-platform/core/product-app-p0.js','utf8');
must(app.includes('function routerHostReady()'),'PRODUCT_APP_HOST_READY_PREDICATE_MISSING');
must(app.includes('function waitForRouterReady(timeoutMs)'),'PRODUCT_APP_ROUTER_WAIT_MISSING');
must(app.includes('return waitForRouterReady(120000)'),'PRODUCT_APP_ROUTER_WAIT_BOUNDARY_MISSING');
must(app.includes("PRODUCT_ROUTER_NOT_READY"),'PRODUCT_APP_ROUTER_READY_GUARD_MISSING');
must(app.includes("VERSION:'fase-a-product-p0-20260819-router-host-readiness'"),'PRODUCT_APP_ROOTFIX_VERSION_MISSING');
must(!app.includes('Orbit.router.init();state.routerStarted=true;'),'PREMATURE_ROUTER_READY_STILL_PRESENT');

const host={childElementCount:0,textContent:''};
const fakeDocument={
  documentElement:{dataset:{}},
  dispatchEvent(){},
  getElementById(id){return id==='host'?host:null;}
};
const fakeLocation={hash:''};
let routerInitCalls=0;
const fakeOrbit={
  auth:{init(){},showApp(){}},
  novedades:{init(){}},
  productRuntimeBrowserProvidersP0:{dependencies(){return{};}},
  backendProductReadOnlyBootstrapP0:{async start(){return{ok:true,ready:true,writeAuthorized:false};}},
  store:{_productStatus(){return{ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false};}},
  productTenantRuntimeContextP0:{install(){return{ready:true,tenantId:'synthetic-tenant',writeAuthorized:false};}},
  router:{init(){routerInitCalls+=1;}}
};
const context={window:{Orbit:fakeOrbit,__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{enabled:true,collections:[]}},Orbit:fakeOrbit,document:fakeDocument,location:fakeLocation,CustomEvent:class{},HashChangeEvent:class{},Event:class{},setTimeout,clearTimeout,Date,Promise,console};
context.window.window=context.window;
context.window.dispatchEvent=function(){};
vm.createContext(context);
vm.runInContext(app,context,{filename:'product-app-p0.js'});
context.Orbit.productAppP0.init();
const activation=context.Orbit.productAppP0.activate();
await new Promise(r=>setTimeout(r,25));
must(routerInitCalls===1,'ROUTER_INIT_CALL_COUNT_INVALID');
must(context.Orbit.productAppP0.status().started===false,'PRODUCT_APP_STARTED_BEFORE_HOST_RENDERED');
must(context.Orbit.productAppP0.status().routerStarted===false,'PRODUCT_APP_ROUTER_FLAG_PREMATURE');
host.childElementCount=1;
host.textContent='Inicio';
await activation;
must(context.Orbit.productAppP0.status().started===true,'PRODUCT_APP_NOT_STARTED_AFTER_HOST_RENDERED');
must(context.Orbit.productAppP0.status().routerStarted===true,'PRODUCT_APP_ROUTER_FLAG_NOT_SET_AFTER_HOST_RENDERED');

console.log(JSON.stringify({schemaVersion:'orbit360-f2-router-readiness-rootfix-regression-v2',ok:true,status:'PASS_F2_REQUEST08_ROUTER_READINESS_ROOTFIX',classification:'PASS',rootfixOwner:'core/product-app-p0.js',routerSourceMutationRequired:false,activationWaitsForRenderedHost:true,hostRenderedBeforeReady:true,routerInitCalls,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,dataWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false},null,2));