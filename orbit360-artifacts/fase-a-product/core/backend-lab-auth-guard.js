/* ============================================================
   Orbit 360 · Guard de autenticación Firestore por membresía
   - Acepta cualquier identidad Firebase con membresía activa del tenant.
   - Roles, advisorId, países y scopes provienen de la membresía.
   - No fuerza usuarios técnicos, roles ni asesores.
   - Rearma Orbit.store únicamente después de la proyección autorizada.
   ============================================================ */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (window.OrbitBackend.tenantId || window.OrbitBackend.tenant)) || '';
  var bound = false;
  var lastUid = '';
  var attempts = 0;
  var authGeneration = 0;

  if (mode !== 'firestore-lab' || !tenant) return;

  function auth() {
    try {
      if (window.firebase && typeof window.firebase.auth === 'function') return window.firebase.auth();
    } catch (e) {}
    return null;
  }

  function currentUser() {
    var provider = auth();
    return provider && provider.currentUser ? provider.currentUser : null;
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

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function visualRole(role) {
    var clean = text(role);
    if (clean === 'SuperAdmin') return 'Dirección';
    if (clean === 'AdminTenant') return 'Administración';
    return clean || 'Acceso autorizado';
  }

  function initials(value) {
    var parts = text(value).split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
  }

  function paintIdentity(user, projection) {
    var top = document.querySelector('.tb-user .who');
    var avatar = document.querySelector('.tb-user .av');
    var display = text(user && user.displayName) || text(user && user.email) || 'Usuario';
    var role = visualRole(projection && (projection.activeRole || projection.defaultRole || (projection.roles || [])[0]));
    if (top) {
      var safeName = display.replace(/[&<>"']/g, function (char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
      });
      top.innerHTML = '<b>' + safeName + '</b><br><span id="tb-rol-lbl">' + role + ' · salir</span>';
    }
    if (avatar) avatar.textContent = initials(display);
    try {
      document.body.dataset.authBackend = user ? 'firestore-membership' : 'none';
      document.body.dataset.authUid = user && user.uid ? user.uid : '';
      document.body.dataset.authTenant = projection && projection.tenantId ? projection.tenantId : '';
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
      if (window.Orbit && Orbit.store && typeof Orbit.store._detachSnapshots === 'function') Orbit.store._detachSnapshots();
    } catch (e) {}
    try {
      if (window.Orbit && Orbit.auth && typeof Orbit.auth.showLogin === 'function') Orbit.auth.showLogin();
      else document.body.classList.add('pre-auth');
    } catch (e) {}
    paintIdentity(null, null);
    paintLoginError(message || 'Inicia sesión con el usuario asignado a tu organización.');
  }

  function membershipProjection(user) {
    try {
      var projection = window.Orbit && Orbit.auth && Orbit.auth.productUser;
      var status = text(projection && projection.status).toLowerCase();
      if (!projection || projection.__labMembershipProjection !== true || projection.productReadOnly !== true) return null;
      if (text(projection.uid) !== text(user && user.uid)) return null;
      if (text(projection.tenantId) !== tenant) return null;
      if (status !== 'active' && status !== 'activo') return null;
      if (!Array.isArray(projection.roles) || !projection.roles.length) return null;
      return projection;
    } catch (e) {
      return null;
    }
  }

  function membershipStatus() {
    try {
      if (window.Orbit && Orbit.session && typeof Orbit.session.membershipProjectionStatus === 'function') {
        return Orbit.session.membershipProjectionStatus() || {};
      }
    } catch (e) {}
    return {};
  }

  function waitForMembership(user, generation) {
    return new Promise(function (resolve) {
      var count = 0;
      (function probe() {
        if (generation !== authGeneration) return resolve(null);
        var projection = membershipProjection(user);
        if (projection) return resolve(projection);
        var status = membershipStatus();
        if (status.status === 'blocked') return resolve(null);
        try {
          if (window.Orbit && Orbit.session && typeof Orbit.session.bindLabMembershipProjection === 'function') Orbit.session.bindLabMembershipProjection();
        } catch (e) {}
        count += 1;
        if (count >= 160) return resolve(null);
        setTimeout(probe, 100);
      })();
    });
  }

  function syncMembershipSession() {
    try {
      if (!window.Orbit || !Orbit.session || typeof Orbit.session.syncFromAuth !== 'function') return false;
      return Orbit.session.syncFromAuth() !== false;
    } catch (e) {
      return false;
    }
  }

  function reattachStore(user) {
    if (!user || !window.Orbit || !Orbit.store) return;
    if (lastUid === user.uid && Orbit.store._labStatus && Orbit.store._labStatus().snapshotAttached) return;
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

  function rerenderCurrentRoute() {
    setTimeout(function () {
      try {
        if (window.Orbit && Orbit.router && typeof Orbit.router.rebuildSidebar === 'function') Orbit.router.rebuildSidebar();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (e) {}
    }, 300);
  }

  async function acceptUser(user) {
    var generation = ++authGeneration;
    if (!user || !text(user.uid)) {
      forceRealLogin('Inicia sesión con el usuario asignado a tu organización.');
      return;
    }
    try { document.body.dataset.authStage = 'validating-membership'; } catch (e) {}
    var projection = await waitForMembership(user, generation);
    if (generation !== authGeneration) return;
    if (!projection) {
      var provider = auth();
      if (provider && typeof provider.signOut === 'function') {
        try { await provider.signOut(); } catch (e) {}
      }
      forceRealLogin('Tu usuario no tiene una membresía activa para esta organización.');
      return;
    }
    paintLoginError('');
    syncMembershipSession();
    paintIdentity(user, projection);
    reattachStore(user);
    try {
      if (window.Orbit && Orbit.auth && typeof Orbit.auth.showApp === 'function') Orbit.auth.showApp();
    } catch (e) {}
    rerenderCurrentRoute();
  }

  function bind() {
    if (bound) return true;
    var provider = auth();
    if (!provider || typeof provider.onAuthStateChanged !== 'function') return false;
    bound = true;
    provider.onAuthStateChanged(function (user) {
      if (user) acceptUser(user);
      else {
        authGeneration += 1;
        forceRealLogin('Inicia sesión con el usuario asignado a tu organización.');
      }
    });
    return true;
  }

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('[data-ays-initial-card] button,[data-ays-initial-modal] [data-dry],[data-ays-initial-modal] [data-write]') : null;
    if (!target || currentUser()) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    forceRealLogin('Inicia sesión con el usuario asignado antes de continuar.');
  }, true);

  (function waitForAuth() {
    if (bind()) return;
    attempts += 1;
    if (attempts < 120) setTimeout(waitForAuth, 125);
    else forceRealLogin('No fue posible inicializar el servicio de acceso.');
  })();

  window.OrbitLabAuthGuard = {
    currentUser: currentUser,
    forceRealLogin: forceRealLogin,
    reattachStore: reattachStore,
    syncMembershipSession: syncMembershipSession,
    membershipProjection: membershipProjection
  };
})();
