'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const PREVIEW_REGION = process.env.ORBIT360_PREVIEW_FUNCTIONS_REGION || 'us-east1';
const VERSION = 'orbit360-tenant-domain-config-v1';
const PREVIEW_VERSION = 'orbit360-tenant-domain-config-preview-b2-r96-v1';
const app = getApps()[0] || initializeApp();
const db = getFirestore(app);
const DOMAINS = new Set(['workflow', 'reconciliation', 'access', 'catalogs']);
const ADMIN_ROLES = new Set(['superadmin', 'admintenant', 'direccion', 'admin']);
const PERMISSIONS = new Set(['config_manage', 'workflow_config_manage', 'reconciliation_config_manage', 'access_config_manage', 'catalog_config_manage']);
const CATALOG_DEFAULT = Object.freeze({"canales":["Referido","Conocido","Cliente actual","Cliente antiguo","Web / sitio","WhatsApp","Facebook","Instagram","TikTok","LinkedIn","YouTube","Campaña","Telemarketing","Evento / feria"],"ramos":["Auto","Vida","Gastos Médicos","Hogar","Daños","Fianzas","Transporte","RC","Accidentes"],"ramosPais":{"GT":{"Automóviles":["Vehículo Liviano","Vehículo Pesado","Motocicleta","Grúa / Equipo Especial","Pérdidas Totales","Pérdidas Parciales","Responsabilidad Civil Vehículos","Seguro por Kilómetros","Flotilla"],"Vida":["Vida Individual","Vida Colectivo","Vida Deudores","Vida Temporal","Dotal","Renta / Retiro"],"Gastos Médicos":["GM Individual","GM Familiar","GM Colectivo","GM Internacional","Enfermedades Graves"],"Incendio y Líneas Aliadas":["Hogar","Edificio / Comercio","Todo Riesgo Construcción","Lucro Cesante"],"Daños":["Multirriesgo PYME","Multirriesgo Hogar","Robo y Hurto","Rotura de Maquinaria","Equipo Electrónico","Dinero y Valores"],"Fianzas":["Fianza de Cumplimiento","Fianza de Anticipo","Fianza de Sostenimiento de Oferta","Fianza de Calidad / Conservación de Obra","Fianza Judicial","Fianza Aduanera"],"Transporte":["Carga Terrestre","Carga Marítima","Carga Aérea","Casco","Importación / Exportación"],"Responsabilidad Civil":["RC General","RC Profesional","RC Productos","RC Patronal","RC Directores y Funcionarios (D&O)"],"Accidentes Personales":["AP Individual","AP Colectivo","AP Escolar","Viajero / Asistencia"]},"CO":{"Automóviles":["Todo Riesgo Liviano","Todo Riesgo Pesado","Pérdidas Totales","Pérdidas Parciales","Responsabilidad Civil","Motos","Grúa / Maquinaria","Seguro por Kilómetros","SOAT","Flotas"],"Vida":["Vida Individual","Vida Grupo","Vida Deudores","Temporal","Exequias","Renta Voluntaria"],"Salud":["Salud Individual","Salud Familiar","Medicina Prepagada","Plan Complementario","Hospitalización y Cirugía","Salud Internacional"],"Incendio y Terremoto":["Hogar","PYME","Copropiedades","Todo Riesgo Daño Material","Lucro Cesante"],"Daños":["Multirriesgo Empresarial","Multirriesgo Hogar","Sustracción","Rotura de Maquinaria","Equipo y Maquinaria","Manejo"],"Cumplimiento":["Cumplimiento Particular","Cumplimiento Estatal","Seriedad de la Oferta","Buen Manejo de Anticipo","Estabilidad de Obra","Calidad del Servicio"],"Transporte":["Mercancías","Automotor de Carga","Casco Marítimo","Importación / Exportación"],"Responsabilidad Civil":["RC Extracontractual","RC Profesional","RC Directores y Administradores (D&O)","RC Clínicas y Hospitales","RC Contractual"],"ARL / Riesgos Laborales":["ARL","Accidentes Personales","AP Estudiantil","Viajero"]}},"productos":["Auto Total","Auto Plus","Auto Básico","Vida Entera","Vida Temporal","Salud Integral","Salud Familiar","Salud Premium","Hogar Protegido","Hogar Plus","Multirriesgo PYME","Responsabilidad Civil","Transporte de Carga","Fianza Cumplimiento","Accidentes Personales"],"prioridades":["Alta","Media","Baja"],"tiposGestion":[{"t":"Solicitar condiciones de renovación","lista":"Renovaciones / Modif."},{"t":"Renovación de póliza","lista":"Renovaciones / Modif."},{"t":"Modificar suma asegurada","lista":"Renovaciones / Modif."},{"t":"Sustitución de vehículo","lista":"Renovaciones / Modif."},{"t":"Cambio de propietario","lista":"Renovaciones / Modif."},{"t":"Actualizar datos de cliente","lista":"Gestiones Admin"},{"t":"Endoso de beneficiario","lista":"Gestiones Admin"},{"t":"Solicitud de cancelación","lista":"Gestiones Admin"},{"t":"Carta de no adeudo","lista":"Gestiones Admin"},{"t":"Emisión de certificado","lista":"Gestiones Admin"},{"t":"Reclamo / Siniestro","lista":"Gestiones Admin"}],"opsListas":[{"id":"l-admin","nombre":"Gestiones Admin","emoji":"🗂","color":"#1f3a5f","kind":"gestion"},{"id":"l-cotiz","nombre":"Cotizaciones","emoji":"🧮","color":"#c9821b","kind":"negocio","etapa":"cotizando","fixed":true},{"id":"l-insp","nombre":"Inspecciones","emoji":"🔍","color":"#0f766e","kind":"negocio","etapa":"inspeccion","fixed":true},{"id":"l-emis","nombre":"Emisiones","emoji":"📝","color":"#1f8a4c","kind":"negocio","etapa":"emision","fixed":true},{"id":"l-renov","nombre":"Renovaciones / Modif.","emoji":"🔄","color":"#6b4ea0","kind":"gestion"}],"leadsListas":[{"id":"q-nuevo","nombre":"Nuevo","emoji":"🌱","color":"#6b7280","etapa":"nuevo","fixed":true},{"id":"q-cont","nombre":"Contactado","emoji":"📞","color":"#1f3a5f","etapa":"contactado","fixed":true},{"id":"q-cotiz","nombre":"Cotizando","emoji":"🧮","color":"#c9821b","etapa":"cotizando","espejo":true,"fixed":true},{"id":"q-prop","nombre":"Propuesta","emoji":"📨","color":"#6b4ea0","etapa":"propuesta","fixed":true},{"id":"q-nego","nombre":"Negociación","emoji":"🤝","color":"#2563a8","etapa":"negociacion","fixed":true},{"id":"q-insp","nombre":"Inspección","emoji":"🔍","color":"#0f766e","etapa":"inspeccion","espejo":true,"fixed":true},{"id":"q-emis","nombre":"Emisión","emoji":"📝","color":"#1f8a4c","etapa":"emision","espejo":true,"fixed":true},{"id":"q-cierre","nombre":"Cierre","emoji":"🏆","color":"#15803d","etapa":"emitido","fixed":true}],"segmentos":["Premium","Recurrente","Estándar","Nuevo","Activo","Inactivo","Prospecto"],"puntosIngreso":[{"id":"LEADS_INTERES","label":"Leads (interés, sin cotizar)","etapa":"nuevo","origen":"Leads","probability":10},{"id":"OPS_COTIZACION","label":"Ops (pide cotización)","etapa":"cotizando","origen":"Ops","probability":45}]});

