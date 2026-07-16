#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { appendProtectedChecks } from './orbit360-protected-baseline.mjs';

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const rootArg = args.find(x => x !== '--verbose');
const root = path.resolve(rootArg || path.join(process.cwd(), 'orbit360-platform'));
const pass = [], fail = [], warn = [];
const files = {
  access:'core/access-scope.js',
  visibility:'core/aseguradoras-op2-role-visibility.js',
  operationalAccess:'core/aseguradoras-op2-operational-access-policy.js',
  importer:'core/insurer-directory-import-v1202.js',
  importerSecurity:'core/insurer-directory-import-v1202-security.js',
  quarantine:'core/aseguradoras-op2-sheet-quarantine.js',
  sourceGuard:'core/aseguradoras-op2-source-guard.js',
  importUi:'core/aseguradoras-op2-import-ui-guard.js',
  ux:'modules/aseguradoras.js',
  resources:'modules/aseguradoras-v1202-resources-bridge.js',
  operationalResources:'modules/aseguradoras-op2-operational-resources.js',
  closure:'modules/aseguradoras-op2-closure-bridge.js',
  permission:'modules/aseguradoras-op2-permission-guard.js',
  academy:'data/academia-v1217-aseguradoras-op2.js',
  styles:'styles/aseguradoras-op2-v1217.css'
};
const adapterFile = 'modules/aseguradoras-v1197-ux-bridge.js';
const projectionFile = 'modules/aseguradoras-frontend-projection-v20260716.js';
const p = file => path.join(root, file);
const read = file => fs.existsSync(p(file)) ? fs.readFileSync(p(file), 'utf8') : '';
const all = (src, terms) => terms.every(term => typeof term === 'string' ? src.includes(term) : term.test(src));
function check(id, ok, message, file='') { (ok ? pass : fail).push({ id, message, file }); }
function warning(id, ok, message, file='') { if (!ok) warn.push({ id, message, file }); }

Object.entries(files).forEach(([key,file]) => check('FILE_' + key.toUpperCase(), fs.existsSync(p(file)), 'Archivo requerido presente', file));
check('UX_ADAPTER_FILE', fs.existsSync(p(adapterFile)), 'Adaptador aditivo presente', adapterFile);
check('UX_PROJECTION_FILE', fs.existsSync(p(projectionFile)), 'Proyección de conocimiento presente', projectionFile);
const src = Object.fromEntries(Object.entries(files).map(([key,file]) => [key, read(file)]));
src.adapter = read(adapterFile);
src.projection = read(projectionFile);

check('ACCESS_CENTRAL', all(src.access,['function can','function audit','function correction']), 'Acceso, auditoría y correcciones centralizados', files.access);
check('ROLE_VISIBILITY', all(src.visibility,["ensure('Operativo', ['aseguradoras'])","ensure('Asesor', ['aseguradoras'])",'sensitiveAccessUnchanged: true','insurerWritePermissionUnchanged: true']), 'Operativo y Asesor ven el módulo sin ampliar escritura', files.visibility);
check('BANK_POLICY', all(src.operationalAccess,['function canViewBankAccounts','function canCopyBankAccounts',"accessClass:'operational_all_viewers'",'bankAccountsVisible']), 'Cuentas visibles y copiables para usuarios autorizados', files.operationalAccess);
check('CREDENTIAL_POLICY', all(src.operationalAccess,['function canViewCredentials','function canCopyCredentials',"accessClass:'administrative_operational'","'Dirección','SuperAdmin','AdminTenant','Admin','Operativo'"]), 'Accesos de plataforma restringidos por rol', files.operationalAccess);
check('RESTRICTIONS_PREVAIL', all(src.operationalAccess,['restricciones','aseguradoras_cuentas_ver','aseguradoras_credenciales_ver','aseguradoras_credenciales_copiar']), 'Restricciones explícitas prevalecen', files.operationalAccess);

