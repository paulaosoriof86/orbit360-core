/* ============================================================
   Orbit 360 · Auth (demo) — gate de sesión + login con órbita
   Login white-label: marca de producto Orbit 360, palette-adaptive,
   slot de logo del cliente. NO usa branding A&S.
   Sesión demo persistida en localStorage (clave propia).
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.auth = (function () {
  const KEY = 'orbit360_session';

  function authed() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  function login(user) {
    try { localStorage.setItem(KEY, JSON.stringify(user || { nombre: 'Paula Osorio', rol: 'Dirección', email: 'admin@demo.com' })); } catch (e) {}
  }
  function logout() { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); }
  function user() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }

  function showApp() {
    const lg = document.getElementById('login');
    if (lg) { lg.classList.add('hidden'); setTimeout(() => lg.style.display = 'none', 480); }
    document.body.classList.remove('pre-auth');
  }
  function showLogin() {
    const lg = document.getElementById('login');
    if (lg) { lg.style.display = ''; lg.classList.remove('hidden'); }
    document.body.classList.add('pre-auth');
  }

  function init() {
    const form = document.getElementById('login-form');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const email = (document.getElementById('lg-user') || {}).value || 'admin@demo.com';
      login({ nombre: 'Paula Osorio', rol: 'Dirección', email });
      showApp();
    });
    const reset = document.getElementById('lg-reset');
    if (reset) reset.addEventListener('click', e => { e.preventDefault(); logout(); });

    if (authed()) showApp(); else showLogin();
  }
  return { init, authed, login, logout, user, showLogin };
})();
