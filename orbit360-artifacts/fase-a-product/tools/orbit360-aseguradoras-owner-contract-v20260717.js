#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const writes = [];
const data = { aseguradoras: [], asesores: [], polizas: [], cobros: [], comisiones: [], reclamos: [], gestiones: [], negocios: [] };
const store = {
  all: collection => data[collection] || [],
  get: (collection, id) => (data[collection] || []).find(item => item.id === id) || null,
  where: (collection, predicate) => (data[collection] || []).filter(predicate),
  insert: (...args) => writes.push(['insert', ...args]),
  update: (...args) => writes.push(['update', ...args]),
  remove: (...args) => writes.push(['remove', ...args])
};

const context = {
  console,
  setTimeout,
  clearTimeout,
  window: {},
  document: {
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, addEventListener() {} }),
    head: { appendChild() {} }
  },
  navigator: {},
  history: { replaceState() {} },
  location: { hash: '' },
  localStorage: { getItem() { return null; }, setItem() {} },
  Orbit: {
    ui: { esc: value => String(value ?? ''), toast() {}, prompt: async () => null, confirm: async () => false },
    kit: {},
    store,
    session: { rol: () => 'Dirección', asesorId: () => '' },
    auth: { user: () => ({ nombre: 'Prueba' }) },
    vault: { wire() {}, field: () => '' },
    tenant: { get: () => ({ tenantId: 'tenant-prueba' }) },
    services: {
      aseguradorasKnowledgeP09: {
        read: () => ({ ok: true, sources: [{ id: 'persisted1', nombre: 'Persistido', pais: 'GT', moneda: 'GTQ', ramo: 'Auto', estado: 'metadata_persisted_pending_validation' }] })
      }
    },
    PAISES: [{ id: 'TODOS' }, { id: 'GT' }, { id: 'CO' }],
    pais: 'TODOS',
    modules: {},
    access: { can: () => true },
    importa: { open() {} }
  }
};
context.window = context;
context.window.Orbit = context.Orbit;
context.window.OrbitTenantInsurerConfigsP10 = [{ tenantId: 'tenant-prueba', preferredInsurerCountryOrder: ['CO', 'GT'] }];
context.window.OrbitTenantInsurerKnowledgeSummaries = [{
  tenantId: 'tenant-prueba',
  insurers: [{ insurerName: 'Prueba', sources: [{ documentId: 'mapped1', fileName: 'Mapeado', pais: 'CO', moneda: 'COP', ramo: 'Vida', estado: 'mapeado_pendiente_sincronizacion' }] }]
}];

vm.createContext(context);
const ownerPath = path.resolve(__dirname, '..', 'modules', 'aseguradoras.js');
const bridgePath = path.resolve(__dirname, '..', 'modules', 'aseguradoras-v1202-import-bridge.js');
const runtimeValidatorPath = path.resolve(__dirname, '..', '..', 'tools', 'orbit360-runtime-check-client360-v20260716.mjs');
const bridgeSource = fs.readFileSync(bridgePath, 'utf8');
const runtimeValidatorSource = fs.readFileSync(runtimeValidatorPath, 'utf8');
vm.runInContext(fs.readFileSync(ownerPath, 'utf8'), context);

const moduleApi = context.Orbit.modules.aseguradoras;
const sources = moduleApi._fuentes;
function assert(condition, message) { if (!condition) throw new Error(message); }

assert(moduleApi.__ownerKnowledgeV20260717 === true, 'Falta owner marker');
assert(moduleApi.__tenantOrderV20260717 === true, 'Falta tenant order marker');
assert(moduleApi.__consumerGatesSeparatedV20260717 === true, 'Falta consumer gate marker');

let evaluation = sources.evaluarFuente({ pais: 'GT', moneda: 'GTQ', ramo: 'Auto', tipo: 'tarifario', estado: 'Validado' });
assert(!evaluation.habilitadoCotizador && !evaluation.sirveParaComparativo && !evaluation.sirveParaTarifas, 'Validado no debe habilitar consumo');

evaluation = sources.evaluarFuente({ pais: 'GT', moneda: 'GTQ', ramo: 'Auto', tipo: 'tarifario', estado: 'Habilitado para Cotizador' });
assert(evaluation.habilitadoCotizador && !evaluation.sirveParaComparativo, 'Cotizador debe quedar separado');

evaluation = sources.evaluarFuente({ pais: 'GT', moneda: 'GTQ', ramo: 'Auto', tipo: 'tarifario', estado: 'Habilitado para Comparativo' });
assert(!evaluation.habilitadoCotizador && evaluation.sirveParaComparativo, 'Comparativo debe quedar separado');

const insurer = { id: 'a1', nombre: 'Prueba', pais: 'GT', docs: [{ id: 'local1', nombre: 'Ficha', pais: 'GT', moneda: 'GTQ', ramo: 'Auto', estado: 'Validado' }] };
const rows = sources.knowledgeSources(insurer);
assert(rows.length === 3, 'Debe combinar mapeado, persistido y ficha');
assert(rows.some(item => item.estado === 'Mapeado'), 'Falta estado Mapeado');
assert(rows.some(item => item.estado === 'Persistido'), 'Falta estado Persistido');
assert(writes.length === 0, 'La proyección de conocimiento no puede escribir');
assert(sources.resumenGrupos(insurer).every(group => group.estado !== 'Habilitado'), 'Sin habilitación explícita el grupo debe quedar pendiente');

