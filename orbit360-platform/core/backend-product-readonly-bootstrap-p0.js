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

  // B4-003 scoped-only resolution of a stale static module visibility check.
  // The effective module gate and the server callable must BOTH authorize.
  // Never promote a denied/foreign scope or a malformed tenant plan.
  function protectedReadRolePlan(collection, membership, selected, compiled) {
    var moduleKey = collection === 'negocios' ? 'leads' :
      collection === 'gestiones' ? 'ops' : '';
    if(!moduleKey || String(selected||'').toLowerCase() !== 'operativo' ||
       !compiled || compiled.ok !== false) return compiled;
    var errors = Array.isArray(compiled.errors) ? compiled.errors : [];
    if(errors.length !== 1 || errors[0] !== 'modulo_no_visible' ||
       compiled.module !== moduleKey ||
       ['own','team','all'].indexOf(String(compiled.scope||'')) < 0) return compiled;
    var constraints = Array.isArray(compiled.constraints) ? compiled.constraints : [];
    var tenant = constraints.filter(function(c){return c&&c.field==='tenantId'&&
      c.op==='=='&&c.value===membership.tenantId;});
    if(tenant.length!==1 || constraints.some(function(c){return c&&c.field==='__deny__';}))
      return compiled;
    var access=window.Orbit&&window.Orbit.access;
    if(!access||typeof access.can!=='function'||
       access.can(moduleKey,'view')!==true) return compiled;
    // This plan is still used solely to request the independently scoped
    // Preview callable; it is not an access grant or a Firestore Rules bypass.
    return Object.assign({},compiled,{ok:true,errors:[],
      protectedReadAuthorization:'EFFECTIVE_MODULE_VIEW_PLUS_SERVER_SCOPED_CALLABLE'});
  }
  // Every assigned role needs its own effective-module projection.
  // Never carry old Dirección/Operativo modules into Asesor or vice versa.
  // Server callable and query scope enforce permissions independently.
  function protectedRoleMembership(membership, selected) {
    var member = Object.assign({}, membership || {}, { activeRole: selected });
    var owner = window.Orbit && window.Orbit.membershipMultirolEffectiveP0;
    var modules = owner && typeof owner.effectiveModules === 'function'
      ? owner.effectiveModules(member) : null;
    // A missing evaluator never grants broad access.
    member.modulesVisible = Array.isArray(modules) ? modules.slice() : [];
    return member;
  }
  // B4_003_PROTECTED_ROLE_QUERY_PARITY_END

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
      failurePhase: '',
      failureCode: '',
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
      // These values come from our own finite state machine, never from an
      // untrusted server error, membership document or user identity.
      failurePhase: text(state.failurePhase),
      failureCode: text(state.failureCode),
      // The bootstrap event is also observed by the browser QA harness.
      // Backend exception text must never be projected into that event.
      errors: state.phase === 'blocked' ? [text(state.failureCode) || 'BOOTSTRAP_FAILED'] : unique(state.errors),
      lastTransitionAt: state.lastTransitionAt
    };
  }

  function safeFailureCode(error, phase) {
    var message = text(error && (error.message || error));
    if (message === 'product_store_readiness_timeout') return 'STORE_READINESS_TIMEOUT';
    if (message === 'product_store_blocked:snapshot-error') return 'STORE_SNAPSHOT_ERROR';
    if (message === 'product_store_blocked:attach-error') return 'STORE_ATTACH_ERROR';
    if (message.indexOf('product_store_blocked:') === 0) return 'STORE_BLOCKED';
    if (message.indexOf('membership_invalid:') === 0 || message === 'tenant_membership_invalido')
      return 'MEMBERSHIP_REJECTED';
    if (message.indexOf('product_readiness_blocked:') === 0) return 'READINESS_CONTRACT_REJECTED';
    if (message === 'PROTECTED_READ_PROVIDER_MISSING') return 'PROTECTED_PROVIDER_MISSING';
    if (message === 'snapshots_no_adjuntos') return 'SNAPSHOTS_NOT_ATTACHED';
    // A finite allowlist prevents leaking Firebase messages, emails, UIDs,
    // document paths, auth tokens or other personal information to console.
    var stages = {
      environment: 'ENVIRONMENT_FAILED', authentication: 'AUTHENTICATION_FAILED',
      membership: 'MEMBERSHIP_FAILED', planning: 'PLANNING_FAILED',
      attaching: 'ATTACHING_FAILED', 'waiting-snapshots': 'SNAPSHOT_READ_FAILED',
      installing: 'INSTALLING_FAILED'
    };
    return stages[phase] || 'BOOTSTRAP_FAILED';
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
    var membershipEmail = text(normalized.email).toLowerCase();
    var authEmail = text(authUser && authUser.email).toLowerCase();
    if (text(normalized.uid) !== text(authUser && authUser.uid)) errors.push('membership_uid_no_coincide');
    if (membershipEmail && membershipEmail !== authEmail) errors.push('membership_email_no_coincide');
    if (text(normalized.status).toLowerCase() !== 'active') errors.push('membership_inactiva');
    if (!normalized.activeRole || normalized.roles.indexOf(normalized.activeRole) < 0) errors.push('membership_rol_activo_invalido');
    normalized.modulesVisible = owner && typeof owner.effectiveModules === 'function'
      ? owner.effectiveModules(normalized)
      : [];
    return { ok: errors.length === 0, membership: normalized, errors: unique(errors) };
  }

  function authProjection(authUser, membership) {
    return {
      uid: text(authUser && authUser.uid),
      email: text(authUser && authUser.email).toLowerCase(),
      nombre: text(membership.nombre || membership.displayName || membership.name || (authUser && authUser.displayName) || (authUser && authUser.email) || ''),
      displayName: text(membership.displayName || membership.nombre || membership.name || (authUser && authUser.displayName) || (authUser && authUser.email) || ''),
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
      modulesVisible: (membership.modulesVisible || []).slice(),
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
        'create_product_readonly_store',
        'attach_allowed_snapshots',
        'wait_store_ready_read_only',
        'install_product_readonly_store',
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
    var store = null;
    var snapshotsAttached = false;
    state.collections = plan.collections.slice();
    if (!plan.ok || options.runtimeAuthorized !== true) {
      state.errors = unique(plan.errors.concat(options.runtimeAuthorized === true ? [] : ['runtime_productivo_no_autorizado']));
      state.failurePhase = 'preflight';
      state.failureCode = 'BOOTSTRAP_PREFLIGHT_REJECTED';
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
      if(options.protectedReadCandidate===true){
        queryPlanner=function(collection){
          // Read-scoped roles are not frozen at bootstrap: regenerate constraints per role.
          var selected=text(membership.activeRole);
          try{var s=window.Orbit.session;if(s&&typeof s.rol==='function')selected=text(s.rol())||selected;}catch(_){}
          var norm=function(v){return text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_');};
          if(!(membership.roles||[]).some(function(r){return norm(r)===norm(selected);}))
            return {ok:false,hardError:true,constraints:[],errors:['PROTECTED_ROLE_NOT_ASSIGNED']};
          var compiled=window.Orbit.productQueryPlannerP0.compile(collection,
            protectedRoleMembership(membership,selected),{accessPolicy:accessPolicy});
          return protectedReadRolePlan(collection,membership,selected,compiled);
        };
      }
      // A protected Preview must never pass Firestore references, query helpers
      // or snapshot callbacks to the product store. This is an explicit
      // transport boundary, not a best-effort preference inside attach().
      // Legacy direct-read dependencies remain available only to the existing
      // unprotected channel until the shared rules migration is certified.
      var storeDeps;
      if(options.protectedReadCandidate===true){
        if(typeof deps.protectedReadPage!=='function')throw new Error('PROTECTED_READ_PROVIDER_MISSING');
        storeDeps={protectedReadPage:deps.protectedReadPage};
      }else{
        storeDeps=typeof deps.firebaseAdapter.storeDependencies==='function'
          ?deps.firebaseAdapter.storeDependencies(firebaseContext)
          :{db:firebaseContext&&firebaseContext.db};
      }
      store = window.Orbit.createFirestoreProductReadOnlyStoreP0(storeDeps, {
        tenantId: tenantId,
        membership: membership,
        protectedReadCandidate: options.protectedReadCandidate===true,
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

      transition(state, 'attaching');
      snapshotsAttached = store._attachSnapshots() !== false;
      if (!snapshotsAttached) throw new Error('snapshots_no_adjuntos');
      transition(state, 'waiting-snapshots', { ready: false, errors: [] });
      await waitForStoreReady(store, options.snapshotTimeoutMs);

      transition(state, 'installing');
      window.Orbit.store = store;
      installAuthProjection(projection);
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
      if (store && typeof store._detachSnapshots === 'function') {
        try { store._detachSnapshots(); } catch (detachError) {}
      }
      state.failurePhase = state.phase;
      state.failureCode = safeFailureCode(error, state.phase);
      state.errors = unique(state.errors.concat([String(error && (error.message || error) || error)]));
      transition(state, 'blocked', { ready: false });
      return { ok: false, ready: false, plan: plan, status: sanitizeState(state), storeInstalled: false, snapshotsAttached: false, writeAuthorized: false };
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
