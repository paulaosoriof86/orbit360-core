/* ============================================================
   Orbit 360 · Bootstrap productivo read-only P0
   Fecha: 2026-07-23

   Owner explícito y fail-closed. No se autoejecuta, no contiene
   configuración, no autoriza escrituras y deriva tenant solo desde
   la membership autenticada.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-m2-20260723';
  var TENANT_SOURCE = 'membership_only';
  var WRITE_AUTHORIZED = false;
  var DEFAULT_SNAPSHOT_TIMEOUT_MS = 20000;
  var REQUIRED_DEPENDENCIES = Object.freeze([
    'environmentProvider', 'firebaseAdapter', 'authProvider', 'membershipProvider'
  ]);
  var REQUIRED_CONTRACTS = Object.freeze([
    'membershipMultirolEffectiveP0',
    'tenantAccessPolicyProductP0',
    'productQueryPlannerP0',
    'tenantCanonicalPathsP0',
    'backendProductReadinessP0',
    'createFirestoreProductReadOnlyStoreP0'
  ]);

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return value && typeof value === 'object' ? Object.assign({}, value) : value; }
  }

  function unique(values) {
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var clean = text(value);
      if (clean && out.indexOf(clean) < 0) out.push(clean);
    });
    return out;
  }

  function createState() {
    return {
      version: VERSION,
      mode: 'product',
      phase: 'created',
      ready: false,
      readOnly: true,
      writeAuthorized: false,
      tenantSource: TENANT_SOURCE,
      tenantId: '',
      activeRole: '',
      assignedRoles: [],
      countries: [],
      collections: [],
      errors: [],
      lastTransitionAt: new Date().toISOString()
    };
  }

  function transition(state, phase, patch) {
    state.phase = phase;
    state.lastTransitionAt = new Date().toISOString();
    Object.assign(state, patch || {});
    try {
      window.dispatchEvent(new CustomEvent('orbit:product-readonly-bootstrap', {
        detail: sanitizeState(state)
      }));
    } catch (error) {}
  }

  function sanitizeState(state) {
    return {
      version: state.version,
      mode: state.mode,
      phase: state.phase,
      ready: state.ready === true,
      readOnly: true,
      writeAuthorized: false,
      tenantSource: TENANT_SOURCE,
      tenantId: text(state.tenantId),
      activeRole: text(state.activeRole),
      assignedRoleCount: Array.isArray(state.assignedRoles) ? state.assignedRoles.length : 0,
      countryCount: Array.isArray(state.countries) ? state.countries.length : 0,
      collectionCount: Array.isArray(state.collections) ? state.collections.length : 0,
      errors: unique(state.errors),
      lastTransitionAt: state.lastTransitionAt
    };
  }

  function dependencyErrors(deps) {
    var errors = [];
    REQUIRED_DEPENDENCIES.forEach(function (name) {
      if (!deps || !deps[name]) errors.push('dependencia_faltante:' + name);
    });
    REQUIRED_CONTRACTS.forEach(function (name) {
      if (!window.Orbit[name]) errors.push('contrato_faltante:' + name);
    });
    if (deps && deps.environmentProvider && typeof deps.environmentProvider.describePublicConfig !== 'function') errors.push('environment_provider_invalido');
    if (deps && deps.firebaseAdapter && typeof deps.firebaseAdapter.initializeFromEnvironment !== 'function') errors.push('firebase_adapter_invalido');
    if (deps && deps.authProvider && typeof deps.authProvider.waitForAuthenticatedUser !== 'function') errors.push('auth_provider_invalido');
    if (deps && deps.membershipProvider && typeof deps.membershipProvider.getByUid !== 'function') errors.push('membership_provider_invalido');
    return errors;
  }

  function normalizeMembership(input) {
    var owner = window.Orbit.membershipMultirolEffectiveP0;
    return owner && owner.normalize ? owner.normalize(input) : clone(input || {});
  }

  function deriveTenantFromMembership(membership) {
    var normalized = normalizeMembership(membership);
    var tenantId = text(normalized.tenantId);
    var paths = window.Orbit.tenantCanonicalPathsP0;
    var validation = paths && paths.validateTenantId ? paths.validateTenantId(tenantId) : { ok: false, errors: ['contrato_rutas_faltante'] };
    if (!validation.ok || !validation.tenantId) {
      var error = new Error('tenant_membership_invalido');
      error.code = 'TENANT_MEMBERSHIP_INVALID';
      error.details = validation.errors || [];
      throw error;
    }
    return validation.tenantId;
  }

  function validateMembershipForUser(membership, authUser) {
    var owner = window.Orbit.membershipMultirolEffectiveP0;
    var check = owner && owner.validate ? owner.validate(membership) : { ok: false, errors: ['contrato_membresia_faltante'] };
    var normalized = check.membership || normalizeMembership(membership);
    var errors = (check.errors || []).slice();
    if (text(normalized.uid) !== text(authUser && authUser.uid)) errors.push('membership_uid_no_coincide');
    if (text(normalized.status).toLowerCase() !== 'active') errors.push('membership_inactiva');
    if (!normalized.activeRole || normalized.roles.indexOf(normalized.activeRole) < 0) errors.push('membership_rol_activo_invalido');
    return { ok: errors.length === 0, membership: normalized, errors: unique(errors) };
  }

  function authProjection(authUser, membership) {
    return {
      uid: text(authUser && authUser.uid),
      email: text(authUser && authUser.email).toLowerCase(),
      emailVerified: authUser && authUser.emailVerified === true,
      tenantId: text(membership.tenantId),
      roles: (membership.roles || []).slice(),
      defaultRole: text(membership.defaultRole),
      activeRole: text(membership.activeRole),
      countries: (membership.countries || []).slice(),
      advisorId: text(membership.advisorId),
      teamId: text(membership.teamId),
      dataScopes: clone(membership.dataScopes || {}),
      modulesExtra: (membership.modulesExtra || []).slice(),
      modulesRestricted: (membership.modulesRestricted || []).slice(),
      productReadOnly: true
    };
  }

  function installAuthProjection(projection) {
    window.Orbit.auth = window.Orbit.auth || {};
    window.Orbit.auth.productUser = clone(projection);
    window.Orbit.auth.user = function () { return clone(window.Orbit.auth.productUser); };
  }

  function waitForStoreReady(store, timeoutMs) {
    var timeout = Number(timeoutMs) > 0 ? Number(timeoutMs) : DEFAULT_SNAPSHOT_TIMEOUT_MS;
    var startedAt = Date.now();
    return new Promise(function (resolve, reject) {
      function inspect() {
        var status = store && typeof store._productStatus === 'function' ? store._productStatus() : {};
        if (status.ready === true && status.status === 'ready-read-only') return resolve(status);
        if (status.status === 'snapshot-error' || status.status === 'attach-error' || status.status === 'blocked-tenant' || status.status === 'blocked-no-collections' || status.status === 'blocked-no-database') {
          return reject(new Error('product_store_blocked:' + text(status.status)));
        }
        if (Date.now() - startedAt >= timeout) return reject(new Error('product_store_readiness_timeout'));
        setTimeout(inspect, 100);
      }
      inspect();
    });
  }

  function buildPlan(input) {
    input = input || {};
    var errors = [];
    if (input.authorizedProductReadOnly !== true) errors.push('autorizacion_readonly_faltante');
    if (text(input.mode).toLowerCase() !== 'product') errors.push('modo_productivo_requerido');
    if (!Array.isArray(input.collections) || !input.collections.length) errors.push('colecciones_requeridas_faltantes');
    errors = errors.concat(dependencyErrors(input.dependencies || {}));
    return {
      ok: errors.length === 0,
      readyForExecution: errors.length === 0,
      version: VERSION,
      mode: 'product',
      tenantSource: TENANT_SOURCE,
      queryStringTenantAllowed: false,
      autoStart: false,
      writeAuthorized: false,
      runtimeAuthorized: input.runtimeAuthorized === true,
      collections: unique(input.collections),
      errors: unique(errors),
      steps: errors.length ? [] : [
        'describe_public_environment',
        'initialize_from_environment_provider',
        'wait_authenticated_user',
        'resolve_membership_by_uid',
        'derive_tenant_from_membership',
        'canonicalize_roles_and_scopes',
        'compile_tenant_scoped_queries',
        'install_product_readonly_store',
        'attach_allowed_snapshots',
        'wait_store_ready_read_only',
        'emit_sanitized_readiness'
      ]
    };
  }

  async function start(deps, options) {
    options = options || {};
    var plan = buildPlan({
      authorizedProductReadOnly: options.authorizedProductReadOnly,
      mode: options.mode,
      collections: options.collections,
      dependencies: deps,
      runtimeAuthorized: options.runtimeAuthorized
    });
    var state = createState();
    var storeInstalled = false;
    var snapshotsAttached = false;
    state.collections = plan.collections.slice();
    if (!plan.ok || options.runtimeAuthorized !== true) {
      state.errors = unique(plan.errors.concat(options.runtimeAuthorized === true ? [] : ['runtime_productivo_no_autorizado']));
      transition(state, 'blocked', { ready: false });
      return { ok: false, ready: false, plan: plan, status: sanitizeState(state), storeInstalled: false, snapshotsAttached: false, writeAuthorized: false };
    }

    try {
      transition(state, 'environment');
      var configInfo = await deps.environmentProvider.describePublicConfig();
      var firebaseContext = await deps.firebaseAdapter.initializeFromEnvironment(deps.environmentProvider);
      transition(state, 'authentication');
      var authUser = await deps.authProvider.waitForAuthenticatedUser(firebaseContext);
      transition(state, 'membership');
      var membershipRaw = await deps.membershipProvider.getByUid(text(authUser && authUser.uid), firebaseContext);
      var membershipCheck = validateMembershipForUser(membershipRaw, authUser);
      if (!membershipCheck.ok) throw new Error('membership_invalid:' + membershipCheck.errors.join('|'));
      var membership = membershipCheck.membership;
      var tenantId = deriveTenantFromMembership(membership);
      state.tenantId = tenantId;
      state.activeRole = membership.activeRole;
      state.assignedRoles = membership.roles.slice();
      state.countries = membership.countries.slice();

      transition(state, 'planning');
      var accessPolicy = window.Orbit.tenantAccessPolicyProductP0;
      var queryPlanner = window.Orbit.productQueryPlannerP0.createPlanner(membership, { accessPolicy: accessPolicy });
      var storeDeps = typeof deps.firebaseAdapter.storeDependencies === 'function'
        ? deps.firebaseAdapter.storeDependencies(firebaseContext)
        : { db: firebaseContext && firebaseContext.db };
      var store = window.Orbit.createFirestoreProductReadOnlyStoreP0(storeDeps, {
        tenantId: tenantId,
        collections: plan.collections,
        queryPlanner: queryPlanner,
        paths: window.Orbit.tenantCanonicalPathsP0
      });
      var projection = authProjection(authUser, membership);
      var readiness = window.Orbit.backendProductReadinessP0.readiness({
        mode: 'product',
        tenantId: tenantId,
        firebaseConfigInfo: configInfo,
        authUser: authUser,
        membership: membership,
        store: store,
        storeMetadata: store._productStatus ? store._productStatus() : {},
        pathContractVersion: window.Orbit.tenantCanonicalPathsP0.VERSION,
        accessPolicyVersion: accessPolicy.VERSION
      });
      if (!readiness.ok) throw new Error('product_readiness_blocked:' + readiness.errors.join('|'));

      transition(state, 'installing');
      window.Orbit.store = store;
      storeInstalled = true;
      installAuthProjection(projection);
      snapshotsAttached = store._attachSnapshots() !== false;
      if (!snapshotsAttached) throw new Error('snapshots_no_adjuntos');
      transition(state, 'waiting-snapshots', { ready: false, errors: [] });
      await waitForStoreReady(store, options.snapshotTimeoutMs);
      transition(state, 'ready-read-only', { ready: true, errors: [] });
      return {
        ok: true,
        ready: true,
        plan: plan,
        readiness: readiness,
        status: sanitizeState(state),
        storeInstalled: true,
        snapshotsAttached: true,
        writeAuthorized: false
      };
    } catch (error) {
      state.errors = unique(state.errors.concat([String(error && (error.message || error) || error)]));
      transition(state, 'blocked', { ready: false });
      return { ok: false, ready: false, plan: plan, status: sanitizeState(state), storeInstalled: storeInstalled, snapshotsAttached: snapshotsAttached, writeAuthorized: false };
    }
  }

  window.Orbit.backendProductReadOnlyBootstrapP0 = Object.freeze({
    VERSION: VERSION,
    TENANT_SOURCE: TENANT_SOURCE,
    REQUIRED_DEPENDENCIES: REQUIRED_DEPENDENCIES,
    REQUIRED_CONTRACTS: REQUIRED_CONTRACTS,
    WRITE_AUTHORIZED: WRITE_AUTHORIZED,
    DEFAULT_SNAPSHOT_TIMEOUT_MS: DEFAULT_SNAPSHOT_TIMEOUT_MS,
    buildPlan: buildPlan,
    deriveTenantFromMembership: deriveTenantFromMembership,
    validateMembershipForUser: validateMembershipForUser,
    authProjection: authProjection,
    waitForStoreReady: waitForStoreReady,
    start: start,
    autoStart: false,
    queryStringTenantAllowed: false,
    noFallback: true,
    writesAuthorized: false
  });
})();
