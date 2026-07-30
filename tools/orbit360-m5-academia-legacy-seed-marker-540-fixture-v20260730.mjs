#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT=process.cwd(),DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716'),OUT=path.join(DIR,'m5-academia-legacy-seed-marker-540-fixture-summary.json');
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');const checks=[];const add=(id,ok,d='')=>checks.push({id,ok:Boolean(ok),detail:String(d||'').slice(0,240)});
try{
 const policy=read('orbit360-platform/core/academia-static-content-write-policy-v20260729.js'),bridge=read('orbit360-platform/data/academia-v1197-bridge.js'),seed=read('orbit360-platform/data/seed.js'),module=read('orbit360-platform/modules/academia.js'),index=read('orbit360-platform/index.html'),v1230=read('orbit360-platform/data/academia-v1230-operational-directory-v20260722.js');
 const sandbox={window:{Orbit:{}},document:{dispatchEvent(){},addEventListener(){},readyState:'complete'},CustomEvent:function(){},setTimeout(){return 0},clearTimeout(){}};sandbox.window.window=sandbox.window;sandbox.window.document=sandbox.document;sandbox.Orbit=sandbox.window.Orbit;vm.createContext(sandbox);vm.runInContext(policy,sandbox,{filename:'policy.js'});
 const classify=sandbox.window.Orbit.academiaStaticContentWritePolicy.classify;
 const legacy={id:'cur1',titulo:'Inducción',_cv:1,_staticCourse:true};const user={id:'cur123456',titulo:'Usuario',_cv:1};const modern={id:'cur_moderno',titulo:'Sistema',_cv:2};
 const a=classify('insert','cursos','cur1',legacy),b=classify('insert','cursos','cur123456',user),c=classify('insert','cursos','cur_moderno',modern);
 const section=(seed.match(/const cursos = \[([\s\S]*?)\n\s*\/\/ ={10,}\n\s*\/\/  NOTIFICACIONES DEL PORTAL/)||[])[1]||'';const legacyIds=[...section.matchAll(/\bid:\s*['"](cur[^'"]+)['"]/g)].map(m=>m[1]);
 add('POLICY_VERSION',policy.includes("var VERSION='20260730.1';"));
 add('EXPLICIT_LEGACY_TRANSIENT',a&&a.mode==='transient_static_content'&&a.reason==='versioned_explicit_seed_course');
 add('USER_CUR_ID_DURABLE',b&&b.mode==='durable_operational'&&b.reason==='user_or_operational_mutation');
 add('MODERN_STATIC_TRANSIENT',c&&c.mode==='transient_static_content');
 add('NORMALIZER_EXPLICIT_MARKER',bridge.includes('c._staticCourse = true')&&bridge.includes('if (!c._cv) c._cv = 1'));
 add('LEGACY_IDS_PRESENT',legacyIds.length>=6&&legacyIds.includes('cur1')&&legacyIds.includes('cur2')&&legacyIds.includes('cur3')&&legacyIds.includes('cur4'));
 add('USER_CREATION_UNMARKED',module.includes("id: 'cur' + Date.now().toString().slice(-6)")&&!/Date\.now[^\n]+_staticCourse/.test(module));
 add('INDEX_POLICY_VERSION',index.includes('academia-static-content-write-policy-v20260729.js?v=20260730-1'));
 add('V1230_POLICY_VERSION',v1230.includes("current.version === '20260730.1'")&&v1230.includes('academia-static-content-write-policy-v20260729.js?v=20260730-1'));
 add('NO_GLOBAL_CUR_STAR_RELAXATION',policy.includes("/^(cur_|curso_base_|academia_)/i.test(key)")&&!policy.includes('/^(cur|curso_base_|academia_)'));
 const failed=checks.filter(x=>!x.ok),out={schemaVersion:'orbit360-m5-academia-legacy-seed-marker-540-fixture-summary-v1',generatedAt:new Date().toISOString(),gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.40',ok:failed.length===0,status:failed.length?'M5_ACADEMIA_LEGACY_SEED_MARKER_540_FIXTURE_FAIL':'M5_ACADEMIA_LEGACY_SEED_MARKER_540_FIXTURE_PASS',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,legacySeedCourseIdsObserved:legacyIds.slice(0,32),userGeneratedCourseRemainsDurable:b?.mode==='durable_operational',explicitLegacySeedCourseTransient:a?.mode==='transient_static_content',policyVersion:'20260730.1',firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtime:false,browser:false,deploy:false,production:false,containsPII:false,containsSecrets:false};fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
}catch(error){const out={schemaVersion:'orbit360-m5-academia-legacy-seed-marker-540-fixture-summary-v1',gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.40',ok:false,status:'PIPELINE_MECHANISM_FAILURE',failed:1,error:String(error&&error.message||error).slice(0,300),firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtime:false,browser:false,deploy:false,production:false,containsPII:false,containsSecrets:false};fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(out.error);process.exit(41);}
