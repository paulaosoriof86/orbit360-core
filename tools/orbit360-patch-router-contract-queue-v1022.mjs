#!/usr/bin/env node
import fs from 'node:fs';
const ROUTER='orbit360-platform/core/router.js';
const SYNC='orbit360-platform/core/backend-lab-canonical-view-sync.js';
const RUNTIME='tools/orbit360-gate-runtime-crm-v20260716.mjs';
function one(s,a,b,c){const n=s.split(a).length-1;if(n!==1)throw new Error(c+':'+n);return s.replace(a,()=>b)}
let r=fs.readFileSync(ROUTER,'utf8');
r=one(r,"      function attach(node) {\n        node.addEventListener('load', function () { state.loadEvent = true; checkReady(); }, { once: true });\n        node.addEventListener('error', function () { state.errorEvent = true; finish('error'); }, { once: true });\n      }","      function attach(node) {\n        node.addEventListener('load', function () { state.loadEvent = true; runtimeSignal('contract-loaded', item.marker); checkReady(); }, { once: true });\n        node.addEventListener('error', function () { state.errorEvent = true; runtimeSignal('contract-load-error', item.marker); finish('error'); }, { once: true });\n      }",'ROUTER_ATTACH');
r=one(r,"        script.src = src;\n        script.async = false;\n        script.setAttribute(item.marker, '1');\n        state.status = 'loading';\n        attach(script);\n        document.head.appendChild(script);","        script.src = src;\n        script.async = true;\n        script.setAttribute(item.marker, '1');\n        state.status = 'loading';\n        runtimeSignal('contract-requested', item.marker);\n        attach(script);\n        document.head.appendChild(script);",'ROUTER_ASYNC');
fs.writeFileSync(ROUTER,r);
let s=fs.readFileSync(SYNC,'utf8');
s=one(s,"  function routeKey() {\n    var hash = String(window.location.hash || '');\n    if (hash.indexOf('#/cliente360') === 0) return 'cliente360';\n    if (hash.indexOf('#/aseguradoras') === 0) return 'aseguradoras';\n    return '';\n  }","  function routeKey() {\n    try {\n      var key = window.Orbit && Orbit.route && Orbit.route.key ? String(Orbit.route.key) : '';\n      if (key === 'cliente360' || key === 'aseguradoras') return key;\n    } catch (error) {}\n    return '';\n  }",'SYNC_ROUTE_OWNER');
fs.writeFileSync(SYNC,s);
let x=fs.readFileSync(RUNTIME,'utf8');
x=one(x,"schemaVersion:'orbit360-runtime-gate-joint-v21-auth-ui-external-evidence'","schemaVersion:'orbit360-runtime-gate-joint-v22-router-owned-contract-queue'",'SCHEMA');
x=one(x,"contractVersion:'1.0.21'","contractVersion:'1.0.22'",'VERSION');
fs.writeFileSync(RUNTIME,x);
console.log(JSON.stringify({ok:true,contractVersion:'1.0.22',classification:'FUNCTIONAL_DEFECT',changed:[ROUTER,SYNC,RUNTIME]}));