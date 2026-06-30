/* ============================================================
   Orbit 360 · Auth (demo) — gate de sesión + login con órbita
   Login white-label: marca de producto Orbit 360, palette-adaptive,
   slot de logo del cliente. NO usa branding A&S.
   Sesión demo persistida en localStorage (clave propia).
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.auth = (function () {
  const KEY = 'orbit360_session';
  const CKEY = 'orbit360_confidencialidad';
  const AUTH_MODE_KEY = 'orbit360_auth_mode';
  const LAB_PROJECT_ID = 'ays-orbit-360-lab';
  let firebaseAuth = null;
  let firebaseReady = false;

  function queryMode() { try { return new URLSearchParams(location.search).get('orbitAuth') || ''; } catch (e) { return ''; } }
  function localMode() { try { return localStorage.getItem(AUTH_MODE_KEY) || ''; } catch (e) { return ''; } }
  function mode() { return (queryMode() || localMode() || 'demo').toLowerCase(); }
  function useFirebase() { return mode() === 'firebase'; }
  function ensureFirebase() {
    if (!useFirebase()) return null;
    const cfg = window.OrbitFirebaseAuthConfig || null;
    if (!cfg || cfg.projectId !== LAB_PROJECT_ID) throw new Error('Firebase Auth LAB requiere auth-firebase.config.local.js de ' + LAB_PROJECT_ID + '.');
    if (!window.firebase || !firebase.auth) throw new Error('Firebase SDK Auth no esta cargado para modo LAB.');
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    firebaseAuth = firebase.auth();
    firebaseReady = true;
    return firebaseAuth;
  }
  function sessionFromFirebase(fbUser) {
    return { nombre: fbUser.displayName || fbUser.email || 'Usuario LAB', rol: 'Direccion', email: fbUser.email || '', provider: 'firebase', projectId: LAB_PROJECT_ID };
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
    if (useFirebase()) return !!(firebaseAuth && firebaseAuth.currentUser);
    try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
  }
  function login(user) {
    try { localStorage.setItem(KEY, JSON.stringify(user || { nombre: 'Paula Osorio', rol: 'Dirección', email: 'admin@demo.com' })); } catch (e) {}
  }
  function logout() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    if (useFirebase() && firebaseAuth) firebaseAuth.signOut().finally(function () { location.reload(); });
    else location.reload();
  }
  function user() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }

  function showApp() {
    const lg = document.getElementById('login');
    if (lg) { lg.classList.add('hidden'); setTimeout(() => lg.style.display = 'none', 480); }
    document.body.classList.remove('pre-auth');
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
  }

  function firebaseLogin(email, pass) {
    try {
      const auth = ensureFirebase();
      auth.signInWithEmailAndPassword(email, pass).catch(function (err) {
        console.error('[Orbit Auth LAB] Login Firebase fallido:', err);
        alert('No se pudo iniciar sesion en Firebase LAB: ' + (err && err.message ? err.message : err));
      });
    } catch (err) {
      console.error('[Orbit Auth LAB] Configuracion Firebase invalida:', err);
      alert(err.message || err);
    }
  }

  function initFirebaseMode() {
    try {
      const auth = ensureFirebase();
      auth.onAuthStateChanged(function (fbUser) {
        if (fbUser) {
          login(sessionFromFirebase(fbUser));
          showApp();
        } else {
          try { localStorage.removeItem(KEY); } catch (e) {}
          showLogin();
        }
      });
    } catch (err) {
      console.error('[Orbit Auth LAB] No se pudo activar Firebase Auth:', err);
      showLogin();
    }
  }

  function init() {
    const form = document.getElementById('login-form');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const email = (document.getElementById('lg-user') || {}).value || 'admin@demo.com';
      const pass = (document.getElementById('lg-pass') || {}).value || '';
      if (useFirebase()) {
        firebaseLogin(email, pass);
        return;
      }
      login({ nombre: 'Paula Osorio', rol: 'Dirección', email });
      showApp();
    });
    const reset = document.getElementById('lg-reset');
    if (reset) reset.addEventListener('click', e => { e.preventDefault(); logout(); });

    if (useFirebase()) {
      initFirebaseMode();
      return;
    }
    if (authed()) showApp(); else showLogin();
  }
  return { init, authed, login, logout, user, showLogin, mode, firebaseReady: function () { return firebaseReady; } };
})();
