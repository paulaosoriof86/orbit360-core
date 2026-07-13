#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || path.join(process.cwd(), 'orbit360-platform'));
const pass = [], fail = [], warn = [];
const p = file => path.join(root, file);
const exists = file => fs.existsSync(p(file));
const read = file => exists(file) ? fs.readFileSync(p(file), 'utf8') : '';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(p(file))).digest('hex');
const all = (src, patterns) => patterns.every(x => typeof x === 'string' ? src.includes(x) : x.test(src));
function check(id, ok, message, file='') { (ok ? pass : fail).push({ id, message, file }); }
function warning(id, ok, message, file='') { if (!ok) warn.push({ id, message, file }); }

const files = {
  access:'core/access-scope.js',
  visibility:'core/aseguradoras-op2-role-visibility.js',
  importer:'core/insurer-directory-import-v1202.js',
  importerSecurity:'core/insurer-directory-import-v1202-security.js',
  sourceGuard:'core/aseguradoras-op2-source-guard.js',
  importUiGuard:'core/aseguradoras-op2-import-ui-guard.js',
  resources:'modules/aseguradoras-v1202-resources-bridge.js',
  ux:'modules/aseguradoras-v1197-ux-bridge.js',
  closure:'modules/aseguradoras-op2-closure-bridge.js',
  permission:'modules/aseguradoras-op2-permission-guard.js',
  academy:'data/academia-v1217-aseguradoras-op2.js',
  styles:'styles/aseguradoras-op2-v1217.css'
};
Object.entries(files).forEach(([key,file]) => check('FILE_' + key.toUpperCase(), exists(file), 'Archivo requerido presente', file));

const access = read(files.access);
const visibility = read(files.visibility);
const importer = read(files.importer);
const importerSecurity = read(files.importerSecurity);
const sourceGuard = read(files.sourceGuard);
const importUiGuard = read(files.importUiGuard);
const resources = read(files.resources);
const ux = read(files.ux);
const closure = read(files.closure);
const permission = read(files.permission);
const academy = read(files.academy);
const styles = read(files.styles);

check('CENTRAL_ACCESS', all(access, ['function can', 'function audit', 'function correction']), 'Acceso, auditoría y corrección central disponibles', files.access);
check('ROLE_VISIBILITY', all(visibility, ["ensure('Operativo', ['aseguradoras'])", "ensure('Asesor', ['aseguradoras'])", 'sensitiveAccessUnchanged: true', 'insurerWritePermissionUnchanged: true']), 'Directorio visible para Operativo y Asesor sin ampliar sensibles/escritura', files.visibility);
check('IMPORT_COUNTRY', all(importer, ["if (!['GT','CO'].includes(country))", 'pais_directorio_requerido', 'currencyFor(country)']), 'País explícito GT/CO y moneda derivada', files.importer);
check('IMPORT_SUPPORT_SHEETS', all(importer, ['SUPPORT_RE', "reason: 'hoja_soporte'", 'sin_datos']), 'Hojas de apoyo excluidas', files.importer);
check('IMPORT_TRACE', all(importer, ['fuenteTraza', 'archivo: source.fileName', 'hoja: source.sheetName', 'fila:', "bloque: 'contactos'", "bloque: 'plataformas'", "bloque: 'bancos'"]), 'Trazabilidad archivo/hoja/fila/bloque/país', files.importer);
check('IMPORT_SAFE_SESSION', all(importer, ['const secureSession = new Map()', 'persistedInStore: false', 'safeOperationData', 'delete p.usuario', 'delete c.numero']), 'Sensibles permanecen en sesión temporal y no en Orbit.store', files.importer);
check('IMPORT_CONFIRMATION', all(importer, ["CONFIRM_PHRASE = 'CONFIRMO DIRECTORIO'", 'confirmacion_reforzada_requerida', 'applyValidOnly']), 'Dry-run y confirmación reforzada', files.importer);
check('IMPORT_SOURCE_SEPARATION', all(importer, ['sourceType: SOURCE_TYPE', "collection: 'aseguradoras'", 'No crea clientes']), 'Fuente separada limitada a Aseguradoras', files.importer);
check('BACKEND_WRITE_GUARD', all(importerSecurity, ['backendWriteAllowed', 'Conexión segura requerida para aplicar', 'backend_operativo_requerido_para_aplicar_datos_reales']), 'Aplicación real bloqueada sin conexión segura', files.importerSecurity);

