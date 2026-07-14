/* ============================================================
   Orbit 360 · Guard de autenticación para preview Firestore LAB
   Evita que una sesión demo aparente acceso LAB y rearma los
   snapshots únicamente después de autenticar al usuario canónico.
   ============================================================ */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (window.OrbitBackend.tenantId || window.OrbitBackend.tenant)) || '';
  var expectedEmail = (window.OrbitBackend && window.OrbitBackend.expectedEmail) || 'orbit.lab@demo.com';
  var bound = false;
  var lastUid = '';
  var attempts = 0;

  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones') return;

  function auth() {
    try {
      if (window.firebase && typeof window.firebase.auth === 'function') return window.firebase.auth();
    } catch (e) {}
    return null;
  }

  function currentUser() {
    var a = auth();
    return a && a.currentUser ? a.currentUser : null;
  }

  function paintLoginError(message) {
    var box = document.querySelector('.lg-box');
    if (!box) return;
    var el = document.getElementById('login-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'login-error';
      el.className = 'hint error';
      box.appendChild(el);
    }
    el.textContent = message || '';
  }

  function paintIdentity(user) {
    var top = document.querySelector('.tb-user .who');
    var avatar = document.querySelector('.tb-user .av');
    if (top) top.innerHTML = '<b>Usuario LAB</b><br><span id="tb-rol-lbl">Dirección · salir</span>';
    if (avatar) avatar.textContent = 'OL';
    try {
      document.body.dataset.authBackend = user ? 'firestore-lab' : 'none';
      document.body.dataset.authUid = user && user.uid ? user.uid : '';
    } catch (e) {}
  }

  function closeImportModal() {
    var modal = document.querySelector('[data-ays-initial-modal]');
    if (modal) modal.remove();
  }

  function forceRealLogin(message) {
    lastUid = '';
    closeImportModal();
    try { localStorage.removeItem('orbit360_session'); } catch (e) {}
    try {
      if (window.Orbit && Orbit.auth && typeof Orbit.auth.showLogin === 'function') Orbit.auth.showLogin();
      else document.body.classList.add('pre-auth');
    } catch (e) {}
    paintIdentity(null);
    paintLoginError(message || 'Inicia sesión con el usuario LAB autorizado para continuar.');
  }

  function reattachStore(user) {
    if (!user || !window.Orbit || !Orbit.store) return;
    if (lastUid === user.uid) return;
    lastUid = user.uid || '';
    try {
      if (typeof Orbit.store._detachSnapshots === 'function') Orbit.store._detachSnapshots();
    } catch (e) {}
    setTimeout(function () {
      try {
        if (typeof Orbit.store._attachSnapshots === 'function') Orbit.store._attachSnapshots();
      } catch (e) {}
    }, 180);
  }

  function acceptUser(user) {
    var email = String(user && user.email || '').toLowerCase();
    if (!user || email !== expectedEmail.toLowerCase()) {
      var a = auth();
      if (user && a && typeof a.signOut === 'function') {
        try { a.signOut(); } catch (e) {}
      }
      forceRealLogin('La sesión no corresponde al usuario LAB autorizado.');
      return;
    }
    paintLoginError('');
    paintIdentity(user);
    reattachStore(user);
    try {
      if (window.Orbit && Orbit.auth && typeof Orbit.auth.showApp === 'function') Orbit.auth.showApp();
    } catch (e) {}
  }

  function bind() {
    if (bound) return true;
    var a = auth();
    if (!a || typeof a.onAuthStateChanged !== 'function') return false;
    bound = true;
    a.onAuthStateChanged(function (user) {
      if (user) acceptUser(user);
      else forceRealLogin('Inicia sesión con el usuario LAB autorizado para ejecutar el dry-run.');
    });
    return true;
  }

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('[data-ays-initial-card] button,[data-ays-initial-modal] [data-dry],[data-ays-initial-modal] [data-write]') : null;
    if (!target || currentUser()) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    forceRealLogin('Inicia sesión con el usuario LAB autorizado antes de abrir la carga inicial.');
  }, true);

  (function waitForAuth() {
    if (bind()) return;
    attempts += 1;
    if (attempts < 80) setTimeout(waitForAuth, 125);
    else forceRealLogin('No fue posible inicializar Firebase Auth LAB.');
  })();

  window.OrbitLabAuthGuard = {
    currentUser: currentUser,
    forceRealLogin: forceRealLogin,
    reattachStore: reattachStore
  };
})();
