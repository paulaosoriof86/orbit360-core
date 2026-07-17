/* ============================================================
   Orbit 360 · PWA — instalable como app (white-label)
   - Manifest dinámico desde la marca del cliente (nombre + logo + color)
   - Favicon / apple-touch-icon desde el logo del cliente
   - Captura beforeinstallprompt y ofrece instalar (auto, según dispositivo)
   - Registra service worker (no-op si el origen no lo permite)
   ============================================================ */
(function () {
  function clientLogo() { try { var t = Orbit.tenant && Orbit.tenant.get(); return (t && t.branding && t.branding.logo) || localStorage.getItem('orbit360_logo') || ''; } catch (e) { return ''; } }
  function clientName() { try { var t = Orbit.tenant && Orbit.tenant.get(); return (t && t.empresa) || 'Orbit 360'; } catch (e) { return 'Orbit 360'; } }
  function themeColor() { try { return getComputedStyle(document.documentElement).getPropertyValue('--red').trim() || '#C5162E'; } catch (e) { return '#C5162E'; } }

  function fallbackIcon() {
    var c = themeColor();
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="34" fill="#1E2227"/><circle cx="96" cy="96" r="42" fill="' + c + '"/><circle cx="96" cy="96" r="18" fill="#1E2227"/></svg>';
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  function setFavicons() {
    var icon = clientLogo() || fallbackIcon();
    ['icon', 'apple-touch-icon'].forEach(function (rel) {
      var l = document.querySelector('link[rel="' + rel + '"]');
      if (!l) { l = document.createElement('link'); l.rel = rel; document.head.appendChild(l); }
      l.href = icon;
    });
  }

  function buildManifest() {
    var icon = clientLogo() || fallbackIcon();
    var manifest = {
      name: clientName() + ' · Orbit 360',
      short_name: clientName().slice(0, 18),
      start_url: '.',
      scope: '.',
      display: 'standalone',
      orientation: 'any',
      background_color: '#1E2227',
      theme_color: themeColor(),
      description: 'Sistema 360 para intermediarios de seguros.',
      icons: [
        { src: icon, sizes: '192x192', type: icon.indexOf('svg') >= 0 ? 'image/svg+xml' : 'image/png', purpose: 'any maskable' },
        { src: icon, sizes: '512x512', type: icon.indexOf('svg') >= 0 ? 'image/svg+xml' : 'image/png', purpose: 'any maskable' }
      ]
    };
    var blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    var url = URL.createObjectURL(blob);
    var link = document.querySelector('link[rel="manifest"]');
    if (!link) { link = document.createElement('link'); link.rel = 'manifest'; document.head.appendChild(link); }
    link.href = url;
  }

  var deferredPrompt = null;
  function showInstall(estado) {
    var prev = document.getElementById('pwa-install'); if (prev) prev.remove();
    var btn = document.createElement('button');
    btn.id = 'pwa-install';
    if (estado === 'instalada') { btn.textContent = '✓ App instalada'; btn.setAttribute('data-state', 'instalada'); }
    else if (estado === 'ios') { btn.textContent = '📲 Instalar en iPhone/iPad'; btn.setAttribute('data-state', 'ios'); }
    else { btn.textContent = '⬇ Instalar como app'; btn.setAttribute('data-state', 'instalar'); }
    var bg = estado === 'instalada' ? 'var(--ok,#1F8A5B)' : 'var(--red,#C5162E)';
    btn.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:300;background:' + bg + ';color:#fff;border:none;border-radius:30px;padding:11px 20px;font-weight:700;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.25);cursor:pointer;font-family:var(--f-display,sans-serif);transition:opacity .3s';
    btn.onclick = function () {
      if (estado === 'instalada') { btn.style.opacity = '0'; setTimeout(function () { btn.remove(); }, 300); return; }
      if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(function () { deferredPrompt = null; btn.remove(); }); }
      else { iosHint(); }
    };
    document.body.appendChild(btn);
    if (estado === 'instalada') setTimeout(function () { if (btn.parentNode) { btn.style.opacity = '0'; setTimeout(function () { btn.remove(); }, 300); } }, 4000);
    else setTimeout(function () { if (document.getElementById('pwa-install')) btn.style.opacity = '0.85'; }, 8000);
  }

  function iosHint() {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:50%;bottom:74px;transform:translateX(-50%);z-index:301;background:#1E2227;color:#fff;padding:12px 16px;border-radius:12px;font-size:13px;max-width:300px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.3)';
    d.innerHTML = 'Para instalar en iPhone/iPad: toca <b>Compartir</b> ⬆ y luego <b>"Agregar a inicio"</b>.';
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 6000);
  }

  function init() {
    try { setFavicons(); buildManifest(); } catch (e) {}
    var _ab = Orbit.applyBrand;
    if (_ab) Orbit.applyBrand = function () { try { _ab.apply(this, arguments); } catch (e) {} try { setFavicons(); buildManifest(); } catch (e) {} };
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; if (!(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)) showInstall('instalar'); });
    window.addEventListener('appinstalled', function () { deferredPrompt = null; showInstall('instalada'); });
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) { setTimeout(function () { if (!document.body.classList.contains('pre-auth')) showInstall('instalada'); }, 2500); }
    else if (isIOS) { setTimeout(function () { if (!document.body.classList.contains('pre-auth')) showInstall('ios'); }, 4000); }
    if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {} }
    Orbit.pwa = { refresh: function () { try { setFavicons(); buildManifest(); } catch (e) {} }, install: showInstall };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
