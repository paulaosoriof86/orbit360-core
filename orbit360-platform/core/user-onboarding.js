/* ============================================================
   Orbit 360 · Onboarding seguro del equipo
   - Adaptador de UI para el ejecutor protegido Admin SDK.
   - No crea usuarios privilegiados desde el navegador.
   - No genera, muestra ni persiste contraseñas temporales.
   - La invitación usa el flujo estándar de establecimiento de contraseña.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.userOnboarding = (function () {
  'use strict';

  const FUNCTION_NAME = 'orbit360ProvisionTeamAccess';
  const DEFAULT_REGION = 'us-central1';

  function text(value) { return String(value == null ? '' : value).trim(); }
  function backend() { return window.OrbitBackend || {}; }
  function provider() { return Orbit.productRuntimeBrowserProvidersP0 || null; }
  function productUser() { return Orbit.auth && Orbit.auth.productUser || null; }
  function tenantId() {
    const user = productUser();
    const configured = window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__ || {};
    return text(user && user.tenantId || configured.tenantHint || backend().tenantId || backend().tenant);
  }
  function isFirestoreRuntime() {
    const p = provider();
    return !!tenantId() && !!(p && p.serverWriteTransport === 'firebase-functions' && p.noFallback === true && typeof p.initialize === 'function' && typeof p.callFunction === 'function');
  }
  function actor() {
    try { return Orbit.auth && typeof Orbit.auth.user === 'function' ? Orbit.auth.user() || {} : {}; }
    catch (error) { return {}; }
  }
  function available() {
    const p = provider();
    const user = productUser();
    return isFirestoreRuntime() && !!(p && user && text(user.uid) && text(user.tenantId));
  }
  function friendly(code, details) {
    const error = new Error(code || 'ONBOARDING_FAILED');
    error.code = code || 'ONBOARDING_FAILED';
    error.details = details || null;
    return error;
  }
  function errorCode(payload, response) {
    const status = text(payload && payload.error && payload.error.status).toLowerCase();
    const message = text(payload && payload.error && payload.error.message);
    if (status) return status;
    if (message) return message;
    return `http_${response && response.status || 0}`;
  }
  async function call(payload) {
    if (!available()) throw friendly('ONBOARDING_BACKEND_UNAVAILABLE');
    const p = provider();
    try {
      const result = await p.callFunction(FUNCTION_NAME, payload, text(backend().functionsRegion || DEFAULT_REGION));
      if (!result || result.ok !== true) throw friendly('ONBOARDING_INVALID_RESPONSE');
      return result;
    } catch (error) {
      const code = text(error && (error.code || error.message) || 'ONBOARDING_FAILED');
      const wrapped = friendly(code.replace(/^functions\//, ''), error && error.details || null);
      wrapped.cause = error;
      throw wrapped;
    }
  }
  function resetContinueUrl() {
    const origin = location.origin;
    const tenant = encodeURIComponent(tenantId());
    return `${origin}/index.html?orbitBackend=firestore-lab&tenant=${tenant}#/inicio`;
  }
  async function sendInvitation(email) {
    const target = text(email).toLowerCase();
    if (!target) throw friendly('INVITATION_EMAIL_REQUIRED');
    const p = provider();
    if (!p || typeof p.initialize !== 'function') throw friendly('AUTH_NOT_AVAILABLE');
    const ctx = await p.initialize();
    if (!ctx || !ctx.auth || !ctx.modules || !ctx.modules.auth || typeof ctx.modules.auth.sendPasswordResetEmail !== 'function') throw friendly('AUTH_NOT_AVAILABLE');
    await ctx.modules.auth.sendPasswordResetEmail(ctx.auth, target, { url: resetContinueUrl(), handleCodeInApp: false });
    return true;
  }
  async function execute(options) {
    options = options || {};
    const currentActor = actor();
    const payload = {
      tenantId: tenantId(),
      advisorId: text(options.advisorId),
      advisor: options.advisor || {},
      operation: text(options.operation || 'provision'),
      reason: text(options.reason),
      confirmScopeAll: options.confirmScopeAll === true,
      activeRole: text(currentActor.rol || currentActor.activeRole)
    };
    const result = await call(payload);
    if (result.requiresPasswordSetup === true && result.invitationState === 'pending_delivery' && options.sendInvitation !== false) {
      try {
        await sendInvitation(options.advisor && options.advisor.email);
        return await call({
          tenantId: payload.tenantId,
          advisorId: payload.advisorId,
          advisor: payload.advisor,
          operation: 'mark_invitation_sent',
          requestId: result.requestId,
          reason: 'Invitación enviada mediante Firebase Auth',
          activeRole: payload.activeRole
        });
      } catch (error) {
        return Object.assign({}, result, {
          invitationState: 'pending_delivery',
          invitationDeliveryFailed: true,
          invitationDeliveryCode: text(error && error.code || 'INVITATION_SEND_FAILED')
        });
      }
    }
    return result;
  }
  function status(record) {
    record = record || {};
    const state = text(record.onboardingState || record.accessState || record.membershipStatus || '').toLowerCase();
    const invitation = text(record.invitacionEstado || record.invitationState || '').toLowerCase();
    if (record.inactivo || record.activo === false || state === 'blocked' || invitation === 'bloqueada') {
      return { id: 'blocked', label: 'Bloqueado', tone: 'neutral', detail: 'No puede iniciar sesión' };
    }
    if (state === 'error') return { id: 'error', label: 'Requiere atención', tone: 'danger', detail: 'El alta no terminó correctamente' };
    if (state === 'provisioning') return { id: 'provisioning', label: 'Habilitando', tone: 'info', detail: 'Creando o vinculando acceso' };
    if (record.accessProvisioned === true && record.authDisabled !== true && ['active', 'activo'].includes(state || 'active') && record.authEmailVerified !== false) {
      return { id: 'active', label: 'Activo', tone: 'ok', detail: 'Auth, membresía y correo verificado' };
    }
    if (record.accessProvisioned === true && record.authDisabled !== true && record.authEmailVerified === false) {
      return { id: 'verification_pending', label: 'Verificación pendiente', tone: 'warn', detail: 'Debe verificar su correo para iniciar sesión' };
    }
    if (state === 'invited' || invitation === 'enviada') return { id: 'invited', label: 'Invitación enviada', tone: 'info', detail: 'Debe completar la activación de su acceso' };
    if (invitation === 'pendiente_envio') return { id: 'pending_delivery', label: 'Invitación pendiente', tone: 'warn', detail: 'El acceso existe; falta enviar la invitación' };
    return { id: 'pending', label: 'Sin acceso', tone: 'warn', detail: 'Registro de equipo sin Auth/membresía vinculados' };
  }
  function message(error) {
    const code = text(error && error.code).toLowerCase();
    if (/permission|denied/.test(code)) return 'Tu rol activo no permite administrar accesos.';
    if (/unauthenticated/.test(code)) return 'La sesión venció. Ingresa nuevamente.';
    if (/email|correo/.test(code)) return 'Revisa el correo configurado para este usuario.';
    if (/scope|alcance|failed-precondition/.test(code)) return 'La configuración requiere validación antes de habilitar el acceso.';
    if (/backend|project|http_404/.test(code)) return 'El servicio de acceso todavía no está publicado.';
    if (/too-many|quota|resource-exhausted/.test(code)) return 'El servicio de acceso está temporalmente limitado.';
    return 'No fue posible completar el acceso. La configuración no se aplicó parcialmente.';
  }

  return {
    available,
    execute,
    status,
    message,
    sendInvitation,
    _call: call
  };
})();
