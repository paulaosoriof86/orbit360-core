import fs from 'node:fs';
import vm from 'node:vm';

const must=(v,code)=>{if(!v)throw new Error(code);};
const router=fs.readFileSync('orbit360-platform/core/router.js','utf8');
const app=fs.readFileSync('orbit360-platform/core/product-app-p0.js','utf8');
must(router.includes('let routerInitPromise = null'),'ROUTER_INIT_PROMISE_MISSING');
must(router.includes('if (routerInitPromise) return routerInitPromise;'),'ROUTER_INIT_NOT_IDEMPOTENT');
must(router.includes("ROUTER_HOST_NOT_RENDERED"),'ROUTER_EMPTY_HOST_GUARD_MISSING');
must(router.includes("orbit:router-ready"),'ROUTER_READY_EVENT_MISSING');
must(app.includes('Promise.resolve(Orbit.router.init())'),'PRODUCT_APP_DOES_NOT_AWAIT_ROUTER');
must(app.includes('PRODUCT_ROUTER_NOT_READY'),'PRODUCT_APP_ROUTER_READY_GUARD_MISSING');
must(!app.includes('Orbit.router.init();state.routerStarted=true;'),'PREMATURE_ROUTER_READY_STILL_PRESENT');

let resolveRouter;
const routerPromise=new Promise(r=>{resolveRouter=r;});
const fakeDocument={
  documentElement:{dataset:{}},
  dispatchEvent(){},
};
const fakeLocation={hash:''};
const fakeOrbit={
  auth:{init(){},showApp(){}},
  novedades:{init(){}},
  productRuntimeBrowserProvidersP0:{dependencies(){return{};}},
  backendProductReadOnlyBootstrapP0:{async start(){return{ok:true,ready:true,writeAuthorized:false};}},
  store:{_productStatus(){return{ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false};}},
  productTenantRuntimeContextP0:{install(){return{ready:true,tenantId:'synthetic-tenant',writeAuthorized:false};}},
  router:{init(){return routerPromise;}}
};
const context={window:{Orbit:fakeOrbit,__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{enabled:true,collections:[]}},Orbit:fakeOrbit,document:fakeDocument,location:fakeLocation,CustomEvent:class{},HashChangeEvent:class{},Event:class{},setTimeout,clearTimeout,Promise,console};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(app,context,{filename:'product-app-p0.js'});
context.Orbit.productAppP0.init();
const activation=context.Orbit.productAppP0.activate();
await Promise.resolve(); await Promise.resolve();
must(context.Orbit.productAppP0.status().started===false,'PRODUCT_APP_STARTED_BEFORE_ROUTER_READY');
must(context.Orbit.productAppP0.status().routerStarted===false,'PRODUCT_APP_ROUTER_FLAG_PREMATURE');
resolveRouter({ready:true,route:'inicio',hostRendered:true});
await activation;
must(context.Orbit.productAppP0.status().started===true,'PRODUCT_APP_NOT_STARTED_AFTER_ROUTER_READY');
must(context.Orbit.productAppP0.status().routerStarted===true,'PRODUCT_APP_ROUTER_FLAG_NOT_SET_AFTER_READY');

console.log(JSON.stringify({schemaVersion:'orbit360-f2-router-readiness-rootfix-regression-v1',ok:true,status:'PASS_F2_REQUEST08_ROUTER_READINESS_ROOTFIX',classification:'PASS',routerInitIdempotent:true,activationWaitsForRouter:true,hostRenderedBeforeReady:true,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,dataWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false},null,2));