const text = (value, max = 1000) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const norm = value => text(value, 160).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const id = (value, label) => {
  const out = text(value, 160);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/.test(out)) throw new HttpsError('invalid-argument', `${label || 'ID'} inválido.`);
  return out;
};
const unique = values => Array.from(new Set([].concat(values || []).map(v => text(v, 160)).filter(Boolean)));
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));

function memberRef(tenantId, uid) {
  return db.collection('tenants').doc(tenantId).collection('members').doc(uid);
}
function configRef(tenantId, domain) {
  return db.collection('tenants').doc(tenantId).collection('config').doc(domain);
}
function eventRef(tenantId, eventId) {
  return db.collection('tenants').doc(tenantId).collection('configEvents').doc(eventId);
}
function previewConfigRef(tenantId, domain) {
  return db.collection('tenants').doc(tenantId).collection('previewUatConfig').doc(domain);
}
function previewEventRef(tenantId, eventId) {
  return db.collection('tenants').doc(tenantId).collection('previewUatConfigEvents').doc(eventId);
}
function roles(member) {
  return unique([...(member.roles || []), member.activeRole, member.rolActivo, member.rol]).map(norm);
}
function permissions(member) {
  return unique([...(member.permissions || []), ...(member.permisosExtra || []), ...(member.extras || [])]).map(norm);
}
function active(member) {
  const state = norm(member && (member.status || member.estado));
  return !!member && member.active !== false && member.activo !== false && !['inactive', 'inactivo', 'blocked', 'bloqueado'].includes(state);
}
function canManage(member, domain) {
  const needed = domain === 'workflow' ? 'workflow_config_manage' : domain === 'access' ? 'access_config_manage' : domain === 'catalogs' ? 'catalog_config_manage' : 'reconciliation_config_manage';
  return roles(member).some(role => ADMIN_ROLES.has(role)) || permissions(member).some(permission => PERMISSIONS.has(permission) || permission === needed);
}
async function authorize(request, domain, write) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Se requiere sesión activa.');
  const tenantId = id(request.data && request.data.tenantId, 'tenantId');
  const snap = await memberRef(tenantId, request.auth.uid).get();
  const member = snap.exists ? snap.data() : null;
  if (!active(member)) throw new HttpsError('permission-denied', 'Membresía inactiva.');
  if (write && !canManage(member, domain)) throw new HttpsError('permission-denied', 'No puede administrar esta configuración.');
  return { tenantId, actor: { uid: request.auth.uid, activeRole: text(member.activeRole || member.rolActivo || member.rol, 100) } };
}

