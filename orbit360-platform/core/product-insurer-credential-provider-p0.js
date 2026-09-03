/* ============================================================
   Gravicentra Insurance · Product insurer credential provider P0
   Adapter only: secureResources -> product callable.
   - No direct Firestore writes.
   - No LAB callable/provider reuse.
   - No secret persistence/cache/logging in browser.
   - Backend callable remains authoritative for membership, role and vault.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (Orbit.productInsurerCredentialProviderP0) return;

  const VERSION = 'gravicentra-product-insurer-credential-provider-p0-v1';
  const CALLABLE = 'orbit360ProductInsurerCredentialCommand';
  const REF_RE = /^cred_[a-f0-9]{32}$/;
  const text = (v, max) => String(v == null ? '' : v).trim().slice(0, max || 800);

  function runtime() {
    const r = Orbit.productRuntimeBrowserProvidersP0;
    if (!r || typeof r.callFunction !== 'function') throw new Error('PRODUCT_FUNCTION_RUNTIME_UNAVAILABLE');
    return r;
  }

  function access() {
    const a = Orbit.aseguradorasOperationalAccess;
    if (!a || typeof a.canViewCredentials !== 'function') throw new Error('INSURER_CREDENTIAL_ACCESS_POLICY_UNAVAILABLE');
    return a;
  }

  function tenantId() {
    let id = '';
    try { id = text(Orbit.tenant && (Orbit.tenant.id || Orbit.tenant.tenantId), 63); } catch (e) {}
    if (!id) {
      try {
        const c = Orbit.secureResources && Orbit.secureResources.context ? Orbit.secureResources.context() : null;
        id = text(c && c.tenantId, 63);
      } catch (e) {}
    }
    if (!id) {
      try {
        const c = Orbit.productTenantRuntimeContextBridgeP0 && Orbit.productTenantRuntimeContextBridgeP0.context ? Orbit.productTenantRuntimeContextBridgeP0.context() : null;
        id = text(c && (c.tenantId || c.tenant), 63);
      } catch (e) {}
    }
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(id)) throw new Error('PRODUCT_TENANT_CONTEXT_UNAVAILABLE');
    return id;
  }

  function activeRole() {
    try { return text(Orbit.session && Orbit.session.rol && Orbit.session.rol(), 80); } catch (e) { return ''; }
  }

  function targetFor(ref) {
    if (!REF_RE.test(text(ref, 80))) return null;
    try {
      const rows = Orbit.store && Orbit.store.all ? (Orbit.store.all('aseguradoras') || []) : [];
      for (const insurer of rows) {
        const portals = Array.isArray(insurer && insurer.portales) ? insurer.portales : [];
        for (let i = 0; i < portals.length; i += 1) {
          if (text(portals[i] && portals[i].credentialRef, 80) === ref) {
            return { insurerId: text(insurer.id, 160), portalIndex: i };
          }
        }
      }
    } catch (e) {}
    return null;
  }

  function localStatus(ref, extra) {
    const a = access();
    const r = text(ref, 80);
    if (!REF_RE.test(r)) return { status:'no_disponible', available:false, revealAvailable:false, copyAvailable:false, requiresReauth:true, message:'Referencia de acceso inválida' };
    if (!a.canViewCredentials()) return { status:'restringido', available:false, revealAvailable:false, copyAvailable:false, requiresReauth:true, message:'El rol activo no permite consultar credenciales' };
    const target = targetFor(r);
    if (!target || !target.insurerId) return { status:'no_disponible', available:false, revealAvailable:false, copyAvailable:false, requiresReauth:true, message:'Referencia segura no vinculada al directorio cargado' };
    try { runtime(); } catch (e) { return { status:'pendiente_conexion', available:false, revealAvailable:false, copyAvailable:false, requiresReauth:true, message:'Conexión segura no disponible' }; }
    return {
      status:'disponible',
      available:true,
      revealAvailable:true,
      copyAvailable:typeof a.canCopyCredentials === 'function' ? a.canCopyCredentials() === true : false,
      requiresReauth:true,
      message:'Acceso protegido disponible',
      insurerId:target.insurerId
    };
  }

  async function command(operation, ref, extra) {
    const r = text(ref, 80);
    const a = access();
    const ctx = extra || {};
    if (!REF_RE.test(r)) return { ok:false, status:'no_disponible', message:'Referencia de acceso inválida' };
    if (!a.canViewCredentials()) return { ok:false, status:'restringido', message:'El rol activo no permite consultar credenciales' };
    if (operation === 'copy' && (typeof a.canCopyCredentials !== 'function' || a.canCopyCredentials() !== true)) return { ok:false, status:'restringido', message:'El rol activo no permite copiar credenciales' };
    const target = targetFor(r);
    const insurerId = text(ctx.insurerId || (target && target.insurerId), 160);
    if (!target || !insurerId || insurerId !== target.insurerId) return { ok:false, status:'no_disponible', message:'La referencia segura no corresponde a la aseguradora cargada' };
    const role = activeRole();
    if (!role) return { ok:false, status:'restringido', message:'Rol activo no disponible' };
    const result = await runtime().callFunction(CALLABLE, {
      operation,
      tenantId:tenantId(),
      activeRole:role,
      credentialRef:r,
      insurerId
    });
    const out = result && result.data ? result.data : (result || {});
    if (!out || out.ok !== true || typeof out.value !== 'string') return { ok:false, status:text(out && out.status, 80) || 'no_disponible', message:'No fue posible recuperar el acceso' };
    return { ok:true, status:'disponible', value:out.value, expiresInMs:Number(out.expiresInMs) || 6000, containsSecrets:true };
  }

  const provider = Object.freeze({
    status: localStatus,
    reveal: (ref, extra) => command('reveal', ref, extra),
    copy: (ref, extra) => command('copy', ref, extra)
  });

  if (!Orbit.secureResources || typeof Orbit.secureResources.registerCredentialProvider !== 'function') throw new Error('SECURE_RESOURCE_CONTRACT_UNAVAILABLE');
  Orbit.secureResources.registerCredentialProvider(provider);
  Orbit.productInsurerCredentialProviderP0 = Object.freeze({
    VERSION,
    callable:CALLABLE,
    providerRegistered:true,
    persistentSecrets:false,
    browserSecretCache:false,
    directFirestoreWrites:false,
    status:function () {
      let secure = {};
      try { secure = Orbit.secureResources.selfTest ? Orbit.secureResources.selfTest() : {}; } catch (e) {}
      return { version:VERSION, providerRegistered:secure.credentialProvider === true, callable:CALLABLE, persistentSecrets:false, browserSecretCache:false, directFirestoreWrites:false };
    }
  });
})();
