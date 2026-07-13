#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const root = path.resolve(process.argv[2] || path.join(process.cwd(), 'orbit360-platform'));
const pass = [], fail = [], warn = [];

function p(file) { return path.join(root, file); }
function exists(file) { return fs.existsSync(p(file)); }
function read(file) { return exists(file) ? fs.readFileSync(p(file), 'utf8') : ''; }
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(p(file))).digest('hex'); }
function check(id, ok, message, file) { (ok ? pass : fail).push({ id, message, file: file || '' }); }
function warning(id, ok, message, file) { if (!ok) warn.push({ id, message, file: file || '' }); }
function all(src, patterns) { return patterns.every(x => typeof x === 'string' ? src.includes(x) : x.test(src)); }

const files = {
  access: 'core/access-scope.js',
  crm: 'modules/crm-v1198-operational-bridge.js',
  quality: 'modules/calidad.js',
  portal: 'modules/portal-v1198-scope-viewer-bridge.js',
  viewer: 'core/document-viewer.js',
  client: 'modules/cliente360.js',
  policy: 'modules/polizas.js',
  closure: 'modules/crm-op1-closure-bridge.js',
  academy: 'data/academia-v1216-crm-portal-poliza.js',
  responsive: 'styles/crm-op1-v1216.css'
};
Object.entries(files).forEach(([key,file]) => check('FILE_' + key.toUpperCase(), exists(file), 'Archivo requerido presente', file));

const access = read(files.access);
const crm = read(files.crm);
const quality = read(files.quality);
const portal = read(files.portal);
const closure = read(files.closure);
const academy = read(files.academy);
const responsive = read(files.responsive);

check('SCOPES', all(access, ["return 'all'", "return 'team'", "return 'own'", "return 'none'"]), 'Scopes all/team/own/none implementados', files.access);
check('SCOPED_STORE', all(access, ['function scopedStore', 'function withScope', "new Set(['clientes','polizas'", 'canView(collection, rec, moduleKey)']), 'Store filtrado por alcance', files.access);
check('CLIENT_INITIAL_STATE', all(crm, ["row.estadoOperativo = 'pendiente_polizas'", "row.estado = 'pendiente_polizas'"]), 'Alta de cliente inicia pendiente de Pólizas', files.crm);
check('CLIENT_DEDUP', all(crm, ['A.duplicateCandidates(raw)', 'duplicado_probable', 'existe un cliente con identificación o correo coincidente']), 'Deduplicación exacta y probable', files.crm);
check('CLIENT_GEO', all(crm, ['Orbit.GEO', 'fillCities', 'fillDeps']), 'Geografía mediante catálogos', files.crm);
check('CLIENT_CORRECTION', all(crm, ['A.correction', 'Gestión de póliza', 'Datos faltantes completados']), 'Cambios no autorizados crean gestión o completan vacíos', files.crm);
check('CLIENT_AUDIT', all(crm, ["A.audit('crear'", "A.audit('editar'", "A.audit('completar_faltantes'"]), 'Altas y cambios auditados', files.crm);

check('QUALITY_BEFORE_POLICIES', all(quality, ['soloVig: false', 'filtro opcional, no el estado inicial']), 'Calidad muestra clientes antes de importar Pólizas', files.quality);
check('QUALITY_SCOPE', all(quality, ["A.dataScope ? A.dataScope('calidad')", 'scopeLabel()', "S().all('clientes')"]), 'Calidad usa alcance activo', files.quality);
check('QUALITY_ADVISOR', all(quality, ['advisorOptions', 'q-asesor', 'Todos los asesores']), 'Filtro por asesor disponible cuando corresponde', files.quality);
check('QUALITY_FIELDS', all(quality, ['Teléfono / WhatsApp', 'Documento', 'Departamento / provincia', 'Ciudad / municipio', 'Contacto principal']), 'Faltantes ampliados', files.quality);
check('QUALITY_SAFE_EDIT', all(quality, ['Solo se completan campos vacíos', 'Motivo / fuente de actualización', "A.audit('completar_faltantes'"]), 'Edición solo de vacíos con motivo y auditoría', files.quality);
check('QUALITY_HONEST_COMM', all(quality, ['No se ha confirmado ningún envío', 'Preparar WA', 'Preparar correo']), 'Comunicación preparada, no enviada', files.quality);

check('PORTAL_SCOPE', all(portal, ["Orbit.access.can('portal', 'edit')", 'admin.remove()']), 'Portal oculta administración sin permiso', files.portal);
check('PORTAL_VIEWER', all(portal, ['Orbit.documentViewer.open', 'documentRef', "module: 'portal'"]), 'Portal usa visor documental común', files.portal);
check('PORTAL_STATES', all(closure, ['no_preparado', 'invitacion_preparada', 'activo_confirmado', 'suspendido', 'requiere_revision']), 'Estados honestos de acceso al Portal', files.closure);
check('PORTAL_PREPARED_NOT_SENT', all(closure, ['entregaConfirmada:false', 'La entrega y activación siguen pendientes de confirmación', "credentialRef:'backend_required'", 'secretoExpuesto:false']), 'Invitación preparada no simula entrega ni credenciales', files.closure);
check('PORTAL_CONFIRMATION', all(closure, ['ACCESO CONFIRMADO', 'evidencia externa', 'confirmacionReforzada:true']), 'Acceso confirmado exige evidencia y confirmación reforzada', files.closure);
check('PORTAL_AUDIT', all(closure, ['preparar_invitacion_portal', 'confirmar_acceso_portal', 'suspender_acceso_portal']), 'Acciones de Portal auditadas', files.closure);
check('PORTAL_NO_SECRET_COPY', !/(contraseña generada|token visible|api key|secret key)/i.test(closure), 'Sin secretos o credenciales visibles', files.closure);
check('PORTAL_TECH_COPY_SANITIZED', all(closure, ['servicio documental conectado', 'resguardo pendiente', 'asistente de orientación']), 'Copy técnico visible traducido a lenguaje de usuario', files.closure);

