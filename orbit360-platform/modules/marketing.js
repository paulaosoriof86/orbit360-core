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
        { label: 'Contenidos del mes', val: arr.length, color: 'var(--red)', foot: pub.length + ' publicados', onclick: "location.hash='#/marketing'" },
        { label: 'Alcance', val: alcance.toLocaleString('es'), color: 'var(--info)', foot: 'personas', onclick: "location.hash='#/marketing'" },
        { label: 'Interacciones', val: pub.reduce((s, c) => s + ((c.stats && c.stats.interac) || 0), 0), color: 'var(--ok)', foot: 'likes/coment/share', onclick: "location.hash='#/marketing'" },
        { label: 'Leads generados', val: leads, color: 'var(--warn)', foot: 'desde contenidos', footTone: 'up' }
      ])}
      <div class="mk-bar">
        <div class="mk-nav"><button class="mk-navb" id="mk-prev">‹</button>
        <b style="font-family:var(--f-display);font-size:18px;min-width:150px;text-align:center">${MESES[m - 1]} ${y}</b>
        <button class="mk-navb" id="mk-next">›</button></div>
        <button class="btn ghost sm" id="mk-gen">✨ Generar mes con IA</button>
        <button class="btn ghost sm" id="mk-reprog">🔁 Reprogramar atrasados</button>
      </div>
      <div class="mk-cal">
        <div class="mk-week">${DIAS.map(d => `<div class="mk-dh">${d}</div>`).join('')}</div>
        <div class="mk-grid">${grid(y, m)}</div>
      </div>
      <div class="mk-legend">
        <span><span class="mk-dot neutral"></span>Idea</span>
        <span><span class="mk-dot info"></span>Programado</span>
        <span><span class="mk-dot ok"></span>Publicado</span>
        <span><span class="mk-dot danger"></span>Atrasado</span>
      </div>
    </div>`;
    host.querySelector('#mk-prev').addEventListener('click', () => { mes = shift(-1); render(host); });
    host.querySelector('#mk-next').addEventListener('click', () => { mes = shift(1); render(host); });
    host.querySelector('#mk-new').addEventListener('click', () => ficha(null));
    host.querySelector('#mk-gen').addEventListener('click', () => { generarMes(); });
    host.querySelector('#mk-reprog').addEventListener('click', () => { reprogramar(); });
    host.querySelector('#mk-imp').addEventListener('click', () => Orbit.importa.open('calendario-marketing', { onDone: () => { render(host); } }));
    host.querySelectorAll('[data-day]').forEach(el => el.addEventListener('click', e => { if (e.target.closest('[data-c]') || e.target.closest('[data-add]')) return; ficha(null, el.dataset.day); }));
    host.querySelectorAll('[data-add]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); ficha(null, el.dataset.add); }));
    host.querySelectorAll('[data-c]').forEach(el => el.addEventListener('click', () => ficha(el.dataset.c)));
  }
  function shift(d) { const [y, m] = mes.split('-').map(Number); const dt = new Date(y, m - 1 + d, 1); return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'); }

  function grid(y, m) {
    const first = new Date(y, m - 1, 1);
    let off = first.getDay() - 1; if (off < 0) off = 6;
    const days = new Date(y, m, 0).getDate();
    const arr = delMes();
    const now = U.NOW ? new Date(U.NOW) : new Date();
    const hoyStr = now.toISOString().slice(0, 10);
    let cells = '';
    for (let i = 0; i < off; i++) cells += `<div class="mk-cell empty"></div>`;
    for (let d = 1; d <= days; d++) {
      const fecha = mes + '-' + String(d).padStart(2, '0');
      const items = arr.filter(c => c.fecha === fecha);
      const esHoy = fecha === hoyStr;
      cells += `<div class="mk-cell ${esHoy ? 'today' : ''}" data-day="${fecha}">
        <div class="mk-d">${esHoy ? '<span class="mk-today">' + d + '</span>' : d}${items.length ? `<span class="mk-count">${items.length}</span>` : ''}</div>
        ${items.slice(0, 3).map(c => {
          const atras = c.estado !== 'Publicado' && c.fecha < hoyStr;
          const tone = atras ? 'danger' : EST_TONE[c.estado];
          return `<div class="mk-chip" data-c="${c.id}" title="${U.esc(c.titulo)}" style="--enf:${enfColor(c.enfoque)}">
            <span class="mk-chip-em">${enfEmoji(c.enfoque)}</span>
            <span class="mk-chip-t">${U.esc(c.titulo.replace(/^\S+\s/, ''))}</span>
            <span class="mk-chip-ico">${CANAL_ICON[c.canal] || '•'}</span>
            <span class="mk-dot ${tone}"></span></div>`;
        }).join('')}
        ${items.length > 3 ? `<div class="mk-more">+${items.length - 3} más</div>` : ''}
        <button class="mk-add" data-add="${fecha}" title="Agregar contenido">+</button>
      </div>`;
    }
    return cells;
  }
  const ENF_COLOR = { 'Seguros / Riesgos': '#C5162E', 'Auto': '#2563a8', 'Vida y GM': '#be185d', 'Hogar / Daños': '#c9821b', 'Logística / Transporte': '#0e7490', 'Educativo': '#6b4ea0', 'Tendencias': '#1f8a4c', 'Normativa': '#475569', 'Prospecting': '#b45309', 'Renovaciones': '#0f766e' };
  function enfColor(e) { return ENF_COLOR[e] || '#C5162E'; }

  /* generar mes con IA (demo: rellena días con ideas de seguros) */
  async function generarMes() {
    const fallback = [['🚗 Auto: lo que tu póliza sí cubre', 'Auto', 'Instagram'], ['❤️ Vida: proteger a los tuyos en 3 pasos', 'Vida y GM', 'Facebook'], ['🏠 Hogar: riesgos que olvidamos', 'Hogar / Daños', 'LinkedIn'], ['📈 Tendencias 2026 en seguros', 'Tendencias', 'LinkedIn'], ['🔄 Renueva a tiempo y ahorra', 'Renovaciones', 'WhatsApp'], ['📚 ¿Qué es el deducible? En simple', 'Educativo', 'Instagram']];
    const [y, mm] = mes.split('-').map(Number);
    let ideas = null;
    if (window.claude && window.claude.complete) {
      toast('🧠 Generando ideas con IA…');
      try {
        const prompt = 'Eres estratega de marketing de una correduría de seguros. Diseña un PLAN mensual de contenidos para ' + MESES[mm - 1] + ' con criterio estratégico: cubre las 4 semanas, mezcla objetivos (captación, educación, retención/renovación, prueba social/confianza), varía ramos (auto, vida/GM, hogar, pyme) y canales (Instagram, Facebook, LinkedIn, WhatsApp), e incluye fechas clave del mes si aplica. Devuelve SOLO un JSON array sin markdown de 8 items, cada item: ["título con emoji","enfoque/ramo","canal","objetivo (captación|educación|retención|confianza)","CTA breve"]. Español, útil, sin relleno.';
        const out = await window.claude.complete({ messages: [{ role: 'user', content: prompt }] });
        const m = String(out).match(/\[[\s\S]*\]/); if (m) { const arr = JSON.parse(m[0]); if (Array.isArray(arr) && arr.length) ideas = arr.filter(x => Array.isArray(x) && x.length >= 3); }
      } catch (e) {}
    }
    if (!ideas || !ideas.length) ideas = fallback;
    ideas.forEach((b, i) => { const dd = 3 + i * 4; if (dd <= new Date(y, mm, 0).getDate()) S().insert('contenidos', { id: 'mk' + Date.now().toString().slice(-6) + i, fecha: mes + '-' + String(dd).padStart(2, '0'), hora: '08:10', canal: b[2], tipo: 'Texto', enfoque: b[1], estado: 'Idea', titulo: b[0], copy: 'Borrador generado con IA — revisa el tono antes de programar.', cta: 'Escríbeme por WhatsApp', hashtags: '#Seguros #GestiónDeRiesgos', stats: null }); });
    toast('✨ ' + ideas.length + ' ideas generadas para ' + MESES[mm - 1]); render(host);
  }
  /* reprogramar publicaciones atrasadas al siguiente día disponible */
  function reprogramar() {
    const hoy = (U.NOW ? new Date(U.NOW) : new Date()).toISOString().slice(0, 10);
    const atras = todos().filter(c => c.estado !== 'Publicado' && c.fecha < hoy);
    if (!atras.length) { toast('✓ No hay publicaciones atrasadas'); return; }
    atras.forEach((c, i) => { const d = new Date(hoy); d.setDate(d.getDate() + 1 + i); S().update('contenidos', c.id, { fecha: d.toISOString().slice(0, 10), estado: 'Programado' }); });
    toast('🔁 ' + atras.length + ' publicación(es) reprogramada(s) automáticamente'); render(host);
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
    $('#mk-ia').addEventListener('click', async () => {
      const enf = $('#mk-enfoque').value, canal = $('#mk-canal').value;
      const emoji = enfEmoji(enf);
      const iaB = $('#mk-ia');
      if (window.claude && window.claude.complete) {
        iaB.textContent = '🧠 Generando…'; iaB.disabled = true;
        try {
          const prompt = 'Eres community manager de una correduría de seguros. Escribe un post para ' + canal + ' sobre "' + enf + '". Devuelve SOLO JSON sin markdown: {"titulo":"...","copy":"cuerpo con emojis y 2-3 ideas","cta":"llamado a la acción","hashtags":"#... #..."}. Tono cercano, claro, en español.';
          const out = await window.claude.complete({ messages: [{ role: 'user', content: prompt }] });
          const m = String(out).match(/\{[\s\S]*\}/);
          if (m) { const o = JSON.parse(m[0]); if (o.titulo && !$('#mk-titulo').value) $('#mk-titulo').value = o.titulo; if (o.copy) $('#mk-copy').value = o.copy; if (o.cta) $('#mk-cta').value = o.cta; if (o.hashtags) $('#mk-hash').value = o.hashtags; }
          iaB.textContent = '✨ Generar copy con IA'; iaB.disabled = false;
          toast('✨ Copy generado con IA — revisá y ajustá el tono'); return;
        } catch (e) { iaB.textContent = '✨ Generar copy con IA'; iaB.disabled = false; }
      }
      // fallback sin IA
      if (!$('#mk-titulo').value) $('#mk-titulo').value = emoji + ' ' + enf + ': 3 claves que sí valen la pena en 2026';
      $('#mk-copy').value = `${emoji} Te comparto en simple sobre ${enf.toLowerCase()}:\n\n1) ✅ Lo que más impacta a empresas y familias (sin tecnicismos).\n2) 📌 Un tip práctico que puedes aplicar hoy.\n3) 🤝 Cómo te acompañamos si necesitas revisarlo.\n\nLa idea no es complicar: es darte claridad y confianza.`;
      if (!$('#mk-cta').value) $('#mk-cta').value = 'Escríbeme REVISIÓN por WhatsApp y te ayudo sin compromiso';
      if (!$('#mk-hash').value) $('#mk-hash').value = '#Seguros #GestiónDeRiesgos #' + (canal === 'LinkedIn' ? 'Empresas' : 'Familias');
      toast('✨ Copy generado — revisa y ajusta el tono');
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
