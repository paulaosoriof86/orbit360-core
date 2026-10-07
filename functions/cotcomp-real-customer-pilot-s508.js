'use strict';

const crypto=require('node:crypto');
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {onRequest}=require('firebase-functions/v2/https');
const ops=require('./ops-leads-domain').__opsLeadsDomain;
const page=require('./cotcomp-s508-private-page');

const VERSION='ays-cotcomp-s508-one-time-real-customer-lab-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const REGION='us-central1';
const TOKEN_SHA256='674510736431c588904cd533abad7a7c5f3d8da82043a45bbaae3787f46a43e1';
const EXPIRES_AT='2026-10-08T15:13:16.171Z';
const STATE_PATH='tenants/alianzas-soluciones/cotcomp/pilotIntake/items/s508';
const CONSENT_VERSION='GT_REAL_CUSTOMER_LAB_PILOT_REQUEST_MANAGEMENT_v1';
const PRIVACY_NOTICE_VERSION='GT_REAL_CUSTOMER_LAB_PILOT_PRIVACY_v1';
const RETENTION='RETAIN_IF_VALID_BUSINESS_RECORD';
const ALLOWED=new Set(['brand','lineModel','name','whatsapp','email','note','adultConfirmed','requestManagementConsent']);

const clean=(v,m=500)=>String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,m);
const norm=v=>clean(v,160).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sha=v=>crypto.createHash('sha256').update(String(v==null?'':v),'utf8').digest('hex');

