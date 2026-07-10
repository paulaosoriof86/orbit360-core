import fs from 'node:fs';
import vm from 'node:vm';

const file = 'orbit360-platform/core/drive-folder-matcher-p03.js';
const code = fs.readFileSync(file, 'utf8');
const context = { window: {}, console, Date, Math, Set, Array, String, Object };
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(code, context);
const api = context.window.Orbit.driveFolderMatcherP03;

function assert(condition, message) { if (!condition) throw new Error(message); }

assert(api.normalize('Compañía Águila, S.A.') === 'compania_aguila_s_a', 'Debe normalizar acentos y signos');
assert(api.withoutLegalSuffixes('Compañía Águila Seguros, S.A.') === 'aguila', 'Debe limpiar sufijos legales y descriptivos');
assert(api.normalizeCountry('Guatemala') === 'GT', 'Guatemala debe normalizarse como GT');
assert(api.normalizeCountry('Colombia') === 'CO', 'Colombia debe normalizarse como CO');

const entities = [
  { id: 'asg1', nombre: 'Compañía Águila Seguros, S.A.', aliases: ['Águila'], pais: 'GT' },
  { id: 'asg2', nombre: 'Protección Andina S.A.', aliases: ['Andina'], pais: 'CO' },
  { id: 'asg3', nombre: 'Mutual Horizonte', pais: 'GT', driveFolderRef: 'f3' },
  { id: 'asg4', nombre: 'Seguros Nueva Vida', pais: 'GT', driveFolderRef: 'fold-old' },
  { id: 'asg5', nombre: 'Sin Carpeta Conocida', pais: 'GT' }
];
const folders = [
  { id: 'f1', name: 'Águila', path: 'Aseguradoras/Guatemala/Águila', webViewLink: 'https://drive.example/f1' },
  { id: 'f2', name: 'Proteccion Andina', path: 'Aseguradoras/Colombia/Proteccion Andina', webViewLink: 'https://drive.example/f2' },
  { id: 'f3', name: 'Mutual Horizonte', path: 'Aseguradoras/Guatemala/Mutual Horizonte', webViewLink: 'https://drive.example/f3' },
  { id: 'f4', name: 'Nueva Vida', path: 'Aseguradoras/Guatemala/Nueva Vida', webViewLink: 'https://drive.example/f4' },
  { id: 'f-wrong-country', name: 'Aguila', path: 'Aseguradoras/Colombia/Aguila' },
  { id: 'not-folder', name: 'Aguila.pdf', mimeType: 'application/pdf', path: 'Aseguradoras/Guatemala/Aguila.pdf' }
];

const eagleRank = api.rankCandidates(entities[0], folders);
assert(eagleRank[0].folderId === 'f1', 'Debe priorizar alias y país correcto');
assert(eagleRank.every(candidate => candidate.folderId !== 'not-folder'), 'No debe considerar archivos como carpetas');
assert(eagleRank.find(candidate => candidate.folderId === 'f-wrong-country').warnings.includes('PAIS_NO_COINCIDE'), 'Debe advertir país incorrecto');

const dryRun = api.buildDryRun({
  parentFolderId: 'root-insurers',
  source: 'google_drive_folder_metadata',
  entidades: entities,
  carpetas: folders,
  generatedAt: '2026-07-10T08:30:00.000Z'
}, { tipo: 'aseguradora' });

assert(dryRun.writeAllowed === false && dryRun.requiresConfirmation === true, 'El motor nunca debe escribir automáticamente');
assert(dryRun.summary.totalEntities === 5 && dryRun.summary.totalFolders === 6, 'Debe conservar totales de dry-run');
const op1 = dryRun.operations.find(op => op.entityId === 'asg1');
const op2 = dryRun.operations.find(op => op.entityId === 'asg2');
const op3 = dryRun.operations.find(op => op.entityId === 'asg3');
const op4 = dryRun.operations.find(op => op.entityId === 'asg4');
const op5 = dryRun.operations.find(op => op.entityId === 'asg5');
assert(op1.proposedFolderId === 'f1', 'Debe proponer carpeta de Águila');
assert(op2.proposedFolderId === 'f2', 'Debe proponer carpeta de Andina');
assert(op3.action === 'omit_existing' && op3.proposedFolderId === 'f3', 'Vínculo existente idéntico debe omitirse');
assert(op4.action === 'update_proposed' && op4.currentFolderId === 'fold-old' && op4.proposedFolderId === 'f4', 'Cambio de carpeta debe quedar como propuesta de actualización');
assert(op5.action === 'omit' && !op5.proposedFolderId, 'Entidad sin coincidencia debe quedar sin enlace');
assert(op1.trace.parentFolderId === 'root-insurers' && op1.trace.country === 'GT', 'Debe conservar trazabilidad de raíz y país');

const ambiguous = api.buildDryRun({
  entidades: [{ id: 'a1', nombre: 'Seguros Central', pais: 'GT' }],
  carpetas: [
    { id: 'ca', name: 'Central', path: 'GT/Central' },
    { id: 'cb', name: 'Seguros Central', path: 'GT/Seguros Central' }
  ],
  options: { minDelta: 50 }
});
assert(ambiguous.operations[0].action === 'requires_validation', 'Coincidencias cercanas deben requerir validación');

const collision = api.buildDryRun({
  entidades: [
    { id: 'c1', nombre: 'Vida Clara', pais: 'GT' },
    { id: 'c2', nombre: 'Vida Clara Seguros', pais: 'GT' }
  ],
  carpetas: [{ id: 'shared', name: 'Vida Clara', path: 'Guatemala/Vida Clara' }]
});
assert(collision.summary.conflicts === 2, 'Una carpeta propuesta a dos entidades debe crear conflicto');
assert(collision.operations.every(op => op.action === 'requires_validation'), 'Los conflictos no se enlazan automáticamente');

const manual = api.buildDryRun({
  entidades: [{ id: 'm1', nombre: 'Nombre difícil', pais: 'CO' }],
  carpetas: [{ id: 'manual-folder', name: 'Archivo Corporativo', path: 'Colombia/Archivo Corporativo', webViewLink: 'https://drive.example/manual' }],
  overrides: { m1: { folderId: 'manual-folder', motivo: 'Validado por administración' } }
});
assert(manual.operations[0].action === 'link_manual_proposed', 'Selección manual debe quedar como propuesta explícita');
const links = api.buildConfirmedLinks(manual, ['m1']);
assert(links.length === 1 && links[0].driveFolder.folderId === 'manual-folder', 'Debe construir vínculo confirmado solo para IDs autorizados');
assert(links[0].driveFolder.matchedBy === 'manual', 'Debe conservar origen manual');
assert(links[0].audit.containsFileBytes === false && links[0].audit.containsAccessToken === false, 'El vínculo no debe incluir bytes ni tokens');

const notConfirmed = api.buildConfirmedLinks(dryRun, []);
assert(notConfirmed.length === 0, 'Sin confirmación no se generan enlaces');

console.log('OK orbit360-test-drive-folder-matcher-p03');
