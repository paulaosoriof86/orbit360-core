/* ============================================================
   Orbit 360 · UI helpers compartidos
   ============================================================ */
window.Orbit = window.Orbit || {};
// Helper global: abrir el correo INTERNO de Orbit (no mailto del SO)
Orbit.correoCompose = function (pre) {
  window.__orbitCompose = pre || {};
  if (location.hash !== '#/correo') location.hash = '#/correo';
  else if (Orbit.modules && Orbit.modules.correo) { const p = window.__orbitCompose; window.__orbitCompose = null; Orbit.modules.correo.redactar(p); }
};
Orbit.ui = (function () {
  // Ancla temporal. Por defecto usa la fecha REAL del sistema para que el mes,
  // el conteo de días y los vencimientos reflejen el calendario actual. El backend
  // puede fijarla poniendo Orbit.tenant.demoDate = 'YYYY-MM-DD' (o window.ORBIT_DEMO_DATE).
  const DEMO_ANCHOR = '2026-06-20';
  function _anchor() {
    try { var d = (Orbit.tenant && Orbit.tenant.demoDate); if (d === 'real') return new Date(); if (d) return new Date(d + 'T00:00:00'); } catch (e) {}
    try { var w = window.ORBIT_DEMO_DATE; if (w === 'real') return new Date(); if (w) return new Date(w + 'T00:00:00'); } catch (e) {}
    return new Date();
  }
  const NOW = _anchor();
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function now() { return NOW; }
  function today() { return NOW.toISOString().slice(0, 10); }
  function monthLabel() { return (MESES[NOW.getMonth()][0].toUpperCase() + MESES[NOW.getMonth()].slice(1)) + ' ' + NOW.getFullYear(); }
  function monthKey() { return NOW.getFullYear() + '-' + String(NOW.getMonth() + 1).padStart(2, '0'); }
  function monthProgressPct() { const dim = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0).getDate(); return NOW.getDate() / dim; }

  function money(n, cur) {
    if (n == null) return '—';
    const sym = cur === 'COP' ? '$' : cur === 'USD' ? 'US$' : 'Q';
    const v = Math.round(n);
    return sym + ' ' + v.toLocaleString('es-GT');
  }
  function moneyShort(n, cur) {
    if (n == null) return '—';
    const sym = cur === 'COP' ? '$' : cur === 'USD' ? 'US$' : 'Q';
    const a = Math.abs(n);
    if (a >= 1e9) return sym + (n / 1e9).toFixed(1) + 'B';
    if (a >= 1e6) return sym + (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return sym + (n / 1e3).toFixed(0) + 'K';
    return sym + Math.round(n);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function initials(name) {
    return String(name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function daysFromNow(iso) {
    if (!iso) return null;
    return Math.round((new Date(iso + 'T00:00:00') - NOW) / 86400000);
  }
  function ago(iso) {
    const d = -daysFromNow(iso);
    if (d <= 0) return 'hoy';
    if (d === 1) return 'ayer';
    if (d < 30) return 'hace ' + d + ' d';
    if (d < 365) return 'hace ' + Math.round(d / 30) + ' m';
    return 'hace ' + Math.round(d / 365) + ' a';
  }
  function avatar(name, color, size) {
    const c = color || '#5a6472';
    const s = size || 'md';
    return `<span class="av ${s}" style="background:linear-gradient(135deg,${c},${shade(c, -28)})">${initials(name)}</span>`;
  }
  function shade(hex, amt) {
    try {
      let h = hex.replace('#', '');
      if (h.length === 3) h = h.split('').map(x => x + x).join('');
      const n = parseInt(h, 16);
      let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
      r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    } catch (e) { return hex; }
  }
  function estadoBadge(estado) {
    const map = {
      'Vigente': 'ok', 'Pagado': 'ok', 'Liquidada': 'ok', 'Renovada': 'ok', 'Activo': 'ok',
      'Por renovar': 'warn', 'Pendiente': 'warn', 'Devengada': 'warn', 'Gestionando': 'warn',
      'Vencida': 'danger', 'Vencido': 'danger', 'Cancelada': 'danger', 'Perdida': 'danger', 'Anulado': 'neutral',
      'Próxima': 'info'
    };
    const cls = map[estado] || 'neutral';
    return `<span class="badge ${cls}">${esc(estado)}</span>`;
  }
  /* ---- Modales Orbit (reemplazo de alert/confirm/prompt nativos) ---- */
  function _overlay() {
    const b = document.createElement('div'); b.className = 'drawer-back open';
    b.style.cssText = 'display:grid;place-items:center;z-index:9600'; return b;
  }
  function toast(msg, tone) {
    const t = document.createElement('div'); t.className = 'ciclo-toast';
    if (tone === 'danger') t.style.background = 'var(--danger,#C5162E)';
    t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
  }
  function alertm(msg, opts) {
    opts = opts || {};
    return new Promise(res => {
      const b = _overlay();
      b.innerHTML = `<div class="card" style="width:min(440px,93vw);padding:0">
        <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px"><span style="font-size:20px">${opts.icon || 'ℹ️'}</span><b style="font-family:var(--f-display);font-size:16px">${esc(opts.title || 'Aviso')}</b></div>
        <div style="padding:18px 20px;font-size:13.5px;line-height:1.55;white-space:pre-wrap">${esc(msg)}</div>
        <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end"><button class="btn primary" data-ok>${esc(opts.ok || 'Entendido')}</button></div>
      </div>`;
      document.body.appendChild(b);
      const close = () => { b.remove(); res(true); };
      b.querySelector('[data-ok]').addEventListener('click', close);
      b.addEventListener('click', e => { if (e.target === b) close(); });
    });
  }
  function confirmm(msg, opts) {
    opts = opts || {};
    return new Promise(res => {
      const b = _overlay();
      const danger = opts.danger !== false && (opts.danger || /elimin|borrar|quitar|cancelar la|desactiv/i.test(msg));
      b.innerHTML = `<div class="card" style="width:min(460px,94vw);padding:0">
        <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px"><span style="font-size:20px">${opts.icon || (danger ? '⚠️' : '❓')}</span><b style="font-family:var(--f-display);font-size:16px">${esc(opts.title || 'Confirmar')}</b></div>
        <div style="padding:18px 20px;font-size:13.5px;line-height:1.55;white-space:pre-wrap">${esc(msg)}</div>
        <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" data-no>${esc(opts.cancel || 'Cancelar')}</button><button class="btn ${danger ? '' : 'primary'}" data-yes style="${danger ? 'background:var(--danger,#C5162E);color:#fff' : ''}">${esc(opts.ok || 'Confirmar')}</button></div>
      </div>`;
      document.body.appendChild(b);
      const done = v => { b.remove(); res(v); };
      b.querySelector('[data-yes]').addEventListener('click', () => done(true));
      b.querySelector('[data-no]').addEventListener('click', () => done(false));
      b.addEventListener('click', e => { if (e.target === b) done(false); });
    });
  }
  function promptm(msg, opts) {
    opts = opts || {};
    return new Promise(res => {
      const b = _overlay();
      b.innerHTML = `<div class="card" style="width:min(460px,94vw);padding:0">
        <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px"><span style="font-size:20px">${opts.icon || '✏️'}</span><b style="font-family:var(--f-display);font-size:16px">${esc(opts.title || 'Escribe un valor')}</b></div>
        <div style="padding:18px 20px;display:grid;gap:10px"><div style="font-size:13px">${esc(msg || '')}</div><input class="o-sel" data-in value="${esc(opts.value || '')}" placeholder="${esc(opts.placeholder || '')}"></div>
        <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-yes>${esc(opts.ok || 'Guardar')}</button></div>
      </div>`;
      document.body.appendChild(b);
      const inp = b.querySelector('[data-in]');
      const done = v => { b.remove(); res(v); };
      b.querySelector('[data-yes]').addEventListener('click', () => done(inp.value));
      b.querySelector('[data-no]').addEventListener('click', () => done(null));
      b.addEventListener('click', e => { if (e.target === b) done(null); });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') done(inp.value); });
      setTimeout(() => inp.focus(), 30);
    });
  }

  return { NOW, now, monthLabel, monthKey, monthProgressPct, money, moneyShort, esc, initials, fmtDate, daysFromNow, ago, avatar, shade, estadoBadge, toast, alert: alertm, confirm: confirmm, prompt: promptm, today };
})();
