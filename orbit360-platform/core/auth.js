/* ============================================================
   Orbit 360 · Auth
   Demo/local por defecto. Firebase Auth solo en ?orbitBackend=firestore-lab.
   Login white-label: marca de producto Orbit 360, palette-adaptive,
   slot de logo del cliente. NO usa branding A&S.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.auth = (function () {
  const KEY = 'orbit360_session';
  const CKEY = 'orbit360_confidencialidad';
  const DEMO_EMAIL = 'admin@demo.com';
  const DEMO_PASS = 'demo123';
  const LAB_EMAIL = 'orbit.lab@demo.com';

  function isLab() {
    try {
      const q = new URLSearchParams(location.search || '');
      return q.get('orbitBackend') === 'firestore-lab' || (window.OrbitBackend && window.OrbitBackend.mode === 'firestore-lab');
    } catch (e) { return false; }
  }

  function expectedLabEmail() {
    return (window.OrbitBackend && window.OrbitBackend.expectedEmail) || LAB_EMAIL;
  }

  function fbAuth() {
    try { if (window.firebase && firebase.auth) return firebase.auth(); } catch (e) {}
    try { if (window.auth && typeof window.auth.signInWithEmailAndPassword === 'function') return window.auth; } catch (e) {}
    return null;
  }

  function fbUser() {
    try { const a = fbAuth(); return a && a.currentUser ? a.currentUser : null; } catch (e) { return null; }
  }

  function mapFbUser(u) {
    if (!u) return null;
    return {
      nombre: u.displayName || (u.email || 'Usuario LAB'),
      rol: 'Dirección',
      email: u.email || '',
      uid: u.uid || '',
      tipo: 'interno',
      backend: 'firestore-lab'
    };
  }

  function withTimeout(promise, milliseconds, code) {
    let timer;
    const timeout = new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        const error = new Error(code || 'AUTH_TIMEOUT');
        error.code = code || 'AUTH_TIMEOUT';
        reject(error);
      }, milliseconds);
    });
    return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
  }

  function friendlyAuthError(error) {
    const code = String(error && (error.code || error.message) || '');
    if (/AUTH_PERSISTENCE_TIMEOUT/.test(code)) return 'El navegador no permitió preparar la sesión. Cierra esta ventana privada y vuelve a abrir el enlace LAB.';
    if (/AUTH_SIGNIN_TIMEOUT/.test(code)) return 'El servicio de acceso no respondió. Vuelve a intentarlo en unos segundos.';
    if (/auth\/(invalid-credential|wrong-password|user-not-found)/i.test(code)) return 'El usuario o la contraseña asignados no son válidos.';
    if (/auth\/network-request-failed/i.test(code)) return 'No fue posible conectar con el servicio de acceso. Revisa la conexión y vuelve a intentarlo.';
    if (/auth\/too-many-requests/i.test(code)) return 'El acceso está temporalmente limitado por varios intentos. Espera unos minutos y vuelve a intentarlo.';
    if (/auth\/unauthorized-domain/i.test(code)) return 'Este canal de validación todavía no está autorizado para iniciar sesión.';
    if (/auth\/operation-not-allowed/i.test(code)) return 'El acceso con usuario y contraseña no está habilitado en este entorno.';
    return 'No fue posible iniciar sesión. Intenta nuevamente.';
  }

  function setAuthStage(value) {
    try { document.body.dataset.authStage = value || ''; } catch (e) {}
  }

  async function configureLabPersistence(auth) {
    if (!auth || typeof auth.setPersistence !== 'function') return;
    let persistence = null;
    try {
      persistence = window.firebase && firebase.auth && firebase.auth.Auth && firebase.auth.Auth.Persistence
        ? firebase.auth.Auth.Persistence
        : null;
    } catch (e) { persistence = null; }
    if (!persistence) return;

    try {
      await withTimeout(auth.setPersistence(persistence.SESSION), 8000, 'AUTH_PERSISTENCE_TIMEOUT');
    } catch (sessionError) {
      try {
        await withTimeout(auth.setPersistence(persistence.NONE), 8000, 'AUTH_PERSISTENCE_TIMEOUT');
      } catch (memoryError) {
        throw sessionError;
      }
    }
  }

  function aceptoConf() { try { return !!localStorage.getItem(CKEY); } catch (e) { return false; } }
  function gateConfidencialidad() {
    if (aceptoConf()) return;
    const back = document.createElement('div');
    back.className = 'drawer-back open'; back.style.cssText = 'display:grid;place-items:center;z-index:260';
    back.innerHTML = `<div class="conf-modal">
      <div class="conf-h"><span class="conf-ic">🔒</span><div><div class="nov-eyebrow">Antes de continuar</div><h2>Acuerdo de confidencialidad y tratamiento de datos</h2></div></div>
      <div class="conf-body">
        <p>El acceso a Orbit 360 implica el manejo de <b>información confidencial</b> de clientes, pólizas, finanzas y operación del intermediario.</p>
        <ul>
          <li>Usaré la información únicamente para las funciones que me han sido asignadas.</li>
          <li>No divulgaré, copiaré ni extraeré datos de clientes o de la cartera fuera de la plataforma sin autorización.</li>
          <li>Protegeré mis credenciales y mantendré la confidencialidad incluso después de terminar mi relación con la empresa.</li>
          <li>Cumpliré la normativa de protección de datos personales aplicable en mi país de operación.</li>
        </ul>
        <label class="conf-chk"><input type="checkbox" id="conf-chk"> He leído y <b>acepto</b> el acuerdo de confidencialidad y el tratamiento de datos.</label>
      </div>
      <div class="conf-f"><button class="btn primary" id="conf-ok" disabled>Aceptar y continuar</button></div>
    </div>`;
    document.body.appendChild(back);
    const chk = back.querySelector('#conf-chk'), ok = back.querySelector('#conf-ok');
    chk.addEventListener('change', () => { ok.disabled = !chk.checked; });
    ok.addEventListener('click', () => {
      try { localStorage.setItem(CKEY, JSON.stringify({ aceptado: true, fecha: new Date().toISOString(), usuario: (user() || {}).email || '' })); } catch (e) {}
      back.remove();
    });
  }

  function authed() {
    if (isLab()) return !!fbUser();
    try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
  }

  function login(userObj) {
    if (isLab()) return mapFbUser(fbUser());
    try { localStorage.setItem(KEY, JSON.stringify(userObj || { nombre: 'Andrea Beltrán', rol: 'Dirección', email: DEMO_EMAIL })); } catch (e) {}
    return user();
  }

  async function loginFirebase(email, pass) {
    const auth = fbAuth();
    if (!auth || typeof auth.signInWithEmailAndPassword !== 'function') throw new Error('AUTH_NOT_AVAILABLE');
    setAuthStage('preparing-session');
    await configureLabPersistence(auth);
    setAuthStage('signing-in');
    const cred = await withTimeout(auth.signInWithEmailAndPassword(email, pass), 25000, 'AUTH_SIGNIN_TIMEOUT');
    const current = cred && cred.user ? cred.user : fbUser();
    if (!current) throw new Error('AUTH_USER_NOT_AVAILABLE');
    setAuthStage('authenticated');
    return mapFbUser(current);
  }

  function logout() {
    if (isLab()) {
      try { const a = fbAuth(); if (a && a.signOut) a.signOut(); } catch (e) {}
    }
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  }

  function user() {
    if (isLab()) return mapFbUser(fbUser());
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }

  function showApp() {
    const lg = document.getElementById('login');
    if (lg) { lg.classList.add('hidden'); setTimeout(() => lg.style.display = 'none', 480); }
    document.body.classList.remove('pre-auth');
    setAuthStage('inside');
    setTimeout(function () {
      const u = user() || {};
      const tipo = u.tipo === 'socio' ? 'socio' : 'interno';
      const scopeId = 'user:' + (u.email || 'demo');
      if (Orbit.legal && Orbit.legal.gate) Orbit.legal.gate(tipo, scopeId);
      else gateConfidencialidad();
    }, 520);
  }

  function showLogin() {
    const lg = document.getElementById('login');
    if (lg) { lg.style.display = ''; lg.classList.remove('hidden'); }
    document.body.classList.add('pre-auth');
    if (!document.body.dataset.authStage || document.body.dataset.authStage === 'inside') setAuthStage('login-ready');
    try { if (Orbit.applyBrand) Orbit.applyBrand(); } catch (e) {}
    setTimeout(paintLoginDefaults, 0);
  }

  function paintLoginDefaults() {
    const labMode = isLab();
    const form = document.getElementById('login-form');
    const email = document.getElementById('lg-user');
    const pass = document.getElementById('lg-pass');
    const labEmail = expectedLabEmail();

    if (form) form.dataset.authMode = labMode ? 'firestore-lab' : 'demo';
    if (email) email.dataset.authMode = labMode ? 'firestore-lab' : 'demo';
    if (pass) pass.dataset.authMode = labMode ? 'firestore-lab' : 'demo';

    function forceLabFields() {
      if (!isLab()) return;
      if (email && (!email.value || email.value === DEMO_EMAIL)) email.value = labEmail;
      if (pass && pass.value === DEMO_PASS) pass.value = '';
    }

    if (labMode) {
      try { localStorage.removeItem(KEY); } catch (e) {}
      if (email) email.value = (!email.value || email.value === DEMO_EMAIL) ? labEmail : email.value;
      if (pass && pass.value === DEMO_PASS) pass.value = '';
      setTimeout(forceLabFields, 60);
      setTimeout(forceLabFields, 250);
      setTimeout(forceLabFields, 700);
      return;
    }

    if (email && (!email.value || email.value === labEmail)) email.value = DEMO_EMAIL;
    if (pass && !pass.value) pass.value = DEMO_PASS;
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

  function init() {
    paintLoginDefaults();

    const form = document.getElementById('login-form');
    if (form) form.addEventListener('submit', async e => {
      e.preventDefault();
      if (form.dataset.submitting === '1') return;
      const labMode = isLab();
      const emailEl = document.getElementById('lg-user');
      const passEl = document.getElementById('lg-pass');
      let email = (emailEl || {}).value || DEMO_EMAIL;
      const pass = (passEl || {}).value || '';

      if (labMode && (!email || email === DEMO_EMAIL)) {
        email = expectedLabEmail();
        if (emailEl) emailEl.value = email;
      }

      paintError('');
      setSubmitting(form, true);
      setAuthStage('submitting');

      try {
        if (labMode) {
          if (!pass) throw new Error('AUTH_PASSWORD_REQUIRED');
          if (pass === DEMO_PASS) throw new Error('AUTH_DEMO_PASSWORD_BLOCKED');
          await loginFirebase(email, pass);
        } else {
          login({ nombre: 'Andrea Beltrán', rol: 'Dirección', email });
        }
        paintError('');
        showApp();
      } catch (err) {
        setAuthStage('error');
        const code = String(err && (err.code || err.message) || '');
        if (code === 'AUTH_PASSWORD_REQUIRED') paintError('Ingresa la contraseña asignada para continuar.');
        else if (code === 'AUTH_DEMO_PASSWORD_BLOCKED') paintError('Usa la contraseña asignada para este entorno, no la contraseña de demostración.');
        else paintError(friendlyAuthError(err));
        showLogin();
      } finally {
        setSubmitting(form, false);
      }
    });

    const reset = document.getElementById('lg-reset');
    if (reset) reset.addEventListener('click', e => { e.preventDefault(); logout(); });

    if (isLab()) {
      const auth = fbAuth();
      if (auth && typeof auth.onAuthStateChanged === 'function') {
        auth.onAuthStateChanged(function(u){ if (u) showApp(); else showLogin(); });
      } else {
        showLogin();
      }
      return;
    }

    if (authed()) showApp(); else showLogin();
  }

  return { init, authed, login, loginFirebase, logout, user, showLogin, showApp };
})();
