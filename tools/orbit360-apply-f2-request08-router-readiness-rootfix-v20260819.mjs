import fs from 'node:fs';
import crypto from 'node:crypto';

const ROUTER='orbit360-platform/core/router.js';
const APP='orbit360-platform/core/product-app-p0.js';
const EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/f2-request08-router-readiness-rootfix-source-v20260819.json';
const OLD_ROUTER_SHA256='9858d5375dedc8a9a994194a7e8bb03f5fe9047ac12fb79f4f1fabf028f46393';
const OLD_APP_SHA256='4a7490164a9b845cae2311a90ca718e6e4cec2f91adab29a40af1b79acfedc23';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const must=(v,code)=>{if(!v)throw new Error(code);};

let router=fs.readFileSync(ROUTER,'utf8');
let app=fs.readFileSync(APP,'utf8');
must(sha(router)===OLD_ROUTER_SHA256,'ROOTFIX_BASE_ROUTER_SHA_MISMATCH');
must(sha(app)===OLD_APP_SHA256,'ROOTFIX_BASE_PRODUCT_APP_SHA_MISMATCH');

router=router.replace(
"  let host, sidebar, current = null, storeRefreshTimer = null, storeRefreshUnsub = null;\n",
"  let host, sidebar, current = null, storeRefreshTimer = null, storeRefreshUnsub = null;\n  let routerInitPromise = null, routerInitResolve = null, routerInitReject = null, routerReady = false;\n"
);

const routerOld=`    onHash();
    runtimeSignal('router-ready', '1');
  }

  function init() {
    host = document.getElementById('host');
    sidebar = document.getElementById('sidebar');
    let started = false;
    function begin() {
      if (started) return;
      started = true;
      loadRuntimeContracts(start);
    }
    const pwaReady = window.OrbitPwaWorkerReady;
    if (!pwaReady || typeof pwaReady.then !== 'function') {
      runtimeContractState.__pwa = { status: 'unavailable', controlled: false };
      runtimeSignal('pwa-ready', 'unavailable');
      begin();
      return;
    }
    Promise.race([
      pwaReady,
      new Promise(resolve => setTimeout(() => resolve({ status: 'timeout', controlled: false }), 20000))
    ]).then(function (state) {
      const status = state && state.controlled ? 'controlled' : String(state && state.status || 'uncontrolled');
      runtimeContractState.__pwa = { status: status, controlled: status === 'controlled' };
      runtimeSignal('pwa-ready', status);
      begin();
    }).catch(function () {
      runtimeContractState.__pwa = { status: 'error', controlled: false };
      runtimeSignal('pwa-ready', 'error');
      begin();
    });
  }
`;
const routerNew=`    onHash();
    const hostRendered = !!(host && (host.childElementCount > 0 || String(host.textContent || '').trim()));
    if (!hostRendered) {
      runtimeSignal('router-not-ready', 'host-empty');
      const error = new Error('ROUTER_HOST_NOT_RENDERED');
      error.code = 'ROUTER_HOST_NOT_RENDERED';
      if (routerInitReject) routerInitReject(error);
      routerInitResolve = null; routerInitReject = null; routerInitPromise = null;
      return;
    }
    routerReady = true;
    const readyState = { ready: true, route: (Orbit.route && Orbit.route.key) || 'inicio', hostRendered: true };
    runtimeSignal('router-ready', '1');
    try { document.dispatchEvent(new CustomEvent('orbit:router-ready', { detail: readyState })); } catch (e) {}
    if (routerInitResolve) routerInitResolve(readyState);
    routerInitResolve = null; routerInitReject = null;
    return readyState;
  }

  function init() {
    if (routerReady) return Promise.resolve({ ready: true, route: (Orbit.route && Orbit.route.key) || current || 'inicio', hostRendered: !!(host && (host.childElementCount > 0 || String(host.textContent || '').trim())) });
    if (routerInitPromise) return routerInitPromise;
    host = document.getElementById('host');
    sidebar = document.getElementById('sidebar');
    routerInitPromise = new Promise(function (resolve, reject) { routerInitResolve = resolve; routerInitReject = reject; });
    let started = false;
    function begin() {
      if (started) return;
      started = true;
      try { loadRuntimeContracts(start); } catch (error) {
        if (routerInitReject) routerInitReject(error);
        routerInitResolve = null; routerInitReject = null; routerInitPromise = null;
      }
    }
    const pwaReady = window.OrbitPwaWorkerReady;
    if (!pwaReady || typeof pwaReady.then !== 'function') {
      runtimeContractState.__pwa = { status: 'unavailable', controlled: false };
      runtimeSignal('pwa-ready', 'unavailable');
      begin();
      return routerInitPromise;
    }
    Promise.race([
      pwaReady,
      new Promise(resolve => setTimeout(() => resolve({ status: 'timeout', controlled: false }), 20000))
    ]).then(function (state) {
      const status = state && state.controlled ? 'controlled' : String(state && state.status || 'uncontrolled');
      runtimeContractState.__pwa = { status: status, controlled: status === 'controlled' };
      runtimeSignal('pwa-ready', status);
      begin();
    }).catch(function () {
      runtimeContractState.__pwa = { status: 'error', controlled: false };
      runtimeSignal('pwa-ready', 'error');
      begin();
    });
    return routerInitPromise;
  }
`;
must(router.includes(routerOld),'ROOTFIX_ROUTER_TARGET_NOT_FOUND');
router=router.replace(routerOld,routerNew);