function validateWorkflow(input) {
  input = input || {};
  const stagesInput = input.stages && typeof input.stages === 'object' ? input.stages : {};
  const stages = {};
  Object.entries(stagesInput).forEach(([rawId, raw]) => {
    const stageId = norm(rawId);
    if (!stageId) throw new HttpsError('invalid-argument', 'Cada etapa requiere identificador.');
    raw = raw || {};
    stages[stageId] = {
      label: text(raw.label || raw.nombre || rawId, 120),
      leads: raw.leads !== false,
      ops: raw.ops === true,
      opsList: text(raw.opsList || raw.listaOps, 120),
      terminal: raw.terminal === true,
      next: unique(raw.next || raw.siguientes || []).map(norm),
      probability: Math.max(0, Math.min(100, Number(raw.probability || raw.probabilidad || 0))),
      slaHours: Math.max(0, Number(raw.slaHours || raw.slaHoras || 0))
    };
  });
  if (!Object.keys(stages).length) throw new HttpsError('invalid-argument', 'Debe existir al menos una etapa.');
  Object.entries(stages).forEach(([stageId, stage]) => stage.next.forEach(next => {
    if (!stages[next]) throw new HttpsError('invalid-argument', `La etapa ${stageId} apunta a ${next}, que no existe.`);
    if (next === stageId) throw new HttpsError('invalid-argument', `La etapa ${stageId} no puede apuntarse a sí misma.`);
  }));
  return {
    schemaVersion: VERSION,
    storageMode: input.storageMode === 'canonicalV2' ? 'canonicalV2' : 'legacyCompatible',
    stages,
    notificationChannels: unique(input.notificationChannels || ['portal', 'in_app']).map(norm),
    advisorManagementProjection: input.advisorManagementProjection !== false,
    portalResponseEnabled: input.portalResponseEnabled !== false,
    cadenceEnabled: input.cadenceEnabled !== false,
    escalationEnabled: input.escalationEnabled !== false,
    duplicateDetectionEnabled: input.duplicateDetectionEnabled !== false,
    defaultManagementSlaHours: Math.max(0, Number(input.defaultManagementSlaHours || 72)),
    priorities: unique(input.priorities || ['Baja', 'Media', 'Alta', 'Crítica']),
    managementTypes: Array.isArray(input.managementTypes) ? input.managementTypes.slice(0, 200).map(row => ({ id: norm(row.id || row.label || row.nombre), label: text(row.label || row.nombre, 160), opsList: text(row.opsList || row.lista, 120), slaHours: Math.max(0, Number(row.slaHours || row.slaHoras || 0)) })).filter(row => row.id && row.label) : []
  };
}
function normalizeInsurerPaymentPlans(input) {
  const rows = Array.isArray(input) ? input : [];
  return rows.slice(0, 100).map(row => {
    row = row || {};
    const insurer = text(row.insurer || row.name || row.canonicalName || row.canonicalKey || row.insurerId, 180);
    const maxInstallments = Math.floor(Number(row.maxInstallments || row.maxCuotas || 0));
    const exceptionalMaxRaw = Math.floor(Number(row.exceptionalMaxInstallments || row.maxInstallmentsException || row.maxCuotasExcepcion || 0));
    const exceptionalMaxInstallments = exceptionalMaxRaw > maxInstallments && exceptionalMaxRaw <= 24 ? exceptionalMaxRaw : null;
    if (!insurer || !(maxInstallments > 0 && maxInstallments <= 24)) return null;
    return {
      insurer,
      insurerId: text(row.insurerId, 180),
      canonicalKey: text(row.canonicalKey, 180),
      aliases: unique(row.aliases || []).slice(0, 40),
      scope: norm(row.scope || 'fraccionado') || 'fraccionado',
      maxInstallments,
      exceptionalMaxInstallments,
      exceptionRequiresExplicitEvidence: exceptionalMaxInstallments ? row.exceptionRequiresExplicitEvidence !== false : false
    };
  }).filter(Boolean);
}
function validateReconciliation(input) {
  input = input || {};
  return {
    schemaVersion: VERSION,
    inferenceEnabled: input.inferenceEnabled !== false,
    autoCommitHighConfidence: input.autoCommitHighConfidence !== false,
    highConfidenceMode: 'UNIQUE_MATCH_FAIL_CLOSED',
    humanConfirmationRequiredForHighConfidence: false,
    humanConfirmationRequired: false,
    ambiguousEvidenceRequiresHumanReview: true,
    commissionRecognitionEnabled: input.commissionRecognitionEnabled !== false,
    commissionSequenceEnabled: input.commissionSequenceEnabled !== false,
    completePortfolioSequenceEnabled: input.completePortfolioSequenceEnabled !== false,
    bankSupportRequiresCounterpart: input.bankSupportRequiresCounterpart !== false,
    absenceAloneNeverReconciles: input.absenceAloneNeverReconciles !== false,
    amountTolerance: Math.max(0, Number(input.amountTolerance == null ? 0.02 : input.amountTolerance)),
    dateToleranceDays: Math.max(0, Math.floor(Number(input.dateToleranceDays == null ? 7 : input.dateToleranceDays))),
    requireSameCurrency: input.requireSameCurrency !== false,
    requireSameTerm: input.requireSameTerm !== false,
    holdOnNegative: input.holdOnNegative !== false,
    holdOnReversal: input.holdOnReversal !== false,
    holdOnDuplicate: input.holdOnDuplicate !== false,
    autoApplyThreshold: null,
    insurerPaymentPlans: normalizeInsurerPaymentPlans(input.insurerPaymentPlans || input.aseguradoraPlanesPago || []),
    evidencePriority: unique(input.evidencePriority || ['INSURER_PAYMENT', 'COMMISSION_RECOGNITION', 'PORTFOLIO_SNAPSHOT', 'PLATFORM_PAYMENT_REPORT', 'BANK_SUPPORT'])
  };
}
function validateAccess(input){
  input=input&&typeof input==='object'?input:{};const valid=new Set(['own','team','all','none']),rolePermissions={},roleScopes={};
  Object.entries(input.rolePermissions&&typeof input.rolePermissions==='object'?input.rolePermissions:{}).slice(0,30).forEach(([role,mods])=>{const rk=text(role,100);if(!rk||!mods||typeof mods!=='object')return;rolePermissions[rk]={};Object.entries(mods).slice(0,120).forEach(([moduleKey,actions])=>{const mk=norm(moduleKey);if(!mk||!actions||typeof actions!=='object')return;rolePermissions[rk][mk]={ver:actions.ver===true,editar:actions.editar===true};});});
  Object.entries(input.roleScopes&&typeof input.roleScopes==='object'?input.roleScopes:{}).slice(0,30).forEach(([role,value])=>{const rk=text(role,100),sc=norm(value);if(rk&&valid.has(sc))roleScopes[rk]=sc;});
  return{schemaVersion:'gravicentra-access-policy-v1',rolePermissions,roleScopes};
}
function cloneCatalogDefault(){return JSON.parse(JSON.stringify(CATALOG_DEFAULT));}
function validateCatalogs(input){
 input=input&&typeof input==='object'?input:{};const base=cloneCatalogDefault(),out={schemaVersion:'gravicentra-tenant-catalogs-v1'};
 const strList=(key,max=300)=>unique(input[key]==null?base[key]:input[key]).slice(0,max);
 out.canales=strList('canales');out.productos=strList('productos');out.segmentos=strList('segmentos');out.prioridades=strList('prioridades');out.ramos=strList('ramos');
 const rp=input.ramosPais&&typeof input.ramosPais==='object'?input.ramosPais:base.ramosPais;out.ramosPais={};
 ['GT','CO'].forEach(country=>{const source=rp?.[country]&&typeof rp[country]==='object'?rp[country]:{};out.ramosPais[country]={};Object.entries(source).slice(0,100).forEach(([ramo,subs])=>{const k=text(ramo,160);if(k)out.ramosPais[country][k]=unique(subs).slice(0,200);});});
 const points=Array.isArray(input.puntosIngreso)?input.puntosIngreso:base.puntosIngreso;out.puntosIngreso=points.slice(0,20).map(row=>({id:norm(row?.id),label:text(row?.label,180),etapa:norm(row?.etapa),origen:text(row?.origen,80),probability:Math.max(0,Math.min(100,Number(row?.probability??row?.prob??0)))})).filter(row=>row.id&&row.label&&row.etapa);
 const mg=Array.isArray(input.tiposGestion)?input.tiposGestion:base.tiposGestion;out.tiposGestion=mg.slice(0,200).map(row=>({t:text(row?.t||row?.label,180),lista:text(row?.lista||row?.opsList,120)})).filter(row=>row.t);
 const board=rows=>[].concat(rows||[]).slice(0,100).map(row=>({id:text(row?.id,100),nombre:text(row?.nombre,160),emoji:text(row?.emoji,16),color:text(row?.color,32),kind:text(row?.kind,40),etapa:norm(row?.etapa),espejo:row?.espejo===true,fixed:row?.fixed===true,custom:row?.custom===true})).filter(row=>row.id&&row.nombre);
 out.opsListas=board(input.opsListas==null?base.opsListas:input.opsListas);out.leadsListas=board(input.leadsListas==null?base.leadsListas:input.leadsListas);return out;
}
function validate(domain,input){return domain==='workflow'?validateWorkflow(input):domain==='access'?validateAccess(input):domain==='catalogs'?validateCatalogs(input):validateReconciliation(input);}