function verify(token){
  const a=Buffer.from(sha(clean(token,300)),'utf8'),b=Buffer.from(TOKEN_SHA256,'utf8');
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
function normalize(body){
  const raw=body&&typeof body==='object'&&!Array.isArray(body)?body:{};
  if(Object.keys(raw).some(k=>!ALLOWED.has(k)))throw new Error('FIELDS');
  return {
    brand:clean(raw.brand,120),lineModel:clean(raw.lineModel,160),name:clean(raw.name,180),
    whatsapp:clean(raw.whatsapp,80),email:clean(raw.email,220).toLowerCase(),note:clean(raw.note,600),
    adultConfirmed:raw.adultConfirmed===true,requestManagementConsent:raw.requestManagementConsent===true
  };
}
function validate(v){
  const e=[];
  if(!v.brand)e.push('BRAND_REQUIRED');
  if(!v.lineModel)e.push('LINE_MODEL_REQUIRED');
  if(v.name.length<2)e.push('NAME_REQUIRED');
  if(!v.whatsapp&&!v.email)e.push('CONTACT_REQUIRED');
  if(v.whatsapp&&!/^[+0-9() .-]{7,30}$/.test(v.whatsapp))e.push('WHATSAPP_INVALID');
  if(v.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))e.push('EMAIL_INVALID');
  if(!v.adultConfirmed)e.push('ADULT_REQUIRED');
  if(!v.requestManagementConsent)e.push('CONSENT_REQUIRED');
  return e;
}
function advisorEligible(row){
  const status=norm(row&&(row.status||row.estado));
  const active=!!row&&row.active!==false&&row.activo!==false&&!['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(status);
  const roles=[].concat(row&&row.roles||[],row&&row.activeRole||[],row&&row.rolActivo||[],row&&row.role||[],row&&row.rol||[]).map(norm);
  const countries=[].concat(row&&row.countries||[],row&&row.paises||[],row&&row.country||[],row&&row.pais||[]).map(x=>clean(x,8).toUpperCase()).filter(Boolean);
  return active&&roles.some(r=>['asesor','asesora','comercial'].includes(r)||r.startsWith('asesor_')||r.startsWith('asesora_'))&&(!countries.length||countries.includes('GT'));
}
function isPaula(row){
  const p=norm(row&&(row.nombre||row.name)).split('_').filter(Boolean);
  return p.includes('paula')&&p.includes('osorio')&&advisorEligible(row);
}
function db(){const app=getApps()[0]||initializeApp({projectId:PROJECT_ID});return getFirestore(app);}
async function mode(d){const s=await d.collection('tenants').doc(TENANT_ID).collection('config').doc('workflow').get();return s.exists&&s.data().storageMode==='canonicalV2'?'canonicalV2':'legacyCompatible';}
function bizRef(d,m,id){return m==='canonicalV2'?d.collection('tenants').doc(TENANT_ID).collection('workflow').doc('negocios').collection('items').doc(id):d.collection('tenantId').doc(TENANT_ID).collection('negocios').doc(id);}
async function paula(d){const s=await d.collection('tenantId').doc(TENANT_ID).collection('asesores').get();const a=s.docs.map(x=>({id:x.id,...(x.data()||{})})).filter(isPaula);if(a.length!==1)throw new Error('PAULA_NOT_UNIQUE');return {id:a[0].id,commitment:sha(a[0].id)};}
function ids(){const x=sha('s508|'+TOKEN_SHA256).slice(0,20),requestId='s508_req_'+x;return {businessId:'s508_neg_'+x,requestId,eventId:'evt_'+sha(TENANT_ID+'|'+requestId).slice(0,28),caseId:'s508_case_'+x,correlationId:'s508_corr_'+x,uid:'s508_public_ingress_service'};}
async function claim(d){
  return d.runTransaction(async tx=>{
    const r=d.doc(STATE_PATH),s=await tx.get(r),v=s.exists?s.data()||{}:{},now=Date.now();
    if(v.used===true)return {ok:false,used:true,reference:clean(v.reference,40)};
    if(Number(v.attempts||0)>=5)return {ok:false,limited:true};
    if(v.processing===true&&now-Number(v.processingAtEpochMs||0)<120000)return {ok:false,processing:true};
    tx.set(r,{schemaVersion:VERSION,tenantId:TENANT_ID,attempts:Number(v.attempts||0)+1,processing:true,processingAtEpochMs:now,used:false,tokenSha256:TOKEN_SHA256,expiresAt:EXPIRES_AT,containsPii:false},{merge:true});
    return {ok:true};
  });
}
async function release(d,p={}){await d.doc(STATE_PATH).set({processing:false,processingAtEpochMs:0,...p},{merge:true});}
function headers(res){res.set('Cache-Control','no-store');res.set('Referrer-Policy','no-referrer');res.set('X-Content-Type-Options','nosniff');res.set('X-Frame-Options','DENY');}

async function post(req,res){
  if(Date.now()>Date.parse(EXPIRES_AT))return res.status(410).json({ok:false,message:'Enlace vencido.'});
  if(!verify(req.get('x-ays-pilot-capability')))return res.status(403).json({ok:false,message:'Enlace no autorizado.'});
  let v;try{v=normalize(req.body);}catch{return res.status(400).json({ok:false,message:'Campos no autorizados.'});}
  const errors=validate(v);if(errors.length)return res.status(400).json({ok:false,message:'Revisa los datos requeridos.',errors});
  const d=db(),lock=await claim(d);if(!lock.ok){if(lock.used)return res.status(200).json({ok:true,status:'ALREADY_REGISTERED',reference:lock.reference});if(lock.limited)return res.status(429).json({ok:false,message:'Límite de intentos alcanzado.'});return res.status(409).json({ok:false,message:'Solicitud en proceso.'});}
  const x=ids(),member=d.collection('tenants').doc(TENANT_ID).collection('members').doc(x.uid);
  try{
    const a=await paula(d),now=new Date().toISOString(),detail='Vehículo: '+v.brand+' '+v.lineModel+(v.note?' · Necesidad: '+v.note:'');
    await member.set({tenantId:TENANT_ID,uid:x.uid,status:'active',active:true,roles:['SuperAdmin'],activeRole:'SuperAdmin',dataScopes:{workflow:'all'},serviceActor:true,pilot:'S5.08'},{merge:true});
    const result=await ops.executeCommand({auth:{uid:x.uid},data:{tenantId:TENANT_ID,operation:'create_business',requestId:x.requestId,reason:'Solicitud real autorizada S5.08 · Web CotComp',payload:{id:x.businessId,nombre:v.name,tipo:'Prospecto web',pais:'GT',moneda:'GTQ',canal:'Web CotComp',producto:'Vehículo / Movilidad',ramo:'Vehículo / Movilidad',prioridad:'Media',origen:'Web CotComp',asesorId:a.id,cotcompRef:{role:'public_handoff',caseId:x.caseId,journeyId:'GT_AUTO_MOTO_HYBRID',correlationId:x.correlationId,quoteCasePath:'none',intakeStatus:'lead_recibido'},notificationTitle:'Nueva solicitud Web CotComp · Vehículo/Movilidad',notificationMessage:'Nueva solicitud real autorizada S5.08 en Leads.'}}});
    const m=await mode(d),b=bizRef(d,m,x.businessId);
    await b.set({telefono:v.whatsapp,email:v.email,descripcion:detail,requestManagementConsent:true,requestManagementConsentVersion:CONSENT_VERSION,requestManagementConsentAt:now,privacyNoticeVersion:PRIVACY_NOTICE_VERSION,privacyContactEmail:'info@aysseguros.com',marketingConsent:false,adultConfirmed:true,pilotScope:'S5.08_ONE_TIME_REAL_LAB',retentionDisposition:RETENTION,unconvertedRetentionMonths:12,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    const q=d.collection('tenants').doc(TENANT_ID).collection('workflowRequests').doc(x.requestId),e=d.collection('tenants').doc(TENANT_ID).collection('workflowEvents').doc(result.eventId),o=d.collection('tenants').doc(TENANT_ID).collection('notificationOutbox').doc(result.eventId);
    const [bs,qs,es,os]=await Promise.all([b.get(),q.get(),e.get(),o.get()]);if(!bs.exists||!qs.exists||!es.exists||!os.exists)throw new Error('READBACK_MISSING');
    const br=bs.data()||{},ob=os.data()||{},assigned=clean(br.asesorId)===a.id,targeted=[].concat(ob.targets||[]).some(t=>t&&t.type==='advisor'&&clean(t.id)===a.id),leads=!!(result.projection&&result.projection.leadsVisible);
    if(!assigned||!targeted||!leads||norm(br.etapa)!=='nuevo'||br.requestManagementConsent!==true||br.marketingConsent!==false)throw new Error('READBACK_FAILED');
    const reference=sha(x.businessId).slice(0,12);
    await release(d,{used:true,usedAt:now,reference,businessCommitment:sha(x.businessId),advisorCommitment:a.commitment,requestCommitment:sha(x.requestId),consentVersion:CONSENT_VERSION,privacyNoticeVersion:PRIVACY_NOTICE_VERSION,retentionDisposition:RETENTION,productionTouched:false,providerRaterUsed:false,issued:false,bound:false,paid:false});
    await member.delete();
    return res.status(201).json({ok:true,status:'REGISTERED',reference,assignedTo:'Paula Osorio'});
  }catch(err){
    try{const m=await mode(d),b=bizRef(d,m,x.businessId),q=d.collection('tenants').doc(TENANT_ID).collection('workflowRequests').doc(x.requestId),e=d.collection('tenants').doc(TENANT_ID).collection('workflowEvents').doc(x.eventId),o=d.collection('tenants').doc(TENANT_ID).collection('notificationOutbox').doc(x.eventId);const batch=d.batch();for(const ref of [b,q,e,o]){const s=await ref.get();if(s.exists)batch.delete(ref);}await batch.commit();await member.delete();await release(d,{used:false,lastFailureAt:new Date().toISOString(),lastFailureCode:clean(err&&(err.code||err.message),120)});}catch{}
    return res.status(500).json({ok:false,message:'No fue posible registrar la solicitud. Usa WhatsApp +502 5614 9048 o info@aysseguros.com.'});
  }
}
async function handler(req,res){headers(res);if((process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID)!==PROJECT_ID)return res.status(503).send('Entorno no autorizado.');if(req.method==='GET'){res.set('Content-Type','text/html; charset=utf-8');return res.status(200).send(page.html({tokenHash:TOKEN_SHA256,privacyEmail:'info@aysseguros.com'}));}if(req.method==='POST')return post(req,res);return res.status(405).send('Método no permitido.');}
const cotcompRealCustomerPilotS508=onRequest({region:REGION,timeoutSeconds:45,maxInstances:1,concurrency:1,invoker:'public'},handler);
module.exports=Object.freeze({VERSION,PROJECT_ID,TENANT_ID,REGION,TOKEN_SHA256,EXPIRES_AT,STATE_PATH,CONSENT_VERSION,PRIVACY_NOTICE_VERSION,RETENTION,ALLOWED,sha,verify,normalize,validate,advisorEligible,isPaula,ids,handler,cotcompRealCustomerPilotS508});