check('IMPORT_COUNTRY', all(src.importer,["if (!['GT','CO'].includes(country))",'currencyFor(country)','pais_directorio_requerido']), 'País GT/CO y moneda explícitos', files.importer);
check('IMPORT_TRACE', all(src.importer,['fuenteTraza','archivo: source.fileName','hoja: source.sheetName','fila:',"bloque: 'contactos'","bloque: 'plataformas'","bloque: 'bancos'"]), 'Trazabilidad archivo/hoja/fila/bloque', files.importer);
check('IMPORT_SOURCE_SEPARATION', all(src.importer,['sourceType: SOURCE_TYPE',"collection: 'aseguradoras'",'No crea clientes']), 'Fuente limitada a Aseguradoras', files.importer);
check('IMPORT_SECURE_SESSION', all(src.importer,['const secureSession = new Map()','persistedInStore: false','safeOperationData','delete p.usuario','delete c.numero']), 'Recursos protegidos separados de Orbit.store', files.importer);
check('IMPORT_CONFIRMATION', all(src.importer,["CONFIRM_PHRASE = 'CONFIRMO DIRECTORIO'",'confirmacion_reforzada_requerida','applyValidOnly']), 'Dry-run y confirmación reforzada', files.importer);

check('WRITE_GUARD', all(src.importerSecurity,['function backendWriteAllowed','Conexión segura requerida para aplicar','backend_operativo_requerido_para_aplicar_datos_reales']), 'Aplicación bloqueada sin conexión segura', files.importerSecurity);
check('FRIENDLY_ERRORS', all(src.importerSecurity,['const ERROR_COPY','function friendlyError','function friendlyVisibleText','La operación requiere una revisión adicional antes de continuar.']), 'Errores técnicos se traducen a mensajes operativos', files.importerSecurity);
check('SAFE_VISIBLE_COPY', all(src.importerSecurity,['Los datos protegidos no se muestran ni se guardan junto con el directorio','El archivo se revisa de forma segura','node.textContent = next']), 'Copy visible no expone términos internos', files.importerSecurity);
check('NO_HTML_INJECTION', !src.importerSecurity.includes('node.innerHTML ='), 'Sanitización no inyecta HTML', files.importerSecurity);