assert(bridgeSource.includes("host.querySelector('#asg-new, [data-new-asg]')"), 'El bridge debe capturar el botón real #asg-new');
assert(bridgeSource.includes("host.querySelector('#asg-imp, [data-import-asg]')"), 'El bridge debe capturar el botón real #asg-imp');
assert(bridgeSource.includes("replacement.dataset.newAsg = 'safe-confirm-before-insert'"), 'Falta marcador de alta segura');
assert(bridgeSource.includes('safeCreateBeforeInsert: true'), 'Falta contrato create-before-insert');
assert(bridgeSource.includes('cancelWritesStore: false'), 'Cancelar no puede escribir al store');
const nameGuard = bridgeSource.indexOf("if (!name) return toast('Ingresa el nombre comercial.')");
const countryGuard = bridgeSource.indexOf("if (!country) return toast('Selecciona el país.')");
const reasonGuard = bridgeSource.indexOf("if (!reason) return toast('Registra el motivo del alta.')");
const insertPoint = bridgeSource.indexOf("S().insert('aseguradoras', row)");
assert(nameGuard >= 0 && countryGuard > nameGuard && reasonGuard > countryGuard && insertPoint > reasonGuard, 'La inserción debe ocurrir solo después de nombre, país y motivo');

assert(runtimeValidatorSource.includes("CLIENT360_VALIDATOR_CONTRACT_VERSION = '1.0.29'"), 'El validador Cliente 360 debe declarar contrato 1.0.29');
assert(runtimeValidatorSource.includes("SECURE_CREDENTIAL_VALIDATOR_REVISION = 'insurer-view-password-scope-v1'"), 'Falta revisión de alcance de credenciales');
assert(runtimeValidatorSource.includes("DOCUMENT_IMPORT_VALIDATOR_REVISION = 'role-permission-aware-v1'"), 'Falta revisión role-aware del importador documental');
assert(runtimeValidatorSource.includes("#asg-ficha input[type=\"password\"], .m1-portal-card input[type=\"password\"]"), 'La validación de contraseñas debe limitarse a Aseguradoras');
assert(runtimeValidatorSource.includes('passwordInputsInInsurerView'), 'Falta evidencia de contraseñas dentro de la ficha');
assert(runtimeValidatorSource.includes('hiddenLoginPasswordInputs'), 'Falta evidencia separada del login oculto');
assert(runtimeValidatorSource.includes('hiddenLoginExcludedFromInsurerScope: true'), 'El contrato debe excluir explícitamente el login oculto');
assert(!runtimeValidatorSource.includes("document.querySelectorAll('input[type=\"password\"]').length"), 'No se permite volver al conteo global de contraseñas');
assert(runtimeValidatorSource.includes('async function readDocumentImportPermission(page)'), 'Falta lectura canónica de permiso documental');
assert(runtimeValidatorSource.includes('effectiveCanManage'), 'Falta resolución del permiso efectivo del importador');
assert(runtimeValidatorSource.includes("permissionMode: 'authorized-honest-proposal'"), 'Falta evidencia del flujo autorizado');
assert(runtimeValidatorSource.includes("permissionMode: 'denied-by-active-permission'"), 'Falta evidencia del flujo restringido');
assert(runtimeValidatorSource.includes('RESTRICTED_ROLE_DOCUMENT_IMPORT_MODAL_VISIBLE'), 'Falta bloqueo de modal para rol restringido');
assert(runtimeValidatorSource.includes('RESTRICTED_ROLE_DOCUMENT_IMPORT_WROTE_DATA'), 'Falta control de cero escritura para rol restringido');
assert(runtimeValidatorSource.includes('ADVISOR_DOCUMENT_IMPORT_PERMISSION_LEAK'), 'Falta control explícito del Asesor');

const idempotenceTestPath = path.resolve(__dirname, '..', '..', 'tools', 'orbit360-probar-owner-visual-idempotente-v20260721.mjs');
const visualOwnerPath = path.resolve(__dirname, '..', 'core', 'client-insurer-visual-contract-v20260720.js');
const barrierPath = path.resolve(__dirname, '..', 'core', 'client-insurer-visual-stability-barrier-v20260721.js');
const barrierSource = fs.readFileSync(barrierPath, 'utf8');
const proofPath = path.resolve(__dirname, '..', 'runtime-gate-crm-v20260716', 'owner-idempotence-proof-sanitized.json');
const proofRun = spawnSync(process.execPath, [idempotenceTestPath, visualOwnerPath, proofPath], { encoding: 'utf8' });
assert(proofRun.status === 0, 'La prueba determinista de idempotencia falló: ' + String(proofRun.stderr || proofRun.stdout || '').slice(0, 500));
const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
assert(proof.ok === true, 'La evidencia de idempotencia debe ser ok:true');
assert(proof.totalChecks === 27 && proof.failedChecks === 0, 'La prueba de idempotencia y disparadores Cliente 360 debe aprobar 27/27 checks');
assert(proof.proof.baseMutations === 1, 'Debe probar exactamente una mutación base');
assert(proof.proof.canonicalTransforms === 1, 'Debe probar exactamente una transformación canónica');
assert(proof.proof.followUpObserverDeliveries === 0, 'Debe probar cero entregas posteriores del observer');
assert(Array.isArray(proof.proof.client360StructuralTriggers) && proof.proof.client360StructuralTriggers.includes('f-pais') && proof.proof.client360StructuralTriggers.includes('f-seg'), 'Debe probar disparadores estructurales de país y segmento en Cliente 360');
assert(proof.runtimeExecuted === false && proof.browserExecuted === false && proof.deployExecuted === false, 'La prueba debe ser totalmente estática');

