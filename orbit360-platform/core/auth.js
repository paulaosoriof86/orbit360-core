/* ============================================================
   Orbit 360 · Auth canónico por membresía v1.80
   - Demo/local separado del runtime Firestore.
   - En Firestore acepta cualquier identidad Firebase con membresía
     activa en tenants/{tenantId}/members/{uid}.
   - Roles, advisorId, países y scopes provienen de la membresía.
   - No contiene usuario técnico ni fuerza Dirección/Paula.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.auth = (function () {
  'use strict';

  const KEY = 'orbit360_session';
  const CKEY = 'orbit360_confidencialidad';
  const DEMO_EMAIL = 'admin@demo.com';
  const DEMO_PASS = 'demo123';
  let authBound = false;
  let formBound = false;
  let membershipGeneration = 0;

  function text(value) { return String(value == null ? '' : value).trim(); }
  function isFirestoreRuntime() {
    try {
      const q = new URLSearchParams(location.search || '');
      return q.get('orbitBackend') === 'firestore-lab' || !!(window.OrbitBackend && String(OrbitBackend.mode || '').indexOf('firestore') >= 0);
    } catch (error) { return false; }
  }
  function tenantId() {
    try {
      const q = new URLSearchParams(location.search || '');
      return text(q.get('tenant') || (window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant)));
    } catch (error) { return ''; }
  }
  function fbAuth() {
    try { return window.firebase && typeof firebase.auth === 'function' ? firebase.auth() : null; }
    catch (error) { return null; }
  }
  function fbUser() {
    const auth = fbAuth();
    return auth && auth.currentUser ? auth.currentUser : null;
  }
  function projection() {
    try { return window.Orbit && Orbit.auth && Orbit.auth.productUser || null; }
    catch (error) { return null; }
  }
  function activeProjection(user) {
    const p = projection();
    const status = text(p && p.status).toLowerCase();
    if (!user || !p || p.productReadOnly !== true || p.__labMembershipProjection !== true) return null;
    if (text(p.uid) !== text(user.uid)) return null;
    if (!tenantId() || text(p.tenantId) !== tenantId()) return null;
    if (status !== 'active' && status !== 'activo') return null;
    if (!Array.isArray(p.roles) || !p.roles.length) return null;
    if (!p.activeRole || p.roles.indexOf(p.activeRole) < 0) return null;
    return p;
  }
  function roleLabel(role) {
    if (role === 'SuperAdmin') return 'Dirección';
    if (role === 'AdminTenant') return 'Administración';
    return text(role) || 'Acceso autorizado';
  }
  function mapUser(user) {
    if (!user) return null;
    const p = activeProjection(user);
    if (isFirestoreRuntime() && !p) return null;
    return {
      nombre: text(user.displayName) || text(user.email) || 'Usuario',
      rol: p ? p.activeRole : 'Dirección',
      roles: p ? p.roles.slice() : ['Dirección'],
      email: text(user.email),
      uid: text(user.uid),
      tipo: 'interno',
      backend: p ? 'firestore-membership' : 'demo',
      tenantId: p ? p.tenantId : '',
      advisorId: p ? text(p.advisorId) : '',
      countries: p ? (p.countries || []).slice() : [],
      dataScopes: p ? Object.assign({}, p.dataScopes || {}) : {},
      productReadOnly: !!p
    };
  }
  function setAuthStage(stage) {
    try { document.body.dataset.authStage = stage || ''; } catch (error) {}
  }
  function paintError(message) {
    const box = document.querySelector('.lg-box');
    if (!box) return;
    let el = document.getElementById('login-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'login-error';
      el.className = 'hint error';
      box.appendChild(el);
    }
    el.textContent = message || '';
  }
  function setSubmitting(form, active) {
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');
    form.dataset.submitting = active ? '1' : '0';
    if (!button) return;
    if (!button.dataset.label) button.dataset.label = button.textContent || 'Ingresar al Orbit 360';
    button.disabled = !!active;
    button.textContent = active ? 'Validando acceso…' : button.dataset.label;
  }
  function friendlyError(error) {
    const code = text(error && (error.code || error.message));
    if (code === 'AUTH_EMAIL_REQUIRED') return 'Ingresa el correo asignado a tu usuario.';
    if (code === 'AUTH_PASSWORD_REQUIRED') return 'Ingresa la contraseña asignada para continuar.';
    if (code === 'MEMBERSHIP_REQUIRED') return 'Tu usuario no tiene una membresía activa para esta organización.';
    if (/auth\/(invalid-credential|wrong-password|user-not-found)/i.test(code)) return 'El usuario o la contraseña asignados no son válidos.';
    if (/auth\/network-request-failed/i.test(code)) return 'No fue posible conectar con el servicio de acceso. Revisa la conexión y vuelve a intentarlo.';
    if (/auth\/too-many-requests/i.test(code)) return 'El acceso está temporalmente limitado por varios intentos. Espera unos minutos y vuelve a intentarlo.';
    if (/auth\/unauthorized-domain/i.test(code)) return 'Este dominio todavía no está autorizado para iniciar sesión.';
    return 'No fue posible iniciar sesión. Intenta nuevamente.';
  }
  function withTimeout(promise, milliseconds, code) {
    let timer;
    const timeout = new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        const error = new Error(code || 'TIMEOUT');
        error.code = code || 'TIMEOUT';
        reject(error);
      }, milliseconds);
    });
    return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
  }
  async function configurePersistence(auth) {
    if (!auth || typeof auth.setPersistence !== 'function') return;
    let persistence = null;
    try { persistence = firebase.auth.Auth.Persistence; } catch (error) { persistence = null; }
    if (!persistence) return;
    try { await withTimeout(auth.setPersistence(persistence.SESSION), 8000, 'AUTH_PERSISTENCE_TIMEOUT'); }
    catch (error) { await withTimeout(auth.setPersistence(persistence.NONE), 8000, 'AUTH_PERSISTENCE_TIMEOUT'); }
  }
  function membershipStatus() {
    try {
      return Orbit.session && typeof Orbit.session.membershipProjectionStatus === 'function'
        ? Orbit.session.membershipProjectionStatus() || {}
        : {};
    } catch (error) { return {}; }
  }
  function bindMembershipProjection() {
    try {
      if (Orbit.session && typeof Orbit.session.bindLabMembershipProjection === 'function') Orbit.session.bindLabMembershipProjection();
    } catch (error) {}
  }
  function waitForMembership(user, generation) {
    return new Promise((resolve) => {
      let attempts = 0;
      (function poll() {
        if (generation !== membershipGeneration) return resolve(null);
        const p = activeProjection(user);
        if (p) return resolve(p);
        const status = membershipStatus();
        if (status.status === 'blocked') return resolve(null);
        bindMembershipProjection();
        attempts += 1;
        if (attempts >= 180) return resolve(null);
        setTimeout(poll, 100);
      })();
    });
  }
  function paintIdentity(user, p) {
    const top = document.querySelector('.tb-user .who');
    const avatar = document.querySelector('.tb-user .av');
    const display = text(user && user.displayName) || text(user && user.email) || 'Usuario';
    const initials = display.split(/\s+/).filter(Boolean).map((part) => part.charAt(0)).slice(0, 2).join('').toUpperCase() || 'U';
    if (top) {
      const safe = display.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
      top.innerHTML = '<b>' + safe + '</b><br><span id="tb-rol-lbl">' + roleLabel(p.activeRole) + ' · salir</span>';
    }
    if (avatar) avatar.textContent = initials;
    try {
      document.body.dataset.authBackend = 'firestore-membership';
      document.body.dataset.authUid = text(user.uid);
      document.body.dataset.authTenant = text(p.tenantId);
    } catch (error) {}
  }
  function acceptedLegal() {
    try { return !!localStorage.getItem(CKEY); } catch (error) { return false; }
  }
  function legalGate() {
    if (acceptedLegal()) return;
    if (Orbit.legal && typeof Orbit.legal.gate === 'function') {
      const u = user() || {};
      Orbit.legal.gate('interno', 'user:' + (u.uid || u.email || 'unknown'));
    }
  }
  function showLogin(message) {
    const lg = document.getElementById('login');
    if (lg) { lg.style.display = ''; lg.classList.remove('hidden'); }
    document.body.classList.add('pre-auth');
    setAuthStage('login-ready');
    const email = document.getElementById('lg-user');
    const pass = document.getElementById('lg-pass');
    if (isFirestoreRuntime()) {
      if (email && (email.value === DEMO_EMAIL || /@demo\.com$/i.test(email.value || ''))) email.value = '';
      if (pass && pass.value === DEMO_PASS) pass.value = '';
    } else {
      if (email && !email.value) email.value = DEMO_EMAIL;
      if (pass && !pass.value) pass.value = DEMO_PASS;
    }
    paintError(message || '');
    try { if (Orbit.applyBrand) Orbit.applyBrand(); } catch (error) {}
  }
  function showApp() {
    const current = fbUser();
    const p = activeProjection(current);
    if (isFirestoreRuntime() && (!current || !p)) { showLogin('Tu usuario no tiene una membresía activa para esta organización.'); return false; }
    const lg = document.getElementById('login');
    if (lg) { lg.classList.add('hidden'); setTimeout(() => { lg.style.display = 'none'; }, 250); }
    document.body.classList.remove('pre-auth');
    setAuthStage('inside');
    if (current && p) paintIdentity(current, p);
    setTimeout(legalGate, 300);
    return true;
  }
  async function loginFirebase(email, password) {
    const auth = fbAuth();
    if (!auth || typeof auth.signInWithEmailAndPassword !== 'function') throw new Error('AUTH_NOT_AVAILABLE');
    await configurePersistence(auth);
    return withTimeout(auth.signInWithEmailAndPassword(email, password), 25000, 'AUTH_SIGNIN_TIMEOUT');
  }
  async function acceptFirebaseUser(current) {
    const generation = ++membershipGeneration;
    if (!current) { showLogin(); return false; }
    setAuthStage('validating-membership');
    const p = await waitForMembership(current, generation);
    if (generation !== membershipGeneration) return false;
    if (!p) {
      const auth = fbAuth();
      try { if (auth && typeof auth.signOut === 'function') await auth.signOut(); } catch (error) {}
      showLogin('Tu usuario no tiene una membresía activa para esta organización.');
      return false;
    }
    try { if (Orbit.session && typeof Orbit.session.syncFromAuth === 'function') Orbit.session.syncFromAuth(); } catch (error) {}
    paintError('');
    showApp();
    try { if (Orbit.store && typeof Orbit.store._attachSnapshots === 'function') Orbit.store._attachSnapshots(); } catch (error) {}
    setTimeout(() => {
      try {
        if (Orbit.router && typeof Orbit.router.rebuildSidebar === 'function') Orbit.router.rebuildSidebar();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (error) {}
    }, 250);
    return true;
  }
  function bindForm() {
    if (formBound) return;
    const form = document.getElementById('login-form');
    if (!form) return;
    formBound = true;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (form.dataset.submitting === '1') return;
      const emailEl = document.getElementById('lg-user');
      const passEl = document.getElementById('lg-pass');
      const email = text(emailEl && emailEl.value);
      const password = String(passEl && passEl.value || '');
      setSubmitting(form, true);
      paintError('');
      try {
        if (isFirestoreRuntime()) {
          if (!email) throw new Error('AUTH_EMAIL_REQUIRED');
          if (!password) throw new Error('AUTH_PASSWORD_REQUIRED');
          setAuthStage('signing-in');
          await loginFirebase(email, password);
        } else {
          localStorage.setItem(KEY, JSON.stringify({ nombre: 'Andrea Beltrán', rol: 'Dirección', email: email || DEMO_EMAIL }));
          showApp();
        }
      } catch (error) {
        setAuthStage('error');
        showLogin(friendlyError(error));
      } finally {
        setSubmitting(form, false);
      }
    });
  }
  function bindFirebaseAuth() {
    if (authBound || !isFirestoreRuntime()) return authBound;
    const auth = fbAuth();
    if (!auth || typeof auth.onAuthStateChanged !== 'function') return false;
    authBound = true;
    auth.onAuthStateChanged((current) => {
      if (current) acceptFirebaseUser(current);
      else { membershipGeneration += 1; showLogin(); }
    });
    return true;
  }
  function init() {
    bindForm();
    if (!isFirestoreRuntime()) {
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (saved) showApp(); else showLogin();
      } catch (error) { showLogin(); }
      return;
    }
    let attempts = 0;
    (function waitAuth() {
      if (bindFirebaseAuth()) return;
      attempts += 1;
      if (attempts < 120) setTimeout(waitAuth, 100);
      else showLogin('No fue posible inicializar el servicio de acceso.');
    })();
  }
  function logout() {
    membershipGeneration += 1;
    if (isFirestoreRuntime()) {
      try { if (Orbit.store && typeof Orbit.store._detachSnapshots === 'function') Orbit.store._detachSnapshots(); } catch (error) {}
      const auth = fbAuth();
      if (auth && typeof auth.signOut === 'function') auth.signOut().finally(() => location.reload());
      else location.reload();
      return;
    }
    try { localStorage.removeItem(KEY); } catch (error) {}
    location.reload();
  }
  function user() {
    if (isFirestoreRuntime()) return mapUser(fbUser());
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (error) { return null; }
  }
  function authed() {
    if (isFirestoreRuntime()) return !!mapUser(fbUser());
    return !!user();
  }

  const api = { init, authed, loginFirebase, logout, user, showLogin, showApp };
  return api;
})();