async function execute(request) {
  const data = request.data || {};
  const action = norm(data.action || 'get');
  const domain = norm(data.domain);
  if (!DOMAINS.has(domain)) throw new HttpsError('invalid-argument', 'Dominio no soportado.');
  if (!['get', 'save'].includes(action)) throw new HttpsError('invalid-argument', 'Acción no soportada.');
  const authz = await authorize(request, domain, action === 'save');
  const ref = configRef(authz.tenantId, domain);
  if (action === 'get') {
    const snap = await ref.get();
    return { ok: true, domain, exists: snap.exists, config: snap.exists ? snap.data() : (domain==='catalogs'?validateCatalogs(CATALOG_DEFAULT):null), source: snap.exists?'canonical':(domain==='catalogs'?'canonical_default':'empty') };
  }
  const reason = text(data.reason || data.motivo, 1000);
  if (!reason) throw new HttpsError('invalid-argument', 'El motivo es obligatorio.');
  const next = validate(domain, data.config || {});
  const eventId = `cfg_${sha(`${authz.tenantId}|${domain}|${digest(next)}|${reason}`).slice(0, 28)}`;
  return db.runTransaction(async tx => {
    const beforeSnap = await tx.get(ref);
    const before = beforeSnap.exists ? beforeSnap.data() : null;
    const stored = Object.assign({}, next, { tenantId: authz.tenantId, updatedAt: FieldValue.serverTimestamp(), updatedByUid: authz.actor.uid });
    tx.set(ref, stored, { merge: false });
    tx.set(eventRef(authz.tenantId, eventId), {
      schemaVersion: VERSION,
      tenantId: authz.tenantId,
      domain,
      actor: authz.actor,
      reason,
      beforeDigest: before ? digest(before) : '',
      afterDigest: digest(next),
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    return { ok: true, domain, eventId, config: next };
  });
}


async function executePreview(request) {
  const data = request.data || {};
  const action = norm(data.action || 'get');
  const domain = norm(data.domain);
  if (!DOMAINS.has(domain)) throw new HttpsError('invalid-argument', 'Dominio no soportado.');
  if (!['get', 'save'].includes(action)) throw new HttpsError('invalid-argument', 'Acción no soportada.');
  const authz = await authorize(request, domain, action === 'save');
  const ref = previewConfigRef(authz.tenantId, domain);
  if (action === 'get') {
    const previewSnap = await ref.get();
    if (previewSnap.exists) {
      return { ok: true, domain, exists: true, config: previewSnap.data(), previewIsolated: true, source: 'preview_uat' };
    }
    const canonicalSnap = await configRef(authz.tenantId, domain).get();
    return {
      ok: true,
      domain,
      exists: canonicalSnap.exists,
      config: canonicalSnap.exists ? canonicalSnap.data() : (domain==='catalogs'?validateCatalogs(CATALOG_DEFAULT):null),
      previewIsolated: true,
      source: canonicalSnap.exists ? 'canonical_readonly_baseline' : (domain==='catalogs'?'canonical_default_readonly_baseline':'empty_baseline')
    };
  }
  const reason = text(data.reason || data.motivo, 1000);
  if (!reason) throw new HttpsError('invalid-argument', 'El motivo es obligatorio.');
  const next = validate(domain, data.config || {});
  const eventId = `uat_${sha(`${authz.tenantId}|${domain}|${digest(next)}|${reason}`).slice(0, 28)}`;
  return db.runTransaction(async tx => {
    const beforeSnap = await tx.get(ref);
    const before = beforeSnap.exists ? beforeSnap.data() : null;
    const stored = Object.assign({}, next, {
      tenantId: authz.tenantId,
      previewIsolated: true,
      schemaOwner: PREVIEW_VERSION,
      updatedAt: FieldValue.serverTimestamp(),
      updatedByUid: authz.actor.uid
    });
    tx.set(ref, stored, { merge: false });
    tx.set(previewEventRef(authz.tenantId, eventId), {
      schemaVersion: PREVIEW_VERSION,
      tenantId: authz.tenantId,
      domain,
      actor: authz.actor,
      reason,
      beforeDigest: before ? digest(before) : '',
      afterDigest: digest(next),
      previewIsolated: true,
      productionConfigWrite: false,
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    return { ok: true, domain, eventId, config: next, previewIsolated: true, source: 'preview_uat' };
  });
}

exports.orbit360TenantDomainConfig = onCall({ region: REGION, cors: true }, execute);
exports.orbit360TenantDomainConfigPreview = onCall({ region: PREVIEW_REGION, cors: true }, executePreview);
exports.__tenantDomainConfig = Object.freeze({ VERSION, PREVIEW_VERSION, DOMAINS, validateReconciliation, validateCatalogs, normalizeInsurerPaymentPlans });



/* B4-003 Academia manuals: server-owned, read-only, authenticated documents.
   The five HTML manuals must never enter public Firebase Hosting. */
const academyFs=require('node:fs'),academyPath=require('node:path');
const academyCrypto=require('node:crypto');
const {resolveProductActiveRole:resolveAcademyRole}=require('./product-active-role-contract');
const ACADEMIA_DOCS=Object.freeze({
 'manual-maestro':{file:'manual-maestro.html',roles:['direccion','superadmin','super_admin','admin','admintenant','admin_tenant']},
 'capacitacion-tecnica-interna':{file:'capacitacion-tecnica-interna.html',roles:['direccion','superadmin','super_admin','admin','admintenant','admin_tenant']},
 'capacitacion-crm':{file:'capacitacion-crm.html',roles:['direccion','superadmin','super_admin','admin','admintenant','admin_tenant','operativo','asesor','comercial']},
 'manual-integraciones':{file:'manual-integraciones.html',roles:['direccion','superadmin','super_admin','admin','admintenant','admin_tenant']},
 'comparativa-ia':{file:'comparativa-ia.html',roles:['direccion','superadmin','super_admin','admin','admintenant','admin_tenant']}
});
async function academyManualRead(request){
 if(!request.auth?.uid)throw new HttpsError('unauthenticated','Necesitas iniciar sesión.');
 const tenantId=id(request.data?.tenantId,'tenantId');
 const key=text(request.data?.manualId,100),manual=Object.prototype.hasOwnProperty.call(ACADEMIA_DOCS,key)?ACADEMIA_DOCS[key]:null;
 if(!manual)throw new HttpsError('not-found','Manual no encontrado.');
 const snap=await memberRef(tenantId,request.auth.uid).get(),member=snap.exists?snap.data():null;
 if(!active(member)||text(member.tenantId,160)!==tenantId)throw new HttpsError('permission-denied','Membresía no autorizada.');
 let role;
 try{role=resolveAcademyRole(member,request.data?.activeRole).activeRole;}
 catch(e){throw new HttpsError('permission-denied','El rol solicitado no está asignado.');}
 if(!manual.roles.includes(role))throw new HttpsError('permission-denied','Este manual no está disponible para tu rol activo.');
 const file=academyPath.join(__dirname,'secure-academia-manuals',manual.file);
 let html;try{html=academyFs.readFileSync(file,'utf8');}
 catch(e){throw new HttpsError('unavailable','El manual aún no se encuentra disponible.');}
 if(!html.startsWith('<!DOCTYPE html>')||!html.includes('</html>'))throw new HttpsError('failed-precondition','Documento no válido.');
 return{ok:true,schemaVersion:'gravicentra-academia-manuals-v1',manualId:key,html,
         sha256:academyCrypto.createHash('sha256').update(html).digest('hex')};
}
exports.orbit360AcademiaManualRead=onCall({region:REGION,cors:true,timeoutSeconds:25},academyManualRead);
exports.orbit360AcademiaManualReadPreview=onCall({region:PREVIEW_REGION,cors:true,timeoutSeconds:25},academyManualRead);
