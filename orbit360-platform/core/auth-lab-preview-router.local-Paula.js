/* ============================================================
   Orbit 360 - Auth LAB Preview Router local
   Uso: solo index-dev-firestore.html / firestore-lab.
   Objetivo: separar dos entradas:
   - index.html = preview visual/prototipo demo.
   - index-dev-firestore.html = backend LAB con Firebase Auth real.
   ============================================================ */
(function () {
  var EXPECTED_TENANT = 'alianzas-soluciones';

  function params() {
    try { return new URLSearchParams(window.location.search || ''); } catch (e) { return new URLSearchParams(''); }
  }

  function isLabMode() {
    var p = params();
    var mode = p.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
    var tenant = p.get('tenant') || (window.OrbitBackend && window.OrbitBackend.tenantId) || '';
    return mode === 'firestore-lab' && tenant === EXPECTED_TENANT;
  }

  function visualUrl() {
    return 'http://127.0.0.1:5178/index.html?preview=visualClienteSinBackendLab';
  }

  function inject() {
    if (!isLabMode()) return;

    var form = document.getElementById('login-form') || document.querySelector('form');
    if (!form) return;
    if (document.getElementById('orbit-lab-open-visual-preview')) return;

    var wrap = document.createElement('div');
    wrap.id = 'orbit-lab-open-visual-preview';
    wrap.style.cssText = 'margin-top:12px;border-top:1px solid #eceff3;padding-top:12px;font-family:Arial,sans-serif;';

    var note = document.createElement('div');
    note.style.cssText = 'font-size:12px;line-height:1.4;color:#575f69;margin-bottom:8px;';
    note.textContent = 'Esta pantalla es solo Backend LAB. Para revisar el prototipo visual usa la entrada visual separada.';

    var link = document.createElement('a');
    link.href = visualUrl();
    link.textContent = 'Abrir preview visual del prototipo';
    link.style.cssText = 'display:block;text-align:center;text-decoration:none;border:1px solid #d9dde2;background:#ffffff;color:#1e2227;border-radius:8px;padding:9px 12px;font-size:13px;font-weight:700;';

    wrap.appendChild(note);
    wrap.appendChild(link);
    form.appendChild(wrap);
  }

  function tick() {
    try { inject(); } catch (e) {}
  }

  window.addEventListener('DOMContentLoaded', function () {
    tick();
    setTimeout(tick, 250);
    setTimeout(tick, 750);
    setTimeout(tick, 1500);
  });

  try { setInterval(tick, 2000); } catch (e) {}
})();
