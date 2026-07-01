/* ============================================================
   Orbit 360 · Theming — paleta seleccionable (white-label)
   Cambia SOLO el color primario (acento) en toda la plataforma:
   login, títulos, badges, KPIs, sidebar activo, etc.
   Neutrales grafito constantes (regla de marca / chrome).
   Default: Rojo Orbit #C5162E. Alternas para clientes white-label.
   Persistente en localStorage (clave propia, no toca la DB).
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.theme = (function () {
  const KEY = 'orbit360_theme';

  // helpers de color
  function shade(hex, amt) {
    let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const n = parseInt(h, 16); let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function rgba(hex, a) {
    let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const n = parseInt(h, 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // paletas (primary). El resto se deriva.
  const PALETTES = [
    { id: 'rojo', name: 'Rojo Orbit', primary: '#C5162E', brand: true },
    { id: 'indigo', name: 'Índigo', primary: '#3b46d8' },
    { id: 'esmeralda', name: 'Esmeralda', primary: '#1f8a4c' },
    { id: 'cobre', name: 'Cobre', primary: '#b5532b' },
    { id: 'violeta', name: 'Violeta', primary: '#6b4ea0' },
    { id: 'oceano', name: 'Océano', primary: '#11698e' }
  ];

  function apply(id) {
    const p = PALETTES.find(x => x.id === id) || PALETTES[0];
    const r = document.documentElement.style;
    r.setProperty('--red', p.primary);
    r.setProperty('--red-600', shade(p.primary, -24));
    r.setProperty('--red-700', shade(p.primary, -48));
    r.setProperty('--red-soft', rgba(p.primary, .10));
    r.setProperty('--red-line', rgba(p.primary, .24));
    r.setProperty('--danger', p.brand ? p.primary : '#C5162E'); // semántica de peligro se mantiene roja salvo paleta roja
    r.setProperty('--danger-soft', rgba(p.brand ? p.primary : '#C5162E', .10));
    try { localStorage.setItem(KEY, id); } catch (e) {}
    Orbit.theme.current = p.id;
    document.dispatchEvent(new CustomEvent('orbit:theme', { detail: p }));
  }
  function get() { try { return localStorage.getItem(KEY) || 'rojo'; } catch (e) { return 'rojo'; } }

  // ---- sidebar claro/oscuro (personalizable, auto-contraste) ----
  const SB_KEY = 'orbit360_sidebar';
  function applySidebar(mode) {
    document.body.classList.toggle('sb-light', mode === 'claro');
    document.body.classList.toggle('sb-gray', mode === 'gris');
    document.body.classList.toggle('sb-graphite', mode === 'grafito');
    try { localStorage.setItem(SB_KEY, mode); } catch (e) {}
    Orbit.theme.sidebar = mode;
  }
  function getSidebar() { try { return localStorage.getItem(SB_KEY) || 'oscuro'; } catch (e) { return 'oscuro'; } }

  // popover picker
  function picker(anchorEl) {
    closePicker();
    const pop = document.createElement('div');
    pop.id = 'theme-pop';
    pop.className = 'theme-pop';
    pop.innerHTML = `<div class="tp-title">Paleta de la marca</div>
      <div class="tp-grid">${PALETTES.map(p => `
        <button class="tp-sw ${get() === p.id ? 'on' : ''}" data-p="${p.id}" title="${p.name}">
          <span style="background:${p.primary}"></span>${p.name}${p.brand ? ' ·' : ''}
        </button>`).join('')}</div>
      <div class="tp-foot">Se aplica a toda la plataforma y al login. White-label para Alianzas.</div>
      </div>
      <div class="tp-title" style="margin-top:12px">Tipografía</div>
      <div class="tp-grid">${[['Manrope', 'Manrope (display)'], ['Segoe UI', 'Segoe (corporativa)'], ['Inter', 'Inter (moderna)']].map(f => `<button class="tp-sw ${(document.documentElement.style.getPropertyValue('--f-display') || '').includes(f[0]) ? 'on' : ''}" data-font="${f[0]}" title="${f[1]}"><span style="font-family:${f[0]};font-size:11px;background:none;width:auto;height:auto;padding:0">${f[1].split(' ')[0]}</span></button>`).join('')}</div>
      <div class="tp-title" style="margin-top:12px">Menú lateral</div>
      <div class="tp-grid">
        <button class="tp-sw ${getSidebar() === 'oscuro' ? 'on' : ''}" data-sb="oscuro"><span style="background:#1E2227"></span>Oscuro</button>
        <button class="tp-sw ${getSidebar() === 'claro' ? 'on' : ''}" data-sb="claro"><span style="background:#f3f1ec;box-shadow:inset 0 0 0 1px #ccc"></span>Claro</button>
        <button class="tp-sw ${getSidebar() === 'gris' ? 'on' : ''}" data-sb="gris"><span style="background:#cbc8c1;box-shadow:inset 0 0 0 1px #b3b0a8"></span>Gris</button>
        <button class="tp-sw ${getSidebar() === 'grafito' ? 'on' : ''}" data-sb="grafito"><span style="background:#3a4047"></span>Grafito</button>
      </div>`;
    document.body.appendChild(pop);
    const r = anchorEl.getBoundingClientRect();
    pop.style.top = (r.bottom + 8) + 'px';
    pop.style.right = (window.innerWidth - r.right) + 'px';
    pop.querySelectorAll('.tp-sw').forEach(b => b.addEventListener('click', () => { if (b.dataset.sb) { applySidebar(b.dataset.sb); } else { apply(b.dataset.p); } closePicker(); }));
    setTimeout(() => document.addEventListener('click', outside), 0);
    function outside(e) { if (!pop.contains(e.target) && e.target !== anchorEl) closePicker(); }
    pop._outside = outside;
  }
  function closePicker() {
    const p = document.getElementById('theme-pop');
    if (p) { if (p._outside) document.removeEventListener('click', p._outside); p.remove(); }
  }

  return { PALETTES, apply, get, picker, current: 'rojo', applySidebar, getSidebar };
})();
// aplicar de inmediato (antes del primer render)
Orbit.theme.apply(Orbit.theme.get());
Orbit.theme.applySidebar(Orbit.theme.getSidebar());
