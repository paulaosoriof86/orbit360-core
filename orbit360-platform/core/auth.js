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

  function isLab() {
    try {
      const q = new URLSearchParams(location.search || '');
      return q.get('orbitBackend') === 'firestore-lab' || (window.OrbitBackend && window.OrbitBackend.mode === 'firestore-lab');
    } catch (e) { return false; }
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
    try { localStorage.setItem(KEY, JSON.stringify(userObj || { nombre: 'Andrea Beltrán', rol: 'Dirección', email: 'admin@demo.com' })); } catch (e) {}
    return user();
  }

  async function loginFirebase(email, pass) {
    const auth = fbAuth();
    if (!auth || typeof auth.signInWithEmailAndPassword !== 'function') throw new Error('Firebase Auth LAB no disponible. Verifica core/auth-firebase.config.local.js.');
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    return mapFbUser(cred && cred.user ? cred.user : fbUser());
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
    try { if (Orbit.applyBrand) Orbit.applyBrand(); } catch (e) {}
  }

  function paintLabDefaults() {
    if (!isLab()) return;
    const email = document.getElementById('lg-user');
    const pass = document.getElementById('lg-pass');
    if (email && (!email.value || email.value === 'admin@demo.com')) email.value = (window.OrbitBackend && window.OrbitBackend.expectedEmail) || 'orbit.lab@demo.com';
    if (pass && pass.value === 'demo123') pass.value = '';
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

  function init() {
    paintLabDefaults();

    const form = document.getElementById('login-form');
    if (form) form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = (document.getElementById('lg-user') || {}).value || 'admin@demo.com';
      const pass = (document.getElementById('lg-pass') || {}).value || '';
      try {
        if (isLab()) {
          await loginFirebase(email, pass);
        } else {
          login({ nombre: 'Andrea Beltrán', rol: 'Dirección', email });
        }
        paintError('');
        showApp();
      } catch (err) {
        paintError(err && err.message ? err.message : 'No se pudo iniciar sesión.');
        showLogin();
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
