'use strict';

const crypto=require('node:crypto');

const VERSION='ays-cotcomp-s502-gravicentra-handoff-contract-v0.1-source-only';
const AUTO_READY=false;
const RUNTIME_WRITES_ALLOWED=false;
const PRODUCTION=false;

const TENANT_ID='alianzas-soluciones';
const PUBLIC_SOURCE='ays_web_cotcomp';

const COUNTRY=Object.freeze({gt:'GT',co:'CO'});
const FAMILY_TO_PRODUCT=Object.freeze({
  vehicle:'Vehículo / Movilidad',
  home:'Hogar',
  health:'Salud / Gastos médicos',
  life:'Vida / Ingreso',
  business:'Empresa',
  cargo:'Transporte / Carga',
  other:'Orientación'
});

function text(v,max=300){return String(v==null?'':v).trim().slice(0,max);}
function norm(v){return text(v,160).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function cleanCountry(v){
  const n=norm(v);
  if(n==='gt'||n==='guatemala')return 'GT';
  if(n==='co'||n==='colombia')return 'CO';
  return '';
}
function cleanFamily(v){
  const id=norm(v).replace(/ /g,'_');
  const aliases={
    'vehiculo_movilidad':'vehicle','vehiculo':'vehicle','vehicle':'vehicle',
    'hogar':'home','home':'home',
    'salud_gastos_medicos':'health','salud':'health','health':'health',
    'vida_ingreso':'life','vida':'life','life':'life',
    'empresa':'business','business':'business',
    'transporte_carga':'cargo','transporte':'cargo','cargo':'cargo',
    'otros_no_se_cual_necesito':'other','orientacion':'other','other':'other'
  };
  return aliases[id]||'';
}
function sanitizeContact(input){
  input=input&&typeof input==='object'?input:{};
  const name=text(input.name||input.nombre,180);
  const whatsapp=text(input.whatsapp||input.phone||input.telefono,40).replace(/[^0-9+]/g,'');
  const email=text(input.email,180).toLowerCase();
  const consent=input.requestManagementConsent===true||input.consent===true;
  const missing=[];
  if(!name)missing.push('contact.name');
  if(!whatsapp&&!email)missing.push('contact.channel');
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))missing.push('contact.email_valid');
  if(!consent)missing.push('consents.requestManagement');
  return {name,whatsapp,email,consent,missing};
}
function sanitizeCotcompRef(input){
  if(!input)return null;
  if(typeof input!=='object'||Array.isArray(input))return {error:'COTCOMP_REF_INVALID'};
  const caseId=text(input.caseId,180);
  const journeyId=text(input.journeyId,180);
  const correlationId=text(input.correlationId,180);
  if(!caseId&&!journeyId&&!correlationId)return null;
  if(!caseId||!journeyId||!correlationId)return {error:'COTCOMP_REF_INCOMPLETE'};
  return {
    schemaVersion:'orbit360-cotcomp-workflow-ref-v1',
    role:'public_handoff',
    caseId,
    journeyId,
    correlationId,
    quoteCasePath:text(input.quoteCasePath,500),
    selectedProposalId:text(input.selectedProposalId,180),
    intakeStatus:'lead_recibido'
  };
}
function handoffIdentity({country,family,ref,handoffId}){
  const explicit=text(handoffId,180);
  if(explicit&&/^[A-Za-z0-9][A-Za-z0-9._:-]{7,179}$/.test(explicit))return explicit;
  const corr=ref&&ref.correlationId?ref.correlationId:'no-correlation';
  return 'web_'+sha(JSON.stringify({country,family,corr,source:PUBLIC_SOURCE})).slice(0,28);
}
function buildSourceOnlyHandoff(input={}){
  const country=cleanCountry(input.country||input.pais);
  const family=cleanFamily(input.family||input.need||input.necesidad);
  const contact=sanitizeContact(input.contact);
  const ref=sanitizeCotcompRef(input.cotcompRef);
  const blockers=[];
  if(!country)blockers.push('COUNTRY_REQUIRED');
  if(!family)blockers.push('FAMILY_REQUIRED');
  blockers.push(...contact.missing.map(x=>'MISSING_'+x));
  if(ref&&ref.error)blockers.push(ref.error);

  const handoffId=handoffIdentity({country,family,ref:ref&& !ref.error?ref:null,handoffId:input.handoffId});
  const product=FAMILY_TO_PRODUCT[family]||'Orientación';

  const proposedCommand={
    tenantId:TENANT_ID,
    operation:'create_business',
    requestId:handoffId,
    reason:'Solicitud de continuidad desde Cotizar y comparar A&S',
    payload:{
      id:'neg_'+handoffId.replace(/[^A-Za-z0-9]/g,'').slice(-24),
      nombre:contact.name,
      tipo:'Prospecto web',
      pais:country,
      canal:'Web CotComp',
      producto:product,
      prioridad:'Media',
      origen:'Web CotComp',
      descripcion:text(input.summary||input.contextSummary||('Solicitud de acompañamiento · '+product),1200),
      cotcompRef:ref&& !ref.error?ref:undefined,
      notificationTitle:'Nueva solicitud desde Cotizar y comparar',
      notificationMessage:'Un usuario solicitó acompañamiento desde la web de A&S.'
    }
  };

  return {
    version:VERSION,
    autoReady:AUTO_READY,
    runtimeWritesAllowed:RUNTIME_WRITES_ALLOWED,
    production:PRODUCTION,
    tenantId:TENANT_ID,
    publicSource:PUBLIC_SOURCE,
    country,
    family,
    contact:{
      name:contact.name,
      hasWhatsapp:!!contact.whatsapp,
      hasEmail:!!contact.email,
      requestManagementConsent:contact.consent
    },
    cotcompRef:ref&& !ref.error?ref:null,
    handoffId,
    blockers:[...new Set(blockers)],
    serverRequirements:[
      'APP_CHECK_OR_EQUIVALENT_ANTI_ABUSE',
      'SERVER_SIDE_ADVISOR_ROUTING',
      'SERVICE_OR_AUTHORIZED_ACTOR',
      'IDEMPOTENT_COMMAND',
      'DURABLE_READBACK',
      'NOTIFICATION_OUTBOX_READBACK'
    ],
    proposedCommand,
    readyForServerAdapter:blockers.length===0,
    userAckAllowed:false,
    rationale:'User success acknowledgement is forbidden until the server adapter returns durable entity + workflow event + advisor-targeted outbox/readback.'
  };
}

module.exports=Object.freeze({
  VERSION,AUTO_READY,RUNTIME_WRITES_ALLOWED,PRODUCTION,TENANT_ID,PUBLIC_SOURCE,
  COUNTRY,FAMILY_TO_PRODUCT,buildSourceOnlyHandoff
});
