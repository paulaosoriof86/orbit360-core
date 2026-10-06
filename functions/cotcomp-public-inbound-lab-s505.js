'use strict';

const crypto=require('node:crypto');
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {onRequest}=require('firebase-functions/v2/https');
const ops=require('./ops-leads-domain').__opsLeadsDomain;

const VERSION='ays-cotcomp-s505-public-inbound-lab-v0.1';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const REGION='us-central1';
const FUNCTION_NAME='cotcompPublicInboundS505';
const ALLOWED_ORIGINS=new Set(['https://aysseguros.com','https://www.aysseguros.com']);

const app=getApps()[0]||initializeApp();
const db=getFirestore(app);

function clean(v,max=500){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function validProofRunId(v){return /^s505-[A-Za-z0-9._:-]{4,90}$/.test(clean(v,100));}
function validIdempotencyKey(v){return /^idem-[A-Za-z0-9._:-]{4,90}$/.test(clean(v,100));}
function country(v){const x=clean(v,8).toUpperCase();return x==='GT'||x==='CO'?x:'';}
function family(v){
  const x=clean(v,80).toLowerCase();
  const map={vehicle:'Vehículo / Movilidad',home:'Hogar',health:'Salud / Gastos médicos',life:'Vida / Ingreso',business:'Empresa',cargo:'Transporte / Carga',other:'Orientación'};
  return map[x]||'';
}
function cors(req,res){
  const origin=clean(req.get('origin'),300).replace(/\/$/,'');
  if(ALLOWED_ORIGINS.has(origin)){
    res.set('Access-Control-Allow-Origin',origin);
    res.set('Vary','Origin');
    res.set('Access-Control-Allow-Headers','Content-Type, X-Ays-Proof-Token');
    res.set('Access-Control-Allow-Methods','POST, OPTIONS');
  }
  return origin;
}
function deny(res,code,message){
  return res.status(code).json({ok:false,registered:false,message});
}
function permitRef(proofRunId){
  return db.collection('tenants').doc(TENANT_ID).collection('syntheticProofPermits').doc(proofRunId);
}
function businessRef(storageMode,id){
  return storageMode==='canonicalV2'
    ? db.collection('tenants').doc(TENANT_ID).collection('workflow').doc('negocios').collection('items').doc(id)
    : db.collection('tenantId').doc(TENANT_ID).collection('negocios').doc(id);
}
function requestRef(id){return db.collection('tenants').doc(TENANT_ID).collection('workflowRequests').doc(id);}
function eventRef(id){return db.collection('tenants').doc(TENANT_ID).collection('workflowEvents').doc(id);}
function outboxRef(id){return db.collection('tenants').doc(TENANT_ID).collection('notificationOutbox').doc(id);}

async function verifyPermit({proofRunId,token,origin,countryCode}){
  if(!ALLOWED_ORIGINS.has(origin))return {ok:false,code:'ORIGIN_NOT_ALLOWED'};
  if(!validProofRunId(proofRunId))return {ok:false,code:'PROOF_RUN_INVALID'};
  if(clean(token,200).length<24)return {ok:false,code:'PROOF_TOKEN_REQUIRED'};
  const snap=await permitRef(proofRunId).get();
  if(!snap.exists)return {ok:false,code:'PROOF_PERMIT_MISSING'};
  const p=snap.data()||{};
  if(p.synthetic!==true||p.enabled!==true)return {ok:false,code:'PROOF_PERMIT_DISABLED'};
  if(clean(p.proofRunId,100)!==proofRunId)return {ok:false,code:'PROOF_PERMIT_MISMATCH'};
  if(clean(p.country,8)!==countryCode)return {ok:false,code:'PROOF_COUNTRY_MISMATCH'};
  if(clean(p.tokenDigest,64)!==sha(token))return {ok:false,code:'PROOF_TOKEN_INVALID'};
  if(Number(p.expiresAtEpochMs||0)<Date.now())return {ok:false,code:'PROOF_PERMIT_EXPIRED'};
  if(!clean(p.uid,180)||!clean(p.advisorId,180))return {ok:false,code:'PROOF_ROUTING_INCOMPLETE'};
  return {ok:true,permit:p};
}

async function handler(req,res){
  res.set('Cache-Control','no-store');
  res.set('X-Content-Type-Options','nosniff');
  const origin=cors(req,res);
  if(req.method==='OPTIONS')return res.status(204).send('');
  if(req.method!=='POST')return deny(res,405,'Método no permitido.');

  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID;
  if(project!==PROJECT_ID)return deny(res,503,'Entorno no habilitado.');

  const body=req.body&&typeof req.body==='object'?req.body:{};
  if(body.synthetic!==true)return deny(res,403,'Solo se acepta prueba sintética controlada.');

  const proofRunId=clean(body.proofRunId,100);
  const idempotencyKey=clean(body.idempotencyKey,100);
  const countryCode=country(body.country);
  const product=family(body.needFamily);
  if(!validIdempotencyKey(idempotencyKey)||!countryCode||!product)return deny(res,400,'Payload sintético incompleto.');

  const token=clean(req.get('x-ays-proof-token'),200);
  const gate=await verifyPermit({proofRunId,token,origin,countryCode});
  if(!gate.ok)return deny(res,403,gate.code);

  const permit=gate.permit;
  const suffix=sha(proofRunId+'|'+idempotencyKey).slice(0,20);
  const businessId='s505_neg_'+suffix;
  const requestId='s505_req_'+suffix;
  const correlationId='s505_corr_'+suffix;
  const caseId='s505_case_'+suffix;
  const journeyId=countryCode==='CO'?'CO_TRANSPORTE_CONSULTATIVE_HYBRID':'GT_AUTO_MOTO_HYBRID';

  const command={
    auth:{uid:clean(permit.uid,180)},
    data:{
      tenantId:TENANT_ID,
      operation:'create_business',
      requestId,
      reason:'Prueba sintética controlada de entrada pública CotComp',
      payload:{
        id:businessId,
        nombre:'Synthetic QA S5.05',
        tipo:'Prospecto web sintético',
        pais:countryCode,
        moneda:countryCode==='CO'?'COP':'GTQ',
        canal:'Web CotComp',
        producto:product,
        ramo:product,
        prioridad:'Media',
        origen:'Web CotComp',
        asesorId:clean(permit.advisorId,180),
        descripcion:'Synthetic QA only. No customer data.',
        cotcompRef:{
          role:'public_handoff',
          caseId,
          journeyId,
          correlationId,
          quoteCasePath:'synthetic-only',
          intakeStatus:'lead_recibido'
        },
        notificationTitle:'Synthetic QA · Nueva solicitud Web CotComp',
        notificationMessage:'Synthetic QA only. No customer data.'
      }
    }
  };

  try{
    const result=await ops.executeCommand(command);
    const [b,r,e,o]=await Promise.all([
      businessRef(result.storageMode,businessId).get(),
      requestRef(requestId).get(),
      eventRef(result.eventId).get(),
      outboxRef(result.eventId).get()
    ]);
    const outbox=o.exists?o.data():{};
    const advisorTarget=o.exists&&[].concat(outbox.targets||[]).some(t=>t&&t.type==='advisor'&&t.id===permit.advisorId);
    if(!b.exists||!r.exists||!e.exists||!o.exists||!advisorTarget){
      return deny(res,503,'No fue posible confirmar el registro interno.');
    }
    return res.status(200).json({
      ok:true,
      registered:true,
      synthetic:true,
      version:VERSION,
      entityId:businessId,
      requestId,
      eventId:result.eventId,
      advisorId:permit.advisorId,
      reused:result.reused===true,
      productionTouched:false
    });
  }catch(error){
    if(error&&error.code==='failed-precondition')return res.status(409).json({ok:false,registered:false,code:'IDEMPOTENCY_CONFLICT'});
    console.error('S505_PUBLIC_INBOUND_ERROR',error&&error.code||error&&error.message||'unknown');
    return deny(res,500,'No fue posible completar la prueba sintética.');
  }
}

const cotcompPublicInboundS505=onRequest({
  region:REGION,
  timeoutSeconds:30,
  memory:'256MiB',
  maxInstances:2,
  concurrency:20,
  invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,TENANT_ID,REGION,FUNCTION_NAME,ALLOWED_ORIGINS,
  validProofRunId,validIdempotencyKey,country,family,verifyPermit,handler,cotcompPublicInboundS505
});