const appOld=`      state.tenantContextReady=true;
      if(!state.routerStarted){if(!Orbit.router||typeof Orbit.router.init!=='function')throw new Error('PRODUCT_ROUTER_MISSING');Orbit.router.init();state.routerStarted=true;}
      state.started=true;state.activating=false;state.lastError='';
      if(Orbit.auth&&typeof Orbit.auth.showApp==='function')Orbit.auth.showApp();
`;
const appNew=`      state.tenantContextReady=true;
      if(!state.routerStarted){
        if(!Orbit.router||typeof Orbit.router.init!=='function')throw new Error('PRODUCT_ROUTER_MISSING');
        return Promise.resolve(Orbit.router.init()).then(function(routerStatus){
          if(!routerStatus||routerStatus.ready!==true||routerStatus.hostRendered!==true)throw new Error('PRODUCT_ROUTER_NOT_READY');
          state.routerStarted=true;
          return result;
        });
      }
      return result;
    }).then(function(){
      state.started=true;state.activating=false;state.lastError='';
      if(Orbit.auth&&typeof Orbit.auth.showApp==='function')Orbit.auth.showApp();
`;
must(app.includes(appOld),'ROOTFIX_PRODUCT_APP_TARGET_NOT_FOUND');
app=app.replace(appOld,appNew).replace("VERSION:'fase-a-product-p0-20260814'","VERSION:'fase-a-product-p0-20260819-router-readiness'");

must(router.includes('routerInitPromise')&&router.includes("ROUTER_HOST_NOT_RENDERED")&&router.includes("orbit:router-ready"),'ROOTFIX_ROUTER_SEMANTICS_MISSING');
must(app.includes('Promise.resolve(Orbit.router.init())')&&app.includes('PRODUCT_ROUTER_NOT_READY'),'ROOTFIX_PRODUCT_APP_WAIT_MISSING');
must(!app.includes('Orbit.router.init();state.routerStarted=true;'),'ROOTFIX_PREMATURE_READY_STILL_PRESENT');

fs.writeFileSync(ROUTER,router);
fs.writeFileSync(APP,app);
const evidence={
  schemaVersion:'orbit360-f2-request08-router-readiness-rootfix-source-v1',ok:true,status:'F2_REQUEST08_ROUTER_READINESS_ROOTFIX_APPLIED',classification:'FUNCTIONAL_DEFECT_ROOTFIX_SOURCE',
  rootCause:'FUNCTIONAL_DEFECT:F2_PRODUCT_APP_ROUTER_READINESS_PREMATURE',request08RunId:32313759752,predecessorArtifactId:9385306424,
  changedFiles:[ROUTER,APP],routerInitIdempotent:true,activationWaitsForRouter:true,hostRenderedBeforeReady:true,
  routerSha256:sha(router),productAppSha256:sha(app),browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,
  firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
};
fs.writeFileSync(EVIDENCE,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));