check('ALIAS_CANONICAL', all(sourceGuard, ['function canonical', 'version', 'copia', 'function distance', 'distance(x, y) <= 1']), 'Alias/versiones y diferencia de una letra detectables', files.sourceGuard);
check('ALIAS_BLOCK_WITHIN', all(sourceGuard, ['duplicado_probable_dentro_del_archivo', 'requiereValidacion = true', "validationStatus = 'requiere_validacion'"]), 'Duplicados probables internos quedan bloqueados', files.sourceGuard);
check('ALIAS_BLOCK_EXISTING', all(sourceGuard, ['duplicado_probable_con_directorio', "op.action !== 'insert'", 'existingId']), 'Duplicados probables contra directorio quedan bloqueados', files.sourceGuard);
check('ALIAS_NO_AUTO_MERGE', !/S\(\)\.(?:update|insert|remove)\('aseguradoras'/.test(sourceGuard), 'Guard no fusiona ni escribe automáticamente', files.sourceGuard);
check('UI_ALIAS_REAL_FLOW', all(importUiGuard, ['const previousOpen = D.open.bind(D)', 'D.parseFile(file, { country, captureSecure:false })', 'duplicateReview', "root.dataset.op2AliasState = 'blocked'", 'button.disabled = true']), 'Flujo visual real analiza y bloquea alias probables', files.importUiGuard);
check('UI_ALIAS_NO_SENSITIVE_CAPTURE', all(importUiGuard, ['captureSecure:false', 'No captura recursos sensibles']), 'Revisión paralela no captura sensibles', files.importUiGuard);
check('UI_ALIAS_FAIL_CLOSED', all(importUiGuard, ["root.dataset.op2AliasState = 'error'", 'La aplicación queda bloqueada para evitar duplicados']), 'Error de revisión bloquea aplicación', files.importUiGuard);

check('UX_DIRECTORY', all(ux, ['kpiData', 'kpiDetail', 'renderDirectory', 'renderFicha', 'Volver al directorio']), 'Directorio, KPI y ficha-página disponibles', files.ux);
check('UX_TABS', all(ux, ["['resumen','Resumen']", "['contactos','Contactos']", "['plataformas','Plataformas']", "['bancos','Bancos y pagos']", "['documentos','Documentos y Drive']", "['tarifas','Tarifas y conocimiento']"]), 'Ficha reúne recursos operativos', files.ux);
check('UX_VIEWER', all(ux, ['Orbit.documentViewer.open', "module:'aseguradoras'", 'Ver documento']), 'Documentos usan visor común', files.ux);
check('RESOURCE_REFS', all(resources, ['accountRef', 'usuarioHint', 'Pendiente de conexión segura', 'copyField', 'revealField']), 'Recursos protegidos usan referencias y acceso temporal', files.resources);
check('RESOURCE_RATE_HONESTY', all(resources, ['Importar contactos o accesos no habilita tarifas', 'Pendiente de configuración validada']), 'Directorio no habilita tarifas por sí solo', files.resources);

check('STORE_GUARD', all(closure, ['function installStoreGuard', "collection === 'aseguradoras' ? sanitizePatch", "collection !== 'aseguradoras'", '__aseguradorasOp2SensitiveGuardV1217']), 'Altas y cambios de Aseguradoras pasan por sanitización', files.closure);
check('PORTAL_SANITIZE', all(closure, ['function sanitizePortal', 'usuarioHint', 'credentialRef', 'delete out.usuario', 'delete out.password', 'secretoExpuesto:false']), 'Usuarios y credenciales no se persisten en claro', files.closure);
check('ACCOUNT_SANITIZE', all(closure, ['function sanitizeAccount', 'numeroHint', 'accountRef', 'delete out.numero', 'delete out.accountNumber']), 'Cuentas completas no se persisten en claro', files.closure);
check('LEGACY_MIGRATION', all(closure, ['function migrateLegacySensitive', 'recursos_sensibles_legacy_requieren_conexion_segura', 'rawPersisted:false']), 'Recursos legacy se migran a referencias protegidas', files.closure);
check('EDITOR_HARDENED', all(closure, ['function hardenEditor', 'user.disabled = true', 'pass.disabled = true', 'number.disabled = true', 'Gestionar de forma segura']), 'Editor manual no captura sensibles en claro', files.closure);
check('NO_FALSE_SAVE_AUDIT', !closure.includes("audit('guardar_ficha_aseguradora'"), 'Sin auditoría falsa al cancelar guardado', files.closure);
check('OPERATIONAL_SUMMARY', all(closure, ['Atención y operación', 'Código de intermediario', 'Emergencias / asistencia', 'Preparar correo', 'Reportar corrección']), 'Ficha soporta atención operativa', files.closure);
check('CORRECTION_FLOW', all(closure, ['A.correction', 'Corregir directorio', 'Gestión de corrección creada']), 'Datos faltantes generan gestión de corrección', files.closure);
check('TECH_COPY', all(closure, ['Inventario recibido', 'conexión segura pendiente', 'referencia protegida']), 'Estados técnicos traducidos a copy operativo', files.closure);
check('DIRECT_ENTRY_GUARD', all(permission, ["A.can('aseguradoras', action)", 'startEdit && !allowed', "!allowed('create')", "!allowed('create') && !allowed('manage_documents')"]), 'Entradas directas a editar/crear/importar exigen permiso', files.permission);
check('ADVISOR_DENIAL_COPY', all(permission, ['puede consultar la ficha, pero no editar', 'no puede crear Aseguradoras', 'no puede importar directorios']), 'Denegaciones visibles y honestas', files.permission);

check('ACADEMY_SAME_IDS', all(academy, ['cur_dir_aseg_dir_v1202', 'cur_dir_aseg_op_v1202', 'cur_dir_aseg_asesor_v1202', 'Orbit.store.update']), 'Academia actualiza cursos existentes', files.academy);
check('ACADEMY_NO_DUPLICATE_INSERT', !/Orbit\.store\.insert\('cursos'/.test(academy), 'Academia OP-2 no crea cursos duplicados', files.academy);
check('ACADEMY_TOPICS', all(academy, ['Una sola seguridad para importar y editar', 'Alias y duplicados probables', 'Relación con Cotizador y Comparativo', 'next._cv = 1217']), 'Academia cubre cierre OP-2', files.academy);
check('ACADEMY_PROGRESS', all(academy, ['next.progreso = previous.progreso', 'next.certificado = !!previous.certificado']), 'Academia conserva progreso y certificado', files.academy);
check('RESPONSIVE', all(styles, ['@media(max-width:900px)', '@media(max-width:640px)', '.asg217-quick-grid', '.asg217-secure-hint']), 'Responsive desktop/tablet/móvil', files.styles);

Object.values(files).filter(exists).filter(file => /\.(?:js|mjs)$/.test(file)).forEach(file => {
  const src = read(file);
  check('NO_DIRECT_BROWSER_STORAGE_' + file.replace(/\W+/g,'_'), !/\b(?:localStorage|sessionStorage)\b/.test(src), 'Sin almacenamiento operativo directo', file);
  const result = spawnSync(process.execPath, ['--check', p(file)], { encoding:'utf8' });
  check('SYNTAX_' + file.replace(/\W+/g,'_'), result.status === 0, result.status === 0 ? 'Sintaxis válida' : String(result.stderr || result.stdout).trim(), file);
});

const protectedExpected = {
  'data/store.js':'1ec42cf35458c607333a494c4fd7fa74e04101869185423d8cd71ae8098fd838',
  'core/auth.js':'756b7ec6ad4788b3d77fe09b5ac7f706c9deb62cd44459bd06a2ac5284c5d230',
  'core/importa.js':'fbdc378d709aeb6816418d8c4d5dd0627675d6919caed887f45494fbf319e0df'
};
Object.entries(protectedExpected).forEach(([file, expected]) =>
  check('PROTECTED_' + file.replace(/\W+/g,'_'), exists(file) && hash(file) === expected, 'Archivo protegido byte-identical', file)
);

const index = read('index.html');
warning('INDEX_VISIBILITY', index.includes('core/aseguradoras-op2-role-visibility.js?v=20260713-op2'), 'Integrar visibilidad OP-2 mediante pipeline seguro', 'index.html');
warning('INDEX_SOURCE_GUARD', index.includes('core/aseguradoras-op2-source-guard.js?v=20260713-op2'), 'Integrar guard de alias/duplicados mediante pipeline seguro', 'index.html');
warning('INDEX_IMPORT_UI', index.includes('core/aseguradoras-op2-import-ui-guard.js?v=20260713-op2'), 'Integrar guard visual del importador mediante pipeline seguro', 'index.html');
warning('INDEX_CLOSURE', index.includes('modules/aseguradoras-op2-closure-bridge.js?v=20260713-op2'), 'Integrar cierre Aseguradoras OP-2 mediante pipeline seguro', 'index.html');
warning('INDEX_PERMISSION', index.includes('modules/aseguradoras-op2-permission-guard.js?v=20260713-op2'), 'Integrar guard de entradas OP-2 mediante pipeline seguro', 'index.html');
warning('INDEX_ACADEMY', index.includes('data/academia-v1217-aseguradoras-op2.js?v=20260713-op2'), 'Integrar Academia OP-2 mediante pipeline seguro', 'index.html');
warning('INDEX_STYLES', index.includes('styles/aseguradoras-op2-v1217.css?v=20260713-op2'), 'Integrar estilos OP-2 mediante pipeline seguro', 'index.html');
warning('REAL_DRY_RUN', false, 'Pendiente dry-run separado GT/CO con fuentes reales y backend seguro', 'fuentes');
warning('VISUAL_GATE', false, 'Pendiente smoke visual OP-2 en 1366/768/390 para Dirección/Operativo/Asesor', 'tools');

const result = {
  validator:'orbit360-validar-aseguradoras-op2-v1217', root,
  generatedAt:new Date().toISOString(), summary:{ pass:pass.length, fail:fail.length, warn:warn.length },
  pass, fail, warn
};
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
