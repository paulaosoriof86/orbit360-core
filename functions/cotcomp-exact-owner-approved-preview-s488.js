'use strict';

const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {onRequest}=require('firebase-functions/v2/https');

const VERSION='ays-cotcomp-s488-exact-owner-baseline-recovery-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompExactOwnerApprovedPreviewS488';
const EXPECTED_SHA256='a7f1be79cdb6d8144f608dc559d69ebc38bb6347a03ad2733eac2bb914a4673d';
const EXPECTED_CHUNKS=28;
const ASSET_DIR=path.join(__dirname,'assets','cotcomp-owner-approved-s410-exact');

function loadExactHtml(){
  const files=fs.readdirSync(ASSET_DIR)
    .filter(n=>/^chunk-\d{3}\.txt$/.test(n))
    .sort();
  if(files.length!==EXPECTED_CHUNKS){
    throw new Error('S488_EXACT_BASELINE_CHUNK_COUNT_MISMATCH');
  }
  const html=files.map(n=>fs.readFileSync(path.join(ASSET_DIR,n),'utf8')).join('');
  const digest=crypto.createHash('sha256').update(html,'utf8').digest('hex');
  if(digest!==EXPECTED_SHA256){
    const e=new Error('S488_EXACT_BASELINE_SHA256_MISMATCH');
    e.expected=EXPECTED_SHA256;
    e.actual=digest;
    throw e;
  }
  if(!html.includes("state = { screen:'cotcomp'")){
    throw new Error('S488_COTCOMP_DEFAULT_STATE_MISSING');
  }
  if(!html.includes('Empecemos por lo que quieres proteger.')){
    throw new Error('S488_OWNER_APPROVED_HIERARCHY_MISSING');
  }
  return {html,digest,files};
}

const EXACT=loadExactHtml();

function handler(req,res){
  res.set('Cache-Control','no-store, max-age=0');
  res.set('Pragma','no-cache');
  res.set('X-Content-Type-Options','nosniff');
  res.set('Referrer-Policy','no-referrer');
  res.set('X-Ays-CotComp-Baseline','S4.10/S4.18 exact');
  res.set('X-Ays-CotComp-Sha256',EXPECTED_SHA256);
  if(req.method!=='GET'){
    res.set('Allow','GET');
    return res.status(405).send('Método no permitido.');
  }
  res.set('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(EXACT.html);
}

const cotcompExactOwnerApprovedPreviewS488=onRequest({
  region:REGION,
  timeoutSeconds:60,
  memory:'512MiB',
  maxInstances:2,
  concurrency:20,
  invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,FUNCTION_NAME,EXPECTED_SHA256,EXPECTED_CHUNKS,ASSET_DIR,
  loadExactHtml,handler,cotcompExactOwnerApprovedPreviewS488
});