check('QUARANTINE_PRE_PARSE', all(src.quarantine,['const originalParseMatrices = D.parseMatrices.bind(D)','quarantineMatrices(matrices)','D.parseFile = async function']), 'Cuarentena previa al parser', files.quarantine);
check('QUARANTINE_CLASSES', all(src.quarantine,['hoja_soporte_por_nombre','hoja_personal_interno','hoja_tecnica_sensible']), 'Clasificación separada de hojas excluidas', files.quarantine);
check('QUARANTINE_NO_VALUES', all(src.quarantine,['rawValuesExposed:false','excludedSheetValuesCaptured:false',"scope:'excluded_sheets'"]), 'Reporte no expone valores excluidos', files.quarantine);
check('QUARANTINE_CAPTURE_MODE', all(src.quarantine,['const captureSecure = opts.captureSecure !== false','reviewCaptureSecure:captureSecure === true']), 'Revisión sin captura e importación preparada diferenciadas', files.quarantine);
check('QUARANTINE_NO_WRITES', !/Orbit\.store|\.insert\(|\.update\(|\.remove\(/.test(src.quarantine), 'Cuarentena no escribe datos operativos', files.quarantine);

check('ALIAS_VERSION_AND_DISTANCE', all(src.sourceGuard,['function canonical','function distance','distance(x, y) <= 1','function exactCanonical']), 'Versiones, errores de una letra e identidad exacta disponibles', files.sourceGuard);
check('ALIAS_WITHIN_FILE', all(src.sourceGuard,['duplicado_probable_dentro_del_archivo','requiereValidacion = true',"validationStatus = 'requiere_validacion'"]), 'Duplicados internos quedan bloqueados', files.sourceGuard);
check('ALIAS_EXISTING', all(src.sourceGuard,['duplicado_probable_con_directorio',"type:'existing_directory'",'existingId']), 'Coincidencias contra directorio quedan bloqueadas', files.sourceGuard);
check('PROBABLE_UPDATE', all(src.sourceGuard,['actualizacion_probable_requiere_confirmacion',"type:'probable_update'",'!exactCanonical(found.nombre, sourceName)']), 'Actualización probable requiere confirmación', files.sourceGuard);
check('ALIAS_NO_WRITES', !/Orbit\.store\.(?:insert|update|remove)/.test(src.sourceGuard), 'Guard no fusiona ni escribe automáticamente', files.sourceGuard);
check('UI_REVIEW_NO_CAPTURE', all(src.importUi,['D.parseFile(file, { country, captureSecure:false })','duplicateReview',"root.dataset.op2AliasState = 'blocked'",'button.disabled = true']), 'Revisión visual bloquea sin capturar recursos', files.importUi);
check('UI_FAIL_CLOSED', all(src.importUi,["root.dataset.op2AliasState = 'error'",'La aplicación queda bloqueada para evitar duplicados']), 'Error de revisión bloquea aplicación', files.importUi);

check('UX_DIRECTORY', all(src.ux,['function render(','K.kpis([','function card(','function ficha(','id="asg-ficha"','data-asg=']), 'Renderer canónico contiene directorio, KPI, tarjetas y ficha', files.ux);
check('UX_TABS', all(src.ux,[/['"]resumen['"]/,/['"]contactos['"]/,/['"]plataformas['"]/,/['"]bancos['"]/,/['"]documentos['"]/,/['"]tarifas['"]/]), 'Ficha canónica reúne recursos operativos', files.ux);
check('UX_CANONICAL_PRESERVED', all(src.adapter,['visualOverride: false',"canonicalRenderer: 'modules/aseguradoras.js'",'__candidateContractAdapter = true']), 'Adaptador conserva el renderer canónico', adapterFile);
check('UX_KNOWLEDGE_PROJECTION', all(src.projection,['canonicalRendererPreserved: true','writesKnowledge: false','Mapeado · pendiente de sincronización','Tarifas, reglas y formatos vinculados']), 'Proyección aditiva muestra conocimiento sin escribir ni habilitar', projectionFile);
check('DOCUMENT_VIEWER', all(src.ux,['Orbit.documentViewer.open',"module:'aseguradoras'",'Ver documento']) || all(src.adapter,['openKnowledge','Fuentes mapeadas']), 'Documentos/conocimiento usan visor o catálogo controlado', files.ux);
check('RATE_HONESTY', all(src.resources,['Importar contactos o accesos no habilita tarifas','Pendiente de configuración validada']), 'Directorio no habilita tarifas', files.resources);

check('BANK_OPERATIONAL', all(src.operationalResources,['data-op2-account-value','data-op2-copy-account','P.canCopyBankAccounts()','R.revealField','R.copyField']), 'Cuenta visible y copiable según política', files.operationalResources);
check('CREDENTIAL_OPERATIONAL', all(src.operationalResources,['Ver usuario y contraseña','Copiar usuario','Copiar contraseña','P.canViewCredentials()','R.revealCredential','R.copyCredential']), 'Accesos visibles y copiables para roles autorizados', files.operationalResources);
check('CREDENTIAL_TEMPORARY', all(src.operationalResources,['const transient = new Map()','15000','transient.delete(index)']), 'Contraseña temporal en memoria', files.operationalResources);
check('PROVIDER_CONTEXT', all(src.operationalResources,['P.bankContext','P.credentialContext','insurerId:a.id','platformIndex:index']), 'Proveedor recibe entidad y contexto de permiso', files.operationalResources);

check('STORE_GUARD', all(src.closure,['function installStoreGuard',"collection === 'aseguradoras' ? sanitizePatch",'__aseguradorasOp2SensitiveGuardV1218']), 'Altas y cambios pasan por guard', files.closure);
check('NEW_RESOURCES_SANITIZED', all(src.closure,['function sanitizePortal','function sanitizeAccount','delete out.usuario','delete out.password','delete out.numero','delete out.accountNumber']), 'Nuevos recursos no se persisten en claro', files.closure);
check('LEGACY_NON_DESTRUCTIVE', all(src.closure,['pendiente_migracion_segura_no_destructiva','rawPersisted:true','migrationPerformed:false','destructive:false']), 'Migración legacy no destructiva', files.closure);
check('NO_PREMATURE_MIGRATION', !src.closure.includes("audit('migrar_recursos_sensibles_legacy'") && !src.closure.includes('rawPersisted:false'), 'No se declara migración antes de verificar', files.closure);
check('DIRECT_ENTRY_GUARD', all(src.permission,["A.can('aseguradoras', action)",'startEdit && !allowed',"!allowed('create')","!allowed('create') && !allowed('manage_documents')"]), 'Entradas directas exigen permiso', files.permission);

check('ACADEMY_SAME_IDS', all(src.academy,['cur_dir_aseg_dir_v1202','cur_dir_aseg_op_v1202','cur_dir_aseg_asesor_v1202','Orbit.store.update']), 'Academia actualiza cursos existentes', files.academy);
check('ACADEMY_V1220', all(src.academy,['Cuarentena de hojas','Identidad exacta antes de actualizar','Mensajes operativos','next._cv = 1220']), 'Academia enseña contratos v1.220', files.academy);
check('ACADEMY_PROGRESS', all(src.academy,['next.progreso = previous.progreso','next.certificado = !!previous.certificado']), 'Progreso y certificado preservados', files.academy);
check('ACADEMY_NO_DUPLICATE', !/Orbit\.store\.insert\('cursos'/.test(src.academy), 'Academia no duplica cursos', files.academy);
check('RESPONSIVE', all(src.styles,['@media(max-width:900px)','@media(max-width:640px)','.asg218-bank','.asg218-platform','.asg218-credentials']), 'Responsive de recursos operativos', files.styles);

Object.values(files).concat([adapterFile, projectionFile]).filter((file, index, arr) => arr.indexOf(file) === index).filter(file => fs.existsSync(p(file))).filter(file => /\.(?:js|mjs)$/.test(file)).forEach(file => {
  const content = read(file);
  const directBrowserStorage = /\b(?:window\s*\.\s*)?(?:localStorage|sessionStorage)\s*(?:\.|\[)/.test(content);
  check('NO_BROWSER_STORAGE_' + file.replace(/\W+/g,'_'), !directBrowserStorage, 'Sin almacenamiento operativo directo', file);
  const syntax = spawnSync(process.execPath, ['--check', p(file)], { encoding:'utf8' });
  check('SYNTAX_' + file.replace(/\W+/g,'_'), syntax.status === 0, syntax.status === 0 ? 'Sintaxis válida' : String(syntax.stderr || syntax.stdout).trim(), file);
});

appendProtectedChecks(pass, fail, root);
const index = read('index.html');
warning('INDEX_QUARANTINE', index.includes('core/aseguradoras-op2-sheet-quarantine.js?v=20260713-op2-v1219'), 'Integrar cuarentena mediante pipeline seguro', 'index.html');
warning('INDEX_SOURCE_GUARD', index.includes('core/aseguradoras-op2-source-guard.js?v=20260713-op2'), 'Integrar guard de identidad mediante pipeline seguro', 'index.html');
warning('INDEX_ACADEMY', index.includes('data/academia-v1217-aseguradoras-op2.js?v=20260713-op2-v1218'), 'Integrar Academia mediante pipeline seguro', 'index.html');
warning('VISUAL_GATE', false, 'Pendiente gate focalizado de tres vistas Plataformas', 'tools');
warning('REAL_DRY_RUN', false, 'Pendiente dry-run separado Guatemala y Colombia', 'fuentes');

const result = { validator:'orbit360-validar-aseguradoras-op2-v1220', generatedAt:new Date().toISOString(), root, summary:{ pass:pass.length, fail:fail.length, warn:warn.length }, fail, warn };
if (verbose) result.pass = pass;
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
