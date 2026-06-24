/* ============================================================
   Orbit 360 · Orbit Marketing (calendario de contenidos)
   Vista calendario mensual con ficha por día (contenidos, piezas,
   canal, estado, stats). Inteligente/automatizable: generar con IA,
   programar y publicar vía Metricool/Make. Importable desde xlsx.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.marketing = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  let host, mes;
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const CANAL_ICON = { LinkedIn: '💼', Facebook: '📘', Instagram: '📸', WhatsApp: '💬', TikTok: '🎵', YouTube: '▶' };
  const EST_TONE = { 'Idea': 'neutral', 'Programado': 'info', 'Publicado': 'ok' };
  const ENFOQUES = ['Seguros / Riesgos', 'Auto', 'Vida y GM', 'Hogar / Daños', 'Logística / Transporte', 'Educativo', 'Tendencias', 'Normativa', 'Prospecting', 'Renovaciones'];
  const ENF_EMOJI = { 'Seguros / Riesgos': '🛡️', 'Auto': '🚗', 'Vida y GM': '❤️', 'Hogar / Daños': '🏠', 'Logística / Transporte': '🚚', 'Educativo': '📚', 'Tendencias': '📈', 'Normativa': '⚖️', 'Prospecting': '🎯', 'Renovaciones': '🔄' };
  function enfEmoji(e) { return ENF_EMOJI[e] || '🛡️'; }
  function toast(msg) { let t = document.getElementById('mk-toast'); if (t) t.remove(); t = document.createElement('div'); t.id = 'mk-toast'; t.className = 'ciclo-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); }

  function init() { if (!mes) { const n = U.NOW ? new Date(U.NOW) : new Date(); mes = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0'); } }
  function todos() { return S().all('contenidos'); }
  function delMes() { return todos().filter(c => (c.fecha || '').slice(0, 7) === mes); }

  function render(h) {
    host = h; init();
    const arr = delMes();
    const pub = arr.filter(c => c.estado === 'Publicado');
    const alcance = pub.reduce((s, c) => s + ((c.stats && c.stats.alcance) || 0), 0);
    const leads = pub.reduce((s, c) => s + ((c.stats && c.stats.leads) || 0), 0);
    const [y, m] = mes.split('-').map(Number);
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '📣', title: 'Orbit Marketing', sub: 'Calendario de contenidos · redes · automatización', features: [], actions: `<button class="btn ghost" id="mk-imp" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">⬇ Importar calendario</button><button class="btn primary" id="mk-new" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)">+ Contenido</button>` })}
      ${K.kpis([
        { label: 'Contenidos del mes', val: arr.length, color: 'var(--red)', foot: pub.length + ' publicados' },
        { label: 'Alcance', val: alcance.toLocaleString('es'), color: 'var(--info)', foot: 'personas' },
        { label: 'Interacciones', val: pub.reduce((s, c) => s + ((c.stats && c.stats.interac) || 0), 0), color: 'var(--ok)', foot: 'likes/coment/share' },
        { label: 'Leads generados', val: leads, color: 'var(--warn)', foot: 'desde contenidos', footTone: 'up' }
      ])}
      <div class="mk-bar">
        <button class="btn ghost sm" id="mk-prev">‹</button>
        <b style="font-family:var(--f-display);font-size:17px">${MESES[m - 1]} ${y}</b>
        <button class="btn ghost sm" id="mk-next">›</button>
        <span class="mk-auto">✨ Generar mes con IA · 📅 Programar en Metricool · 🔁 Automatizar (Make)</span>
      </div>
      <div class="mk-cal">
        <div class="mk-week">${DIAS.map(d => `<div class="mk-dh">${d}</div>`).join('')}</div>
        <div class="mk-grid">${grid(y, m)}</div>
      </div>
    </div>`;
    host.querySelector('#mk-prev').addEventListener('click', () => { mes = shift(-1); render(host); });
    host.querySelector('#mk-next').addEventListener('click', () => { mes = shift(1); render(host); });
    host.querySelector('#mk-new').addEventListener('click', () => ficha(null));
    host.querySelector('#mk-imp').addEventListener('click', () => Orbit.importa.open('calendario-marketing', { onDone: () => {
      // import demo: crea contenidos de ejemplo en el mes visible
      const [yy, mm] = mes.split('-').map(Number);
      const base = [['🚗 Auto: 5 preguntas antes de renovar', 'Auto', 'Instagram'], ['🏠 Hogar: qué cubre de verdad tu póliza', 'Hogar / Daños', 'Facebook'], ['📈 Tendencias 2026 en seguros', 'Tendencias', 'LinkedIn'], ['🔄 Renueva a tiempo y ahorra', 'Renovaciones', 'WhatsApp']];
      base.forEach((b, i) => S().insert('contenidos', { id: 'mk' + Date.now().toString().slice(-6) + i, fecha: mes + '-' + String(4 + i * 6).padStart(2, '0'), hora: '08:10', canal: b[2], tipo: 'Texto', enfoque: b[1], estado: 'Programado', titulo: b[0], copy: 'Contenido importado del calendario. Revisa y ajusta antes de publicar.', cta: 'Escríbeme por WhatsApp', hashtags: '#Seguros #GestiónDeRiesgos', stats: null }));
      toast('✓ Calendario importado · 4 contenidos agregados'); render(host);
    } }));
    host.querySelectorAll('[data-day]').forEach(el => el.addEventListener('click', e => { if (e.target.closest('[data-c]')) return; ficha(null, el.dataset.day); }));
    host.querySelectorAll('[data-c]').forEach(el => el.addEventListener('click', () => ficha(el.dataset.c)));
  }
  function shift(d) { const [y, m] = mes.split('-').map(Number); const dt = new Date(y, m - 1 + d, 1); return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'); }

  function grid(y, m) {
    const first = new Date(y, m - 1, 1);
    let off = first.getDay() - 1; if (off < 0) off = 6; // lunes primero
    const days = new Date(y, m, 0).getDate();
    const arr = delMes();
    let cells = '';
    for (let i = 0; i < off; i++) cells += `<div class="mk-cell empty"></div>`;
    for (let d = 1; d <= days; d++) {
      const fecha = mes + '-' + String(d).padStart(2, '0');
      const items = arr.filter(c => c.fecha === fecha);
      cells += `<div class="mk-cell" data-day="${fecha}">
        <div class="mk-d">${d}</div>
        ${items.map(c => `<div class="mk-chip" data-c="${c.id}" title="${U.esc(c.titulo)}"><span>${CANAL_ICON[c.canal] || '•'}</span><span class="mk-chip-t">${U.esc(c.titulo.replace(/^\S+\s/, ''))}</span><span class="mk-dot ${EST_TONE[c.estado]}"></span></div>`).join('')}
      </div>`;
    }
    return cells;
  }

  function ficha(id, fecha) {
    const c = id ? S().get('contenidos', id) : null;
    const canales = ['LinkedIn', 'Facebook', 'Instagram', 'WhatsApp', 'TikTok', 'YouTube'];
    const tipos = ['Texto', 'Carrusel', 'Reel', 'Historia', 'Video'];
    const enfoques = ENFOQUES;
    const estados = ['Idea', 'Programado', 'Publicado'];
    let back = document.getElementById('mk-ficha'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'mk-ficha'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(640px,95vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:16px">${c ? '✏ Editar contenido' : '+ Nuevo contenido'}</b><button class="imp-x" id="mk-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <div class="cgrid">
          <label class="ce-l">Fecha<input id="mk-fecha" class="o-sel" type="date" value="${c ? c.fecha : (fecha || mes + '-01')}"></label>
          <label class="ce-l">Hora<input id="mk-hora" class="o-sel" value="${c ? c.hora : '08:10'}"></label>
          <label class="ce-l">Canal<select id="mk-canal" class="o-sel">${canales.map(x => `<option ${c && c.canal === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          <label class="ce-l">Tipo<select id="mk-tipo" class="o-sel">${tipos.map(x => `<option ${c && c.tipo === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          <label class="ce-l">Enfoque<select id="mk-enfoque" class="o-sel">${enfoques.map(x => `<option ${c && c.enfoque === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          <label class="ce-l">Estado<select id="mk-estado" class="o-sel">${estados.map(x => `<option ${c && c.estado === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        </div>
        <label class="ce-l">Título<input id="mk-titulo" class="o-sel" value="${c ? U.esc(c.titulo) : ''}"></label>
        <label class="ce-l">Copy (cuerpo)<textarea id="mk-copy" class="o-sel" style="min-height:90px;resize:vertical;padding:9px 11px">${c ? U.esc(c.copy) : ''}</textarea></label>
        <div class="cgrid">
          <label class="ce-l">CTA<input id="mk-cta" class="o-sel" value="${c ? U.esc(c.cta || '') : ''}"></label>
          <label class="ce-l">Hashtags<input id="mk-hash" class="o-sel" value="${c ? U.esc(c.hashtags || '') : ''}"></label>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn ghost sm" id="mk-ia">✨ Generar copy con IA</button>
          <button class="btn ghost sm" id="mk-pieza">🎨 Crear pieza (Canva)</button>
          <button class="btn ghost sm" id="mk-prog">📅 Programar (Metricool)</button>
        </div>
        ${c && c.stats ? `<div class="cfg-note">📊 Alcance <b>${c.stats.alcance.toLocaleString('es')}</b> · interacciones <b>${c.stats.interac}</b> · leads <b>${c.stats.leads}</b></div>` : ''}
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:space-between">
        ${c ? '<button class="btn ghost" id="mk-del" style="color:var(--danger)">🗑 Eliminar</button>' : '<span></span>'}
        <div style="display:flex;gap:8px"><button class="btn ghost" id="mk-cancel">Cancelar</button><button class="btn primary" id="mk-ok">Guardar</button></div>
      </div></div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#mk-x').addEventListener('click', close); $('#mk-cancel').addEventListener('click', close);
    $('#mk-ia').addEventListener('click', () => {
      const enf = $('#mk-enfoque').value, canal = $('#mk-canal').value;
      const emoji = enfEmoji(enf);
      if (!$('#mk-titulo').value) $('#mk-titulo').value = emoji + ' ' + enf + ': 3 claves que sí valen la pena en 2026';
      $('#mk-copy').value = `${emoji} Te comparto en simple sobre ${enf.toLowerCase()}:\n\n1) ✅ Lo que más impacta a empresas y familias (sin tecnicismos).\n2) 📌 Un tip práctico que puedes aplicar hoy.\n3) 🤝 Cómo te acompañamos si necesitas revisarlo.\n\nLa idea no es complicar: es darte claridad y confianza.`;
      if (!$('#mk-cta').value) $('#mk-cta').value = 'Escríbeme REVISIÓN por WhatsApp y te ayudo sin compromiso';
      if (!$('#mk-hash').value) $('#mk-hash').value = '#Seguros #GestiónDeRiesgos #' + (canal === 'LinkedIn' ? 'Empresas' : 'Familias');
      toast('✨ Copy generado con IA — revisa y ajusta el tono');
    });
    $('#mk-pieza').addEventListener('click', () => {
      if (Orbit.cat && Orbit.cat.all().addons && !Orbit.cat.all().addons) {}
      const on = (Orbit.tenant && Orbit.tenant.get && Orbit.tenant.get().addons && Orbit.tenant.get().addons.canva);
      toast(on ? '🎨 Enviando a Canva para generar la pieza…' : '🎨 Activa Canva en Configuración › Integraciones para generar piezas');
    });
    $('#mk-prog').addEventListener('click', () => {
      const f = $('#mk-fecha').value, h = $('#mk-hora').value;
      $('#mk-estado').value = 'Programado';
      toast('📅 Programado para ' + f + ' ' + h + ' · se publicará vía Metricool');
    });
    if ($('#mk-del')) $('#mk-del').addEventListener('click', () => { S().remove('contenidos', id); close(); render(host); });
    $('#mk-ok').addEventListener('click', () => {
      const data = { fecha: $('#mk-fecha').value, hora: $('#mk-hora').value, canal: $('#mk-canal').value, tipo: $('#mk-tipo').value, enfoque: $('#mk-enfoque').value, estado: $('#mk-estado').value, titulo: $('#mk-titulo').value || '(sin título)', copy: $('#mk-copy').value, cta: $('#mk-cta').value, hashtags: $('#mk-hash').value };
      if (id) S().update('contenidos', id, data); else S().insert('contenidos', Object.assign({ id: 'mk' + Date.now().toString().slice(-7), stats: null }, data));
      close(); render(host);
    });
  }

  return { render };
})();
