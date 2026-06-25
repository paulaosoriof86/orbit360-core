/* ============================================================
   Orbit 360 · Orbit Academia (capacitación / LMS)
   Bloques de capacitación con progreso, lecciones (video/lectura/
   quiz), certificaciones y recursos. Se alimenta de documentos
   comerciales por aseguradora (interalimenta IA y Cotizador).
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.academia = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  let host, filtro = 'todas';
  const TIPO_ICON = { video: '🎬', lectura: '📖', quiz: '✏️' };

  function cursos() { return S().all('cursos'); }
  function kpi(label, val, foot, color, fkey) {
    return `<button class="kpi kpi-click" data-kpi="${fkey}"><div class="k-accent" style="background:${color}"></div><div class="k-label">${label}</div><div class="k-val">${val}</div><div class="k-foot">${foot}</div></button>`;
  }

  function render(h) {
    host = h;
    const arr = cursos();
    const cats = ['todas'].concat([...new Set(arr.map(c => c.cat))]);
    const lista = filtro === 'todas' ? arr : arr.filter(c => c.cat === filtro);
    const compl = arr.filter(c => c.progreso >= 100).length;
    const certs = arr.filter(c => c.certificado).length;
    const avg = arr.length ? Math.round(arr.reduce((s, c) => s + c.progreso, 0) / arr.length) : 0;
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '🎓', title: 'Orbit Academia', sub: 'Capacitación, certificaciones y recursos del equipo', features: [], actions: `<button class="btn ghost" id="ac-ia" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">✨ Crear con IA</button><button class="btn ghost" id="ac-imp" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">⬆ Cargar recurso</button><button class="btn primary" id="ac-new" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)">+ Curso</button>` })}
      <div class="kpi-row">
        ${kpi('Cursos', arr.length, compl + ' completados', 'var(--red)', 'todas')}
        ${kpi('Avance promedio', avg + '%', 'del equipo', 'var(--info)', '')}
        ${kpi('Certificaciones', certs, 'obtenidas', 'var(--ok)', 'cert')}
        ${kpi('Lecciones', arr.reduce((s, c) => s + (c.lecciones || []).length, 0), 'disponibles', 'var(--warn)', '')}
      </div>
      <div class="tabs" style="max-width:640px;margin-bottom:16px">
        ${cats.map(c => `<div class="tab ${filtro === c ? 'active' : ''}" data-f="${c}">${c === 'todas' ? 'Todas' : c}</div>`).join('')}
      </div>
      <div class="ac-grid">${lista.map(card).join('')}</div>
    </div>`;
    host.querySelectorAll('.tab[data-f]').forEach(el => el.addEventListener('click', () => { filtro = el.dataset.f; render(host); }));
    host.querySelectorAll('[data-cur]').forEach(el => el.addEventListener('click', () => abrir(el.dataset.cur)));
    host.querySelectorAll('[data-kpi]').forEach(el => el.addEventListener('click', () => { filtro = el.dataset.kpi || 'todas'; render(host); }));
    host.querySelector('#ac-imp').addEventListener('click', () => Orbit.importa.open('documentos', { onDone: () => render(host) }));
    host.querySelector('#ac-new').addEventListener('click', () => editar(null));
    host.querySelector('#ac-ia').addEventListener('click', crearIA);
  }

  function card(c) {
    const lec = (c.lecciones || []).length, min = (c.lecciones || []).reduce((s, l) => s + (l.min || 0), 0);
    return `<div class="ac-card" data-cur="${c.id}">
      <div class="ac-card-top" style="background:linear-gradient(120deg,${c.color},#10141a)">
        <span class="ac-emoji">${c.emoji}</span>
        <span class="badge" style="background:rgba(255,255,255,.18);color:#fff;border:none">${c.cat}</span>
        ${c.certificado ? '<span class="ac-cert">🏅 Certificado</span>' : ''}
      </div>
      <div class="ac-card-b">
        <b style="font-family:var(--f-display);font-size:15px">${U.esc(c.titulo)}</b>
        <p class="muted" style="font-size:12.5px;margin:5px 0 10px;line-height:1.5">${U.esc(c.desc)}</p>
        <div class="ac-meta">${lec} lecciones · ${min} min</div>
        <div class="ac-bar"><i style="width:${c.progreso}%;background:${c.progreso >= 100 ? 'var(--ok)' : c.color}"></i></div>
        <div class="ac-prog">${c.progreso}% completado</div>
      </div>
    </div>`;
  }

  function abrir(id) {
    const c = S().get('cursos', id); if (!c) return;
    const done = Math.round((c.progreso / 100) * (c.lecciones || []).length);
    let back = document.getElementById('ac-ficha'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ac-ficha'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(640px,95vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:22px 24px;background:linear-gradient(120deg,${c.color},#10141a);color:#fff">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.8)">${c.cat}</div>
            <h2 style="font-family:var(--f-display);font-weight:800;font-size:22px;margin:0">${c.emoji} ${U.esc(c.titulo)}</h2></div>
          <button class="imp-x" id="ac-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button>
        </div>
        <p style="font-size:13px;color:rgba(255,255,255,.9);margin:8px 0 0">${U.esc(c.desc)}</p>
        <div class="ac-bar" style="margin-top:12px;background:rgba(255,255,255,.2)"><i style="width:${c.progreso}%;background:#fff"></i></div>
        <div style="font-size:12px;margin-top:5px">${c.progreso}% · ${done}/${(c.lecciones || []).length} lecciones</div>
      </div>
      <div style="padding:18px 22px">
        <div class="asg-sec-t">Lecciones</div>
        <div class="ac-lecs">${(c.lecciones || []).map((l, i) => `<div class="ac-lec ${i < done ? 'done' : ''}" data-lec="${i}">
          <span class="ac-lec-ic">${i < done ? '✓' : TIPO_ICON[l.tipo] || '•'}</span>
          <span style="flex:1"><b>${U.esc(l.t)}</b><span class="muted" style="font-size:11.5px"> · ${l.tipo} · ${l.min} min</span></span>
          ${i < done ? '<span class="badge ok" style="font-size:10px">Completada</span>' : '<button class="btn ghost sm" data-play="' + i + '">▶ Iniciar</button>'}
        </div>`).join('')}</div>
        ${c.certificado ? '<div class="cfg-note" style="margin-top:14px;border-left:3px solid var(--ok)">🏅 <b>Certificado obtenido.</b> Disponible para descarga en el perfil del asesor.</div>' : ''}
        ${(c.recursos || []).length ? `<div class="asg-sec-t" style="margin-top:18px">📎 Recursos del curso</div><div style="display:flex;gap:7px;flex-wrap:wrap">${c.recursos.map(rc => `<button class="ac-res" data-res="${U.esc(rc.nombre)}">${rc.tipo === 'pdf' ? '📄' : rc.tipo === 'img' ? '🖼️' : '📎'} ${U.esc(rc.nombre)}</button>`).join('')}</div>` : ''}
      </div>
      <div style="padding:14px 22px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn ghost" data-close>Cerrar</button>
        ${c.progreso < 100 ? `<button class="btn primary" id="ac-cont">${c.progreso === 0 ? 'Comenzar curso' : 'Continuar'}</button>` : '<button class="btn ghost" id="ac-reset">↺ Repasar</button>'}
      </div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#ac-x').addEventListener('click', close);
    back.querySelector('[data-close]').addEventListener('click', close);
    function avanzar() {
      const tot = (c.lecciones || []).length; const next = Math.min(tot, done + 1);
      const prog = Math.round(next / tot * 100);
      S().update('cursos', id, { progreso: prog, certificado: prog >= 100 ? true : c.certificado });
      if (prog >= 100) S().insert('actividades', { id: 'act' + Date.now(), clienteId: '', asesorId: 'ase001', tipo: 'sistema', icon: '🏅', fecha: '2026-06-24', titulo: 'Curso completado: ' + c.titulo, detalle: 'Certificación obtenida.' });
      abrir(id);
    }
    const cont = back.querySelector('#ac-cont'); if (cont) cont.addEventListener('click', avanzar);
    back.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => verLeccion(c, +b.dataset.play, avanzar)));
    back.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => verLeccion(c, +b.dataset.open, null)));
    const rs = back.querySelector('#ac-reset'); if (rs) rs.addEventListener('click', () => { S().update('cursos', id, { progreso: 0 }); abrir(id); });
    back.querySelectorAll('[data-res]').forEach(b => b.addEventListener('click', () => verRecurso(b.dataset.res)));
  }

  /* ---- Visor de recurso (documento legible en la plataforma) ---- */
  function verRecurso(nombre) {
    const ext = (nombre.split('.').pop() || '').toLowerCase();
    let back = document.getElementById('ac-res'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ac-res'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    const visor = (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'img')
      ? `<div class="ac-docview" style="display:grid;place-items:center;background:var(--surface)"><div style="text-align:center;color:var(--ink-3)"><div style="font-size:46px">🖼️</div><div style="margin-top:8px">Vista previa de imagen</div></div></div>`
      : `<div class="ac-docview"><div class="ac-doc-page"><b style="font-family:var(--f-display);font-size:16px">${U.esc(nombre)}</b><p style="margin-top:10px;line-height:1.7;font-size:13.5px">Este documento se visualiza dentro de la plataforma sin necesidad de descargarlo. El contenido real se renderiza al cargar el archivo (PDF embebido con visor nativo).</p><p style="margin-top:10px;line-height:1.7;font-size:13.5px;color:var(--ink-3)">Soporta PDF, imágenes y documentos de Office mediante visor integrado.</p></div></div>`;
    back.innerHTML = `<div class="card" style="width:min(720px,96vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:15px">📎 ${U.esc(nombre)}</b><button class="imp-x" id="ar-x">✕</button></div>
      ${visor}
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" id="ar-close">Cerrar</button><button class="btn primary" onclick="alert('Descarga del recurso')">⬇ Descargar</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#ar-x').addEventListener('click', close);
    back.querySelector('#ar-close').addEventListener('click', close);
  }

  /* ---- Crear curso con IA (genera estructura editable e iterable) ---- */
  function crearIA() {
    const html = `<label class="ce-l">¿Sobre qué tema?<input id="ai-tema" class="o-sel" placeholder="Ej. Seguro de Vida para familias"></label>
      <label class="ce-l" style="margin-top:10px">Dirigido a<select id="ai-dest" class="o-sel"><option value="equipo">👥 Equipo (asesores)</option><option value="clientes">🧑 Clientes</option><option value="ambos">Ambos</option></select></label>
      <label class="ce-l" style="margin-top:10px">Categoría<select id="ai-cat" class="o-sel">${['Inducción', 'Técnico', 'Comercial', 'Producto', 'Normativa', 'Educativo'].map(c => `<option>${c}</option>`).join('')}</select></label>
      <div class="cfg-note" style="margin-top:10px">✨ La IA genera el curso (título, descripción y lecciones). Luego puedes <b>iterar, editar y completar</b> antes de publicar.</div>`;
    const back = drawer('✨ Crear curso con IA', html, () => {
      const tema = back.querySelector('#ai-tema').value || 'Tema de seguros';
      const dest = back.querySelector('#ai-dest').value, cat = back.querySelector('#ai-cat').value;
      const emoji = { 'Producto': '🚗', 'Técnico': '🛡️', 'Comercial': '🎯', 'Normativa': '⚖️', 'Educativo': '📚', 'Inducción': '🚀' }[cat] || '🎓';
      const nuevo = { id: 'cur' + Date.now().toString().slice(-6), titulo: tema, cat, emoji, color: '#C5162E', desc: 'Curso generado con IA sobre ' + tema.toLowerCase() + '. Revisa y ajusta el contenido.', destinatarios: dest,
        lecciones: [{ t: 'Introducción a ' + tema, tipo: 'video', min: 8, url: '' }, { t: 'Conceptos clave', tipo: 'lectura', min: 12, texto: 'La IA redacta aquí los conceptos clave de ' + tema + '. Edítalo para ajustar el tono y el detalle.' }, { t: 'Casos prácticos', tipo: 'lectura', min: 10, texto: 'Ejemplos prácticos generados por IA.' }, { t: 'Evaluación', tipo: 'quiz', min: 10 }],
        recursos: [{ nombre: 'Resumen ' + tema + '.pdf', tipo: 'pdf' }], progreso: 0, certificado: false };
      S().insert('cursos', nuevo);
      back.remove(); editar(nuevo.id); // abre para iterar/editar
    }, '✨ Generar y editar');
  }

  /* ---- Crear / editar curso (autoadministrable: emoji + lecciones + recursos) ---- */
  function editar(id) {
    const c = id ? S().get('cursos', id) : { id: '', titulo: '', cat: 'Inducción', emoji: '🎓', color: '#C5162E', desc: '', lecciones: [], recursos: [], progreso: 0, certificado: false };
    const cats = ['Inducción', 'Técnico', 'Comercial', 'Producto', 'Normativa'];
    const emojis = ['🎓', '🚀', '🛡️', '🎯', '🚗', '❤️', '🏠', '⚖️', '📈', '💼', '📚', '🔐'];
    const colores = ['#C5162E', '#1f3a5f', '#1f8a4c', '#c9821b', '#6b4ea0', '#0f766e'];
    let lecs = JSON.parse(JSON.stringify(c.lecciones || []));
    let recs = JSON.parse(JSON.stringify(c.recursos || []));
    let back = document.getElementById('ac-edit'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ac-edit'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    function paint() {
      back.querySelector('#ae-lecs').innerHTML = lecs.map((l, i) => `<div class="asg-row" data-lecrow="${i}">
        <input class="o-sel" data-lt value="${U.esc(l.t || '')}" placeholder="Título de la lección" style="flex:2">
        <select class="o-sel" data-ltipo style="flex:1">${['video', 'lectura', 'quiz'].map(t => `<option ${t === l.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <input class="o-sel" data-lmin type="number" value="${l.min || 10}" style="width:62px" title="minutos">
        <input class="o-sel" data-lurl value="${U.esc(l.url || '')}" placeholder="URL video / —" style="flex:1.4">
        <button class="asg-del" data-dellec="${i}">✕</button></div>`).join('') || '<div class="muted" style="font-size:12px">Sin lecciones aún.</div>';
      back.querySelector('#ae-recs').innerHTML = recs.map((r, i) => `<div class="asg-row" data-recrow="${i}">
        <input class="o-sel" data-rn value="${U.esc(r.nombre || '')}" placeholder="archivo.pdf" style="flex:2">
        <select class="o-sel" data-rt style="flex:1">${['pdf', 'img', 'doc', 'video'].map(t => `<option ${t === r.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <button class="asg-del" data-delrec="${i}">✕</button></div>`).join('') || '<div class="muted" style="font-size:12px">Sin recursos.</div>';
      back.querySelectorAll('[data-dellec]').forEach(b => b.addEventListener('click', () => { snapLecs(); lecs.splice(+b.dataset.dellec, 1); paint(); }));
      back.querySelectorAll('[data-delrec]').forEach(b => b.addEventListener('click', () => { snapRecs(); recs.splice(+b.dataset.delrec, 1); paint(); }));
    }
    function snapLecs() { lecs = [...back.querySelectorAll('[data-lecrow]')].map(r => ({ t: r.querySelector('[data-lt]').value, tipo: r.querySelector('[data-ltipo]').value, min: +r.querySelector('[data-lmin]').value || 10, url: r.querySelector('[data-lurl]').value })); }
    function snapRecs() { recs = [...back.querySelectorAll('[data-recrow]')].map(r => ({ nombre: r.querySelector('[data-rn]').value, tipo: r.querySelector('[data-rt]').value })); }
    back.innerHTML = `<div class="card" style="width:min(680px,96vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">${id ? '✏ Editar curso' : '+ Nuevo curso'}</b><button class="imp-x" id="ae-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:13px">
        <div class="cgrid">
          <label class="ce-l">Título<input id="ae-titulo" class="o-sel" value="${U.esc(c.titulo)}"></label>
          <label class="ce-l">Categoría<select id="ae-cat" class="o-sel">${cats.map(x => `<option ${x === c.cat ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        </div>
        <label class="ce-l">Dirigido a<select id="ae-dest" class="o-sel">${[['equipo', '👥 Equipo (asesores)'], ['clientes', '🧑 Clientes'], ['ambos', 'Ambos']].map(o => `<option value="${o[0]}" ${(c.destinatarios || 'equipo') === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></label>
        <label class="ce-l">Emoji<div style="display:flex;gap:5px;flex-wrap:wrap" id="ae-emojis">${emojis.map(e => `<button type="button" class="ac-emoji-pick ${e === c.emoji ? 'on' : ''}" data-emoji="${e}">${e}</button>`).join('')}</div></label>
        <label class="ce-l">Color<div style="display:flex;gap:6px" id="ae-colors">${colores.map(col => `<button type="button" class="ac-color-pick ${col === c.color ? 'on' : ''}" data-color="${col}" style="background:${col}"></button>`).join('')}</div></label>
        <label class="ce-l">Descripción<textarea id="ae-desc" class="o-sel" style="min-height:54px;resize:vertical;padding:9px 11px">${U.esc(c.desc)}</textarea></label>
        <div><div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">Lecciones <button class="btn ghost sm" id="ae-addlec">+ Lección</button></div><div id="ae-lecs" style="display:grid;gap:7px"></div></div>
        <div><div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">Recursos <button class="btn ghost sm" id="ae-addrec">+ Recurso</button></div><div id="ae-recs" style="display:grid;gap:7px"></div></div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:space-between">
        ${id ? '<button class="btn ghost" id="ae-del" style="color:var(--danger)">🗑 Borrar</button>' : '<span></span>'}
        <div style="display:flex;gap:8px"><button class="btn ghost" id="ae-cancel">Cancelar</button><button class="btn primary" id="ae-ok">Guardar curso</button></div>
      </div></div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s);
    const close = () => back.remove();
    let emoji = c.emoji, color = c.color;
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#ae-x').addEventListener('click', close); $('#ae-cancel').addEventListener('click', close);
    back.querySelectorAll('[data-emoji]').forEach(b => b.addEventListener('click', () => { emoji = b.dataset.emoji; back.querySelectorAll('[data-emoji]').forEach(x => x.classList.toggle('on', x === b)); }));
    back.querySelectorAll('[data-color]').forEach(b => b.addEventListener('click', () => { color = b.dataset.color; back.querySelectorAll('[data-color]').forEach(x => x.classList.toggle('on', x === b)); }));
    $('#ae-addlec').addEventListener('click', () => { snapLecs(); lecs.push({ t: '', tipo: 'video', min: 10, url: '' }); paint(); });
    $('#ae-addrec').addEventListener('click', () => { snapRecs(); recs.push({ nombre: '', tipo: 'pdf' }); paint(); });
    if ($('#ae-del')) $('#ae-del').addEventListener('click', () => { if (confirm('¿Borrar curso?')) { S().remove('cursos', id); close(); render(host); } });
    $('#ae-ok').addEventListener('click', () => {
      snapLecs(); snapRecs();
      const data = { titulo: $('#ae-titulo').value || 'Nuevo curso', cat: $('#ae-cat').value, emoji, color, desc: $('#ae-desc').value, destinatarios: ($('#ae-dest') || {}).value || 'equipo', lecciones: lecs.filter(l => l.t), recursos: recs.filter(r => r.nombre) };
      if (id) S().update('cursos', id, data); else S().insert('cursos', Object.assign({ id: 'cur' + Date.now().toString().slice(-6), progreso: 0, certificado: false }, data));
      close(); render(host);
    });
    paint();
  }

  /* ---- Visor de lección: video embebido / lectura legible / quiz ---- */
  function verLeccion(c, i, onDone) {
    const l = (c.lecciones || [])[i]; if (!l) return;
    let back = document.getElementById('ac-lec'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ac-lec'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    let cuerpo = '';
    if (l.tipo === 'video') {
      cuerpo = l.url ? `<div class="ac-video"><iframe src="${l.url}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>`
        : `<div class="ac-video ac-video-ph"><div style="text-align:center"><div style="font-size:40px">🎬</div><div class="muted" style="margin-top:8px">Video pendiente de cargar.</div><div class="muted" style="font-size:11.5px">Pega la URL (YouTube/Vimeo) o sube el archivo en recursos.</div></div></div>`;
    } else if (l.tipo === 'lectura') {
      cuerpo = `<div class="ac-read">${U.esc(l.texto || 'Contenido de lectura de la lección.')}</div>`;
    } else {
      cuerpo = `<div class="ac-read"><b>Evaluación</b><p style="margin-top:8px">Responde las preguntas para completar la lección. (En producción se conecta el banco de preguntas.)</p><label class="chk-row"><input type="checkbox"> Pregunta 1 respondida</label><label class="chk-row"><input type="checkbox"> Pregunta 2 respondida</label></div>`;
    }
    back.innerHTML = `<div class="card" style="width:min(720px,96vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:15px">${TIPO_ICON[l.tipo] || '•'} ${U.esc(l.t)} <span class="muted" style="font-weight:400;font-size:12px">· ${l.min} min</span></b>
        <button class="imp-x" id="al-x">✕</button></div>
      <div style="padding:18px 20px">${cuerpo}</div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn ghost" id="al-close">Cerrar</button>
        ${onDone ? '<button class="btn primary" id="al-done">✓ Marcar completada</button>' : ''}
      </div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#al-x').addEventListener('click', close);
    back.querySelector('#al-close').addEventListener('click', close);
    const dn = back.querySelector('#al-done'); if (dn) dn.addEventListener('click', () => { close(); if (onDone) onDone(); });
  }

  return { render };
})();
