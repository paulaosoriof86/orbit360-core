/* ============================================================
   Orbit 360 · UI helpers compartidos
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ui = (function () {
  const NOW = new Date('2026-06-20');

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
  return { NOW, money, moneyShort, esc, initials, fmtDate, daysFromNow, ago, avatar, shade, estadoBadge };
})();
