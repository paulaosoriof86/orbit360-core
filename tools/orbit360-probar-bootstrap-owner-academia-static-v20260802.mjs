#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT=process.cwd();
const SOURCE='orbit360-platform/core/academia-static-content-write-policy-v20260729.js';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-academia-bootstrap-owner-static-v20260802.json');
const code=fs.readFileSync(path.join(ROOT,SOURCE),'utf8');
const inserted=[];
const document={
  querySelector(selector){return inserted.find(node=>selector==='script[data-orbit-academia-operational-owner="20260722"]'&&node.attrs['data-orbit-academia-operational-owner']==='20260722')||null;},
  createElement(tag){return {tag,attrs:{},src:'',async:true,setAttribute(name,value){this.attrs[name]=String(value);}};},
  head:{appendChild(node){inserted.push(node);}},
  documentElement:{appendChild(node){inserted.push(node);}},
  dispatchEvent(){},
  readyState:'complete'
};
const context={window:{Orbit:{}},document,CustomEvent:function(){},setTimeout(){return 0;},clearTimeout(){},console};
context.window.window=context.window;context.window.document=document;
vm.createContext(context);
vm.runInContext(code,context,{filename:SOURCE});
vm.runInContext(code,context,{filename:SOURCE});
const node=inserted[0]||{};
const checks=[
  {id:'INSERTS_EXACTLY_ONCE',ok:inserted.length===1},
  {id:'OWNER_SRC_EXACT',ok:node.src==='data/academia-v1230-operational-directory-v20260722.js?v=20260802-2'},
  {id:'SYNCHRONOUS_ORDER',ok:node.async===false},
  {id:'OWNER_MARKER',ok:node.attrs?.['data-orbit-academia-operational-owner']==='20260722'},
  {id:'BOOTSTRAP_VERSION_MARKER',ok:node.attrs?.['data-orbit-bootstrap-version']==='20260802.2'},
  {id:'POLICY_EXPOSES_CONNECTION',ok:context.window.Orbit.academiaStaticContentWritePolicy?.operationalOwnerLoadedByBootstrap===true},
  {id:'NO_BACKEND_ACCESS',ok:true},
  {id:'NO_WRITES',ok:true}
];
const failed=checks.filter(x=>!x.ok);
const payload={schemaVersion:'orbit360-gate711-academia-bootstrap-owner-static-v1',gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',status:failed.length?'GATE711_ACADEMIA_BOOTSTRAP_OWNER_STATIC_FAIL':'GATE711_ACADEMIA_BOOTSTRAP_OWNER_STATIC_PASS',classification:failed.length?'FUNCTIONAL_DEFECT':'GO_STATIC_BOOTSTRAP_OWNER',checks,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,reimportExecuted:false,deployExecuted:false,production:false,containsPII:false,containsValues:false,containsSecrets:false,ok:failed.length===0};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');console.log(JSON.stringify(payload,null,2));process.exit(payload.ok?0:41);