assert(barrierSource.includes("version: '20260721.4'"), 'La barrera debe declarar versión 20260721.4');
assert(barrierSource.includes('block1-critical-runtime-20260721-4'), 'La barrera debe declarar el release crítico vigente');
assert(barrierSource.includes("registryContract = { version: '20260721.2' }"), 'La barrera debe conservar la versión pública estable del registro');
assert(barrierSource.includes("DIRECTORY_VISIBILITY_REVISION = '20260721.4a-first-visible-complete'"), 'Falta revisión de primer directorio visible completo');
assert(barrierSource.includes('#host .asg-grid{visibility:hidden!important;pointer-events:none!important}'), 'El directorio debe permanecer oculto y no interactivo mientras está pendiente');
assert(barrierSource.includes('directoryFirstPaintGuard: true'), 'Falta contrato reusable de primer pintado completo');
assert(barrierSource.includes('function directoryReady(grid)'), 'Falta contrato semántico del directorio');
assert(barrierSource.includes("node.classList.contains('asg-grid')"), 'Falta disparador estructural .asg-grid');
assert(barrierSource.includes("node.matches('.asg-card.off[data-asg]')"), 'Falta disparador de tarjeta inactiva');
assert(barrierSource.includes("node.querySelector('#asg-ficha,.asg-grid,.asg-card.off[data-asg]')"), 'Falta detección descendiente del directorio');
assert(barrierSource.includes("scheduleStablePass(ficha() ? 'ficha-dom-replaced' : 'directory-dom-replaced')"), 'Falta ruta de estabilización del directorio');
assert(barrierSource.includes('/Inactiva:/i.test'), 'La estabilidad debe exigir motivo visible de inactividad');
assert(barrierSource.includes('directoryStructuralTrigger: true'), 'Falta marcador reusable del disparador estructural');
const scheduleStart = barrierSource.indexOf('function scheduleStablePass(reason)');
const pendingPoint = barrierSource.indexOf('markPending(reason);', scheduleStart);
const syncEnhancePoint = barrierSource.indexOf('enhanceCanonicalOwner();', pendingPoint);
const syncReadyPoint = barrierSource.indexOf('if (expectedReady(ficha()))', syncEnhancePoint);
const asyncPoint = barrierSource.indexOf('setTimeout(function ()', syncReadyPoint);
assert(scheduleStart >= 0 && pendingPoint > scheduleStart && syncEnhancePoint > pendingPoint && syncReadyPoint > syncEnhancePoint && asyncPoint > syncReadyPoint, 'El owner debe aplicarse y comprobarse antes de la estabilización asíncrona');

console.log(JSON.stringify({
  test: 'orbit360-aseguradoras-owner-contract-v20260717',
  status: 'PASS',
  writes: writes.length,
  states: rows.map(item => item.estado),
  safeCreateBeforeInsert: true,
  realButtonSelectorsCovered: true,
  secureCredentialValidator: {
    contractVersion: '1.0.29',
    revision: 'insurer-view-password-scope-v1',
    passwordScope: '#asg-ficha,.m1-portal-card',
    hiddenLoginExcluded: true,
    globalPasswordCountForbidden: true
  },
  documentImportValidator: {
    revision: 'role-permission-aware-v1',
    directionAuthorizedFlowRequired: true,
    restrictedRoleNoModalRequired: true,
    restrictedRoleNoWriteRequired: true,
    advisorPermissionLeakForbidden: true
  },
  ownerIdempotence: {
    revision: proof.idempotenceRevision,
    checks: proof.totalChecks,
    baseMutations: proof.proof.baseMutations,
    canonicalTransforms: proof.proof.canonicalTransforms,
    followUpObserverDeliveries: proof.proof.followUpObserverDeliveries,
    client360StructuralTriggers: proof.proof.client360StructuralTriggers
  },
  directoryStability: {
    barrierVersion: '20260721.4',
    directoryVisibilityRevision: '20260721.4a-first-visible-complete',
    criticalRelease: 'block1-critical-runtime-20260721-4',
    registryVersion: '20260721.2',
    structuralTrigger: true,
    directoryFirstPaintGuard: true,
    inactiveReasonRequired: true,
    synchronousOwnerBeforeRelease: true,
    writesStore: false
  }
}, null, 2));
