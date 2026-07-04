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

  function authed() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  function login(user) {
    try { localStorage.setItem(KEY, JSON.stringify(user || { nombre: 'Andrea Beltrán', rol: 'Dirección', email: 'admin@demo.com' })); } catch (e) {}
  }
  function logout() { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); }
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
    // pintar logo/nombre del cliente en la franja del login (antes de entrar)
    try { if (Orbit.applyBrand) Orbit.applyBrand(); } catch (e) {}
  }

  function init() {
    const form = document.getElementById('login-form');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const email = (document.getElementById('lg-user') || {}).value || '';
      login({ nombre: 'Andrea Beltrán', rol: 'Dirección', email: email || 'usuario@empresa.com' });
      showApp();
    });
    const reset = document.getElementById('lg-reset');
    if (reset) reset.addEventListener('click', e => { e.preventDefault(); logout(); });

    if (authed()) showApp(); else showLogin();
  }
  return { init, authed, login, logout, user, showLogin };
})();
