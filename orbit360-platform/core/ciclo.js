/* ============================================================
   Orbit 360 · Ciclo comercial — motor Ops ↔ Leads (sincronía en vivo)
   ------------------------------------------------------------
   Un "negocio" (oportunidad) es UN solo registro que se PROYECTA
   en dos tableros según su etapa canónica:
     · Orbit Ops (equipo)  → Cotizaciones · Inspecciones · Emisiones
     · Orbit Leads (asesor) → Nuevo → … → Cierre  (+ listas espejo)
   Cambiar la etapa en cualquier tablero se refleja en el otro al
   instante (misma fuente de datos). Al emitir se crea el cliente.
   Las gestiones administrativas (Gestiones Admin / Renov.-Modif.)
   son operativas, NO prospectos, y viven solo en Ops.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ciclo = (function () {
  const U = Orbit.ui, q = Orbit.q, S = () => Orbit.store;
  // Fechas VIVAS (regla Orbit): nada de literales quemados en flujos que crean datos.
  const today = () => (U.today ? U.today() : new Date().toISOString().slice(0, 10));
  const stamp = () => today() + ' ' + new Date().toTimeString().slice(0, 5);
  const inDays = (d) => { const base = (U.now ? U.now() : new Date()); return new Date(base.getTime() + d * 86400000).toISOString().slice(0, 10); };

  /* ---- Etapas canónicas del ciclo ---- */
  const ETAPAS = [
    { id: 'nuevo', leads: 'Nuevo', ops: null, emoji: '🌱', color: '#6b7280', label: 'Nuevo ingreso' },
    { id: 'contactado', leads: 'Contactado', ops: null, emoji: '📞', color: '#1f3a5f', label: 'Contactado' },
    { id: 'cotizando', leads: 'Cotizando', ops: 'Cotizaciones', emoji: '🧮', color: '#c9821b', label: 'Cotizando' },
    { id: 'propuesta', leads: 'Propuesta', ops: null, emoji: '📨', color: '#6b4ea0', label: 'Propuesta enviada' },
    { id: 'negociacion', leads: 'Negociación', ops: null, emoji: '🤝', color: '#2563a8', label: 'En negociación' },
    { id: 'inspeccion', leads: 'Inspección', ops: 'Inspecciones', emoji: '🔍', color: '#0f766e', label: 'Pendiente inspección' },
    { id: 'emision', leads: 'Emisión', ops: 'Emisiones', emoji: '📝', color: '#1f8a4c', label: 'Pendiente emisión' },
    { id: 'emitido', leads: 'Cierre', ops: null, emoji: '🏆', color: '#15803d', label: 'Emitida · ganada' },
    { id: 'perdido', leads: 'Perdido', ops: null, emoji: '⛔', color: '#b91c1c', label: 'Perdido' }
  ];
  const E = {}; ETAPAS.forEach(e => E[e.id] = e);
  const FLUJO = ['nuevo', 'contactado', 'cotizando', 'propuesta', 'negociacion', 'inspeccion', 'emision', 'emitido'];

  /* ---- Listas de los tableros (EDITABLES, desde Orbit.cat) ---- */
  function opsListas() { return Orbit.cat.get('opsListas'); }
  function leadsListas() { return Orbit.cat.get('leadsListas'); }
  function listById(arr, id) { return arr.find(l => l.id === id); }

  /* Cadencia = seguimiento por WhatsApp y, en su ausencia, por correo. */
  const CADENCIA = ['Día 1 · WhatsApp de bienvenida', 'Día 3 · WhatsApp de seguimiento', 'Día 7 · correo con propuesta (si no responde WA)', 'Día 14 · WhatsApp de cierre'];
  function tiposGestion() { return Orbit.cat.get('tiposGestion'); }

  /* ===================== datos / filtros ===================== */
  function etapaInfo(id) { return E[id] || E.nuevo; }
  function paisOK(pais) { return !Orbit.pais || Orbit.pais === 'TODOS' || pais === Orbit.pais; }
  function rolFiltro(asesorId) {
    if (Orbit.session && Orbit.session.esAsesor && Orbit.session.esAsesor()) return asesorId === Orbit.session.asesorId();
    return true;
  }
  function negocios(opts) {
    opts = opts || {};
    return S().all('negocios').filter(n =>
      (opts.incArchivado ? true : !n.archivado) &&
      paisOK(n.pais) &&
      (opts.ignoreRol ? true : rolFiltro(n.asesorId)));
  }
  function gestiones() {
    return S().all('gestiones').filter(g => !g.archivado &&
      (() => { const c = S().get('clientes', g.clienteId); return !c || paisOK(c.pais); })() &&
      rolFiltro(g.asesorId));
  }
  function primaShort(n) { return U.moneyShort(n.primaEst, n.moneda); }
  function flag(pais) { return pais === 'GT' ? '🇬🇹' : pais === 'CO' ? '🇨🇴' : '🌎'; }

  /* ===================== transiciones ===================== */
  function log(rec, campo, de, a, origen) {
    rec.bitacora = rec.bitacora || [];
    rec.bitacora.push({ ts: stamp(), user: (Orbit.session ? Orbit.session.rol() : 'Equipo'), campo, de: de || '', a: a || '', origen: origen || 'manual' });
  }
  const PROB = { nuevo: 10, contactado: 25, cotizando: 45, propuesta: 65, negociacion: 78, inspeccion: 85, emision: 92, emitido: 100, perdido: 0 };

  /** Mueve un negocio a otra etapa, ejecutando automatizaciones. */
  function setEtapa(id, etapaId) {
    const n = S().get('negocios', id); if (!n || n.etapa === etapaId) return n;
    const de = n.etapa;
    const patch = { etapa: etapaId, prob: PROB[etapaId], actualizado: today() };
    // automatización: cadencia de seguimiento al entrar a Propuesta
    if (etapaId === 'propuesta' && !n.cadenciaActiva) {
      patch.cadenciaActiva = true; patch.cadencia = CADENCIA[1];
      log(n, 'Automatización', '', 'Cadencia de seguimiento activada', 'auto');
    }
    if (etapaId === 'cotizando' && !n.nroCotizacion) patch.nroCotizacion = 'COT-' + Math.floor(1000 + Math.random() * 9000);
    if (etapaId === 'inspeccion' || etapaId === 'emision') patch.decision = etapaId;
    log(n, 'Etapa', de, etapaId, 'manual');
    Object.assign(n, patch);
    S().update('negocios', id, n);
    // emisión → crear cliente
    if (etapaId === 'emitido') emitir(id);
    return n;
  }

  /** Decisión en Cierre (Leads): pasa a Inspección o Emisión → reaparece en Ops. */
  function decidirCierre(id, dest) { return setEtapa(id, dest === 'inspeccion' ? 'inspeccion' : 'emision'); }

  function perder(id, motivo) {
    const n = S().get('negocios', id); if (!n) return;
    log(n, 'Resultado', n.etapa, 'Perdido' + (motivo ? ' · ' + motivo : ''), 'manual');
    S().update('negocios', id, { etapa: 'perdido', prob: 0, motivoPerdido: motivo || '', actualizado: today() });
  }
  function archivar(id) {
    const n = S().get('negocios', id); if (!n) return;
    log(n, 'Archivo', '', 'Archivado', 'manual');
    S().update('negocios', id, { archivado: true });
  }

  /** Emitir: crea el cliente heredando datos + activa cadencia de encuestas. */
  function emitir(id) {
    const n = S().get('negocios', id); if (!n) return;
    if (n.clienteIdCreado) return; // ya creado
    const nuevoId = 'cli' + Date.now().toString().slice(-7);
    const cli = {
      id: nuevoId, tipo: n.tipo || 'Persona', nombre: n.nombre, pais: n.pais,
      moneda: n.moneda, ciudad: '', departamento: '', direccion: '',
      identificacion: '', email: n.email || '', telefono: n.telefono || '',
      asesorId: n.asesorId, segmento: 'Nuevo', canal: n.canal || 'Leads', sexo: '', fechaNac: '',
      contactoAlt: '', fechaAlta: today(), cumple: '', etiquetas: ['Nuevo'],
      driveLink: '', notas: 'Cliente creado desde el ciclo comercial (negocio ' + n.id + ').',
      encuestasActivas: true
    };
    S().insert('clientes', cli);
    S().insert('actividades', { id: 'act' + Date.now(), clienteId: nuevoId, asesorId: n.asesorId, tipo: 'sistema', icon: '🏆', fecha: today(), titulo: 'Cliente creado al emitir', detalle: 'Negocio ganado: ' + n.producto + '. Cadencia de encuestas de satisfacción activada.' });
    log(n, 'Automatización', '', 'Cliente creado + cadencia de encuestas', 'auto');
    S().update('negocios', id, { clienteIdCreado: nuevoId, etapa: 'emitido', prob: 100, bitacora: n.bitacora });
  }

  /* ===================== gestiones (Ops admin/renov) ===================== */
  function gestionPayload(g) {
    let activeAdvisor = '';
    try { activeAdvisor = Orbit.session && Orbit.session.asesorId ? (Orbit.session.asesorId() || '') : ''; } catch (e) {}
    const base = {
      id: 'ges' + Date.now().toString().slice(-7), lista: 'Gestiones Admin', tipo: '', titulo: '',
      clienteId: '', polizaId: '', asesorId: activeAdvisor, aseguradoraId: '', ramo: '',
      estado: 'Pendiente', prioridad: 'Media', vence: '', proximaAccion: 'Pendiente de definir',
      checklist: [], nota: '', notas: '', origen: 'manual',
      bitacora: [{ ts: stamp(), user: (Orbit.session ? Orbit.session.rol() : 'Equipo'), campo: 'Creación', de: '', a: 'Gestión creada', origen: 'manual' }],
      comentarios: [], creado: today(), actualizado: today(), archivado: false
    };
    const out = Object.assign(base, g || {});
    const pol = out.polizaId ? S().get('polizas', out.polizaId) : null;
    const cliId = out.clienteId || (pol && pol.clienteId) || '';
    const cli = cliId ? S().get('clientes', cliId) : null;
    if (!out.clienteId && cliId) out.clienteId = cliId;
    out.pais = out.pais || (pol && pol.pais) || (cli && cli.pais) || '';
    out.moneda = out.moneda || (pol && pol.moneda) || (cli && cli.moneda) || '';
    out.producto = out.producto || (pol && (pol.producto || pol.subramo)) || '';
    out.ramo = out.ramo || (pol && pol.ramo) || '';
    return out;
  }
  function crearGestion(g) {
    return S().insert('gestiones', gestionPayload(g));
  }
  async function crearGestionDurable(g) {
    if (!S().insertDurable) throw new Error('OPS_MANAGEMENT_DURABLE_WRITE_REQUIRED');
    const row = gestionPayload(g);
    await S().insertDurable('gestiones', row);
    const readback = S().get('gestiones', row.id);
    if (!readback) throw new Error('OPS_MANAGEMENT_DURABLE_READBACK_MISSING');
    return readback;
  }

  /* ===================== tableros ===================== */
  function opsBoard() {
    const ng = negocios();
    return opsListas().map(L => {
      let items;
      if (L.kind === 'negocio') items = ng.filter(n => n.etapa === L.etapa).map(n => ({ kind: 'negocio', rec: n }));
      else items = gestiones().filter(g => g.lista === L.nombre).map(g => ({ kind: 'gestion', rec: g }));
      return { def: L, items };
    });
  }
  function leadsBoard() {
    const ng = negocios();
    const lists = leadsListas();
    const customIds = lists.filter(l => l.custom).map(l => l.id);
    return lists.map(L => {
      let items;
      if (L.custom) items = ng.filter(n => n.colLeads === L.id);
      else items = ng.filter(n => n.etapa === L.etapa && !(n.colLeads && customIds.indexOf(n.colLeads) >= 0));
      return { def: L, items: items.map(n => ({ kind: 'negocio', rec: n })) };
    });
  }
  function metricasLeads() {
    const ng = negocios().filter(n => n.etapa !== 'perdido');
    const tot = ng.reduce((s, n) => s + q.norm(n.primaEst, n.moneda), 0);
    const pond = ng.reduce((s, n) => { const prob = U.finiteNumber(n.prob); return s + q.norm(n.primaEst, n.moneda) * (prob == null ? 0 : prob) / 100; }, 0);
    const ganados = negocios({ incArchivado: true }).filter(n => n.etapa === 'emitido').length;
    return { activos: ng.length, tot, pond, ganados };
  }

  /* ===================== tarjetas ===================== */
  function cardNegocio(n, opts) {
    opts = opts || {};
    const ase = q.asesor(n.asesorId), ei = etapaInfo(n.etapa);
    const d = U.daysFromNow(n.proximoToque), prob = U.finiteNumber(n.prob);
    const done = (n.checklist || []).filter(c => c.done).length, tot = (n.checklist || []).length;
    const pr = { Alta: 'danger', Media: 'warn', Baja: 'neutral' }[n.prioridad] || 'neutral';
    const espejo = opts.espejo;
    return `<div class="kcard ${espejo ? 'kcard-espejo' : ''}" data-neg="${n.id}">
      <div class="kcard-top">
        <span class="badge ${pr}">${U.esc(U.text(n.prioridad, 'Sin prioridad'))}</span>
        <span class="badge neutral">${U.esc(U.text(n.ramo, 'Sin ramo'))}</span>
        <span class="kflag" title="${U.esc(U.text(n.pais, 'Sin país'))}">${flag(n.pais)}</span>
        ${opts.board === 'ops' && n.origen ? `<span class="badge info" title="Ingreso por ${n.origen}">${n.origen === 'Leads' ? '🎯' : n.origen === 'Solicitud del cliente' ? '🙋' : '🗂'} ${U.esc(U.text(n.origen, 'Sin origen'))}</span>` : ''}
        ${espejo ? `<span class="kmirror" title="Gestión operativa en curso por el equipo">🔗 en Ops</span>` : ''}
        ${n.cadenciaActiva ? `<span class="badge ok" title="Cadencia automática activa">🔁</span>` : ''}
      </div>
      <div class="kcard-t">${U.esc(n.nombre)}</div>
      <div class="kcard-cli">${U.esc(n.producto)} · <span class="mono">${primaShort(n)}</span></div>
      <div class="kcard-meta"><span class="dot-s" style="background:${ei.color}"></span>${ei.emoji} ${U.esc(U.text(ei.label, 'Sin etapa'))} · ${prob == null ? '—' : prob + '%'}</div>
      ${n.cadenciaActiva && !espejo ? `<div class="kcad">🔁 ${U.esc(n.cadencia || 'Cadencia activa')}</div>` : ''}
      <div class="kcard-foot">
        <span title="${U.esc(ase ? ase.nombre : '')}">${U.avatar(ase ? ase.nombre : '?', ase ? ase.color : '#999', 'sm')}</span>
        ${tot ? `<span class="kchk">✓ ${done}/${tot}</span>` : ''}
        <span class="kvence ${d < 0 ? 'over' : ''}" title="Próximo toque">${d == null ? '—' : d < 0 ? (-d) + 'd' : 'en ' + d + 'd'}</span>
      </div>
    </div>`;
  }
  function cardGestion(g) {
    const cli = S().get('clientes', g.clienteId), ase = q.asesor(g.asesorId), asg = q.aseguradora(g.aseguradoraId);
    const d = U.daysFromNow(g.vence);
    const done = (g.checklist || []).filter(c => c.done).length, tot = (g.checklist || []).length;
    const pr = { Alta: 'danger', Media: 'warn', Baja: 'neutral' }[g.prioridad] || 'neutral';
    const est = { 'Pendiente': 'warn', 'En proceso': 'info', 'Resuelta': 'ok' }[g.estado] || 'neutral';
    return `<div class="kcard" data-ges="${g.id}">
      <div class="kcard-top"><span class="badge ${pr}">${U.esc(U.text(g.prioridad, 'Sin prioridad'))}</span><span class="badge ${est}">${U.esc(U.text(g.estado, 'Sin estado'))}</span></div>
      <div class="kcard-t">${U.esc(g.titulo || g.tipo)}</div>
      <div class="kcard-cli">${cli ? U.esc(cli.nombre) : '<span class="muted">Sin cliente</span>'}</div>
      <div class="kcard-meta"><span class="dot-s" style="background:${asg ? asg.color : '#999'}"></span>${asg ? U.esc(asg.nombre) : '—'}</div>
      <div class="kcard-foot">
        <span title="${U.esc(ase ? ase.nombre : '')}">${U.avatar(ase ? ase.nombre : '?', ase ? ase.color : '#999', 'sm')}</span>
        ${tot ? `<span class="kchk">✓ ${done}/${tot}</span>` : ''}
        <span class="kvence ${d < 0 ? 'over' : ''}">${d == null ? '—' : d < 0 ? (-d) + 'd' : d + 'd'}</span>
      </div>
    </div>`;
  }
  /** Conecta los clicks de tarjetas dentro de un host. */
  function wireCards(host) {
    host.querySelectorAll('[data-neg]').forEach(el => el.addEventListener('click', () => openNegocio(el.dataset.neg)));
    host.querySelectorAll('[data-ges]').forEach(el => el.addEventListener('click', () => openGestion(el.dataset.ges)));
  }

  /* ===================== drawer base ===================== */
  function modal(html, width) {
    let back = document.getElementById('ciclo-modal'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ciclo-modal'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 95;
    back.innerHTML = `<div class="ciclo-card" style="width:min(${width || 880}px,96vw)">${html}</div>`;
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) { e.preventDefault(); e.stopPropagation(); } });
    back.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => back.remove()));
    return back;
  }
  function refresh() { document.dispatchEvent(new CustomEvent('orbit:ciclo')); }

  /* ===================== ficha de NEGOCIO (rediseñada) ===================== */
  function openNegocio(id) {
    const n = S().get('negocios', id); if (!n) return;
    const ase = q.asesor(n.asesorId), asg = q.aseguradora(n.aseguradoraId), ei = etapaInfo(n.etapa), prob = U.finiteNumber(n.prob);
    const asesores = S().all('asesores'), asgs = S().all('aseguradoras');
    const enOps = !!ei.ops;
    // stepper
    const stepper = FLUJO.map((sid, i) => {
      const s = E[sid]; const idx = FLUJO.indexOf(n.etapa);
      const st = n.etapa === sid ? 'cur' : (idx > i ? 'done' : '');
      return `<button class="cstep ${st}" data-etapa="${sid}" title="${s.label}" style="--c:${s.color}">
        <span class="cstep-d">${st === 'done' ? '✓' : s.emoji}</span><span class="cstep-l">${s.leads}</span></button>`;
    }).join('<span class="cstep-sep"></span>');

    const done = (n.checklist || []).filter(c => c.done).length, tot = (n.checklist || []).length;
    const html = `
      <div class="ciclo-h" style="background:linear-gradient(120deg,${ei.color},${U.shade ? U.shade(ei.color, -18) : ei.color})">
        <div>
          <div class="ciclo-eyebrow">Negocio · ciclo comercial</div>
          <h2>${ei.emoji} ${U.esc(n.nombre)}</h2>
          <div class="ciclo-sub">${U.esc(U.text(n.producto, 'Producto pendiente'))} · ${U.esc(U.text(n.ramo, 'Ramo pendiente'))} · ${primaShort(n)} · ${prob == null ? '—' : prob + '%'} prob.</div>
        </div>
        <div class="ciclo-h-act">
          <span class="ciclo-syncbadge">${enOps ? '🗂 Visible en Ops · ' + ei.ops : '🎯 Solo en Leads'}</span>
          <button class="imp-x" data-close>✕</button>
        </div>
      </div>
      <div class="ciclo-stepper">${stepper}</div>
      <div class="ciclo-body">
        <div class="ciclo-main">
          <div class="ciclo-sec">
            <div class="ciclo-sec-t">Datos del prospecto</div>
            <div class="cgrid">
              ${fInput('Nombre / razón social', 'ng-nombre', n.nombre)}
              ${fSelect('Tipo', 'ng-tipo', ['Persona', 'Empresa'], n.tipo)}
              ${fInput('Teléfono (WhatsApp)', 'ng-tel', n.telefono)}
              ${fInput('Correo', 'ng-email', n.email)}
              ${fSelect('País', 'ng-pais', ['GT', 'CO'], n.pais)}
              ${fSelectCat('Canal de ingreso', 'ng-canal', 'canales', n.canal)}
            </div>
          </div>
          <div class="ciclo-sec">
            <div class="ciclo-sec-t">Riesgo y comercial</div>
            <div class="cgrid">
              ${fSelectCat('Producto', 'ng-prod', 'productos', n.producto)}
              ${fSelectCat('Ramo', 'ng-ramo', 'ramos', n.ramo)}
              ${fSelectOpt('Aseguradora de interés', 'ng-asg', asgs.map(a => [a.id, a.nombre]), n.aseguradoraId)}
              ${fSelectOpt('Asesor responsable', 'ng-ase', asesores.map(a => [a.id, a.nombre]), n.asesorId)}
              ${fInput('Prima estimada', 'ng-prima', n.primaEst, 'number')}
              ${fSelectCat('Prioridad', 'ng-prio', 'prioridades', n.prioridad)}
              ${fInput('N.º cotización', 'ng-cot', n.nroCotizacion)}
              ${fInput('Próximo toque', 'ng-toque', n.proximoToque, 'date')}
            </div>
            ${leadsListas().some(l => l.custom) ? `<label class="ce-l" style="margin-top:10px">Columna en Leads<select id="ng-col" class="o-sel"><option value="">Auto (por etapa)</option>${leadsListas().filter(l => l.custom).map(l => `<option value="${l.id}" ${n.colLeads === l.id ? 'selected' : ''}>${l.emoji} ${U.esc(l.nombre)}</option>`).join('')}</select></label>` : ''}
            <label class="ce-l" style="margin-top:10px">Descripción / detalle del riesgo<textarea id="ng-desc" class="o-sel" style="min-height:56px;resize:vertical;padding:9px 11px">${U.esc(n.descripcion || '')}</textarea></label>
          </div>
          <div class="ciclo-sec">
            <div class="ciclo-sec-t">Checklist <span class="muted">· ${done}/${tot}</span></div>
            <div id="ng-chk">${(n.checklist || []).map((c, i) => chkRow('ng', i, c)).join('') || '<div class="muted" style="font-size:12.5px">Sin ítems.</div>'}</div>
            <div class="cadd"><input id="ng-chk-new" class="o-sel" placeholder="Nuevo ítem de checklist"><button class="btn ghost sm" id="ng-chk-add">+ Agregar</button></div>
          </div>
          <div class="ciclo-sec">
            <div class="ciclo-sec-t">Comentarios del equipo</div>
            <div id="ng-coms">${(n.comentarios || []).map(comRow).join('') || '<div class="muted" style="font-size:12.5px">Sin comentarios.</div>'}</div>
            <div class="cadd"><input id="ng-com-new" class="o-sel" placeholder="Escribe un comentario…"><button class="btn ghost sm" id="ng-com-add">Enviar</button></div>
          </div>
        </div>
        <aside class="ciclo-aside">
          <div class="ciclo-sec">
            <div class="ciclo-sec-t">Acciones de etapa</div>
            <div class="ciclo-actions">${stageActions(n)}</div>
          </div>
          <div class="ciclo-sec">
            <div class="ciclo-sec-t">🔁 Cadencia automática</div>
            ${n.cadenciaActiva
              ? `<div class="cad-on">Activa desde <b>Propuesta</b>.</div>${CADENCIA.map((c, i) => `<div class="cad-step ${i <= 1 ? 'done' : ''}">${i <= 1 ? '✓' : '○'} ${U.esc(c)}</div>`).join('')}`
              : `<div class="muted" style="font-size:12.5px">Se activa automáticamente al enviar la <b>propuesta</b> (envío de seguimientos por cadencia).</div>`}
          </div>
          <div class="ciclo-sec">
            <div class="ciclo-sec-t">Sincronización</div>
            <div class="sync-row"><span>🎯 Orbit Leads</span><b>${ei.leads}</b></div>
            <div class="sync-row"><span>🗂 Orbit Ops</span><b>${enOps ? ei.ops : '—'}</b></div>
            <div class="muted" style="font-size:11.5px;margin-top:6px">El asesor da seguimiento en Leads; el equipo ejecuta lo operativo en Ops. Un mismo negocio, sincronizado en vivo.</div>
          </div>
          <div class="ciclo-sec">
            <div class="ciclo-sec-t">Bitácora</div>
            <div class="bitacora">${(n.bitacora || []).slice().reverse().map(bitRow).join('')}</div>
          </div>
        </aside>
      </div>
      <div class="ciclo-foot">
        <div class="muted" style="font-size:12px">${n.clienteIdCreado ? '🏆 Cliente creado · <a style="color:var(--red);cursor:pointer" onclick="document.getElementById(\'ciclo-modal\').remove();location.hash=\'#/cliente360?c=' + n.clienteIdCreado + '\'">ver expediente</a>' : 'Creado ' + U.fmtDate(n.creado)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn ghost" id="ng-delete" style="color:var(--danger,var(--red))">Eliminar</button>
          <button class="btn ghost" data-close>Cerrar</button>
          <button class="btn primary" id="ng-save">Guardar cambios</button>
        </div>
      </div>`;
    const back = modal(html, 980);

    // stepper jump
    back.querySelectorAll('.cstep').forEach(b => b.addEventListener('click', () => { setEtapa(id, b.dataset.etapa); refresh(); openNegocio(id); }));
    // stage actions
    back.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', async () => {
      const a = b.dataset.act;
      if (a === 'perder') { const m = await Orbit.ui.prompt('Motivo de pérdida (opcional):', { title: 'Marcar como perdido', ok: 'Marcar perdido' }); if (m === null) return; perder(id, m); }
      else if (a === 'archivar') { archivar(id); back.remove(); refresh(); return; }
      else if (a === 'insp') decidirCierre(id, 'inspeccion');
      else if (a === 'emis') decidirCierre(id, 'emision');
      else setEtapa(id, a);
      refresh(); openNegocio(id);
    }));
    // checklist
    back.querySelectorAll('[data-chk]').forEach(c => c.addEventListener('change', () => {
      const i = +c.dataset.chk; n.checklist[i].done = c.checked; S().update('negocios', id, { checklist: n.checklist }); refresh();
    }));
    const cadd = back.querySelector('#ng-chk-add');
    if (cadd) cadd.addEventListener('click', () => { const v = back.querySelector('#ng-chk-new').value.trim(); if (!v) return; n.checklist = n.checklist || []; n.checklist.push({ t: v, done: false }); S().update('negocios', id, { checklist: n.checklist }); openNegocio(id); });
    const comadd = back.querySelector('#ng-com-add');
    if (comadd) comadd.addEventListener('click', () => { const v = back.querySelector('#ng-com-new').value.trim(); if (!v) return; n.comentarios = n.comentarios || []; n.comentarios.push({ ts: stamp(), user: (Orbit.session ? Orbit.session.rol() : 'Equipo'), texto: v }); S().update('negocios', id, { comentarios: n.comentarios }); openNegocio(id); });
    // delete
    const ngDelete = back.querySelector('#ng-delete');
    if (ngDelete) ngDelete.addEventListener('click', async () => {
      if (!Orbit.recordDelete) return U.toast('Eliminación canónica no disponible.');
      ngDelete.disabled = true;
      try {
        const result = await Orbit.recordDelete.remove('negocios', id, { label: n.nombre || n.id });
        if (result && result.ok) { back.remove(); refresh(); return; }
      } catch (error) {
        U.toast('No fue posible confirmar la eliminación del negocio.');
      }
      ngDelete.disabled = false;
    });
    // save
    back.querySelector('#ng-save').addEventListener('click', () => {
      const g = sid => (back.querySelector('#' + sid) || {}).value;
      S().update('negocios', id, {
        nombre: g('ng-nombre') || n.nombre, tipo: g('ng-tipo'), telefono: g('ng-tel'), email: g('ng-email'),
        pais: g('ng-pais'), moneda: g('ng-pais') === 'CO' ? 'COP' : 'GTQ', canal: g('ng-canal'),
        producto: g('ng-prod'), ramo: g('ng-ramo'), aseguradoraId: g('ng-asg'), asesorId: g('ng-ase'),
        primaEst: +g('ng-prima') || n.primaEst, prioridad: g('ng-prio'), nroCotizacion: g('ng-cot'),
        proximoToque: g('ng-toque') || n.proximoToque, descripcion: g('ng-desc'), colLeads: (back.querySelector('#ng-col') || {}).value || '', actualizado: today()
      });
      back.remove(); refresh();
    });
  }

  function stageActions(n) {
    const idx = FLUJO.indexOf(n.etapa);
    const btn = (act, txt, cls) => `<button class="btn ${cls || 'ghost'}" data-act="${act}">${txt}</button>`;
    let out = '';
    if (n.etapa === 'perdido') {
      out += btn('contactado', '♻ Reactivar', 'primary');
    } else if (n.etapa === 'emitido') {
      out += `<div class="cad-on" style="background:var(--ok-soft);color:var(--ok)">🏆 Negocio ganado y emitido.</div>`;
      out += btn('archivar', '📦 Archivar (cierre de mes)');
    } else {
      if (n.etapa === 'nuevo') out += btn('contactado', '📞 Marcar contactado', 'primary');
      else if (n.etapa === 'contactado') out += btn('cotizando', '🧮 Pasar a cotización', 'primary');
      else if (n.etapa === 'cotizando') out += btn('propuesta', '📨 Enviar propuesta', 'primary');
      else if (n.etapa === 'propuesta') out += btn('negociacion', '🤝 Pasar a negociación', 'primary');
      else if (n.etapa === 'negociacion') { out += `<div class="muted" style="font-size:12px;margin-bottom:2px">Cierre — ¿qué sigue?</div>`; out += btn('insp', '🔍 Requiere inspección', 'primary') + btn('emis', '📝 Pasar a emisión', 'primary'); }
      else if (n.etapa === 'inspeccion') out += btn('emis', '📝 Inspección lista → emitir', 'primary');
      else if (n.etapa === 'emision') out += btn('emitido', '🏆 Emitir y crear cliente', 'primary');
      out += btn('perder', '⛔ Marcar perdido');
    }
    return out;
  }

  /* ===================== ficha de GESTIÓN (Ops) ===================== */
  function openGestion(id) {
    const g = S().get('gestiones', id); if (!g) return;
    const cli = S().get('clientes', g.clienteId), ase = q.asesor(g.asesorId), asg = q.aseguradora(g.aseguradoraId);
    const asesores = S().all('asesores'), asgs = S().all('aseguradoras');
    const Lcol = (opsListas().find(l => l.nombre === g.lista) || opsListas()[0]);
    const done = (g.checklist || []).filter(c => c.done).length, tot = (g.checklist || []).length;
    const pols = g.clienteId ? S().where('polizas', p => p.clienteId === g.clienteId) : [];
    const html = `
      <div class="ciclo-h" style="background:linear-gradient(120deg,${Lcol.color},${U.shade ? U.shade(Lcol.color, -18) : Lcol.color})">
        <div>
          <div class="ciclo-eyebrow">Gestión operativa · ${Lcol.emoji} ${Lcol.nombre}</div>
          <h2>${U.esc(g.titulo || g.tipo)}</h2>
          <div class="ciclo-sub">${cli ? U.esc(cli.nombre) : 'Sin cliente vinculado'} ${g.polizaId ? '· ' + (S().get('polizas', g.polizaId) || {}).numero : ''}</div>
        </div>
        <div class="ciclo-h-act"><button class="imp-x" data-close>✕</button></div>
      </div>
      <div class="ciclo-body">
        <div class="ciclo-main">
          <div class="ciclo-sec">
            <div class="ciclo-sec-t">Datos de la gestión</div>
            <div class="cgrid">
              ${fSelectOpt('Lista (Ops)', 'gs-lista', opsListas().filter(l => l.kind === 'gestion').map(l => [l.nombre, l.emoji + ' ' + l.nombre]), g.lista)}
              ${fSelectFree('Tipo de gestión', 'gs-tipo', tiposGestion().map(t => t.t), g.tipo)}
              ${fSelectFree('Estado', 'gs-estado', ['Pendiente', 'En proceso', 'Resuelta'], g.estado)}
              ${fSelectCat('Prioridad', 'gs-prio', 'prioridades', g.prioridad)}
              ${fSelectOpt('Responsable', 'gs-ase', asesores.map(a => [a.id, a.nombre]), g.asesorId)}
              ${fSelectOpt('Aseguradora', 'gs-asg', [['', '—']].concat(asgs.map(a => [a.id, a.nombre])), g.aseguradoraId)}
              ${fInput('Vence', 'gs-vence', g.vence, 'date')}
              ${fInput('Próxima acción', 'gs-prox', g.proximaAccion)}
            </div>
            ${g.polizaId || pols.length ? `<label class="ce-l" style="margin-top:10px">Póliza vinculada<select id="gs-pol" class="o-sel">${[['', '—']].concat(pols.map(p => [p.id, p.numero + ' · ' + p.ramo])).map(o => `<option value="${o[0]}" ${o[0] === g.polizaId ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></label>` : ''}
          </div>
          <div class="ciclo-sec">
            <div class="ciclo-sec-t">Checklist <span class="muted">· ${done}/${tot}</span></div>
            <div id="gs-chk">${(g.checklist || []).map((c, i) => chkRow('gs', i, c)).join('') || '<div class="muted" style="font-size:12.5px">Sin ítems.</div>'}</div>
            <div class="cadd"><input id="gs-chk-new" class="o-sel" placeholder="Nuevo control operativo"><button class="btn ghost sm" id="gs-chk-add">+ Agregar</button></div>
          </div>
          <div class="ciclo-sec">
            <div class="ciclo-sec-t">Nota / contexto</div>
            <label class="ce-l"><textarea id="gs-nota" class="o-sel" style="min-height:64px;resize:vertical;padding:9px 11px" placeholder="Detalle de la gestión…">${U.esc(g.nota || g.notas || '')}</textarea></label>
            ${(g.adjuntos && g.adjuntos.length) ? `<div class="sg-files" style="margin-top:8px">${g.adjuntos.map((a, i) => gestionDocumentChip(a, i)).join('')}</div>` : '<div class="muted" style="font-size:12px;margin-top:8px">Sin documentos vinculados.</div>'}
          </div>
        </div>
        <aside class="ciclo-aside">
          <div class="ciclo-sec">
            <div class="ciclo-sec-t">Acciones</div>
            <div class="ciclo-actions">
              ${g.estado !== 'Resuelta' ? '<button class="btn primary" data-gact="resolver">✓ Marcar resuelta</button>' : '<button class="btn ghost" data-gact="reabrir">↺ Reabrir</button>'}
              ${cli ? `<button class="btn ghost" data-gact="cliente">🧑‍💼 Ver cliente</button>` : ''}
              <button class="btn ghost" data-gact="archivar">📦 Archivar</button>
              <button class="btn ghost" data-gact="eliminar" style="color:var(--danger,var(--red))">Eliminar</button>
            </div>
          </div>
          <div class="ciclo-sec">
            <div class="ciclo-sec-t">Bitácora</div>
            <div class="bitacora">${(g.bitacora || []).slice().reverse().map(bitRow).join('')}</div>
          </div>
        </aside>
      </div>
      <div class="ciclo-foot">
        <div class="muted" style="font-size:12px">Creada ${U.fmtDate(g.creado)} · origen ${g.origen}</div>
        <div style="display:flex;gap:8px"><button class="btn ghost" data-close>Cerrar</button><button class="btn primary" id="gs-save">Guardar cambios</button></div>
      </div>`;
    const back = modal(html, 820);
    back.querySelectorAll('[data-gdoc]').forEach(btn => btn.addEventListener('click', () => openGestionDocument((g.adjuntos || [])[+btn.dataset.gdoc], g.id)));
    back.querySelectorAll('[data-chk]').forEach(c => c.addEventListener('change', async () => {
      const i = +c.dataset.chk, before = !!g.checklist[i].done, next = !!c.checked, item = g.checklist[i] || {};
      c.disabled = true; g.checklist[i].done = next; g.bitacora = g.bitacora || [];
      g.bitacora.push({ ts: stamp(), user: (Orbit.session ? Orbit.session.rol() : 'Equipo'), campo: 'Checklist', de: before ? 'Completado' : 'Pendiente', a: next ? 'Completado' : 'Pendiente', origen: 'manual', detalle: item.t || '' });
      try {
        await S().updateDurable('gestiones', id, { checklist: g.checklist, bitacora: g.bitacora, actualizado: today() });
        const resp = S().get('asesores', g.asesorId), cl = S().get('clientes', g.clienteId);
        notify({ tipo: 'gestion', titulo: (next ? '✅ Checklist completado · ' : '↺ Checklist reabierto · ') + (item.t || g.titulo || g.tipo), detalle: cl ? cl.nombre : '', para: resp ? resp.nombre : '', tel: resp ? resp.telefono : '', email: resp ? resp.email : '' });
        refresh(); openGestion(id);
      } catch (error) {
        g.checklist[i].done = before; c.checked = before; c.disabled = false; U.toast('No se pudo guardar el cambio del checklist.');
      }
    }));
    const cadd = back.querySelector('#gs-chk-add');
    if (cadd) cadd.addEventListener('click', () => { const v = back.querySelector('#gs-chk-new').value.trim(); if (!v) return; g.checklist = g.checklist || []; g.checklist.push({ t: v, done: false }); S().update('gestiones', id, { checklist: g.checklist }); openGestion(id); });
    back.querySelectorAll('[data-gact]').forEach(b => b.addEventListener('click', async () => {
      const a = b.dataset.gact;
      if (a === 'resolver') { log(g, 'Estado', g.estado, 'Resuelta', 'manual'); S().update('gestiones', id, { estado: 'Resuelta', bitacora: g.bitacora }); const cl = S().get('clientes', g.clienteId); notify({ tipo: 'gestion', titulo: 'Gestión resuelta · ' + (g.titulo || g.tipo), detalle: cl ? cl.nombre : '', para: (ase || {}).nombre, tel: cl ? cl.telefono : '', email: cl ? cl.email : '' }); if (cl && Orbit.notify) { Orbit.notify.pedir(cl.id, { tipo: 'Respuesta de gestión', icon: '✅', asunto: 'Actualización de tu gestión · ' + (g.tipo || ''), mensaje: 'Hola ' + cl.nombre + ', tu solicitud "' + (g.titulo || g.tipo) + '" ha sido resuelta. ' + (g.resultado ? g.resultado + ' ' : '') + 'Quedamos atentos a cualquier consulta.', onSent: () => openGestion(id) }); } else { openGestion(id); } }
      else if (a === 'reabrir') { S().update('gestiones', id, { estado: 'Pendiente' }); openGestion(id); }
      else if (a === 'archivar') { S().update('gestiones', id, { archivado: true }); back.remove(); }
      else if (a === 'eliminar') {
        if (!Orbit.recordDelete) { U.toast('Eliminación canónica no disponible.'); return; }
        b.disabled = true;
        try {
          const result = await Orbit.recordDelete.remove('gestiones', id, { label: g.titulo || g.tipo || g.id });
          if (result && result.ok) { back.remove(); refresh(); return; }
        } catch (error) {
          U.toast('No fue posible confirmar la eliminación de la gestión.');
        }
        b.disabled = false;
        return;
      }
      else if (a === 'cliente') { back.remove(); location.hash = '#/cliente360?c=' + g.clienteId; }
      refresh();
    }));
    back.querySelector('#gs-save').addEventListener('click', async () => {
      const v = sid => (back.querySelector('#' + sid) || {}).value;
      const nuevoAse = v('gs-ase'), nuevaNota = v('gs-nota');
      const cambioAse = nuevoAse && nuevoAse !== g.asesorId;
      const cambioNota = (nuevaNota || '') !== (g.nota || g.notas || '');
      if (cambioNota) { g.bitacora = g.bitacora || []; g.bitacora.push({ ts: stamp(), user: (Orbit.session ? Orbit.session.rol() : 'Equipo'), campo: 'Nota', de: '', a: 'Nota actualizada', origen: 'manual' }); }
      try {
        await S().updateDurable('gestiones', id, {
          lista: v('gs-lista'), tipo: v('gs-tipo'), titulo: v('gs-tipo'), estado: v('gs-estado'), prioridad: v('gs-prio'),
          asesorId: nuevoAse, aseguradoraId: v('gs-asg'), vence: v('gs-vence'), proximaAccion: v('gs-prox'),
          polizaId: (back.querySelector('#gs-pol') || {}).value || g.polizaId, nota: nuevaNota, bitacora: g.bitacora, actualizado: today()
        });
      } catch (error) {
        U.toast('No fue posible guardar los cambios de la gestión.'); return;
      }
      // notificar al responsable (cambio de asignación o nueva nota) por WA + correo
      const resp = S().get('asesores', nuevoAse); const cl = S().get('clientes', g.clienteId);
      if (resp && (cambioAse || cambioNota)) {
        notify({ tipo: 'gestion', titulo: (cambioAse ? '👤 Gestión asignada · ' : '📝 Nota en gestión · ') + (v('gs-tipo') || g.titulo), detalle: cl ? cl.nombre : '', para: resp.nombre, tel: resp.telefono || (cl ? cl.telefono : ''), email: resp.email || (cl ? cl.email : '') });
      }
      back.remove(); refresh();
    });
  }

  /* ===================== Solicitar gestión ===================== */
  /* desdeCliente=true → la solicita el propio cliente (Portal); notifica al equipo y al asesor. */
  function gestionDocumentChip(a, i) {
    const name = U.esc((a && a.nombre) || ('Documento ' + (i + 1)));
    const safeIndex = Number(i) || 0;
    if (a && (a.documentRef || a.driveUrl || a.externalUrl || a.url)) {
      return '<button type="button" class="sg-fchip" data-gdoc="' + safeIndex + '" style="border:1px solid var(--line);cursor:pointer">📄 ' + name + '</button>';
    }
    return '<span class="sg-fchip">📄 ' + name + '</span>';
  }

  function openGestionDocument(a, gestionId) {
    if (!a) return;
    if (Orbit.documentViewer && typeof Orbit.documentViewer.open === 'function') {
      Orbit.documentViewer.open(a, { context: { entidad: 'gestion', entidadId: gestionId || '', clienteId: a.clienteId || '', polizaId: a.polizaId || '' } });
      return;
    }
    const url = String(a.driveUrl || a.externalUrl || a.url || '').trim();
    if (/^https:\/\/[^\s]+$/i.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
  }

  function managementCreateModal(opts) {
    opts = Object.assign({
      clienteId: '', polizaId: '', tipo: '', titulo: '', lista: '', prioridad: 'Media', estado: 'Pendiente',
      asesorId: '', aseguradoraId: '', vence: inDays(7), proximaAccion: 'Pendiente de definir',
      nota: '', origen: 'Ops', desdeCliente: false, checklist: null, extraFields: null,
      dynamicFields: null, onCreated: null, openAfterCreate: true,
      requireConfirmationText: '', confirmationHelp: ''
    }, opts || {});

    const clientes = S().all('clientes').filter(c => c && c.id);
    const asesores = S().all('asesores').filter(a => a && a.id);
    const asgs = S().all('aseguradoras').filter(a => a && a.id);
    const tipos = tiposGestion().slice();
    const initialClient = opts.clienteId ? S().get('clientes', opts.clienteId) : null;
    const typeDef = tipos.find(t => t.t === opts.tipo) || null;
    const initialList = opts.lista || (typeDef && typeDef.lista) || 'Gestiones Admin';
    const initialAdvisor = opts.asesorId || (initialClient && initialClient.asesorId) || (Orbit.session && Orbit.session.asesorId ? Orbit.session.asesorId() : '');
    const defaultChecklist = Array.isArray(opts.checklist) && opts.checklist.length
      ? opts.checklist.map(x => typeof x === 'string' ? { t: x, done: false } : { t: String(x.t || '').trim(), done: !!x.done }).filter(x => x.t)
      : [{ t: 'Solicitud recibida', done: true }, { t: 'Documentación completa', done: false }, { t: 'Enviado a aseguradora', done: false }];
    const checklistText = defaultChecklist.map(x => x.t).join('\n');
    const uploadStatus = Orbit.secureResources && Orbit.secureResources.documentUploadStatus
      ? Orbit.secureResources.documentUploadStatus({ entidad: 'gestion', clienteId: opts.clienteId || '', polizaId: opts.polizaId || '' })
      : { available: false, status: 'pendiente_conexion', message: 'Carga directa pendiente de conexión con Drive' };
    let canUpload = uploadStatus && uploadStatus.available === true && uploadStatus.uploadAvailable !== false;
    const needsDriveBootstrap = !!(uploadStatus && uploadStatus.bootstrapRequired === true);
    const sourceLabel = opts.desdeCliente ? 'Solicitud del cliente (Portal)' : (opts.origen === 'Ops' ? 'Nueva gestión · Ops' : 'Gestión operativa');
    const headerColor = opts.desdeCliente ? '#15803d,#0c5a2a' : '#1f3a5f,#142840';
    let pendingFiles = [];

    const clientOptions = [['', '— Seleccionar cliente —']].concat(clientes.map(c => [c.id, c.nombre]));
    const managementLists = opsListas().filter(l => l.kind === 'gestion');
    const listOptions = managementLists.map(l => [l.nombre, l.emoji + ' ' + l.nombre]);
    const typeOptions = Array.from(new Set(tipos.map(t => t.t).concat(opts.tipo ? [opts.tipo] : [])));

    const html = `
      <div class="ciclo-h" style="background:linear-gradient(120deg,${headerColor})">
        <div>
          <div class="ciclo-eyebrow">${sourceLabel}</div>
          <h2>🗂 ${initialClient ? U.esc(initialClient.nombre) : 'Crear gestión'}</h2>
          <div class="ciclo-sub">Un solo registro canónico en <b>Ops</b>. La ficha se crea únicamente al confirmar.</div>
        </div>
        <div class="ciclo-h-act"><button class="imp-x" data-close>✕</button></div>
      </div>
      <div class="ciclo-create-body" style="padding:20px 22px;display:grid;gap:14px;max-height:72vh;overflow:auto">
        <div class="ciclo-sec" style="margin:0">
          <div class="ciclo-sec-t">Datos de la gestión</div>
          <div class="cgrid">
            ${fSelectOpt('Cliente', 'mg-cli', clientOptions, opts.clienteId || '')}
            ${fSelectOpt('Lista (Ops)', 'mg-lista', listOptions, initialList)}
            ${fSelectFree('Tipo de gestión', 'mg-tipo', typeOptions, opts.tipo || (typeOptions[0] || 'Actualizar datos de cliente'))}
            ${fSelectFree('Estado', 'mg-estado', ['Pendiente', 'En proceso'], opts.estado || 'Pendiente')}
            ${fSelectCat('Prioridad', 'mg-prio', 'prioridades', opts.prioridad || 'Media')}
            ${fSelectOpt('Responsable', 'mg-ase', asesores.map(a => [a.id, a.nombre]), initialAdvisor)}
            ${fSelectOpt('Aseguradora', 'mg-asg', [['', '—']].concat(asgs.map(a => [a.id, a.nombre])), opts.aseguradoraId || '')}
            ${fInput('Vence', 'mg-vence', opts.vence || inDays(7), 'date')}
            ${fInput('Próxima acción', 'mg-prox', opts.proximaAccion || 'Pendiente de definir')}
          </div>
          <label class="ce-l" style="margin-top:10px">Póliza vinculada<select id="mg-pol" class="o-sel"></select></label>
        </div>

        <div class="ciclo-sec" style="margin:0">
          <div class="ciclo-sec-t">Checklist inicial</div>
          <textarea id="mg-checklist" class="o-sel" style="min-height:82px;resize:vertical;padding:9px 11px" placeholder="Un control por línea">${U.esc(checklistText)}</textarea>
        </div>

        ${opts.requireConfirmationText ? `<div class="ciclo-sec" style="margin:0">
          <div class="ciclo-sec-t">Confirmación requerida</div>
          <label style="display:flex;gap:9px;align-items:flex-start">
            <input type="checkbox" id="mg-confirm" style="margin-top:3px">
            <span><b>${U.esc(opts.requireConfirmationText)}</b>${opts.confirmationHelp ? '<small class="muted" style="display:block;margin-top:3px">' + U.esc(opts.confirmationHelp) + '</small>' : ''}</span>
          </label>
        </div>` : ''}

        <div class="ciclo-sec" style="margin:0">
          <div class="ciclo-sec-t">Nota / contexto</div>
          <textarea id="mg-nota" class="o-sel" style="min-height:82px;resize:vertical;padding:9px 11px" placeholder="Detalle de lo que se necesita gestionar…">${U.esc(opts.nota || '')}</textarea>
        </div>

        <div class="ciclo-sec" style="margin:0">
          <div class="ciclo-sec-t">Documentos de soporte · Drive</div>
          <label class="ce-l">Enlace(s) de Drive / origen<textarea id="mg-links" class="o-sel" style="min-height:68px;resize:vertical;padding:9px 11px" placeholder="Pega uno o varios enlaces https://, uno por línea"></textarea></label>
          <div class="cfg-note" id="mg-drive-connect-note" style="margin-top:10px;${canUpload ? 'display:none' : ''}">
            <b>${needsDriveBootstrap ? 'Drive requiere una configuración administrativa única.' : 'El repositorio documental no está disponible para carga.'}</b>
            <div style="margin-top:6px">Gravicentra controla el acceso por rol y alcance; los usuarios no deben conectar cuentas Google para trabajar los expedientes.</div>
            ${needsDriveBootstrap ? '<button type="button" class="btn ghost sm" id="mg-drive-bootstrap" style="margin-top:8px">⚙ Configurar Drive</button>' : ''}
          </div>
          <div id="mg-drive-upload-area" style="${canUpload ? '' : 'display:none'}">
            <div class="sg-drop" id="mg-drop" style="margin-top:10px"><span>📎 Arrastra o haz clic para cargar a Drive</span><input type="file" id="mg-file" multiple hidden></div>
            <div id="mg-files" class="sg-files"></div>
          </div>
        </div>
      </div>
      <div class="ciclo-foot">
        <div class="muted" style="font-size:12px">Origen: ${U.esc(opts.origen || 'Ops')} · persistencia y readback obligatorios.</div>
        <div style="display:flex;gap:8px"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="mg-save">${opts.desdeCliente ? 'Enviar solicitud' : 'Crear gestión en Ops'}</button></div>
      </div>`;

    const back = modal(html, 760);
    const el = id => back.querySelector('#' + id);
    const policySelect = el('mg-pol');
    const clientSelect = el('mg-cli');
    const insurerSelect = el('mg-asg');
    const advisorSelect = el('mg-ase');

    function paintPolicies(preferred) {
      const cid = clientSelect.value;
      const pols = cid ? S().where('polizas', p => p.clienteId === cid) : [];
      policySelect.innerHTML = '<option value="">— Sin póliza específica —</option>' + pols.map(p => '<option value="' + U.esc(p.id) + '">' + U.esc((p.numero || 'Sin número') + ' · ' + (p.ramo || 'Sin ramo')) + '</option>').join('');
      const target = preferred && pols.some(p => p.id === preferred) ? preferred : '';
      policySelect.value = target;
      const selected = target ? S().get('polizas', target) : null;
      if (selected && insurerSelect && selected.aseguradoraId) insurerSelect.value = selected.aseguradoraId;
    }
    paintPolicies(opts.polizaId || '');

    clientSelect.addEventListener('change', () => {
      const cli = S().get('clientes', clientSelect.value);
      if (cli && advisorSelect && cli.asesorId) advisorSelect.value = cli.asesorId;
      paintPolicies('');
    });
    policySelect.addEventListener('change', () => {
      const pol = policySelect.value ? S().get('polizas', policySelect.value) : null;
      if (pol && insurerSelect && pol.aseguradoraId) insurerSelect.value = pol.aseguradoraId;
    });

    const drop = el('mg-drop'), input = el('mg-file'), chips = el('mg-files');
    const driveArea = el('mg-drive-upload-area'), driveNote = el('mg-drive-connect-note'), driveBootstrap = el('mg-drive-bootstrap');
    const paintFiles = () => {
      chips.innerHTML = pendingFiles.map((f, i) => '<span class="sg-fchip">📄 ' + U.esc(f.name) + ' <b data-rm="' + i + '">✕</b></span>').join('');
      chips.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { pendingFiles.splice(+b.dataset.rm, 1); paintFiles(); });
    };
    const addFiles = list => {
      Array.from(list || []).forEach(f => { if (!pendingFiles.some(x => x.name === f.name && x.size === f.size)) pendingFiles.push(f); });
      paintFiles();
    };
    drop.addEventListener('click', () => { if (canUpload) input.click(); });
    drop.addEventListener('dragover', e => { e.preventDefault(); if (canUpload) drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); if (canUpload) addFiles(e.dataTransfer.files); });
    input.addEventListener('change', () => { if (canUpload) addFiles(input.files); });
    if (driveBootstrap) driveBootstrap.addEventListener('click', async () => {
      const provider = Orbit.productDriveDocumentProviderP0;
      if (!provider || typeof provider.bootstrap !== 'function') return U.toast('La configuración administrativa de Drive no está disponible.');
      driveBootstrap.disabled = true;
      const out = await provider.bootstrap();
      driveBootstrap.disabled = false;
      if (!out || out.ok !== true) return U.toast((out && out.message) || 'No fue posible configurar Drive.');
      const st = provider.probe ? await provider.probe(true) : null;
      canUpload = !!(st && st.available === true && st.uploadAvailable !== false);
      if (canUpload && driveNote) driveNote.style.display = 'none';
      if (canUpload && driveArea) driveArea.style.display = '';
      U.toast(canUpload ? '✓ Drive quedó conectado de forma persistente.' : 'Drive quedó configurado, pero la carga todavía no está disponible.');
    });

    el('mg-save').addEventListener('click', async () => {
      const save = el('mg-save');
      if (save.disabled) return;
      const clienteId = clientSelect.value;
      const cli = clienteId ? S().get('clientes', clienteId) : null;
      if (!cli) return U.toast('Selecciona el cliente de la gestión.');

      const tipo = String(el('mg-tipo').value || '').trim();
      const lista = String(el('mg-lista').value || '').trim();
      if (!tipo || tipo === '__otro__' || !lista) return U.toast('Completa tipo y lista de la gestión.');
      const confirmation = el('mg-confirm');
      if (opts.requireConfirmationText && (!confirmation || !confirmation.checked)) return U.toast('Confirma la condición requerida antes de crear la gestión.');

      const polizaId = policySelect.value || '';
      const pol = polizaId ? S().get('polizas', polizaId) : null;
      const linkLines = String(el('mg-links').value || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      const invalidLink = linkLines.find(x => !/^https:\/\/[^\s]+$/i.test(x));
      if (invalidLink) return U.toast('Los enlaces documentales deben iniciar con https://');

      const managementId = 'ges' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const linkedDocs = linkLines.map((url, i) => ({
        nombre: 'Documento Drive ' + (i + 1),
        driveUrl: url, externalUrl: url, origen: 'Drive/enlace',
        clienteId, polizaId, entidad: 'gestion', entidadId: managementId
      }));
      const checklistLines = String(el('mg-checklist').value || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      const checklist = checklistLines.map(t => {
        const found = defaultChecklist.find(x => x.t === t);
        return { t, done: found ? !!found.done : false };
      });

      save.disabled = true;
      const original = save.textContent;
      save.textContent = 'Guardando…';
      try {
        const noteValue = String(el('mg-nota').value || '').trim();
        const extra = Object.assign(
          {},
          opts.extraFields && typeof opts.extraFields === 'object' ? opts.extraFields : {},
          typeof opts.dynamicFields === 'function' ? (opts.dynamicFields({ clienteId, polizaId, tipo, lista, nota: noteValue }) || {}) : {}
        );
        let gestion = await crearGestionDurable(Object.assign({}, extra, {
          id: managementId,
          lista, tipo, titulo: opts.titulo || tipo, clienteId, polizaId,
          asesorId: el('mg-ase').value || cli.asesorId || '',
          aseguradoraId: el('mg-asg').value || (pol ? pol.aseguradoraId : ''),
          ramo: pol ? pol.ramo : '',
          prioridad: el('mg-prio').value || 'Media',
          estado: el('mg-estado').value || 'Pendiente',
          vence: el('mg-vence').value || inDays(7),
          proximaAccion: String(el('mg-prox').value || '').trim() || 'Pendiente de definir',
          nota: noteValue,
          origen: opts.desdeCliente ? 'Solicitud del cliente' : (opts.origen || 'Ops'),
          adjuntos: linkedDocs.slice(),
          checklist
        }));

        const uploaded = [];
        const failed = [];
        if (pendingFiles.length) {
          save.textContent = 'Guardando documentos…';
          for (const file of pendingFiles) {
            const out = await Orbit.secureResources.uploadDocument(file, {
              entidad: 'gestion', entidadId: managementId, clienteId, polizaId,
              categoria: 'soporte_gestion', nombre: file.name
            });
            if (out && out.ok) {
              uploaded.push({
                nombre: out.nombre || file.name,
                documentRef: out.documentRef || out.fileId || '',
                driveUrl: out.driveUrl || out.externalUrl || out.url || '',
                externalUrl: out.externalUrl || out.driveUrl || out.url || '',
                mimeType: out.mimeType || file.type || '',
                size: file.size,
                origen: out.origen || 'Drive',
                clienteId, polizaId, entidad: 'gestion', entidadId: managementId
              });
            } else {
              failed.push({ nombre: file.name, status: out && out.status || 'error' });
            }
          }
          const docs = linkedDocs.concat(uploaded);
          await S().updateDurable('gestiones', managementId, {
            adjuntos: docs,
            documentoCargaPendiente: failed.length > 0,
            documentoCargaFallida: failed,
            checklist: checklist.map(x => /documentaci[oó]n|documentos?/i.test(x.t) ? Object.assign({}, x, { done: docs.length > 0 && failed.length === 0 }) : x),
            actualizado: today()
          });
          gestion = S().get('gestiones', managementId);
          if (!gestion) throw new Error('OPS_MANAGEMENT_POST_DOCUMENT_READBACK_MISSING');
        }

        try {
          S().insert('actividades', {
            id: 'act' + Date.now(), clienteId, asesorId: gestion.asesorId,
            tipo: 'sistema', icon: '🗂', fecha: today(), titulo: 'Gestión creada: ' + tipo,
            detalle: 'Confirmada en Ops (' + lista + ')' + ((gestion.adjuntos || []).length ? ' · ' + (gestion.adjuntos || []).length + ' documento(s)' : ''),
            gestionId: managementId
          });
        } catch (e) {}
        const ase = q.asesor(gestion.asesorId);
        notify({
          tipo: 'gestion',
          titulo: (opts.desdeCliente ? 'Solicitud de cliente · ' : 'Nueva gestión · ') + tipo,
          detalle: cli.nombre + ' → ' + lista,
          para: ase ? ase.nombre : '', tel: cli.telefono, email: cli.email
        });
        back.remove();
        refresh();
        if (failed.length) U.toast('Gestión creada. ' + failed.length + ' documento(s) no fueron confirmados por Drive; la gestión quedó marcada para completar.');
        else U.toast('Gestión creada y confirmada en Ops.');
        if (typeof opts.onCreated === 'function') {
          try { opts.onCreated(gestion); } catch (callbackError) { U.toast('La gestión quedó guardada, pero no se pudo completar la navegación posterior.'); }
        }
        if (opts.openAfterCreate !== false) openGestion(managementId);
      } catch (error) {
        const code = String(error && (error.code || error.message) || '');
        U.toast(/PREVIEW_SYNTHETIC_ONLY|preview.*synthetic|synthetic.*only/i.test(code)
          ? 'Preview protege los datos reales: no se creó ninguna gestión en Ops.'
          : 'No fue posible crear la gestión. No se registró un falso éxito.');
        save.disabled = false;
        save.textContent = original;
      }
    });
    return back;
  }

  /* Desde Cliente 360, Póliza, Renovaciones o Portal: mismo editor canónico de Ops con contexto prellenado. */
  function solicitarGestion(clienteId, polizaId, desdeCliente, context) {
    const cli = S().get('clientes', clienteId);
    if (!cli) return;
    const pol = polizaId ? S().get('polizas', polizaId) : null;
    const ctx = context && typeof context === 'object' ? context : {};
    return managementCreateModal(Object.assign({
      clienteId,
      polizaId: polizaId || '',
      desdeCliente: !!desdeCliente,
      tipo: 'Gestión de póliza',
      lista: 'Gestiones Admin',
      prioridad: 'Media',
      asesorId: cli.asesorId || '',
      aseguradoraId: pol ? pol.aseguradoraId || '' : '',
      origen: desdeCliente ? 'Portal' : 'Ficha cliente'
    }, ctx));
  }

  /* ===================== nuevo negocio / nueva gestión ===================== */
  function nuevoNegocio() {
    const asesores = S().all('asesores');
    const html = `
      <div class="ciclo-h" style="background:linear-gradient(120deg,#C5162E,#8f1020)">
        <div><div class="ciclo-eyebrow">Nuevo ingreso · ciclo comercial</div><h2>🌱 Nuevo prospecto</h2>
        <div class="ciclo-sub">Entra a <b>Leads</b> (interés) o directo a <b>Cotización</b> en Ops.</div></div>
        <div class="ciclo-h-act"><button class="imp-x" data-close>✕</button></div>
      </div>
      <div class="ciclo-create-body" style="padding:20px 22px;display:grid;gap:13px">
        <div class="cgrid">
          ${fInput('Nombre / razón social', 'nn-nombre', '')}
          ${fSelect('Tipo', 'nn-tipo', ['Persona', 'Empresa'], 'Persona')}
          ${fInput('Teléfono (WhatsApp)', 'nn-tel', '')}
          ${fInput('Correo', 'nn-email', '')}
          ${fSelect('País', 'nn-pais', ['GT', 'CO'], Orbit.pais && Orbit.pais !== 'TODOS' ? Orbit.pais : 'GT')}
          ${fInput('Canal', 'nn-canal', 'Referido')}
          ${fInput('Producto', 'nn-prod', '')}
          ${fInput('Ramo', 'nn-ramo', 'Auto')}
          ${fInput('Prima estimada', 'nn-prima', 0, 'number')}
          ${fSelectOpt('Asesor', 'nn-ase', asesores.map(a => [a.id, a.nombre]), Orbit.session ? Orbit.session.asesorId() : 'ase001')}
        </div>
        ${fSelect('Punto de ingreso', 'nn-ingreso', ['Leads (interés, sin cotizar)', 'Ops (pide cotización)'], 'Ops (pide cotización)')}
        <label class="ce-l">Descripción / detalle del riesgo<textarea id="nn-desc" class="o-sel" style="min-height:54px;resize:vertical;padding:9px 11px"></textarea></label>
      </div>
      <div class="ciclo-foot"><div></div><div style="display:flex;gap:8px"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="nn-ok">Crear</button></div></div>`;
    const back = modal(html, 640);
    back.querySelector('#nn-ok').addEventListener('click', () => {
      const v = sid => (back.querySelector('#' + sid) || {}).value;
      const ingresoOps = v('nn-ingreso').indexOf('Ops') === 0;
      const pais = v('nn-pais');
      const n = {
        id: 'neg' + Date.now().toString().slice(-7), nombre: v('nn-nombre') || 'Prospecto', tipo: v('nn-tipo'),
        etapa: ingresoOps ? 'cotizando' : 'nuevo', prob: ingresoOps ? 45 : 10,
        asesorId: v('nn-ase'), canal: v('nn-canal'), pais, moneda: pais === 'CO' ? 'COP' : 'GTQ',
        producto: v('nn-prod') || 'Por definir', ramo: v('nn-ramo') || 'Auto', aseguradoraId: '',
        telefono: v('nn-tel'), email: v('nn-email'), primaEst: +v('nn-prima') || 0,
        descripcion: v('nn-desc'), notas: '', cadencia: '', cadenciaActiva: false,
        proximoToque: inDays(2), vence: inDays(7), prioridad: 'Media',
        decision: '', nroCotizacion: ingresoOps ? 'COT-' + Math.floor(1000 + Math.random() * 9000) : '', nroPoliza: '',
        checklist: [{ t: 'Datos completos para cotizar', done: ingresoOps }, { t: 'Cotización enviada al cliente', done: false }, { t: 'Documentos del riesgo recibidos', done: false }, { t: 'Inspección / avalúo realizado', done: false }],
        clienteIdCreado: '', archivado: false, etiquetas: [],
        bitacora: [{ ts: stamp(), user: (Orbit.session ? Orbit.session.rol() : 'Equipo'), campo: 'Creación', de: '', a: 'Ingreso (' + (ingresoOps ? 'Ops' : 'Leads') + ')', origen: 'manual' }],
        comentarios: [], origen: ingresoOps ? 'Ops' : 'Leads', creado: today(), actualizado: today()
      };
      S().insert('negocios', n); back.remove(); refresh(); openNegocio(n.id);
    });
  }
  function nuevaGestion() {
    return managementCreateModal({ origen: 'Ops', lista: 'Gestiones Admin', tipo: 'Actualizar datos de cliente', prioridad: 'Media' });
  }

  /* ===================== notificaciones (WhatsApp / correo) ===================== */
  function notify(o) {
    o = o || {};
    try { S().insert('avisos', { id: 'av' + Date.now() + Math.floor(Math.random() * 99), tipo: o.tipo || 'aviso', titulo: o.titulo || 'Notificación', detalle: o.detalle || '', para: o.para || '', tel: o.tel || '', email: o.email || '', fecha: today(), leida: false }); } catch (e) {}
    const waNum = (o.tel || '').replace(/[^0-9]/g, '');
    const msg = encodeURIComponent((o.titulo || '') + (o.detalle ? ' — ' + o.detalle : ''));
    const t = document.createElement('div'); t.className = 'ciclo-toast notif';
    t.innerHTML = `<span>🔔 ${U.esc(o.titulo || 'Notificación')}${o.para ? ' · ' + U.esc(o.para) : ''}</span>` +
      (waNum ? `<a href="https://wa.me/${waNum}?text=${msg}" target="_blank" rel="noopener">💬 WhatsApp</a>` : '') +
      (o.email ? `<a style="cursor:pointer" onclick="Orbit.correoCompose({para:'${o.email}',asunto:'${(o.titulo||'').replace(/'/g,'')}'})">✉ Correo</a>` : '');
    document.body.appendChild(t); setTimeout(() => t.remove(), 5600);
    document.dispatchEvent(new CustomEvent('orbit:notify'));
  }

  /* ===================== gestor de listas (editable por tablero) ===================== */
  function gestionarListas(boardKey) {
    const titulo = boardKey === 'opsListas' ? 'Orbit Ops' : 'Orbit Leads';
    function render() {
      const arr = Orbit.cat.get(boardKey);
      const rows = arr.map((L, i) => `<div class="lm-row" style="border-left:4px solid ${L.color}">
        <input class="lm-emoji" data-emoji="${i}" value="${U.esc(L.emoji)}" maxlength="2">
        <input class="lm-name" data-name="${i}" value="${U.esc(L.nombre)}">
        <input type="color" class="lm-color" data-color="${i}" value="${L.color}">
        <span class="lm-tag">${L.fixed ? (L.etapa ? 'etapa ' + L.etapa : 'fija') : (L.kind === 'gestion' ? 'gestiones' : 'personalizada')}</span>
        <span class="lm-ord"><button data-up="${i}" ${i === 0 ? 'disabled' : ''}>▲</button><button data-down="${i}" ${i === arr.length - 1 ? 'disabled' : ''}>▼</button></span>
        <button class="lm-del" data-del="${i}" ${L.fixed ? 'disabled title="Lista del ciclo: no se elimina"' : ''}>🗑</button>
      </div>`).join('');
      const html = `
        <div class="ciclo-h" style="background:linear-gradient(120deg,#1E2227,#0d0f12)">
          <div><div class="ciclo-eyebrow">Listas del tablero</div><h2>⚙ Configurar listas · ${titulo}</h2>
          <div class="ciclo-sub">Crea, renombra, recolorea, reordena o elimina listas. Las del ciclo (atadas a etapa) no se eliminan.</div></div>
          <div class="ciclo-h-act"><button class="imp-x" data-close>✕</button></div>
        </div>
        <div style="padding:18px 22px;display:grid;gap:9px">${rows}
          <button class="btn ghost" id="lm-add" style="justify-content:center;margin-top:6px">+ Nueva lista</button>
        </div>
        <div class="ciclo-foot"><div class="muted" style="font-size:12px">Los cambios se guardan al instante.</div><button class="btn primary" data-close>Listo</button></div>`;
      const back = modal(html, 600);
      const save = (newArr) => { Orbit.cat.setList(boardKey, newArr); refresh(); render(); };
      back.querySelectorAll('[data-name]').forEach(el => el.addEventListener('change', () => { const a = Orbit.cat.get(boardKey).slice(); const old = a[+el.dataset.name].nombre; a[+el.dataset.name] = Object.assign({}, a[+el.dataset.name], { nombre: el.value }); if (a[+el.dataset.name].kind === 'gestion') S().all('gestiones').forEach(g => { if (g.lista === old) S().update('gestiones', g.id, { lista: el.value }); }); save(a); }));
      back.querySelectorAll('[data-emoji]').forEach(el => el.addEventListener('change', () => { const a = Orbit.cat.get(boardKey).slice(); a[+el.dataset.emoji] = Object.assign({}, a[+el.dataset.emoji], { emoji: el.value || '🗂' }); save(a); }));
      back.querySelectorAll('[data-color]').forEach(el => el.addEventListener('change', () => { const a = Orbit.cat.get(boardKey).slice(); a[+el.dataset.color] = Object.assign({}, a[+el.dataset.color], { color: el.value }); save(a); }));
      back.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => { const a = Orbit.cat.get(boardKey).slice(); const i = +b.dataset.up; [a[i - 1], a[i]] = [a[i], a[i - 1]]; save(a); }));
      back.querySelectorAll('[data-down]').forEach(b => b.addEventListener('click', () => { const a = Orbit.cat.get(boardKey).slice(); const i = +b.dataset.down; [a[i + 1], a[i]] = [a[i], a[i + 1]]; save(a); }));
      back.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { const a = Orbit.cat.get(boardKey).slice(); if (a[+b.dataset.del].fixed) return; a.splice(+b.dataset.del, 1); save(a); }));
      back.querySelector('#lm-add').addEventListener('click', async () => {
        const a = Orbit.cat.get(boardKey).slice();
        const palette = ['#1f3a5f', '#c9821b', '#0f766e', '#6b4ea0', '#2563a8', '#b91c1c', '#15803d', '#7c3aed'];
        const nombre = ((await Orbit.ui.prompt('Nombre de la nueva lista:', { title: 'Nueva lista' })) || '').trim(); if (!nombre) return;
        const base = { id: boardKey.slice(0, 2) + Date.now().toString().slice(-5), nombre, emoji: '🗂', color: palette[a.length % palette.length] };
        a.push(boardKey === 'opsListas' ? Object.assign(base, { kind: 'gestion' }) : Object.assign(base, { custom: true }));
        save(a);
      });
    }
    render();
  }

  /* ===================== helpers de form ===================== */
  function fInput(label, id, value, type) {
    return `<label class="ce-l">${label}<input id="${id}" class="o-sel" type="${type || 'text'}" value="${U.esc(value == null ? '' : value)}"></label>`;
  }
  function fSelect(label, id, opts, val) {
    return `<label class="ce-l">${label}<select id="${id}" class="o-sel">${opts.map(o => `<option ${o === val ? 'selected' : ''}>${U.esc(o)}</option>`).join('')}</select></label>`;
  }
  /* Select alimentado por un catálogo configurable, con opción "➕ Otro…". */
  /* Select libre con opción "➕ Otro…" (no persiste a catálogo). */
  function fSelectFree(label, id, opts, val) {
    const has = opts.indexOf(val) >= 0;
    return `<label class="ce-l">${label}<select id="${id}" class="o-sel free-sel">
      ${opts.map(o => `<option ${o === val ? 'selected' : ''}>${U.esc(o)}</option>`).join('')}
      ${(!has && val) ? `<option selected>${U.esc(val)}</option>` : ''}
      <option value="__otro__">➕ Otro…</option></select></label>`;
  }
  function fSelectCat(label, id, catKey, val) {
    const opts = Orbit.cat.get(catKey).filter(o => typeof o === 'string');
    const has = opts.indexOf(val) >= 0;
    return `<label class="ce-l">${label}<select id="${id}" class="o-sel cat-sel" data-cat="${catKey}">
      ${opts.map(o => `<option ${o === val ? 'selected' : ''}>${U.esc(o)}</option>`).join('')}
      ${(!has && val) ? `<option selected>${U.esc(val)}</option>` : ''}
      <option value="__otro__">➕ Otro…</option></select></label>`;
  }
  function fSelectOpt(label, id, pairs, val) {
    return `<label class="ce-l">${label}<select id="${id}" class="o-sel">${pairs.map(p => `<option value="${p[0]}" ${p[0] === val ? 'selected' : ''}>${U.esc(p[1])}</option>`).join('')}</select></label>`;
  }
  function chkRow(ns, i, c) { return `<label class="chk-row"><input type="checkbox" data-chk="${i}" ${c.done ? 'checked' : ''}><span class="${c.done ? 'done' : ''}">${U.esc(c.t)}</span></label>`; }
  function comRow(c) { return `<div class="com-row"><div class="com-h"><b>${U.esc(c.user)}</b><span class="muted mono">${U.esc(c.ts)}</span></div><div>${U.esc(c.texto)}</div></div>`; }
  function bitRow(b) { return `<div class="bit-row"><span class="bit-dot ${b.origen === 'auto' ? 'auto' : ''}"></span><div><div class="bit-t"><b>${U.esc(b.campo)}</b> ${b.de ? '· ' + U.esc(b.de) + ' → ' : ''}${U.esc(b.a)}</div><div class="muted mono" style="font-size:10.5px">${U.esc(b.ts)} · ${U.esc(b.user)}${b.origen === 'auto' ? ' · auto' : ''}</div></div></div>`; }

  return {
    ETAPAS, E, FLUJO, opsListas, leadsListas, etapaInfo, flag,
    negocios, gestiones, opsBoard, leadsBoard, metricasLeads,
    cardNegocio, cardGestion, wireCards, notify, gestionarListas,
    setEtapa, decidirCierre, perder, archivar, emitir, crearGestion, crearGestionDurable,
    openNegocio, openGestion, managementCreateModal, solicitarGestion, nuevoNegocio, nuevaGestion
  };
})();

/* Listener global: selects de catálogo / libres con opción "Otro". */
if (!window.__orbitOtroSel) {
  window.__orbitOtroSel = true;
  document.addEventListener('change', function (e) {
    var s = e.target;
    if (!s || !s.classList) return;
    if ((s.classList.contains('cat-sel') || s.classList.contains('free-sel')) && s.value === '__otro__') {
      Orbit.ui.prompt('Escribe el nuevo valor:', { title: 'Nuevo valor' }).then(function (raw) {
        var v = (raw || '').trim();
        if (v) {
          if (s.classList.contains('cat-sel') && s.dataset.cat) Orbit.cat.add(s.dataset.cat, v);
          var opt = document.createElement('option'); opt.textContent = v; opt.selected = true;
          s.insertBefore(opt, s.querySelector('option[value="__otro__"]'));
          s.value = v;
        } else { s.selectedIndex = 0; }
      });
      return;
    }
    if (false) {
    }
  });
}