check('CLIENT_DOCUMENT_VIEWER', all(closure, ['documentsForClient', "module:'cliente360'", 'Orbit.documentViewer.open']), 'Visor documental integrado en Cliente360', files.closure);
check('POLICY_PAGE', all(closure, ['function policyPage', "location.hash = '#/polizas?p='", 'Ficha de Póliza', 'Recibos y cartera']), 'Ficha-página propia de Póliza', files.closure);
check('POLICY_SCOPE', all(closure, ["canView('polizas', p, 'polizas')", 'Póliza fuera de tu alcance']), 'Ficha de Póliza respeta scope', files.closure);
check('POLICY_DOCUMENT_VIEWER', all(closure, ['documentsForPolicy', "module:'polizas'", 'Documento fuente']), 'Visor documental integrado en Póliza', files.closure);
check('POLICY_ACTION_GATES', all(closure, ["can('polizas','edit')", 'Los cambios requieren una gestión autorizada', 'Crear gestión operativa']), 'Acciones de Póliza según permiso', files.closure);

check('ACADEMY_ROLES', all(academy, ['Dirección', 'Operativo', 'Asesor', 'cur_crm_portal_pol_dir_v1216', 'cur_crm_portal_pol_op_v1216', 'cur_crm_portal_pol_ase_v1216']), 'Academia profunda por rol', files.academy);
check('ACADEMY_TOPICS', all(academy, ['Calidad antes de Pólizas', 'Invitación preparada', 'Acceso confirmado', 'Visor documental común', 'Ficha de Póliza']), 'Academia cubre los nuevos flujos', files.academy);
check('ACADEMY_IDEMPOTENT', all(academy, ['_cv:1216', 'progreso:prev.progreso', 'certificado:!!prev.certificado']), 'Academia conserva progreso y certificados', files.academy);

check('RESPONSIVE_PANEL', all(responsive, ['#crm-op1-client-panel', '@media (max-width: 900px)', '@media (max-width: 520px)']), 'Responsive tablet/móvil del cierre CRM', files.responsive);

Object.values(files).filter(exists).filter(file => /\.(?:js|mjs)$/.test(file)).forEach(file => {
  const src = read(file);
  check('NO_DIRECT_STORAGE_' + file.replace(/\W+/g,'_'), !/\b(?:localStorage|sessionStorage)\b/.test(src), 'Sin almacenamiento operativo directo', file);
  const run = cp.spawnSync(process.execPath, ['--check', p(file)], { encoding:'utf8' });
  check('SYNTAX_' + file.replace(/\W+/g,'_'), run.status === 0, run.status === 0 ? 'Sintaxis válida' : String(run.stderr || run.stdout).trim(), file);
});

const protectedExpected = {
  'data/store.js': '1ec42cf35458c607333a494c4fd7fa74e04101869185423d8cd71ae8098fd838',
  'core/auth.js': '756b7ec6ad4788b3d77fe09b5ac7f706c9deb62cd44459bd06a2ac5284c5d230',
  'core/importa.js': 'fbdc378d709aeb6816418d8c4d5dd0627675d6919caed887f45494fbf319e0df'
};
Object.entries(protectedExpected).forEach(([file,expected]) =>
  check('PROTECTED_' + file.replace(/\W+/g,'_'), exists(file) && hash(file) === expected, 'Archivo protegido byte-identical', file)
);

const index = read('index.html');
warning('CACHE_QUALITY', /modules\/calidad\.js\?v=(?:20260712-op1|op1)/.test(index), 'Aplicar cache-bust seguro de Calidad antes del smoke visual', 'index.html');
warning('INDEX_CLOSURE', index.includes('modules/crm-op1-closure-bridge.js?v=20260712-op1'), 'Integrar puente CRM OP-1 en index mediante pipeline seguro', 'index.html');
warning('INDEX_ACADEMY', index.includes('data/academia-v1216-crm-portal-poliza.js?v=20260712-op1'), 'Integrar Academia CRM OP-1 en index mediante pipeline seguro', 'index.html');
warning('INDEX_RESPONSIVE', index.includes('styles/crm-op1-v1216.css?v=20260712-op1'), 'Integrar estilos responsive CRM OP-1 en index mediante pipeline seguro', 'index.html');
warning('POLICY_SOURCE', false, 'La fuente separada de Pólizas sigue pendiente después del cierre visual CRM', 'fuentes');
warning('VISUAL_GATE', false, 'Pendiente validación visual CRM en 1366/768/390 y perfiles Admin/Operativo/Asesor', 'docs');

const result = {
  validator: 'orbit360-validar-crm-op1-v1216',
  root,
  generatedAt: new Date().toISOString(),
  summary: { pass: pass.length, fail: fail.length, warn: warn.length },
  pass, fail, warn
};
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
