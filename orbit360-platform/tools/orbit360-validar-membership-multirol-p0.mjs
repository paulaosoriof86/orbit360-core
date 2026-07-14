import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const platform = path.resolve(here, '..');
const contractPath = path.join(platform, 'core', 'membership-multirol-contract-p0.js');
const source = fs.readFileSync(contractPath, 'utf8');

const forbidden = [
  /Orbit\.store\s*[.\[]/,
  /localStorage\s*[.\[]/,
  /sessionStorage\s*[.\[]/,
  /firebase\s*[.\[]/,
  /\.insert\s*\(/,
  /\.update\s*\(/,
  /\.remove\s*\(/
];
const staticViolations = forbidden.filter((pattern) => pattern.test(source)).map(String);
if (staticViolations.length) {
  console.error(JSON.stringify({ ok: false, stage: 'static', staticViolations }, null, 2));
  process.exit(1);
}

const context = {
  window: { Orbit: {} },
  console,
  Number,
  Object,
  Array,
  String,
  RegExp,
  JSON,
  Date,
  Math
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(source, context, { filename: contractPath });

const api = context.window.Orbit.membershipMultirolP0;
if (!api) throw new Error('Contrato multirol no instalado');

const moduleCatalog = [
  'inicio', 'cliente360', 'polizas', 'cobros', 'renovaciones', 'ops', 'leads',
  'aseguradoras', 'calidad', 'importar', 'configuracion', 'equipo', 'finanzas',
  'cotizador', 'comparativo', 'portal'
];

function membership(overrides = {}) {
  return {
    uid: 'user-001',
    email: 'user@example.com',
    tenantId: 'tenant-test',
    displayName: 'Usuario Prueba',
    roles: ['Asesor', 'Operativo'],
    defaultRole: 'Operativo',
    activeRole: 'Operativo',
    modulesExtra: ['finanzas'],
    modulesRestricted: ['importar'],
    dataScopes: {
      default: 'team',
      modules: { cliente360: 'all', finanzas: 'none' }
    },
    countries: ['GT', 'CO'],
    advisorId: 'advisor-001',
    teamId: 'team-001',
    status: 'active',
    activatedAt: '2026-07-13T20:00:00Z',
    ...overrides
  };
}

function actor(overrides = {}) {
  return {
    userId: 'admin-001',
    activeRole: 'Dirección',
    assignedRoles: ['Dirección', 'Asesor'],
    reason: 'Ajuste autorizado de acceso operativo',
    confirmationPhrase: api.STRONG_CONFIRMATION_PHRASE,
    mfaVerified: true,
    changedAt: '2026-07-13T21:00:00Z',
    ...overrides
  };
}

const valid = api.validate(membership());
const modules = api.effectiveModules(membership(), { moduleCatalog }, moduleCatalog);
const scopeClient = api.effectiveScope(membership(), 'cliente360');
const scopeFinance = api.effectiveScope(membership(), 'finanzas');
const switchAllowed = api.proposeRoleSwitch(membership(), 'Asesor', { userId: 'user-001' });
const switchDenied = api.proposeRoleSwitch(membership({ status: 'suspended' }), 'Asesor', { userId: 'user-001' });
const badDefault = api.validate(membership({ defaultRole: 'Dirección' }));
const badActive = api.validate(membership({ activeRole: 'Dirección' }));
const advisorMissing = api.validate(membership({ advisorId: '' }));
const sensitive = api.validate({ ...membership(), password: 'never-store-this' });
const missingCountries = api.validate(membership({ countries: [] }));
const conflictModule = api.validate(membership({ modulesExtra: ['finanzas'], modulesRestricted: ['finanzas'] }));

const before = membership({
  roles: ['Asesor'],
  defaultRole: 'Asesor',
  activeRole: 'Asesor',
  modulesExtra: [],
  modulesRestricted: ['finanzas'],
  dataScopes: { default: 'own', modules: {} }
});
const afterExpansion = membership({
  roles: ['Asesor', 'AdminTenant'],
  defaultRole: 'AdminTenant',
  activeRole: 'AdminTenant',
  modulesExtra: ['finanzas'],
  modulesRestricted: [],
  dataScopes: { default: 'all', modules: {} }
});
const expansion = api.accessExpansion(before, afterExpansion);
const planExpanded = api.planChange(before, afterExpansion, actor(), { requireMfaForExpansion: true });
const planNoPhrase = api.planChange(before, afterExpansion, actor({ confirmationPhrase: '' }), { requireMfaForExpansion: true });
const planNoMfa = api.planChange(before, afterExpansion, actor({ mfaVerified: false }), { requireMfaForExpansion: true });
const planAdvisorActor = api.planChange(before, afterExpansion, actor({ activeRole: 'Asesor', assignedRoles: ['Asesor'] }), {});
const afterRestricted = membership({
  roles: ['Asesor'],
  defaultRole: 'Asesor',
  activeRole: 'Asesor',
  modulesExtra: [],
  modulesRestricted: ['finanzas', 'importar'],
  dataScopes: { default: 'own', modules: { cliente360: 'own' } }
});
const planRestricted = api.planChange(before, afterRestricted, actor({ confirmationPhrase: '' }), {});
const tenantChange = api.planChange(before, membership({ tenantId: 'other-tenant' }), actor(), {});

const assertions = {
  validMembership: valid.ok === true,
  activeRoleModulesOnly: modules.includes('cliente360') && modules.includes('finanzas') && !modules.includes('importar') && !modules.includes('configuracion'),
  moduleScopeOverride: scopeClient === 'all' && scopeFinance === 'none',
  roleSwitchProposalOnly: switchAllowed.ok === true && switchAllowed.writeAuthorized === false && switchAllowed.after.activeRole === 'Asesor',
  suspendedCannotSwitch: switchDenied.ok === false,
  defaultRoleGate: badDefault.ok === false && badDefault.errors.includes('rol_default_no_asignado'),
  activeRoleGate: badActive.ok === false && badActive.errors.includes('rol_activo_no_asignado'),
  advisorIdGate: advisorMissing.ok === false && advisorMissing.errors.includes('asesorId_requerido'),
  secretGate: sensitive.ok === false && sensitive.errors.some((e) => e.startsWith('campos_sensibles_no_permitidos:')),
  countryGate: missingCountries.ok === false && missingCountries.errors.includes('paises_faltantes'),
  moduleConflictGate: conflictModule.ok === false && conflictModule.errors.includes('modulo_extra_y_restringido'),
  expansionDetected: expansion.expanded === true && expansion.reasons.includes('rol_privilegiado_agregado') && expansion.reasons.includes('scope_default_ampliado'),
  expansionPlanOnly: planExpanded.ok === true && planExpanded.writeAuthorized === false && planExpanded.writeExecuted === false,
  expansionAudit: planExpanded.auditEntry && planExpanded.auditEntry.action === 'expand_membership_access' && planExpanded.auditEntry.status === 'planned_not_executed',
  rollbackPlanned: planExpanded.rollbackPlan && planExpanded.rollbackPlan.action === 'restore_membership',
  strongPhraseGate: planNoPhrase.ok === false && planNoPhrase.errors.includes('confirmacion_reforzada_requerida'),
  mfaGate: planNoMfa.ok === false && planNoMfa.errors.includes('mfa_requerido_ampliacion'),
  adminActorGate: planAdvisorActor.ok === false && planAdvisorActor.errors.includes('actor_sin_permiso_membresias'),
  restrictiveChangeNoStrongPhrase: planRestricted.ok === true && planRestricted.expansion.expanded === false,
  tenantImmutable: tenantChange.ok === false && tenantChange.errors.includes('cambio_tenant_no_permitido'),
  executorStillRequired: planExpanded.executorRequirements.productBackendRequired === true && planExpanded.executorRequirements.atomicWriteRequired === true
};

const failed = Object.entries(assertions).filter(([, ok]) => !ok).map(([name]) => name);
const result = {
  ok: failed.length === 0,
  contract: path.relative(platform, contractPath).replaceAll('\\', '/'),
  assertions,
  failed,
  staticViolations,
  sample: {
    activeRole: valid.membership.activeRole,
    modules,
    scopeClient,
    scopeFinance,
    expansionReasons: expansion.reasons,
    writeAuthorized: planExpanded.writeAuthorized,
    writeExecuted: planExpanded.writeExecuted
  }
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
