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
  client: 'modules/cliente360.js'
};
Object.entries(files).forEach(([key,file]) => check('FILE_' + key.toUpperCase(), exists(file), 'Archivo requerido presente', file));

const access = read(files.access);
const crm = read(files.crm);
const quality = read(files.quality);
const portal = read(files.portal);

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

Object.values(files).filter(exists).forEach(file => {
  const src = read(file);
  check('NO_DIRECT_STORAGE_' + file.replace(/\W+/g,'_'), !/\b(?:localStorage|sessionStorage)\b/.test(src), 'Sin almacenamiento operativo directo', file);
  if (/\.(?:js|mjs)$/.test(file)) {
    const run = cp.spawnSync(process.execPath, ['--check', p(file)], { encoding:'utf8' });
    check('SYNTAX_' + file.replace(/\W+/g,'_'), run.status === 0, run.status === 0 ? 'Sintaxis válida' : String(run.stderr || run.stdout).trim(), file);
  }
});

const protectedExpected = {
  'data/store.js': '1ec42cf35458c607333a494c4fd7fa74e04101869185423d8cd71ae8098fd838',
  'core/auth.js': '756b7ec6ad4788b3d77fe09b5ac7f706c9deb62cd44459bd06a2ac5284c5d230',
  'core/importa.js': 'fbdc378d709aeb6816418d8c4d5dd0627675d6919caed887f45494fbf319e0df'
};
Object.entries(protectedExpected).forEach(([file,expected]) =>
  check('PROTECTED_' + file.replace(/\W+/g,'_'), exists(file) && hash(file) === expected, 'Archivo protegido byte-identical', file)
);

warning('CACHE_BUST', /modules\/calidad\.js\?v=(?:20260712-op1|op1)/.test(read('index.html')),
  'Aplicar cache-bust seguro de Calidad antes del smoke visual', 'index.html');
warning('POLICY_SOURCE', false, 'La fuente separada de Pólizas sigue pendiente después del cierre CRM', 'fuentes');
warning('VISUAL_GATE', false, 'Pendiente validación visual CRM en 1366/768/390 y perfiles Admin/Operativo/Asesor', 'docs');

const result = {
  validator: 'orbit360-validar-crm-op1',
  root,
  generatedAt: new Date().toISOString(),
  summary: { pass: pass.length, fail: fail.length, warn: warn.length },
  pass, fail, warn
};
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
