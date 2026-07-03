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
  let host, filtro = 'todas', vista = 'catalogo', rutaRol = null;
  const TIPO_ICON = { video: '🎬', lectura: '📖', quiz: '✏️', recurso: '📎' };
  // paleta para barras de color de las secciones (rota para dar ritmo visual tipo Orbit)
  const SEC_COLORS = ['#2A6FDB', '#1F8A5B', '#D97757', '#7A5Bd9', '#C5162E', '#0E7C86'];
  // formatea el cuerpo (negritas, itálicas, listas, párrafos) de un bloque de texto
  function mdInline(block) {
    let s = U.esc(String(block || '')).trim();
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>');
    s = s.replace(/^\s*[-•]\s+(.*)$/gm, '<li>$1</li>');
    s = s.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul style="margin:4px 0 4px 4px;padding-left:18px">$1</ul>');
    s = s.replace(/\n{2,}/g, '</p><p>').replace(/\n(?!<\/?(ul|li))/g, '<br>');
    return '<p>' + s + '</p>';
  }
  // Convierte texto markdown/emoji en TARJETAS con barra de color (formato Orbit).
  // Reconoce encabezados ##, ###, **Título**, o líneas cortas que arrancan con emoji.
  function mdToHtml(md) {
    const raw = String(md || '').trim();
    if (!raw) return '<div class="ac-read ac-md"><p>Contenido pendiente. Usá ✏ Editar lección para agregarlo.</p></div>';
    const lines = raw.split('\n');
    const emojiHead = /^([\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u2190-\u21FF\u2B00-\u2BFF\u2705\u274C\u26A0\uFE0F]{1,3})\s+(.{2,64})$/u;
    const secs = []; let cur = null;
    const push = (title, icon, color) => { cur = { title: title || '', icon: icon || '▸', color: color || SEC_COLORS[secs.length % SEC_COLORS.length], body: [] }; secs.push(cur); };
    lines.forEach(ln => {
      let m;
      if ((m = ln.match(/^#{1,3}\s+(.*)$/))) { const t = m[1].replace(/\*\*/g, '').trim(); const em = t.match(emojiHead); push(em ? em[2] : t, em ? em[1] : '▸'); }
      else if ((m = ln.match(/^\*\*(.{2,64})\*\*:?\s*$/))) { push(m[1].trim(), '▸'); }
      else if ((m = ln.match(emojiHead)) && ln.trim().length <= 66 && !/[.;]\s/.test(ln)) { push(m[2].trim(), m[1]); }
      else { if (!cur) push('', '📘'); cur.body.push(ln); }
    });
    return secs.map(s => {
      const body = mdInline(s.body.join('\n'));
      const head = s.title ? `<div class="acv-sec-t" style="color:${s.color}">${U.esc(s.icon)} ${U.esc(s.title)}</div>` : '';
      return `<div class="acv-sec ac-md" style="border-left:4px solid ${s.color}">${head}<div class="acv-sec-b">${body}</div></div>`;
    }).join('');
  }
  function fileToDataURL(f, cb) { if (!f) return; const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(f); }
  function fileToText(f, cb) { if (!f) return; if (/\.(txt|csv|md)$/i.test(f.name)) { const r = new FileReader(); r.onload = () => cb(String(r.result)); r.readAsText(f); } else { cb(''); } }
  async function iaTextAsync(prompt, current) { if (Orbit.ia.disponible()) { try { const out = await Orbit.ia.complete(prompt + (current ? '\n\nMejora y expande este borrador:\n' + current : '')); return String(out).trim(); } catch (e) {} } return current || ('📘 Contenido de la lección.\n\nIntroducción, conceptos clave, ejemplos prácticos y cierre. Editá para ajustar el detalle.'); }
  async function iaQuizAsync(tema, current, count, replace) { count = count || 3; if (Orbit.ia.disponible()) { try { const out = await Orbit.ia.complete('Genera ' + count + ' preguntas de opción múltiple sobre "' + (tema || 'seguros') + '". Formato EXACTO: enunciado en una línea, luego cada opción en su propia línea, la correcta con [x] al inicio y las demás con [ ]. Separa preguntas con una línea en blanco. Solo el texto, sin numeración.' + (replace ? '' : ' Que sean DISTINTAS a estas:\n' + (current || ''))); return (replace || !current ? '' : current + '\n\n') + String(out).trim(); } catch (e) {} } let base = []; for (let k = 0; k < count; k++) base.push('¿Pregunta ' + (k + 1) + ' sobre ' + (tema || 'el tema') + '?\n[x] Respuesta correcta\n[ ] Distractor 1\n[ ] Distractor 2'); return (replace || !current ? '' : current + '\n\n') + base.join('\n\n'); }
  async function iaQuizFromDoc(text) { if (Orbit.ia.disponible() && text) { try { const out = await Orbit.ia.complete('A partir de este documento genera 4 preguntas de opción múltiple. Formato: enunciado, opciones en líneas (correcta con [x], otras con [ ]), preguntas separadas por línea en blanco. Documento:\n' + String(text).slice(0, 4000)); return String(out).trim(); } catch (e) {} } return '¿Pregunta basada en el documento?\n[x] Correcta\n[ ] Incorrecta\n[ ] Otra'; }

  function cursosPorRol(rol) {
    rol = rol || (Orbit.auth && Orbit.auth.user && Orbit.auth.user() && Orbit.auth.user().rol) || 'Dirección';
    return S().all('cursos').filter(c => {
      if (!c) return false;
      const d = c.destinatarios || 'equipo';
      if (d === 'clientes') return false; // solo para portal del cliente
      if (d === 'ambos') return true;
      if (d === 'equipo') return true;
      if (d === rol) return true;
      // Dirección/Admin ven todos los cursos de equipo
      if (['Dirección', 'Admin'].includes(rol)) return true;
      return false;
    });
  }
  function cursos() { return cursosPorRol(); }
  function kpi(label, val, foot, color, fkey) {
    return `<button class="kpi kpi-click" data-kpi="${fkey}"><div class="k-accent" style="background:${color}"></div><div class="k-label">${label}</div><div class="k-val">${val}</div><div class="k-foot">${foot}</div></button>`;
  }

  function render(h) {
    host = h;
    const arr = cursos();
    // categorías = union de las guardadas (autoadministrables) + las que ya usan cursos
    const guardadas = (Orbit.cat && Orbit.cat.get) ? Orbit.cat.get('academiaCats') : [];
    const cats = ['todas'].concat([...new Set(guardadas.concat(arr.map(c => c.cat)).filter(Boolean))]);
    const lista = filtro === 'todas' ? arr : arr.filter(c => c.cat === filtro);
    const compl = arr.filter(c => c.progreso >= 100).length;
    const certs = arr.filter(c => c.certificado).length;
    const avg = arr.length ? Math.round(arr.reduce((s, c) => s + c.progreso, 0) / arr.length) : 0;

    const actions = '<button class="btn ghost" id="ac-ia" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">✨ Crear con IA</button>'
      + '<button class="btn ghost" id="ac-man" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">📖 Manuales</button>'
      + '<button class="btn ghost" id="ac-imp" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">⬆ Cargar recurso</button>'
      + '<button class="btn ghost" id="ac-cat" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">+ Categoría</button>'
      + '<button class="btn primary" id="ac-new" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)">+ Curso</button>';

    const catEmoji = { 'todas':'📚','Inducción':'🚀','Técnico':'⚙️','Comercial':'💼','Producto':'📦','Finanzas':'💰','Marketing':'📣','Servicio':'🤝','Cumplimiento':'🛡️','Liderazgo':'🌟','Clientes':'👥' };
    const tabsHtml = cats.map(function(c){
      var ico = catEmoji[c] || '🏷️';
      var label = (c === 'todas' ? 'Todas' : c);
      return '<div class="tab ac-tab' + (filtro === c ? ' active' : '') + '" data-f="' + c + '"><span class="ac-tab-ico">' + ico + '</span> ' + label + '</div>';
    }).join('');

    const kpisHtml = kpi('Cursos', arr.length, compl + ' completados', 'var(--red)', 'todas')
      + kpi('Avance promedio', avg + '%', 'del equipo', 'var(--info)', '')
      + kpi('Certificaciones', certs, 'obtenidas', 'var(--ok)', 'cert')
      + kpi('Lecciones', arr.reduce((s, c) => s + (c.lecciones || []).length, 0), 'disponibles', 'var(--warn)', '');

    const viewToggle = '<div class="tabs" style="max-width:340px;margin-bottom:14px">'
      + '<div class="tab' + (vista === 'catalogo' ? ' active' : '') + '" data-vista="catalogo">📚 Catálogo</div>'
      + '<div class="tab' + (vista === 'ruta' ? ' active' : '') + '" data-vista="ruta">🧭 Ruta por rol</div>'
      + '</div>';
    const bodyHtml = vista === 'ruta'
      ? rutaView()
      : ('<div class="tabs" style="max-width:640px;margin-bottom:16px">' + tabsHtml + '</div><div class="ac-grid">' + lista.map(card).join('') + '</div>');
    host.innerHTML = '<div class="page">'
      + K.banner({ icon: '🎓', title: 'Orbit Academia', sub: 'Capacitación, certificaciones y recursos del equipo', features: [], actions: actions })
      + '<div class="kpi-row">' + kpisHtml + '</div>'
      + viewToggle
      + bodyHtml
      + '</div>';

    host.querySelectorAll('[data-vista]').forEach(el => el.addEventListener('click', () => { vista = el.dataset.vista; render(host); }));
    if (vista === 'ruta') {
      const rs = host.querySelector('#ruta-rol'); if (rs) rs.addEventListener('change', () => { rutaRol = rs.value; render(host); });
      host.querySelectorAll('[data-abrir]').forEach(b => b.addEventListener('click', () => verCurso(b.dataset.abrir)));
    }
    host.querySelectorAll('[data-cert]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); verCertificado(b.dataset.cert); }));

    host.querySelectorAll('.tab[data-f]').forEach(el => el.addEventListener('click', () => { filtro = el.dataset.f; render(host); }));
    host.querySelectorAll('[data-cur]').forEach(el => el.addEventListener('click', (e) => { if (e.target.closest('.ac-act')) return; abrir(el.dataset.cur); }));
    host.querySelectorAll('[data-edit]').forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); editar(el.dataset.edit); }));
    host.querySelectorAll('[data-del]').forEach(el => el.addEventListener('click', async (e) => { e.stopPropagation(); const c = S().get('cursos', el.dataset.del); if (c && (await Orbit.ui.confirm('¿Eliminar el curso "' + c.titulo + '"? Esta acción no se puede deshacer.', { title: 'Eliminar curso', ok: 'Eliminar' }))) { S().remove('cursos', el.dataset.del); render(host); } }));
    host.querySelectorAll('[data-kpi]').forEach(el => el.addEventListener('click', () => { filtro = el.dataset.kpi || 'todas'; render(host); }));
    const impBtn = host.querySelector('#ac-imp'); if (impBtn) impBtn.addEventListener('click', () => Orbit.importa.open('documentos', { onDone: () => render(host) }));
    const newBtn = host.querySelector('#ac-new'); if (newBtn) newBtn.addEventListener('click', () => editar(null));
    const iaBtn  = host.querySelector('#ac-ia');  if (iaBtn)  iaBtn.addEventListener('click', crearIA);
    const catBtn = host.querySelector('#ac-cat'); if (catBtn) catBtn.addEventListener('click', gestionCategorias);
    const manBtn = host.querySelector('#ac-man'); if (manBtn) manBtn.addEventListener('click', verManuales);
  }

  /* ---- Lector de manuales in-app (iframe, sin descarga) ---- */
  function verManuales() {
    const rol = (Orbit.auth && Orbit.auth.user && Orbit.auth.user() && Orbit.auth.user().rol) || 'Dirección';
    const manuales = [
      { t: 'Manual maestro (todos los módulos)', src: 'docs/manual-maestro.html', ico: '📘', sub: 'Super Admin · visión completa', roles: ['Dirección', 'Admin'] },
      { t: 'Capacitación técnica interna', src: 'docs/capacitacion-tecnica-interna.html', ico: '🛠', sub: 'Demo, backend, migración, soporte', roles: ['Dirección', 'Admin'] },
      { t: 'Capacitación CRM', src: 'docs/capacitacion-crm.html', ico: '🎯', sub: 'Operación diaria del CRM', roles: ['Dirección', 'Admin', 'Operativo', 'Asesor', 'Comercial'] },
      { t: 'Manual de integraciones', src: 'docs/manual-integraciones.html', ico: '🔌', sub: 'Configuración, utilidad y valor de cada integración', roles: ['Dirección', 'Admin'] },
      { t: 'Comparativa de motores de IA', src: 'docs/comparativa-ia.html', ico: '🤖', sub: 'Gemini / ChatGPT / Claude — costo y calidad', roles: ['Dirección', 'Admin'] }
    ];
    const visibles = manuales.filter(m => !m.roles || m.roles.indexOf(rol) >= 0 || rol === 'Dirección');
    let back = document.getElementById('ac-man-v'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ac-man-v';
    back.style.cssText = 'position:fixed;inset:0;z-index:210;background:var(--surface);display:flex;flex-direction:column';
    const open = (m) => {
      body.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--card)">'
        + '<button class="btn ghost sm" id="mv-back">← Manuales</button>'
        + '<b style="font-family:var(--f-display);font-size:14px">' + m.ico + ' ' + U.esc(m.t) + '</b>'
        + '<a class="btn ghost sm" href="' + m.src + '" target="_blank" style="margin-left:auto">↗ Abrir aparte / imprimir</a></div>'
        + '<iframe src="' + m.src + '" style="flex:1;width:100%;border:0;background:#fff"></iframe>';
      body.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0';
      body.querySelector('#mv-back').onclick = lista;
    };
    const lista = () => {
      body.style.cssText = 'flex:1;overflow:auto;padding:24px';
      body.innerHTML = '<div style="max-width:720px;margin:0 auto">'
        + '<div class="muted" style="font-size:12.5px;margin-bottom:14px">📖 Manuales de Orbit 360 — se leen aquí dentro. Rol activo: <b>' + U.esc(rol) + '</b> · mostrando los que aplican a tu rol</div>'
        + '<div style="display:grid;gap:12px">' + visibles.map((m, i) => '<button class="card pad" data-m="' + manuales.indexOf(m) + '" style="text-align:left;cursor:pointer;display:flex;align-items:center;gap:14px">'
          + '<span style="font-size:28px">' + m.ico + '</span><span><b style="font-family:var(--f-display);font-size:15px;display:block">' + U.esc(m.t) + '</b><small class="muted">' + U.esc(m.sub) + '</small></span>'
          + '<span style="margin-left:auto;color:var(--red);font-weight:700">Leer →</span></button>').join('') + '</div></div>';
      body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => open(manuales[+b.dataset.m]));
    };
    back.innerHTML = '<div style="display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid var(--line);background:var(--card)">'
      + '<button class="btn ghost" id="mv-close">✕ Cerrar</button>'
      + '<b style="font-family:var(--f-display);font-size:16px">📖 Manuales Orbit</b></div>';
    const body = document.createElement('div'); back.appendChild(body);
    document.body.appendChild(back);
    back.querySelector('#mv-close').onclick = () => back.remove();
    lista();
  }

  function card(c) {
    const lec = (c.lecciones || []).length, min = (c.lecciones || []).reduce((s, l) => s + (l.min || 0), 0);
    return `<div class="ac-card" data-cur="${c.id}">
      <div class="ac-card-top" style="background:linear-gradient(120deg,${c.color},#10141a)">
        <span class="ac-emoji">${c.emoji}</span>
        <span class="badge" style="background:rgba(255,255,255,.18);color:#fff;border:none">${c.cat}</span>
        ${c.certificado ? '<span class="ac-cert">🏅 Certificado</span>' : ''}
        <div class="ac-card-acts">
          <button class="ac-act" data-edit="${c.id}" title="Editar curso">✏</button>
          <button class="ac-act" data-del="${c.id}" title="Eliminar curso">🗑</button>
        </div>
      </div>
      <div class="ac-card-b">
        <b style="font-family:var(--f-display);font-size:15px">${U.esc(c.titulo)}</b>
        <p class="muted" style="font-size:12.5px;margin:5px 0 10px;line-height:1.5">${U.esc(c.desc)}</p>
        <div class="ac-meta">${lec} lecciones · ${min} min</div>
        <div class="ac-bar"><i style="width:${c.progreso}%;background:${c.progreso >= 100 ? 'var(--ok)' : c.color}"></i></div>
        <div class="ac-prog">${c.progreso}% completado</div>
        ${c.certificado ? `<button class="btn ghost sm" data-cert="${c.id}" style="margin-top:8px">🏅 Ver certificado</button>` : ''}
      </div>
    </div>`;
  }

  function abrir(id) { verCurso(id); }

  /* ---- Cuerpo de una lección (video / lectura / quiz interactivo) ---- */
  function lessonBody(l) {
    if (!l) return '';
    if (l.iframeSrc) return `<div style="position:relative;width:100%;height:62vh;border-radius:12px;overflow:hidden;background:#f4f3ee"><iframe src="${l.iframeSrc}" style="width:100%;height:100%;border:0"></iframe></div>`;
    if (l.tipo === 'video') {
      if (!l.url) return `<div style="background:linear-gradient(135deg,#1a1f28,#0f1318);border-radius:12px;padding:56px 32px;text-align:center;color:#fff"><div style="font-size:56px;margin-bottom:16px">🎬</div><h3 style="font-family:var(--f-display);font-size:20px;font-weight:800;margin-bottom:10px">${U.esc(l.t)}</h3><p style="font-size:14px;color:rgba(255,255,255,.7);max-width:420px;margin:0 auto">Para agregar el video, usá <b>✏ Editar lección</b> y pegá la URL de YouTube/Vimeo o subí un archivo.</p></div>`;
      // video subido (data URL o archivo)
      if (/^data:video|^blob:|\.(mp4|webm|ogg|mov)(\?|$)/i.test(l.url)) return `<div class="ac-video"><video src="${l.url}" controls playsinline style="width:100%;height:100%;background:#000"></video></div>`;
      // normalizar YouTube/Vimeo a formato embed
      let emb = l.url;
      const yt = l.url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
      if (yt) emb = 'https://www.youtube.com/embed/' + yt[1] + '?rel=0&modestbranding=1';
      else { const vm = l.url.match(/vimeo\.com\/(?:video\/)?(\d+)/); if (vm) emb = 'https://player.vimeo.com/video/' + vm[1]; }
      return `<div class="ac-video"><iframe src="${emb}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>`;
    }
    if (l.tipo === 'lectura') {
      const secs = l.secciones && l.secciones.length
        ? l.secciones.map(s => `<div class="acv-sec" style="border-left:4px solid ${s.color || 'var(--red)'}"><div class="acv-sec-t" style="color:${s.color || 'var(--red)'}">${U.esc(s.icon || '▸')} ${U.esc(s.t || '')}</div><div class="acv-sec-b">${U.esc(s.d || '')}</div></div>`).join('')
        : mdToHtml(l.texto || '');
      const adj = l.docSrc ? (/^data:image|\.(png|jpe?g|webp|gif)/i.test(l.docSrc) ? `<img src="${l.docSrc}" style="max-width:100%;border-radius:10px;margin-top:14px">` : `<div style="position:relative;width:100%;height:60vh;border-radius:10px;overflow:hidden;background:#f4f3ee;margin-top:14px"><iframe src="${l.docSrc}" style="width:100%;height:100%;border:0"></iframe></div>`) : '';
      return secs + adj;
    }
    if (l.tipo === 'quiz' && l.preguntas && l.preguntas.length) {
      return '<div style="display:grid;gap:16px">' + l.preguntas.map(function (q, i) {
        var ops = q.ops.map(function (o, j) { return '<label style="display:flex;align-items:center;gap:9px;padding:10px 13px;border:1px solid var(--line);border-radius:8px;cursor:pointer;margin-bottom:7px;background:var(--card);font-size:13.5px"><input type="radio" name="qz' + i + '" value="' + j + '" style="accent-color:var(--red)"> ' + U.esc(o) + '</label>'; }).join('');
        var correcta = U.esc(q.ops[q.ok]);
        var verifyFn = "(function(el,qi,ans,cor){var s=document.querySelector('input[name=qz'+qi+']:checked');var r=el.nextElementSibling;if(!s){r.textContent='\u26a0\ufe0f Selecciona una opci\u00f3n.';r.style.color='var(--warn)';r.style.display='block';return;}el.disabled=true;r.style.display='block';if(+s.value===ans){r.textContent='\u2705 \u00a1Correcto!';r.style.color='var(--ok)'}else{r.textContent='\u274c Incorrecto \u2014 la correcta es: '+cor;r.style.color='var(--danger)'}})(this," + i + "," + q.ok + ",'" + correcta.replace(/'/g, "\\'") + "')";
        return '<div style="background:var(--surface);border-radius:10px;padding:18px 20px"><div style="font-family:var(--f-display);font-weight:700;font-size:14.5px;margin-bottom:12px">\u2753 ' + (i + 1) + '. ' + U.esc(q.p) + '</div>' + ops + '<button style="margin-top:6px;background:var(--red);color:#fff;border:none;border-radius:8px;padding:8px 18px;font-weight:700;font-size:13px;cursor:pointer" onclick="' + verifyFn + '">Verificar</button><div style="display:none;font-weight:700;font-size:13px;margin-top:8px"></div></div>';
      }).join('') + '</div>';
    }
    if (l.tipo === 'quiz') return `<div class="ac-read"><b style="font-family:var(--f-display)">Evaluación</b><p style="margin-top:10px">Agregá preguntas reales con ✏ Editar lección.</p></div>`;
    return '';
  }

  /* ---- VISOR INTERACTIVO a pantalla completa (#130) ---- */
  function verCurso(id, startIdx) {
    const c = S().get('cursos', id); if (!c) return;
    let lecs = (c.lecciones || []);
    let idx = startIdx != null ? startIdx : Math.min(Math.max(0, lecs.length - 1), Math.round((c.progreso / 100) * lecs.length));
    if (idx < 0 || isNaN(idx)) idx = 0;
    let back = document.getElementById('ac-viewer'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ac-viewer'; back.className = 'acv';
    document.body.appendChild(back);
    const close = () => { back.remove(); if (host) render(host); };
    function doneCount() { return Math.round((c.progreso / 100) * lecs.length); }
    function paint() {
      lecs = S().get('cursos', id).lecciones || [];
      const total = lecs.length, done = doneCount(), l = lecs[idx] || lecs[0];
      back.innerHTML = `
        <div class="acv-top" style="background:linear-gradient(120deg,${c.color},#10141a)">
          <button class="acv-back" id="acv-back">← Volver</button>
          <div class="acv-ttl">${c.emoji} ${U.esc(c.titulo)}</div>
          <div class="acv-prg"><span>${total ? (idx + 1) : 0}/${total}</span><div class="acv-pbar"><i style="width:${total ? ((idx + 1) / total * 100) : 0}%"></i></div></div>
        </div>
        <div class="acv-body">
          <aside class="acv-side">
            ${lecs.map((le, i) => `<div class="acv-lec-wrap" style="display:flex;align-items:stretch;gap:2px"><button class="acv-lec ${i === idx ? 'active' : ''} ${i < done ? 'done' : ''}" data-go="${i}" style="flex:1"><span class="acv-lec-n">${i < done ? '✓' : (i + 1)}</span><span class="acv-lec-t">${U.esc(le.t)}<small>${TIPO_ICON[le.tipo] || '•'} ${le.tipo} · ${le.min || 0}m</small></span></button><div style="display:flex;flex-direction:column;justify-content:center;gap:1px"><button class="acv-ord" data-up="${i}" title="Subir" ${i === 0 ? 'disabled' : ''} style="border:1px solid var(--line);background:var(--surface);border-radius:5px;width:22px;height:18px;cursor:pointer;font-size:9px;opacity:${i === 0 ? '.3' : '1'}">▲</button><button class="acv-ord" data-down="${i}" title="Bajar" ${i === lecs.length - 1 ? 'disabled' : ''} style="border:1px solid var(--line);background:var(--surface);border-radius:5px;width:22px;height:18px;cursor:pointer;font-size:9px;opacity:${i === lecs.length - 1 ? '.3' : '1'}">▼</button></div></div>`).join('')}
            <button class="acv-addlec" id="acv-addlec">+ Añadir lección</button>
          </aside>
          <main class="acv-main">
            ${l ? `<div class="acv-lechead"><h2>${TIPO_ICON[l.tipo] || '📖'} ${U.esc(l.t)} <span class="muted" style="font-weight:400;font-size:13px">· ${l.min || 0} min</span></h2><button class="btn ghost sm" id="acv-editlec">✏ Editar lección</button></div>
            <div class="acv-content">${lessonBody(l)}</div>
            <div class="acv-nav"><button class="btn ghost" id="acv-prev" ${idx === 0 ? 'disabled style="opacity:.4"' : ''}>← Anterior</button><button class="btn primary" id="acv-next">${idx >= total - 1 ? '✓ Finalizar curso' : 'Siguiente →'}</button></div>` : '<div class="muted" style="padding:40px;text-align:center">Este curso aún no tiene lecciones. Usá <b>+ Añadir lección</b>.</div>'}
          </main>
        </div>`;
      back.querySelector('#acv-back').onclick = close;
      back.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { idx = +b.dataset.go; paint(); });
      back.querySelectorAll('[data-up]').forEach(b => b.onclick = (e) => { e.stopPropagation(); const i = +b.dataset.up; const ls = (S().get('cursos', id).lecciones || []).slice(); if (i > 0) { const t = ls[i - 1]; ls[i - 1] = ls[i]; ls[i] = t; S().update('cursos', id, { lecciones: ls }); if (idx === i) idx = i - 1; else if (idx === i - 1) idx = i; paint(); } });
      back.querySelectorAll('[data-down]').forEach(b => b.onclick = (e) => { e.stopPropagation(); const i = +b.dataset.down; const ls = (S().get('cursos', id).lecciones || []).slice(); if (i < ls.length - 1) { const t = ls[i + 1]; ls[i + 1] = ls[i]; ls[i] = t; S().update('cursos', id, { lecciones: ls }); if (idx === i) idx = i + 1; else if (idx === i + 1) idx = i; paint(); } });
      const al = back.querySelector('#acv-addlec'); if (al) al.onclick = () => { const nl = (S().get('cursos', id).lecciones || []).concat([{ t: 'Nueva lección', tipo: 'lectura', min: 10, texto: '' }]); S().update('cursos', id, { lecciones: nl }); idx = nl.length - 1; paint(); editarLeccion(id, idx, () => paint()); };
      const el = back.querySelector('#acv-editlec'); if (el) el.onclick = () => editarLeccion(id, idx, () => paint());
      const pv = back.querySelector('#acv-prev'); if (pv) pv.onclick = () => { if (idx > 0) { idx--; paint(); } };
      const nx = back.querySelector('#acv-next'); if (nx) nx.onclick = () => {
        const total2 = lecs.length, reached = idx + 1, prog = Math.round(reached / total2 * 100);
        if (prog > (c.progreso || 0)) { c.progreso = prog; S().update('cursos', id, { progreso: prog, certificado: prog >= 100 ? true : c.certificado }); if (prog >= 100) S().insert('actividades', { id: 'act' + Date.now(), clienteId: '', asesorId: 'ase001', tipo: 'sistema', icon: '🏅', fecha: Orbit.ui.today(), titulo: 'Curso completado: ' + c.titulo, detalle: 'Certificación obtenida.' }); }
        if (idx < total2 - 1) { idx++; paint(); } else { close(); }
      };
    }
    paint();
  }

  /* ---- Editar una lección individual (contenido/quiz/recurso) ---- */
  function editarLeccion(cursoId, i, cb) {
    const c = S().get('cursos', cursoId); const l = (c.lecciones || [])[i]; if (!l) return;
    let back = document.getElementById('ac-leced'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ac-leced'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 260;
    const tipos = ['video', 'lectura', 'quiz', 'recurso'];
    back.innerHTML = `<div class="card" style="width:min(580px,95vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">✏ Editar lección</b><button class="imp-x" id="le-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <div class="cgrid">
          <label class="ce-l">Título<input id="le-t" class="o-sel" value="${U.esc(l.t || '')}"></label>
          <label class="ce-l">Tipo<select id="le-tipo" class="o-sel">${tipos.map(t => `<option ${t === l.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="ce-l">Duración (min)<input id="le-min" type="number" class="o-sel" value="${l.min || 10}"></label>
        </div>
        <div id="le-dyn"></div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:space-between">
        <button class="btn ghost" id="le-del" style="color:var(--danger)">🗑 Borrar lección</button>
        <div style="display:flex;gap:8px"><button class="btn ghost" id="le-cancel">Cancelar</button><button class="btn primary" id="le-ok">Guardar lección</button></div>
      </div>
    </div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#le-x').addEventListener('click', close); $('#le-cancel').addEventListener('click', close);
    $('#le-del').addEventListener('click', async () => {
      if (!(await Orbit.ui.confirm('¿Borrar esta lección?', { title: 'Eliminar lección', ok: 'Eliminar' }))) return;
      const lecciones = (S().get('cursos', cursoId).lecciones || []).slice(); lecciones.splice(i, 1);
      S().update('cursos', cursoId, { lecciones }); close(); if (cb) cb();
    });
    function iaText(prompt) {
      // usa Orbit.ia si está; si no, heurística local
      if (Orbit.ia && Orbit.ia.responder) { try { return Orbit.ia.responder(prompt); } catch (e) {} }
      return '📘 ' + ($('#le-t').value || 'Lección') + '\n\nContenido generado: introducción, conceptos clave, ejemplos prácticos y cierre. Edítalo para ajustar el detalle.';
    }
    function dyn() {
      const t = $('#le-tipo').value;
      if (t === 'video') $('#le-dyn').innerHTML = `<label class="ce-l">URL del video (YouTube/Vimeo/HeyGen embed)<input id="le-url" class="o-sel" value="${U.esc(l.url || '')}" placeholder="https://www.youtube.com/embed/..."></label><div style="margin-top:8px"><label class="btn ghost sm" style="cursor:pointer">📎 Subir archivo de video<input type="file" id="le-vfile" accept="video/*" style="display:none"></label> <span class="muted" style="font-size:11.5px">o pegá el enlace embed arriba</span></div><div class="cfg-note">Pegá el enlace <b>embed</b> o subí un video. (Archivos grandes pueden no persistir tras recargar.)</div>`;
      else if (t === 'lectura') $('#le-dyn').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><span class="ce-l">Contenido</span><button class="btn ghost sm" id="le-ia">✨ Generar / mejorar con IA</button></div><textarea id="le-texto" class="o-sel" style="min-height:140px;resize:vertical">${U.esc(l.texto || '')}</textarea><div style="margin-top:8px"><label class="btn ghost sm" style="cursor:pointer">📎 Adjuntar documento (.txt/.pdf/.docx/imagen)<input type="file" id="le-doc" accept=".txt,.pdf,.doc,.docx,image/*" style="display:none"></label> <span class="muted" id="le-doc-name" style="font-size:11.5px">${l.docSrc ? 'documento adjunto ✓' : ''}</span></div><div class="cfg-note">El texto se muestra en la lección. Si adjuntás un PDF/imagen, se <b>embebe</b> debajo del contenido.</div>`;
      else if (t === 'recurso') $('#le-dyn').innerHTML = `<label class="ce-l">Documento embebido (PDF/Word/imagen) — URL o enlace de Drive<input id="le-iframe" class="o-sel" value="${U.esc(l.iframeSrc || '')}" placeholder="https://drive.google.com/.../preview"></label><div style="margin-top:8px"><label class="btn ghost sm" style="cursor:pointer">📎 Subir archivo (PDF/imagen)<input type="file" id="le-rfile" accept=".pdf,image/*" style="display:none"></label> <span class="muted" id="le-rfile-name" style="font-size:11.5px"></span></div><div class="cfg-note">📎 La lección muestra el documento <b>embebido a pantalla</b>. Pegá un enlace de Drive (terminado en <b>/preview</b>) o subí el archivo.</div>`;
      else $('#le-dyn').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span class="ce-l">Preguntas</span><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><label class="muted" style="font-size:11.5px;display:flex;align-items:center;gap:4px">N.º<input id="le-qn" class="o-sel" type="number" min="1" max="20" value="${(l.preguntas || []).length || 3}" style="width:54px;padding:4px 6px"></label><button class="btn ghost sm" id="le-qadd">+ Pregunta</button><button class="btn ghost sm" id="le-qia">✨ Generar (N)</button><button class="btn ghost sm" id="le-qre">🔄 Replantear todas</button><button class="btn ghost sm" id="le-qre1">🔄 Replantear la última</button></div></div><textarea id="le-quiz" class="o-sel" style="min-height:150px;resize:vertical;font-family:var(--f-mono);font-size:12px" placeholder="Enunciado de la pregunta\n[x] Opción correcta\n[ ] Opción incorrecta\n[ ] Otra opción">${U.esc((l.preguntas || []).map(q => q.p + '\n' + q.ops.map((o, j) => (j === q.ok ? '[x] ' : '[ ] ') + o).join('\n')).join('\n\n'))}</textarea><div style="margin-top:6px"><label class="btn ghost sm" style="cursor:pointer">📎 Generar quiz desde un documento (IA)<input type="file" id="le-qdoc" accept=".txt,.pdf,.docx,image/*" style="display:none"></label></div><div class="cfg-note">Eligé la <b>cantidad</b> y generá/replanteá con IA (todas o solo la última). Cada pregunta: enunciado, opciones (una por línea), correcta con <b>[x]</b>; separá con línea en blanco.</div>`;
      // listeners IA
      const iaB = $('#le-ia'); if (iaB) iaB.addEventListener('click', async () => { iaB.textContent = '🧠…'; $('#le-texto').value = await iaTextAsync('Redacta el contenido didáctico de la lección "' + $('#le-t').value + '" para un curso de seguros, con emojis y párrafos.', $('#le-texto').value); iaB.textContent = '✨ Generar / mejorar con IA'; });
      const qadd = $('#le-qadd'); if (qadd) qadd.addEventListener('click', () => { const ta = $('#le-quiz'); ta.value = (ta.value ? ta.value + '\n\n' : '') + '¿Nueva pregunta?\n[x] Opción correcta\n[ ] Opción incorrecta'; });
      const qn = () => Math.max(1, Math.min(20, +($('#le-qn') || {}).value || 3));
      const qia = $('#le-qia'); if (qia) qia.addEventListener('click', async () => { qia.textContent = '🧠…'; const ta = $('#le-quiz'); ta.value = await iaQuizAsync($('#le-t').value, ta.value, qn(), false); qia.textContent = '✨ Generar (N)'; });
      const qre = $('#le-qre'); if (qre) qre.addEventListener('click', async () => { if (!(await Orbit.ui.confirm('¿Replantear TODAS las preguntas con IA? Se reemplazan las actuales.', { title: 'Replantear quiz', ok: 'Replantear', danger: false }))) return; qre.textContent = '🧠…'; const ta = $('#le-quiz'); ta.value = await iaQuizAsync($('#le-t').value, '', qn(), true); qre.textContent = '🔄 Replantear todas'; });
      const qre1 = $('#le-qre1'); if (qre1) qre1.addEventListener('click', async () => { qre1.textContent = '🧠…'; const ta = $('#le-quiz'); const blocks = (ta.value || '').split(/\n\s*\n/).filter(b => b.trim()); const nueva = (await iaQuizAsync($('#le-t').value, ta.value, 1, false)).split(/\n\s*\n/).pop(); if (blocks.length) blocks[blocks.length - 1] = nueva; else blocks.push(nueva); ta.value = blocks.join('\n\n'); qre1.textContent = '🔄 Replantear la última'; });
      // listeners archivo
      const vfile = $('#le-vfile'); if (vfile) vfile.addEventListener('change', e => fileToDataURL(e.target.files[0], u => { $('#le-url').value = u; }));
      const doc = $('#le-doc'); if (doc) doc.addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; if (/\.txt$/i.test(f.name)) fileToText(f, txt => { const ta = $('#le-texto'); ta.value = (ta.value ? ta.value + '\n\n' : '') + txt; }); else fileToDataURL(f, u => { l.docSrc = u; const n = $('#le-doc-name'); if (n) n.textContent = 'documento adjunto ✓'; }); });
      const rfile = $('#le-rfile'); if (rfile) rfile.addEventListener('change', e => fileToDataURL(e.target.files[0], u => { $('#le-iframe').value = u; const n = $('#le-rfile-name'); if (n) n.textContent = 'archivo cargado ✓'; }));
      const qdoc = $('#le-qdoc'); if (qdoc) qdoc.addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const ta = $('#le-quiz'); ta.value = '🧠 Generando quiz desde ' + f.name + '…'; fileToText(f, async txt => { ta.value = await iaQuizFromDoc(txt || f.name); }); });
    }
    $('#le-tipo').addEventListener('change', dyn); dyn();
    $('#le-ok').addEventListener('click', () => {
      const t = $('#le-tipo').value;
      const nl = { t: $('#le-t').value || 'Lección', tipo: t, min: +$('#le-min').value || 10 };
      if (t === 'video') nl.url = ($('#le-url') || {}).value || '';
      else if (t === 'lectura') { nl.texto = ($('#le-texto') || {}).value || ''; if (l.docSrc) nl.docSrc = l.docSrc; const palabras = (nl.texto || '').split(/\s+/).filter(Boolean).length; if (palabras > 30) nl.min = Math.max(2, Math.round(palabras / 180)); }
      else if (t === 'recurso') { nl.iframeSrc = ($('#le-iframe') || {}).value || ''; nl.tipo = 'recurso'; }
      else {
        const blocks = (($('#le-quiz') || {}).value || '').split(/\n\s*\n/).filter(b => b.trim());
        nl.preguntas = blocks.map(b => { const lines = b.split('\n').filter(x => x.trim()); const p = lines.shift() || ''; let ok = 0; const ops = lines.map((ln, j) => { if (/^\[x\]/i.test(ln.trim())) ok = j; return ln.replace(/^\[[ x]\]\s*/i, '').trim(); }); return { p: p.trim(), ops, ok }; }).filter(q => q.ops.length);
      }
      const lecciones = (S().get('cursos', cursoId).lecciones || []).slice(); lecciones[i] = nl;
      S().update('cursos', cursoId, { lecciones });
      close(); if (cb) cb();
    });
  }

  function abrirViejo(id) {
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
      if (prog >= 100) S().insert('actividades', { id: 'act' + Date.now(), clienteId: '', asesorId: 'ase001', tipo: 'sistema', icon: '🏅', fecha: Orbit.ui.today(), titulo: 'Curso completado: ' + c.titulo, detalle: 'Certificación obtenida.' });
      abrir(id);
    }
    const cont = back.querySelector('#ac-cont'); if (cont) cont.addEventListener('click', avanzar);
    back.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => verLeccion(c, +b.dataset.play, avanzar)));
    back.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => verLeccion(c, +b.dataset.open, null)));
    const rs = back.querySelector('#ac-reset'); if (rs) rs.addEventListener('click', () => { S().update('cursos', id, { progreso: 0 }); abrir(id); });
    back.querySelectorAll('[data-res]').forEach(b => b.addEventListener('click', () => verRecurso(b.dataset.res, b.dataset.iframe || '')));
  }

  function verRecurso(nombre, iframeSrc) {
    const ext = (nombre.split('.').pop() || '').toLowerCase();
    let back = document.getElementById('ac-res'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ac-res'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    // si el recurso tiene iframeSrc, lo mostramos embebido
    let visor;
    if (iframeSrc) {
      visor = `<div style="position:relative;width:100%;height:74vh;border-radius:var(--r-md);overflow:hidden;background:#f4f3ee"><iframe src="${iframeSrc}" style="width:100%;height:100%;border:0"></iframe></div>`;
    } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'img' || ext === 'webp') {
      visor = `<div class="ac-docview" style="display:grid;place-items:center;background:var(--surface);min-height:280px"><div style="text-align:center;color:var(--ink-3)"><div style="font-size:52px">🖼️</div><div style="margin-top:10px;font-weight:600">${U.esc(nombre)}</div><div style="font-size:12px;margin-top:6px">Imagen · previsualización disponible al cargar el archivo real.</div></div></div>`;
    } else if (ext === 'pdf') {
      visor = `<div class="ac-docview" style="display:grid;place-items:center;background:var(--surface);min-height:280px"><div style="text-align:center;color:var(--ink-3)"><div style="font-size:52px">📄</div><div style="margin-top:10px;font-weight:600">${U.esc(nombre)}</div><div style="font-size:12px;margin-top:6px">PDF · se visualizará aquí al cargar el archivo real.</div></div></div>`;
    } else {
      visor = `<div class="ac-docview"><div class="ac-doc-page"><b style="font-family:var(--f-display);font-size:16px">${U.esc(nombre)}</b><p style="margin-top:10px;line-height:1.7;font-size:13.5px">Documento cargado en la plataforma. Visualización nativa para PDF, imágenes y documentos.</p></div></div>`;
    }
    back.innerHTML = `<div class="card" style="width:min(760px,96vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;background:var(--graph)">
        <b style="font-family:var(--f-display);font-size:15px;color:#fff">📎 ${U.esc(nombre)}</b>
        <button class="imp-x" id="ar-x" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);color:#fff">✕</button></div>
      ${visor}
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn ghost" id="ar-close">Cerrar</button>
        <button class="btn primary" onclick="Orbit.ui.toast('Descarga disponible al conectar el almacenamiento (Drive o servidor).')">⬇ Descargar</button>
      </div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#ar-x').addEventListener('click', close);
    back.querySelector('#ar-close').addEventListener('click', close);
  }

  /* ---- Gestión de categorías (autoadministrable: crear / renombrar / eliminar) ---- */
  function gestionCategorias() {
    let back = document.getElementById('ac-cats'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ac-cats'; back.className = 'drawer-back open';
    back.style.cssText = 'display:grid;place-items:center;z-index:99';
    function lista() {
      const guardadas = (Orbit.cat && Orbit.cat.get) ? Orbit.cat.get('academiaCats') : [];
      const enUso = [...new Set(cursos().map(c => c.cat).filter(Boolean))];
      const todas = [...new Set(guardadas.concat(enUso))];
      if (!todas.length) return '<div class="muted" style="padding:8px 0">Aún no hay categorías. Crea la primera.</div>';
      return todas.map(c => {
        const n = cursos().filter(x => x.cat === c).length;
        return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;margin-bottom:7px">'
          + '<span style="flex:1;font-weight:600">' + U.esc(c) + ' <span class="muted" style="font-weight:400">· ' + n + ' curso(s)</span></span>'
          + '<button class="btn ghost sm" data-ren="' + U.esc(c) + '">✏️ Renombrar</button>'
          + '<button class="btn ghost sm" data-elc="' + U.esc(c) + '">🗑️</button></div>';
      }).join('');
    }
    function paint() {
      back.innerHTML = '<div class="card" style="width:min(480px,94vw);max-height:90vh;overflow:auto;padding:0">'
        + '<div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">🏷️ Categorías de Academia</b><button class="btn ghost sm" id="acc-x">✕</button></div>'
        + '<div style="padding:16px 20px">'
        + '<div style="display:flex;gap:8px;margin-bottom:14px"><input id="acc-nv" class="o-sel" placeholder="Nueva categoría (ej. Liderazgo)" style="flex:1"><button class="btn primary sm" id="acc-add">Crear</button></div>'
        + '<div id="acc-list">' + lista() + '</div>'
        + '</div></div>';
      const $ = s => back.querySelector(s);
      $('#acc-x').addEventListener('click', () => back.remove());
      $('#acc-add').addEventListener('click', () => {
        const v = $('#acc-nv').value.trim(); if (!v) return;
        Orbit.cat.add('academiaCats', v); paint();
      });
      back.querySelectorAll('[data-ren]').forEach(b => b.addEventListener('click', async () => {
        const old = b.dataset.ren; const nv = await Orbit.ui.prompt('Nuevo nombre de la categoría:', { title: 'Renombrar categoría', value: old });
        if (!nv || nv === old) return;
        // renombrar en la lista guardada
        const g = Orbit.cat.get('academiaCats').map(x => x === old ? nv : x);
        Orbit.cat.setList('academiaCats', [...new Set(g.concat(nv))]);
        // y en los cursos que la usan
        cursos().filter(c => c.cat === old).forEach(c => S().update('cursos', c.id, { cat: nv }));
        paint();
      }));
      back.querySelectorAll('[data-elc]').forEach(b => b.addEventListener('click', async () => {
        const c = b.dataset.elc; const n = cursos().filter(x => x.cat === c).length;
        if (n > 0) { Orbit.ui.toast('No se puede eliminar: hay ' + n + ' curso(s) en esta categoría. Reasígnalos primero.'); return; }
        if (!(await Orbit.ui.confirm('¿Eliminar la categoría "' + c + '"?', { title: 'Eliminar categoría', ok: 'Eliminar' }))) return;
        Orbit.cat.setList('academiaCats', Orbit.cat.get('academiaCats').filter(x => x !== c));
        paint();
      }));
    }
    paint();
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });
    document.body.appendChild(back);
  }

  /* ---- Crear curso con IA (genera estructura editable e iterable) ---- */
  function crearIA() {
    let back = document.getElementById('ac-ia'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ac-ia'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 98;
    back.innerHTML = `<div class="card" style="width:min(520px,94vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">✨ Crear curso con IA</b><button class="imp-x" id="ai-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <label class="ce-l">¿Sobre qué tema?<input id="ai-tema" class="o-sel" placeholder="Ej. Seguro de Vida para familias"></label>
        <label class="ce-l">Dirigido a<select id="ai-dest" class="o-sel"><option value="equipo">👥 Equipo (asesores)</option><option value="clientes">🧑 Clientes</option><option value="ambos">Ambos</option></select></label>
        <label class="ce-l">Categoría<select id="ai-cat" class="o-sel">${[...new Set(['Inducción', 'Técnico', 'Comercial', 'Producto', 'Normativa', 'Educativo'].concat((Orbit.cat && Orbit.cat.get) ? Orbit.cat.get('academiaCats') : []))].map(c => `<option>${c}</option>`).join('')}<option value="__nueva">➕ Nueva categoría…</option></select></label>
        <div><label class="btn ghost sm" style="cursor:pointer">📎 Adjuntar documentos base (la IA crea el curso a partir de ellos)<input type="file" id="ai-docs" accept=".txt,.csv,.md,.pdf,.docx" multiple style="display:none"></label> <span class="muted" id="ai-docs-name" style="font-size:11.5px"></span></div>
        <div class="cfg-note">✨ La IA genera el curso interactivo (título, descripción, lecciones navegables y evaluación). Si adjuntás documentos, los usa como base. Luego podés <b>iterar, editar y completar</b> antes de publicar.</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="ai-cancel">Cancelar</button><button class="btn primary" id="ai-ok">✨ Generar y editar</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#ai-x').addEventListener('click', close); back.querySelector('#ai-cancel').addEventListener('click', close);
    let docsTexto = '';
    const catSel = back.querySelector('#ai-cat');
    catSel.addEventListener('change', async () => { if (catSel.value === '__nueva') { const nv = await Orbit.ui.prompt('Nombre de la nueva categoría:', { title: 'Nueva categoría' }); if (nv) { const o = document.createElement('option'); o.textContent = nv; o.selected = true; catSel.insertBefore(o, catSel.lastChild); } else catSel.selectedIndex = 0; } });
    const docsInput = back.querySelector('#ai-docs');
    if (docsInput) docsInput.addEventListener('change', e => { const files = [...e.target.files]; back.querySelector('#ai-docs-name').textContent = files.length + ' documento(s)'; docsTexto = ''; files.forEach(f => fileToText(f, txt => { if (txt) docsTexto += '\n### ' + f.name + '\n' + txt; })); });
    back.querySelector('#ai-ok').addEventListener('click', async () => {
      const tema = back.querySelector('#ai-tema').value || 'Tema de seguros';
      const dest = back.querySelector('#ai-dest').value, cat = back.querySelector('#ai-cat').value === '__nueva' ? 'General' : back.querySelector('#ai-cat').value;
      const emoji = { 'Producto': '🚗', 'Técnico': '🛡️', 'Comercial': '🎯', 'Normativa': '⚖️', 'Educativo': '📚', 'Inducción': '🚀' }[cat] || '🎓';
      const id = 'cur' + Date.now().toString().slice(-6);
      let lecciones = null, desc = '';
      const okBtn = back.querySelector('#ai-ok');
      if (Orbit.ia.disponible()) {
        okBtn.textContent = '🧠 Generando…'; okBtn.disabled = true;
        try {
          const prompt = 'Genera un curso de capacitación en seguros sobre "' + tema + '" para ' + dest + '. ' + (docsTexto ? 'Basate en estos documentos:\n' + docsTexto.slice(0, 5000) + '\n\n' : '') + 'Devuelve SOLO JSON válido sin markdown con esta forma: {"desc":"descripción breve","lecciones":[{"t":"título","tipo":"lectura","min":10,"texto":"contenido con emojis y párrafos"},{"t":"título","tipo":"quiz","min":8,"preguntas":[{"p":"pregunta","ops":["a","b","c"],"ok":0}]}]}. Incluye 3-4 lecciones de tipo lectura y 1 quiz con 3 preguntas. Texto en español, claro y práctico.';
          const out = await Orbit.ia.complete(prompt);
          const m = String(out).match(/\{[\s\S]*\}/);
          if (m) { const obj = JSON.parse(m[0]); if (obj.lecciones && obj.lecciones.length) { lecciones = obj.lecciones; desc = obj.desc || ''; } }
        } catch (e) {}
      }
      if (!lecciones) {
        desc = 'Curso sobre ' + tema.toLowerCase() + '. Revisá y ajustá el contenido.';
        lecciones = [
          { t: 'Introducción a ' + tema, tipo: 'lectura', min: 8, texto: '📘 ' + tema + '\n\nEn esta lección verás los fundamentos de ' + tema.toLowerCase() + ': qué es, por qué importa y cómo se aplica en el día a día del asesor. Editá este contenido para ajustar el detalle.' },
          { t: 'Conceptos clave', tipo: 'lectura', min: 12, texto: '🔑 Conceptos clave\n\n• Concepto 1: definición y ejemplo.\n• Concepto 2: cómo se usa.\n• Concepto 3: errores comunes a evitar.' },
          { t: 'Casos prácticos', tipo: 'lectura', min: 10, texto: '🧩 Casos prácticos\n\nCaso A: situación típica y cómo resolverla.\nCaso B: objeción frecuente del cliente y respuesta recomendada.' },
          { t: 'Evaluación', tipo: 'quiz', min: 10, preguntas: [{ p: '¿Cuál es el objetivo principal de ' + tema + '?', ops: ['Proteger al asegurado', 'Aumentar trámites', 'Ninguno'], ok: 0 }] }
        ];
      }
      const nuevo = { id, titulo: tema, cat, emoji, color: '#C5162E', desc, destinatarios: dest, lecciones, recursos: [], progreso: 0, certificado: false };
      S().insert('cursos', nuevo);
      close(); editar(id);
    });
  }

  /* ---- Crear / editar curso (autoadministrable: emoji + lecciones + recursos) ---- */
  function editar(id) {
    const c = id ? S().get('cursos', id) : { id: '', titulo: '', cat: 'Inducción', emoji: '🎓', color: '#C5162E', desc: '', lecciones: [], recursos: [], progreso: 0, certificado: false };
    const cats = [...new Set(['Inducción', 'Técnico', 'Comercial', 'Producto', 'Normativa'].concat((Orbit.cat && Orbit.cat.get) ? Orbit.cat.get('academiaCats') : []))];
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
          <label class="ce-l">Categoría<select id="ae-cat" class="o-sel">${cats.map(x => `<option ${x === c.cat ? 'selected' : ''}>${x}</option>`).join('')}${cats.indexOf(c.cat) < 0 && c.cat ? `<option selected>${U.esc(c.cat)}</option>` : ''}<option value="__nueva">➕ Nueva categoría…</option></select></label>
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
    if ($('#ae-del')) $('#ae-del').addEventListener('click', async () => { if (await Orbit.ui.confirm('¿Borrar curso?', { title: 'Eliminar curso', ok: 'Eliminar' })) { S().remove('cursos', id); close(); render(host); } });
    const catSel = $('#ae-cat');
    if (catSel) catSel.addEventListener('change', async () => { if (catSel.value === '__nueva') { const nv = await Orbit.ui.prompt('Nombre de la nueva categoría:', { title: 'Nueva categoría' }); if (nv) { const o = document.createElement('option'); o.textContent = nv; o.selected = true; catSel.insertBefore(o, catSel.lastChild); } else catSel.selectedIndex = 0; } });
    $('#ae-ok').addEventListener('click', () => {
      snapLecs(); snapRecs();
      const data = { titulo: $('#ae-titulo').value || 'Nuevo curso', cat: $('#ae-cat').value, emoji, color, desc: $('#ae-desc').value, destinatarios: ($('#ae-dest') || {}).value || 'equipo', lecciones: lecs.filter(l => l.t), recursos: recs.filter(r => r.nombre) };
      if (id) S().update('cursos', id, data); else S().insert('cursos', Object.assign({ id: 'cur' + Date.now().toString().slice(-6), progreso: 0, certificado: false }, data));
      close(); render(host);
    });
    paint();
  }

  /* ---- Visor de lección: iframe interactivo / video / lectura / quiz ---- */
  function verLeccion(c, i, onDone) {
    const l = (c.lecciones || [])[i]; if (!l) return;
    let back = document.getElementById('ac-lec'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ac-lec'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    let cuerpo = lessonBody(l) || `<div class="ac-read"><b style="font-family:var(--f-display)">Evaluación</b><p style="margin-top:10px">Responde para completar la lección. Agrega preguntas reales al editar el curso.</p></div>`;
    back.innerHTML = `<div class="card" style="width:min(900px,96vw);max-height:94vh;overflow:auto;padding:0">
      <div style="padding:14px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;background:var(--graph)">
        <b style="font-family:var(--f-display);font-size:15px;color:#fff">${TIPO_ICON[l.tipo] || '📖'} ${U.esc(l.t)} <span style="font-weight:400;font-size:12px;color:rgba(255,255,255,.6)">· ${l.min} min</span></b>
        <button class="imp-x" id="al-x" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);color:#fff">✕</button></div>
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
    // escuchar mensaje de leccion completada desde el iframe interactivo
    function msgHandler(ev) { if (ev.data && ev.data.orbit === 'leccion_completada') { window.removeEventListener('message', msgHandler); close(); if (onDone) onDone(); } }
    window.addEventListener('message', msgHandler);
  }

  /* ---- Ruta de aprendizaje por ROL (secuencia curada de cursos) ---- */
  function rutaView() {
    const roles = (Orbit.ROLES ? Object.keys(Orbit.ROLES) : ['Dirección']);
    const activo = (Orbit.auth && Orbit.auth.user && Orbit.auth.user() && Orbit.auth.user().rol) || 'Dirección';
    const rol = rutaRol || activo;
    const ORDEN = ['Inducción', 'Técnico', 'Producto', 'Comercial', 'Servicio', 'Cumplimiento', 'Normativa', 'Finanzas', 'Marketing', 'Liderazgo'];
    const arr = cursosPorRol(rol).slice().sort((a, b) => {
      const ia = ORDEN.indexOf(a.cat), ib = ORDEN.indexOf(b.cat);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || (a.titulo || '').localeCompare(b.titulo || '');
    });
    const total = arr.length, comp = arr.filter(c => c.progreso >= 100).length, certs = arr.filter(c => c.certificado).length;
    const avg = total ? Math.round(arr.reduce((s, c) => s + c.progreso, 0) / total) : 0;
    const selector = '<select id="ruta-rol" class="o-sel" style="width:auto">' + roles.map(r => `<option ${r === rol ? 'selected' : ''}>${U.esc(r)}</option>`).join('') + '</select>';
    const primerPend = arr.find(c => c.progreso < 100);
    const pasos = arr.map((c, i) => {
      const hecho = c.progreso >= 100;
      return `<div class="card" style="display:flex;align-items:center;gap:14px;padding:13px 16px;margin-bottom:10px;border-left:4px solid ${hecho ? 'var(--ok)' : c.color}">
        <div style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-family:var(--f-display);font-weight:800;background:${hecho ? 'var(--ok)' : 'var(--surface)'};color:${hecho ? '#fff' : 'var(--ink-3)'};flex-shrink:0">${hecho ? '✓' : (i + 1)}</div>
        <span style="font-size:22px">${c.emoji}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="font-family:var(--f-display);font-size:14.5px">${U.esc(c.titulo)}</b><span class="badge neutral" style="font-size:9.5px">${U.esc(c.cat || '')}</span>${c.certificado ? '<span class="badge ok" style="font-size:9.5px">🏅 Certificado</span>' : ''}</div>
          <div class="ac-bar" style="margin-top:7px"><i style="width:${c.progreso}%;background:${hecho ? 'var(--ok)' : c.color}"></i></div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">${c.certificado ? `<button class="btn ghost sm" data-cert="${c.id}">🏅</button>` : ''}<button class="btn ${hecho ? 'ghost' : 'primary'} sm" data-abrir="${c.id}">${c.progreso === 0 ? 'Comenzar' : hecho ? 'Repasar' : 'Continuar'}</button></div>
      </div>`;
    }).join('') || '<div class="muted" style="padding:30px;text-align:center">No hay cursos en la ruta de este rol todavía. Creá cursos y asigná su destinatario por rol.</div>';
    return `<div class="card pad" style="margin-bottom:14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div><div class="muted" style="font-size:12px">Ruta de aprendizaje para el rol</div><div style="margin-top:5px">${selector}</div></div>
        <div style="flex:1;min-width:20px"></div>
        <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
          <div><div style="font-family:var(--f-display);font-size:20px;font-weight:800">${avg}%</div><div class="muted" style="font-size:11px">avance</div></div>
          <div><div style="font-family:var(--f-display);font-size:20px;font-weight:800">${comp}/${total}</div><div class="muted" style="font-size:11px">completados</div></div>
          <div><div style="font-family:var(--f-display);font-size:20px;font-weight:800">${certs}</div><div class="muted" style="font-size:11px">certificados</div></div>
          ${primerPend ? `<button class="btn primary" data-abrir="${primerPend.id}">▶ Continuar ruta</button>` : '<span class="badge ok">🎉 Ruta completa</span>'}
        </div>
      </div>${pasos}`;
  }

  /* ---- Certificado imprimible (documento) ---- */
  function verCertificado(cursoId) {
    const c = S().get('cursos', cursoId); if (!c) return;
    const u = (Orbit.auth && Orbit.auth.user && Orbit.auth.user()) || {};
    const nombre = u.nombre || 'Colaborador';
    const t = (Orbit.tenant && Orbit.tenant.get) ? Orbit.tenant.get() : {};
    const folio = 'ORB-' + cursoId.replace(/[^a-z0-9]/gi, '').slice(-5).toUpperCase() + '-' + (Orbit.ui.today() || '').replace(/-/g, '').slice(2);
    let back = document.getElementById('ac-cert'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ac-cert'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 260;
    back.innerHTML = `<div class="card" style="width:min(720px,96vw);padding:0;overflow:hidden">
      <div id="cert-doc" style="padding:42px 46px;background:#fff;border:9px solid ${c.color}">
        <div style="text-align:center">
          <div style="font-family:var(--f-mono);font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:${c.color}">${U.esc(t.empresa || 'Orbit 360')} · Academia</div>
          <div style="font-family:var(--f-display);font-weight:800;font-size:30px;margin:14px 0 6px">Certificado de finalización</div>
          <div class="muted" style="font-size:13px">Se otorga a</div>
          <div style="font-family:var(--f-display);font-weight:800;font-size:26px;margin:10px 0;color:${c.color}">${U.esc(nombre)}</div>
          <div style="font-size:13.5px;max-width:470px;margin:0 auto;line-height:1.6">por completar satisfactoriamente el curso <b>${U.esc(c.titulo)}</b>${c.cat ? ' (' + U.esc(c.cat) + ')' : ''} de la Academia Orbit 360.</div>
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:38px;gap:20px">
            <div style="text-align:left"><div style="font-family:var(--f-mono);font-size:11px;color:var(--ink-3)">FOLIO</div><b class="mono" style="font-size:12.5px">${folio}</b></div>
            <div style="font-size:44px">${c.emoji}</div>
            <div style="text-align:right"><div style="font-family:var(--f-mono);font-size:11px;color:var(--ink-3)">FECHA</div><b style="font-size:12.5px">${U.fmtDate(Orbit.ui.today())}</b></div>
          </div>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn ghost" id="cert-close">Cerrar</button>
        <button class="btn primary" id="cert-print">🖨 Imprimir / PDF</button>
      </div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#cert-close').onclick = close;
    back.querySelector('#cert-print').onclick = () => { const w = window.open('', '_blank'); w.document.write('<html><head><title>Certificado · ' + U.esc(c.titulo) + '</title></head><body style="margin:0">' + back.querySelector('#cert-doc').outerHTML + '</body></html>'); w.document.close(); w.print(); };
  }

  return { render };
})();
