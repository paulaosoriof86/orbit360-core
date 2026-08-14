#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(),DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716');
const BEFORE=path.join(DIR,'m6-product-data-before.json'),AFTER=path.join(DIR,'m6-product-data-after.json'),OUT=path.join(DIR,'fase-a-product-integrity-v20260813.json');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
let out;
try{
 const a=read(BEFORE),b=read(AFTER),keys=['clientes','aseguradoras','asesoresFuente','memberships','config'];
 const countsStable=keys.every(k=>a?.counts?.[k]===b?.counts?.[k]);
 const digestsStable=keys.every(k=>a?.digests?.[k]===b?.digests?.[k]);
 const ok=Boolean(a?.ok&&b?.ok&&countsStable&&digestsStable&&a?.firestoreWrites===0&&b?.firestoreWrites===0&&a?.operationalWrites===0&&b?.operationalWrites===0);
 out={ok,status:ok?'FASE_A_PRODUCT_INTEGRITY_PASS':'FASE_A_PRODUCT_INTEGRITY_FAIL',countsStable,digestsStable,firestoreWrites:0,authWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false};
}catch(e){out={ok:false,status:'FASE_A_PRODUCT_INTEGRITY_FAIL',error:String(e?.message||e).slice(0,300),firestoreWrites:0,authWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false};}
fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
