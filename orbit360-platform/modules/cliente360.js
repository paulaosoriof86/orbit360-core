/* ============================================================
   Orbit 360 · Módulo CRM · Cliente 360  (NÚCLEO — base de oro)
   El "cerebro" del cliente: todo en un lugar, con desglose por
   póliza, cobro, renovación, comisión e historial.
   Master-detail. Deep-link: #/cliente360?c=cliID
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.cliente360 = (function () {
  const U = Orbit.ui, q = Orbit.q, S = () => Orbit.store;

  let host;
  let filtros = { q: '', pais: '', tipo: '', asesor: '', seg: '' };
  let tab = 'resumen';
  let shownCid = null; // cliente actualmente abierto (para resetear pestaña al cambiar)
  // visibilidad por rol (la comisión de empresa es interna/configurable)
  const ROLE = () => (Orbit.session && Orbit.session.rol && Orbit.session.rol()) || (Orbit.auth && Orbit.auth.user() && Orbit.auth.user().rol) || 'Dirección';
  const verEmpresa = () => ['Dirección', 'Admin', 'Finanzas'].includes(ROLE());

  const TABS = ['resumen', 'polizas', 'vehiculos', 'cobros', 'recibos', 'renovaciones', 'comisiones', 'historial'];

  // ---------- entry ----------
  function render(h) {
    host = h;
    const p = (Orbit.route && Orbit.route.params) || {};
    const cid = p.c || null;
    if (cid && S().get('clientes', cid)) {
      // al abrir un cliente distinto, o llegar con pestaña explícita, fijar la pestaña
      if (p.t && TABS.includes(p.t)) tab = p.t;
      else if (cid !== shownCid) tab = 'resumen';
      shownCid = cid;
      detalle(cid);
    } else {
      shownCid = null;
      lista();
    }
  }

  /* =========================================================
     LISTA (cartera de clientes)
     ========================================================= */
  function lista() {
    const clientes = S().all('clientes');
    const asesores = S().all('asesores');
    const f = filtros;
    const rows = clientes.filter(c =>
      (!f.q || (c.nombre + ' ' + c.email + ' ' + c.identificacion).toLowerCase().includes(f.q.toLowerCase())) &&
      (!f.pais || c.pais === f.pais) &&
      (!f.tipo || c.tipo === f.tipo) &&
      (!f.asesor || c.asesorId === f.asesor) &&
      (!f.seg || c.segmento === f.seg)
    );
    const totPrima = clientes.reduce((s, c) => { const r = q.clienteResumen(c.id); return s + (r.moneda === 'COP' ? r.primaAnual / 1000 : r.primaAnual); }, 0);

    host.innerHTML = `<div class="page">
      ${Orbit.kit.bannerFor('cliente360', `<button class="btn primary" onclick="alert('Alta de cliente: captura los datos del expediente o impórtalos desde un documento.')">+ Nuevo cliente</button>`)}

      <div class="kpi-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
        <div class="kpi"><div class="k-accent"></div><div class="k-label">Clientes</div><div class="k-val">${clientes.length}</div><div class="k-foot muted">${clientes.filter(c => c.tipo === 'Empresa').length} empresas · ${clientes.filter(c => c.tipo === 'Persona').length} personas</div></div>
        <div class="kpi"><div class="k-accent" style="background:var(--info)"></div><div class="k-label">Pólizas activas</div><div class="k-val">${S().where('polizas', p => p.estado === 'Vigente' || p.estado === 'Por renovar').length}</div><div class="k-foot muted">de ${S().all('polizas').length} históricas</div></div>
        <div class="kpi"><div class="k-accent" style="background:var(--ok)"></div><div class="k-label">Prima vigente</div><div class="k-val">${U.moneyShort(totPrima, 'GTQ')}</div><div class="k-foot muted">cartera total estimada</div></div>
        <div class="kpi"><div class="k-accent" style="background:var(--warn)"></div><div class="k-label">Por renovar ≤45 d</div><div class="k-val">${q.renovacionesProximas(45).length}</div><div class="k-foot muted">requieren gestión</div></div>
      </div>

      <div class="card" style="overflow:hidden">
        <div style="display:flex;gap:10px;flex-wrap:wrap;padding:13px 14px;border-bottom:1px solid var(--line);align-items:center">
          <div class="tb-search" style="background:var(--surface);border-color:var(--line);color:var(--ink-3);min-width:220px">
            <span>🔍</span><input id="f-q" placeholder="Buscar cliente, correo, identificación…" value="${U.esc(f.q)}">
          </div>
          <select id="f-tipo" class="o-sel"><option value="">Tipo</option><option ${f.tipo === 'Persona' ? 'selected' : ''}>Persona</option><option ${f.tipo === 'Empresa' ? 'selected' : ''}>Empresa</option></select>
          <select id="f-pais" class="o-sel"><option value="">País</option><option value="GT" ${f.pais === 'GT' ? 'selected' : ''}>Guatemala</option><option value="CO" ${f.pais === 'CO' ? 'selected' : ''}>Colombia</option></select>
          <select id="f-seg" class="o-sel"><option value="">Segmento</option>${['Premium', 'Recurrente', 'Estándar', 'Nuevo'].map(s => `<option ${f.seg === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
          <select id="f-ase" class="o-sel"><option value="">Asesor</option>${asesores.map(a => `<option value="${a.id}" ${f.asesor === a.id ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select>
          <span class="muted" style="margin-left:auto;font-size:12.5px">${rows.length} de ${clientes.length}</span>
        </div>
        <div style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>Cliente</th><th>Asesor</th><th class="num">Pólizas</th><th class="num">Prima vigente</th><th>Cartera</th><th>Salud</th><th></th></tr></thead>
          <tbody>
          ${rows.map(c => {
            const r = q.clienteResumen(c.id);
            const ase = q.asesor(c.asesorId);
            const cartera = r.vencido > 0 ? `<span class="badge danger">Vencida ${U.moneyShort(r.vencido, r.moneda)}</span>` : r.pendiente > 0 ? `<span class="badge warn">Al día</span>` : `<span class="badge ok">Al día</span>`;
            return `<tr class="clickable" onclick="location.hash='#/cliente360?c=${c.id}'">
              <td><div style="display:flex;align-items:center;gap:11px">
                ${U.avatar(c.nombre, c.tipo === 'Empresa' ? '#1E2227' : '#C5162E', 'md')}
                <div><div style="font-weight:700">${U.esc(c.nombre)}</div>
                <div class="muted" style="font-size:11.5px">${c.tipo} · ${c.ciudad} · ${c.pais}</div></div>
              </div></td>
              <td><div style="display:flex;align-items:center;gap:7px"><span class="dot-s" style="background:${ase ? ase.color : '#999'}"></span>${U.esc(ase ? ase.nombre : '—')}</div></td>
              <td class="num">${r.nVigentes}<span class="muted">/${r.nPolizas}</span></td>
              <td class="num">${U.money(r.primaAnual, r.moneda)}</td>
              <td>${cartera}</td>
              <td><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="width:54px"><i style="width:${r.salud}%;background:${r.salud >= 70 ? 'linear-gradient(90deg,#1f8a4c,#34b96a)' : r.salud >= 45 ? 'linear-gradient(90deg,#c9821b,#e0a23c)' : 'linear-gradient(90deg,#a01828,#C5162E)'}"></i></div><span class="mono" style="font-size:12px">${r.salud}</span></div></td>
              <td style="text-align:right;color:var(--ink-3)">›</td>
            </tr>`;
          }).join('')}
          ${rows.length === 0 ? `<tr><td colspan="7" style="text-align:center;padding:34px" class="muted">Sin resultados para los filtros aplicados.</td></tr>` : ''}
          </tbody>
        </table>
        </div>
      </div>
    </div>`;

    const reb = () => { tab = 'resumen'; lista(); };
    bind('f-q', 'input', v => { filtros.q = v; }, true);
    bind('f-tipo', 'change', v => { filtros.tipo = v; reb(); });
    bind('f-pais', 'change', v => { filtros.pais = v; reb(); });
    bind('f-seg', 'change', v => { filtros.seg = v; reb(); });
    bind('f-ase', 'change', v => { filtros.asesor = v; reb(); });
    // búsqueda en vivo sin perder foco
    const qi = document.getElementById('f-q');
    if (qi) qi.addEventListener('input', e => { filtros.q = e.target.value; liveFilter(); });
  }

  function liveFilter() {
    // re-render manteniendo el input enfocado
    const active = document.activeElement; const val = active ? active.value : '';
    lista();
    const qi = document.getElementById('f-q');
    if (qi) { qi.focus(); qi.value = val; qi.setSelectionRange(val.length, val.length); }
  }
  function bind(id, ev, fn, skip) {
    const el = document.getElementById(id); if (!el || skip) return;
    el.addEventListener(ev, e => fn(e.target.value));
  }

  /* =========================================================
     DETALLE — el cerebro 360
     ========================================================= */
  function detalle(cid) {
    const r = q.clienteResumen(cid);
    const c = r.cli, ase = q.asesor(c.asesorId);
    const tabs = [
      ['resumen', 'Resumen', '📊'], ['polizas', 'Pólizas', '📑'], ['vehiculos', 'Vehículos', '🚗'], ['cobros', 'Cobros', '💳'],
      ['recibos', 'Recibos y pagos', '🧾'], ['renovaciones', 'Renovaciones', '🔄'], ['comisiones', 'Comisiones', '💼'], ['historial', 'Historial', '📝']
    ];
    const saludCol = r.salud >= 70 ? '#1f8a4c' : r.salud >= 45 ? '#c9821b' : '#C5162E';
    const waNum = (c.telefono || '').replace(/[^0-9]/g, '');
    const waMsg = encodeURIComponent('Hola ' + c.nombre.split(' ')[0] + ', te saluda tu asesor.');

    host.innerHTML = `<div class="page">
      <div class="crumb" style="margin-bottom:14px"><a style="cursor:pointer;color:var(--red)" onclick="location.hash='#/cliente360'">‹ Clientes 360</a> / ${U.esc(c.nombre)}</div>

      <!-- HEADER cerebro -->
      <div class="card fichahdr" style="overflow:hidden">
        <div class="fh-top">
          <div class="fh-avwrap">
            ${U.avatar(c.nombre, c.tipo === 'Empresa' ? '#1E2227' : '#C5162E', 'lg')}
            <span class="fh-pais">${c.pais === 'GT' ? '🇬🇹' : c.pais === 'CO' ? '🇨🇴' : '🌎'} ${c.pais}</span>
          </div>
          <div style="flex:1;min-width:240px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <h2 style="font-family:var(--f-display);font-weight:800;font-size:25px;letter-spacing:-.02em;margin:0">${U.esc(c.nombre)}</h2>
              <span class="badge ${c.tipo === 'Empresa' ? 'info' : 'neutral'}">${c.tipo}</span>
              ${c.etiquetas.map(t => `<span class="badge ${t === 'VIP' ? 'danger' : 'neutral'}">${t}</span>`).join('')}
            </div>
            <div class="fh-contact">
              <span class="fh-chip">🆔 ${U.esc(c.identificacion)}</span>
              <a class="fh-chip" href="mailto:${U.esc(c.email)}">✉ ${U.esc(c.email)}</a>
              <span class="fh-chip">📞 ${U.esc(c.telefono)}</span>
              <span class="fh-chip">📍 ${U.esc([c.direccion, c.ciudad, c.departamento].filter(Boolean).join(', ') || c.ciudad)}</span>
              ${c.contactoAlt ? `<span class="fh-chip">👤 Alt: ${U.esc(c.contactoAlt)}</span>` : ''}
            </div>
            <div class="fh-meta">
              <span>Asesor <b style="color:${ase ? ase.color : '#333'}">${U.esc(ase ? ase.nombre : '—')}</b></span>
              <span>Segmento <b>${c.segmento}</b></span>
              <span>Canal <b>${c.canal}</b></span>
              <span>Desde <b>${U.fmtDate(c.fechaAlta)}</b></span>
              ${c.fechaNac ? `<span>Nac. <b>${U.fmtDate(c.fechaNac)}</b></span>` : ''}
            </div>
            <div style="margin-top:11px;display:flex;gap:8px;flex-wrap:wrap">
              ${c.driveLink
                ? `<a href="${U.esc(c.driveLink)}" target="_blank" rel="noopener" class="fh-drive">📁 Expediente en Drive <span style="opacity:.6">↗</span></a>`
                : `<span class="fh-drive ghost" onclick="Orbit.modules.cliente360.edit('${cid}')">📁 Agregar link de Drive</span>`}
              <span class="fh-drive ghost" onclick="Orbit.importa.openFor('${cid}')">⬇ Importar a este expediente</span>
            </div>
          </div>
          <!-- salud + acciones -->
          <div style="text-align:center;min-width:130px">
            <div class="fh-salud" style="background:conic-gradient(${saludCol} ${r.salud * 3.6}deg, #ececec ${r.salud * 3.6}deg)">
              <div class="fh-salud-in">
                <div style="font-family:var(--f-display);font-weight:800;font-size:27px;color:${saludCol}">${r.salud}</div>
                <div style="font-size:9px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.08em">Salud</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;justify-content:center;margin-top:12px;flex-wrap:wrap">
              <a class="btn ghost sm" title="Enviar WhatsApp" href="https://wa.me/${waNum}?text=${waMsg}" target="_blank" rel="noopener" style="color:#1f8a4c">💬 WA</a>
              <button class="btn ghost sm" title="Solicitar gestión operativa (Ops)" onclick="Orbit.ciclo.solicitarGestion('${cid}')">🗂 Gestión</button>
              <button class="btn ghost sm" title="Solicitud del cliente (Portal)" onclick="Orbit.ciclo.solicitarGestion('${cid}',null,true)">🙋 Cliente</button>
              <button class="btn primary sm" onclick="Orbit.modules.cliente360.edit('${cid}')">Editar</button>
            </div>
          </div>
        </div>

        <!-- KPI band -->
        <div class="fh-kpis">
          ${kpiCell('Pólizas vigentes', r.nVigentes + ' <small>/ ' + r.nPolizas + '</small>', '', '📑')}
          ${kpiCell('Prima anual', U.money(r.primaAnual, r.moneda), '', '💰')}
          ${kpiCell('Cartera al día', U.money(r.cobrado, r.moneda), 'ok', '✅')}
          ${kpiCell('Cartera vencida', U.money(r.vencido, r.moneda), r.vencido > 0 ? 'danger' : '', '⚠')}
          ${kpiCell('Comisión generada', U.money(r.comisionGen, r.moneda), '', '💼')}
        </div>
      </div>

      <!-- tabs -->
      <div class="ficha-tabs-wrap">
        <div class="ficha-tabs" id="ficha-tabs">
          ${tabs.map(t => `<div class="ftab ${tab === t[0] ? 'active' : ''}" data-tab="${t[0]}"><span class="fi">${t[2]}</span>${t[1]}</div>`).join('')}
        </div>
        <button class="ftab-more" id="ftab-more" aria-label="Ver más pestañas">›</button>
      </div>
      <div id="c360-body"></div>
    </div>`;

    host.querySelectorAll('.ftab').forEach(el => el.addEventListener('click', () => { tab = el.dataset.tab; detalle(cid); }));
    wireTabsAffordance();
    renderTab(cid, r);
  }

  /* indicador "hay más" en las pestañas desbordadas */
  function wireTabsAffordance() {
    const wrap = document.querySelector('.ficha-tabs-wrap');
    const strip = document.getElementById('ficha-tabs');
    const more = document.getElementById('ftab-more');
    if (!wrap || !strip || !more) return;
    const upd = () => {
      const overflow = strip.scrollWidth - strip.clientWidth;
      const atEnd = strip.scrollLeft >= overflow - 2;
      wrap.classList.toggle('has-more', overflow > 4 && !atEnd);
      wrap.classList.toggle('has-prev', strip.scrollLeft > 2);
    };
    strip.addEventListener('scroll', upd);
    window.addEventListener('resize', upd);
    more.addEventListener('click', () => strip.scrollBy({ left: strip.clientWidth * 0.7, behavior: 'smooth' }));
    // llevar la pestaña activa a la vista
    const act = strip.querySelector('.ftab.active');
    if (act) { const off = act.offsetLeft - 12; if (off > strip.scrollLeft + strip.clientWidth - act.offsetWidth || off < strip.scrollLeft) strip.scrollLeft = off; }
    setTimeout(upd, 30);
  }

  function kpiCell(label, val, tone, icon) {
    const col = tone === 'ok' ? 'var(--ok)' : tone === 'danger' ? 'var(--danger)' : 'var(--ink)';
    const ac = tone === 'ok' ? 'var(--ok)' : tone === 'danger' ? 'var(--danger)' : 'var(--red)';
    return `<div class="fh-kpi"><span class="fh-kpi-ac" style="background:${ac}"></span>
      <div class="fh-kpi-lab">${icon ? `<span>${icon}</span>` : ''}${label}</div>
      <div class="fh-kpi-val" style="color:${col}">${val}</div></div>`;
  }

  function renderTab(cid, r) {
    const body = document.getElementById('c360-body');
    if (tab === 'resumen') body.innerHTML = tabResumen(cid, r);
    else if (tab === 'polizas') body.innerHTML = tabPolizas(cid, r);
    else if (tab === 'vehiculos') body.innerHTML = tabVehiculos(cid, r);
    else if (tab === 'recibos') { body.innerHTML = tabRecibos(cid, r); wireRecibos(cid); }
    else if (tab === 'cobros') body.innerHTML = tabCobros(cid, r);
    else if (tab === 'renovaciones') body.innerHTML = tabRenov(cid, r);
    else if (tab === 'comisiones') body.innerHTML = tabComis(cid, r);
    else if (tab === 'historial') { body.innerHTML = tabHistorial(cid, r); wireHistorial(cid); }
  }

  /* ---- Resumen (cerebro) ---- */
  function tabResumen(cid, r) {
    const acts = q.actividadesDe(cid).slice(0, 4);
    const proxRenov = r.pol.filter(p => p.estado === 'Por renovar').sort((a, b) => a.vigenciaFin.localeCompare(b.vigenciaFin))[0];
    const proxCobro = r.cob.filter(c => c.estado === 'Pendiente').sort((a, b) => a.vence.localeCompare(b.vence))[0];
    // distribución por ramo
    const porRamo = {};
    r.pol.filter(p => p.estado !== 'Cancelada').forEach(p => porRamo[p.ramo] = (porRamo[p.ramo] || 0) + p.prima);
    const totalRamo = Object.values(porRamo).reduce((s, v) => s + v, 0) || 1;
    const ramoCols = ['#C5162E', '#1E2227', '#1f3a5f', '#1f8a4c', '#c9821b', '#6b4ea0', '#0f766e'];

    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <!-- col izq -->
      <div style="display:grid;gap:16px">
        <div class="card pad">
          <b style="font-family:var(--f-display);font-size:15px">Próximas acciones</b>
          <div style="margin-top:12px;display:grid;gap:10px">
            ${proxRenov ? actionRow('🔄', 'Renovación', `${proxRenov.ramo} · ${proxRenov.numero}`, U.fmtDate(proxRenov.vigenciaFin), 'warn') : actionRow('✓', 'Sin renovaciones próximas', 'Cartera al día', '', 'ok')}
            ${proxCobro ? actionRow('💳', 'Próximo cobro', `Cuota ${proxCobro.cuota} · ${U.money(proxCobro.monto, proxCobro.moneda)}`, U.fmtDate(proxCobro.vence), 'info') : actionRow('✓', 'Sin cobros pendientes', 'Todo aplicado', '', 'ok')}
            ${r.vencido > 0 ? actionRow('⚠', 'Cartera vencida', U.money(r.vencido, r.moneda) + ' por gestionar', 'urgente', 'danger') : ''}
          </div>
        </div>
        <div class="card pad">
          <b style="font-family:var(--f-display);font-size:15px">Cartera de pólizas por ramo</b>
          <div style="height:11px;border-radius:99px;overflow:hidden;display:flex;margin:14px 0 12px">
            ${Object.entries(porRamo).map(([ramo, v], i) => `<div title="${ramo}" style="width:${v / totalRamo * 100}%;background:${ramoCols[i % ramoCols.length]}"></div>`).join('') || '<div style="width:100%;background:#eee"></div>'}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:10px">
            ${Object.entries(porRamo).map(([ramo, v], i) => `<span style="display:flex;align-items:center;gap:6px;font-size:12.5px"><span class="dot-s" style="background:${ramoCols[i % ramoCols.length]}"></span>${ramo} · <b>${Math.round(v / totalRamo * 100)}%</b></span>`).join('') || '<span class="muted">Sin pólizas activas</span>'}
          </div>
        </div>
      </div>
      <!-- col der: actividad reciente -->
      <div class="card pad">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <b style="font-family:var(--f-display);font-size:15px">Actividad reciente</b>
          <span class="tab" style="cursor:pointer;font-size:12px" onclick="document.querySelector('.tab[data-tab=historial]').click()">Ver todo →</span>
        </div>
        <div style="margin-top:14px;position:relative;padding-left:6px">
          ${acts.map(a => `<div style="display:flex;gap:12px;padding-bottom:14px;position:relative">
            <div style="width:30px;height:30px;border-radius:50%;background:var(--surface);border:1px solid var(--line);display:grid;place-items:center;flex-shrink:0">${a.icon}</div>
            <div style="flex:1"><div style="font-size:13.5px;font-weight:600">${U.esc(a.titulo)}</div>
            <div class="muted" style="font-size:12px;margin-top:2px">${U.esc(a.detalle)}</div>
            <div class="muted mono" style="font-size:11px;margin-top:3px">${U.fmtDate(a.fecha)} · ${U.ago(a.fecha)}</div></div>
          </div>`).join('') || '<span class="muted">Sin actividad registrada.</span>'}
        </div>
      </div>
    </div>`;
  }
  function actionRow(ico, t, sub, when, tone) {
    const bg = { warn: 'var(--warn-soft)', info: 'rgba(31,58,95,.08)', danger: 'var(--danger-soft)', ok: 'var(--ok-soft)' }[tone] || 'var(--surface)';
    return `<div style="display:flex;align-items:center;gap:11px;padding:10px 12px;background:${bg};border-radius:var(--r-sm)">
      <span style="font-size:17px">${ico}</span>
      <div style="flex:1"><div style="font-size:13.5px;font-weight:700">${t}</div><div class="muted" style="font-size:12px">${sub}</div></div>
      ${when ? `<span class="mono" style="font-size:12px;color:var(--ink-2)">${when}</span>` : ''}</div>`;
  }

  /* ---- Pólizas ---- */
  function tabPolizas(cid, r) {
    return `<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Póliza</th><th>Ramo / Producto</th><th>Aseguradora</th><th>Forma</th><th class="num">Prima</th><th>Vigencia</th><th>Estado</th><th></th></tr></thead>
      <tbody>${r.pol.map(p => {
        const asg = q.aseguradora(p.aseguradoraId);
        return `<tr class="clickable" onclick="Orbit.modules.cliente360.verPoliza('${p.id}')">
          <td><span class="mono" style="font-size:12.5px;font-weight:600">${p.numero}</span></td>
          <td><b>${p.ramo}</b><div class="muted" style="font-size:12px">${p.producto}</div></td>
          <td><span style="display:flex;align-items:center;gap:7px"><span class="dot-s" style="background:${asg ? asg.color : '#999'}"></span>${U.esc(asg ? asg.nombre : '—')}</span></td>
          <td>${p.forma}</td>
          <td class="num">${U.money(p.prima, p.moneda)}</td>
          <td style="font-size:12.5px">${U.fmtDate(p.vigenciaInicio)}<div class="muted">→ ${U.fmtDate(p.vigenciaFin)}</div></td>
          <td>${U.estadoBadge(p.estado)}</td>
          <td style="text-align:right;color:var(--ink-3)">›</td>
        </tr>`;
      }).join('')}${r.pol.length === 0 ? '<tr><td colspan="8" class="muted" style="text-align:center;padding:28px">Sin pólizas.</td></tr>' : ''}</tbody>
    </table></div></div>`;
  }

  /* ---- Cobros y cartera ---- */
  function tabCobros(cid, r) {
    const cob = r.cob.slice().sort((a, b) => b.vence.localeCompare(a.vence));
    return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px">
      ${miniStat('Al día (pagado)', U.money(r.cobrado, r.moneda), 'ok')}
      ${miniStat('Pendiente', U.money(r.pendiente, r.moneda), 'warn')}
      ${miniStat('Vencido', U.money(r.vencido, r.moneda), r.vencido > 0 ? 'danger' : 'ok')}
    </div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Póliza</th><th>Cuota</th><th class="num">Monto</th><th>Vence</th><th>Pago</th><th>Método</th><th>Estado</th><th title="Conciliado con Finanzas">Concil.</th></tr></thead>
      <tbody>${cob.map(c => {
        const p = S().get('polizas', c.polizaId);
        return `<tr>
          <td><span class="mono" style="font-size:12px">${p ? p.numero : '—'}</span></td>
          <td>${c.cuota}</td>
          <td class="num">${U.money(c.monto, c.moneda)}</td>
          <td style="font-size:12.5px">${U.fmtDate(c.vence)}</td>
          <td style="font-size:12.5px">${c.fechaPago ? U.fmtDate(c.fechaPago) : '<span class="muted">—</span>'}</td>
          <td style="font-size:12.5px">${c.metodo || '<span class="muted">—</span>'}</td>
          <td>${U.estadoBadge(c.estado)}</td>
          <td>${c.estado === 'Pagado' ? (c.conciliado ? '<span title="Pago aplicado a la póliza" style="color:var(--ok)">✓</span>' : '<span title="Pendiente de conciliar (Finanzas)" style="color:var(--warn)">◷</span>') : '<span class="muted">—</span>'}</td>
        </tr>`;
      }).join('')}${cob.length === 0 ? '<tr><td colspan="8" class="muted" style="text-align:center;padding:28px">Sin cobros.</td></tr>' : ''}</tbody>
    </table></div>
    <div style="padding:11px 14px;border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-3);display:flex;align-items:center;gap:8px">
      <span style="color:var(--ok)">✓</span> conciliado &nbsp;·&nbsp; <span style="color:var(--warn)">◷</span> por conciliar — la <b>doble conciliación</b> (pago ↔ póliza) vive en <b>Orbit Finanzas</b>.
    </div></div>`;
  }
  function miniStat(label, val, tone) {
    const col = tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : tone === 'danger' ? 'var(--danger)' : 'var(--ink)';
    return `<div class="card" style="padding:13px 15px"><div style="font-size:11.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.05em;font-weight:600">${label}</div>
      <div style="font-family:var(--f-display);font-weight:800;font-size:20px;margin-top:5px;color:${col}">${val}</div></div>`;
  }

  /* ---- Renovaciones ---- */
  function tabRenov(cid, r) {
    const items = r.pol.filter(p => p.estado !== 'Cancelada').slice().sort((a, b) => a.vigenciaFin.localeCompare(b.vigenciaFin));
    return `<div class="card pad">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <b style="font-family:var(--f-display);font-size:15px">Línea de renovaciones</b>
        <button class="btn ghost sm" onclick="Orbit.ciclo.solicitarGestion('${cid}')">🗂 Solicitar gestión</button>
      </div>
      <div style="margin-top:16px;display:grid;gap:12px">
      ${items.map(p => {
        const d = U.daysFromNow(p.vigenciaFin);
        const estado = p.estado === 'Vencida' ? 'Vencida' : d <= 45 ? 'Por renovar' : 'Vigente';
        const tone = estado === 'Vencida' ? 'danger' : estado === 'Por renovar' ? 'warn' : 'ok';
        const pct = Math.max(2, Math.min(100, 100 - (d / 365 * 100)));
        const gestionable = estado !== 'Vigente';
        return `<div style="display:flex;align-items:center;gap:14px">
          <div style="width:120px;flex-shrink:0"><div style="font-weight:700;font-size:13px">${p.ramo}</div><div class="muted mono" style="font-size:11px">${p.numero}</div></div>
          <div style="flex:1"><div class="bar"><i style="width:${pct}%;background:${tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? 'linear-gradient(90deg,#c9821b,#e0a23c)' : 'linear-gradient(90deg,#1f8a4c,#34b96a)'}"></i></div></div>
          <div style="width:150px;text-align:right;font-size:12.5px">${U.fmtDate(p.vigenciaFin)}<div class="muted">${d < 0 ? 'venció hace ' + (-d) + ' d' : 'en ' + d + ' d'}</div></div>
          ${U.estadoBadge(estado)}
          <button class="btn ${gestionable ? 'primary' : 'ghost'} sm" ${gestionable ? '' : 'disabled style="opacity:.4"'} onclick="Orbit.modules.cliente360.renovar('${p.id}')">Renovar</button>
          <button class="btn ghost sm" onclick="Orbit.modules.cliente360.comparativo('${p.id}')" title="Comparar propuesta de renovación vs actual">⚖ Comparar</button>
          <button class="btn ghost sm" onclick="Orbit.ciclo.solicitarGestion('${cid}','${p.id}')" title="Solicitar condiciones de renovación a la aseguradora">🗂</button>
        </div>`;
      }).join('') || '<span class="muted">Sin pólizas para renovar.</span>'}
      </div>
    </div>`;
  }

  /* ---- Vehículos (detalle por póliza de auto) ---- */
  function tabVehiculos(cid, r) {
    const vs = q.vehiculosDe(cid);
    if (!vs.length) return `<div class="card pad"><span class="muted">Este cliente no tiene vehículos asegurados. Los datos de vehículo aparecen aquí cuando hay pólizas de ramo Auto.</span></div>`;
    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">
      ${vs.map(v => {
        const p = S().get('polizas', v.polizaId);
        return `<div class="card pad">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <span style="width:46px;height:46px;border-radius:11px;background:var(--red-soft);display:grid;place-items:center;font-size:22px">🚗</span>
            <div><b style="font-family:var(--f-display);font-size:16px">${U.esc(v.marca)} ${U.esc(v.linea)}</b>
            <div class="muted mono" style="font-size:12px">${U.esc(v.placa)} · ${v.anio}</div></div>
            <span class="badge ${p && p.estado === 'Vigente' ? 'ok' : p && p.estado === 'Por renovar' ? 'warn' : 'neutral'}" style="margin-left:auto">${p ? p.estado : '—'}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;font-size:12.5px">
            ${vrow('Uso', v.uso)}${vrow('Color', v.color)}
            ${vrow('Chasis (VIN)', v.chasis)}${vrow('Motor', v.motor)}
            ${vrow('Suma asegurada', U.money(v.sumaAsegurada, p ? p.moneda : 'GTQ'))}${vrow('Póliza', p ? p.numero : '—')}
          </div>
          <div style="margin-top:12px;display:flex;gap:8px">
            <button class="btn ghost sm" onclick="Orbit.modules.cliente360.verPoliza('${v.polizaId}')">Ver póliza</button>
            <button class="btn ghost sm" onclick="Orbit.importa.open('polizas')">Importar documentos</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }
  function vrow(k, v) { return `<div><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em">${k}</div><div style="font-weight:600;margin-top:1px">${U.esc(v)}</div></div>`; }

  /* ---- Recibos y pagos (aplicar pago) ---- */
  function tabRecibos(cid, r) {
    const cob = r.cob.slice().sort((a, b) => a.vence.localeCompare(b.vence));
    const pend = cob.filter(c => c.estado === 'Pendiente' || c.estado === 'Vencido');
    return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px">
      ${miniStat('Recibos del cliente', String(cob.length), '')}
      ${miniStat('Por aplicar', String(pend.length), pend.length ? 'warn' : 'ok')}
      ${miniStat('Aplicado', U.money(r.cobrado, r.moneda), 'ok')}
    </div>
    <div class="card" style="overflow:hidden">
      <div style="padding:12px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between">
        <b style="font-family:var(--f-display);font-size:15px">Recibos por forma de pago</b>
      </div>
      <div style="overflow-x:auto"><table class="tbl">
        <thead><tr><th>Recibo</th><th>Póliza</th><th>Forma</th><th>Cuota</th><th class="num">Monto</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
        <tbody>${cob.map(c => {
          const p = S().get('polizas', c.polizaId);
          const aplicable = c.estado === 'Pendiente' || c.estado === 'Vencido';
          return `<tr>
            <td class="mono" style="font-size:12px">REC-${c.id.slice(-5).toUpperCase()}</td>
            <td class="mono" style="font-size:12px">${p ? p.numero : '—'}</td>
            <td>${p ? p.forma : '—'}</td>
            <td>${c.cuota}</td>
            <td class="num">${U.money(c.monto, c.moneda)}</td>
            <td style="font-size:12.5px">${U.fmtDate(c.vence)}</td>
            <td>${U.estadoBadge(c.estado)}</td>
            <td style="text-align:right">${aplicable ? `<button class="btn primary sm" data-apply="${c.id}">Aplicar pago</button>` : (c.estado === 'Pagado' ? `<span class="badge ${c.conciliado ? 'ok' : 'warn'}">${c.conciliado ? 'Conciliado' : 'Por conciliar'}</span>` : '<span class="muted">—</span>')}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      <div style="padding:11px 14px;border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-3)"><b>Aplicar pago</b> concilia el recibo con su póliza. Los estados de cuenta se cargan de forma centralizada en <b>Orbit Finanzas</b> (son generales de la aseguradora) y desde ahí impactan a cada cliente.</div>
    </div>`;
  }
  function wireRecibos(cid) {
    document.querySelectorAll('[data-apply]').forEach(b => b.addEventListener('click', () => {
      S().update('cobros', b.dataset.apply, { estado: 'Pagado', fechaPago: '2026-06-20', metodo: 'Transferencia', conciliado: true });
      detalle(cid);
    }));
  }

  /* ---- Comisiones ---- */
  function tabComis(cid, r) {
    const com = r.com.slice().sort((a, b) => b.periodo.localeCompare(a.periodo));
    const tot = com.reduce((s, c) => s + c.monto, 0);
    const liq = com.filter(c => c.estado === 'Liquidada').reduce((s, c) => s + c.monto, 0);
    const vendedor = Math.round(tot * 0.6), empresa = tot - vendedor; // split demo 60/40
    return `<div style="display:grid;grid-template-columns:repeat(${verEmpresa() ? 4 : 3},1fr);gap:12px;margin-bottom:14px">
      ${miniStat('Comisión vendedor', U.money(vendedor, r.moneda), 'ok')}
      ${verEmpresa() ? miniStat('Comisión empresa 🔒', U.money(empresa, r.moneda), '') : ''}
      ${miniStat('Liquidada', U.money(liq, r.moneda), 'ok')}
      ${miniStat('Por liquidar', U.money(tot - liq, r.moneda), 'warn')}
    </div>
    <div class="card" style="padding:11px 14px;margin-bottom:14px;font-size:12.5px;color:var(--ink-3);display:flex;align-items:center;gap:8px">
      <span>🔒</span> La <b>comisión de empresa</b> es información interna; su visibilidad es <b>configurable por rol</b> (hoy ves como <b>${U.esc(ROLE())}</b>). El vendedor solo ve su comisión.
    </div>
    <div class="card" style="padding:11px 14px;margin-bottom:14px;font-size:12.5px;color:var(--ink-2);border-left:3px solid var(--red)">
      <b>Base de cálculo:</b> la comisión se paga sobre <b>prima neta</b> (antes de gastos, impuestos y costos de asistencia) y se <b>causa sobre prima recaudada</b>, no sobre venta. El % por asesor puede ser <b>fijo o variable</b> (se configura en Equipo / Configuración).
    </div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Periodo</th><th>Póliza</th><th class="num">Base</th><th class="num">%</th><th class="num">Comisión</th><th>Estado</th></tr></thead>
      <tbody>${com.map(c => {
        const p = S().get('polizas', c.polizaId);
        return `<tr><td class="mono" style="font-size:12.5px">${c.periodo}</td>
          <td><span class="mono" style="font-size:12px">${p ? p.numero : '—'}</span></td>
          <td class="num">${U.money(c.base, c.moneda)}</td>
          <td class="num">${c.pct}%</td>
          <td class="num"><b>${U.money(c.monto, c.moneda)}</b></td>
          <td>${U.estadoBadge(c.estado)}</td></tr>`;
      }).join('')}${com.length === 0 ? '<tr><td colspan="6" class="muted" style="text-align:center;padding:28px">Sin comisiones registradas.</td></tr>' : ''}</tbody>
    </table></div></div>`;
  }

  /* ---- Historial + agregar nota ---- */
  function tabHistorial(cid, r) {
    const acts = q.actividadesDe(cid);
    return `<div style="display:grid;grid-template-columns:1.6fr 1fr;gap:16px">
      <div class="card pad">
        <b style="font-family:var(--f-display);font-size:15px">Historial completo</b>
        <div style="margin-top:16px;border-left:2px solid var(--line);padding-left:18px;display:grid;gap:16px">
          ${acts.map(a => `<div style="position:relative">
            <span style="position:absolute;left:-26px;top:0;width:24px;height:24px;border-radius:50%;background:#fff;border:1px solid var(--line);display:grid;place-items:center;font-size:12px">${a.icon}</span>
            <div style="font-size:13.5px;font-weight:600">${U.esc(a.titulo)}</div>
            <div class="muted" style="font-size:12.5px;margin-top:2px">${U.esc(a.detalle)}</div>
            <div class="muted mono" style="font-size:11px;margin-top:3px">${U.fmtDate(a.fecha)} · ${U.ago(a.fecha)} · ${U.esc((q.asesor(a.asesorId) || {}).nombre || '')}</div>
          </div>`).join('') || '<span class="muted">Sin actividad.</span>'}
        </div>
      </div>
      <div class="card pad" style="align-self:start">
        <b style="font-family:var(--f-display);font-size:15px">Registrar interacción</b>
        <div style="margin-top:12px;display:grid;gap:9px">
          <select id="na-tipo" class="o-sel" style="width:100%">
            <option value="📞|llamada">📞 Llamada</option>
            <option value="💬|whatsapp">💬 WhatsApp</option>
            <option value="✉|email">✉ Correo</option>
            <option value="🤝|reunion">🤝 Reunión</option>
            <option value="📝|nota">📝 Nota</option>
          </select>
          <input id="na-tit" class="o-sel" style="width:100%" placeholder="Título (p. ej. Llamada de seguimiento)">
          <textarea id="na-det" class="o-sel" style="width:100%;min-height:74px;resize:vertical;padding:9px 11px" placeholder="Detalle…"></textarea>
          <button class="btn primary" id="na-save">Agregar al historial</button>
          <div class="muted" style="font-size:11.5px">Queda registrado en el expediente y disponible para Insights y Marketing.</div>
        </div>
      </div>
    </div>`;
  }
  function wireHistorial(cid) {
    const btn = document.getElementById('na-save'); if (!btn) return;
    btn.addEventListener('click', () => {
      const [icon, tipo] = (document.getElementById('na-tipo').value || '📝|nota').split('|');
      const tit = document.getElementById('na-tit').value.trim() || 'Nota';
      const det = document.getElementById('na-det').value.trim() || '—';
      S().insert('actividades', {
        id: 'act' + Date.now(), clienteId: cid, asesorId: S().get('clientes', cid).asesorId,
        tipo, icon, fecha: '2026-06-20', titulo: tit, detalle: det
      });
      detalle(cid);
    });
  }

  /* ---- Editar ficha (modal) ---- */
  function edit(cid) {
    const c = S().get('clientes', cid); if (!c) return;
    const asesores = S().all('asesores');
    let back = document.getElementById('c360-edit');
    if (back) back.remove();
    back = document.createElement('div');
    back.id = 'c360-edit'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(520px,94vw);max-height:90vh;overflow:auto;padding:0">
      <div style="padding:18px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:17px">Editar ficha del cliente</b>
        <button class="imp-x" id="ce-x">✕</button>
      </div>
      <div style="padding:18px 20px;display:grid;gap:11px">
        ${field('Nombre / Razón social', 'ce-nombre', c.nombre)}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">
          ${field('Correo', 'ce-email', c.email)}
          ${field('Teléfono', 'ce-tel', c.telefono)}
        </div>
        <label class="ce-l" style="flex-direction:row;align-items:center;gap:8px;font-weight:600"><input type="checkbox" id="ce-cont-chk" ${c.contactoAlt ? 'checked' : ''}> El contacto es diferente al asegurado</label>
        <div id="ce-cont-wrap" style="${c.contactoAlt ? '' : 'display:none'}">${field('Contacto (nombre y teléfono)', 'ce-cont', c.contactoAlt || '')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:11px">
          <label class="ce-l">País<select id="ce-pais" class="o-sel" style="width:100%">${(Orbit.PAISES || []).filter(p => p.id !== 'TODOS').map(p => `<option value="${p.id}" ${p.id === c.pais ? 'selected' : ''}>${p.label}</option>`).join('')}</select></label>
          <label class="ce-l">Departamento<select id="ce-depto" class="o-sel" style="width:100%"></select></label>
          <label class="ce-l">Ciudad<select id="ce-ciudad" class="o-sel" style="width:100%"></select></label>
        </div>
        ${field('Dirección', 'ce-dir', c.direccion || '')}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:11px">
          <label class="ce-l">Canal<select id="ce-canal" class="o-sel" style="width:100%">${['Referido', 'Web', 'WhatsApp', 'Campaña', 'Telemarketing', 'Renovación', 'Ops', 'Leads'].map(s => `<option ${s === c.canal ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
          <label class="ce-l">Sexo<select id="ce-sexo" class="o-sel" style="width:100%"><option value="">—</option><option value="F" ${c.sexo === 'F' ? 'selected' : ''}>Femenino</option><option value="M" ${c.sexo === 'M' ? 'selected' : ''}>Masculino</option></select></label>
          <label class="ce-l">Fecha nac.<input id="ce-nac" type="date" class="o-sel" style="width:100%" value="${c.fechaNac || ''}"></label>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">
          <label class="ce-l">Asesor<select id="ce-ase" class="o-sel" style="width:100%">${asesores.map(a => `<option value="${a.id}" ${a.id === c.asesorId ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select></label>
          <label class="ce-l">Segmento<select id="ce-seg" class="o-sel" style="width:100%">${['Premium', 'Recurrente', 'Estándar', 'Nuevo'].map(s => `<option ${s === c.segmento ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        </div>
        ${field('Link de Drive (expediente)', 'ce-drive', c.driveLink || '')}
        <label class="ce-l">Notas<textarea id="ce-notas" class="o-sel" style="width:100%;min-height:62px;resize:vertical;padding:9px 11px">${U.esc(c.notas || '')}</textarea></label>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn ghost" id="ce-cancel">Cancelar</button>
        <button class="btn primary" id="ce-save">Guardar cambios</button>
      </div>
    </div>`;
    document.body.appendChild(back);
    const closeM = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) closeM(); });
    back.querySelector('#ce-x').addEventListener('click', closeM);
    back.querySelector('#ce-cancel').addEventListener('click', closeM);
    // contacto alterno toggle
    const chk = back.querySelector('#ce-cont-chk');
    chk.addEventListener('change', () => { back.querySelector('#ce-cont-wrap').style.display = chk.checked ? '' : 'none'; });
    // cascada geográfica país → depto → ciudad
    const selPais = back.querySelector('#ce-pais'), selDep = back.querySelector('#ce-depto'), selCiu = back.querySelector('#ce-ciudad');
    function fillDeptos(keepDep, keepCiu) {
      const geo = (Orbit.GEO && Orbit.GEO[selPais.value]) || {};
      const deptos = Object.keys(geo);
      selDep.innerHTML = deptos.map(d => `<option ${d === keepDep ? 'selected' : ''}>${d}</option>`).join('') || '<option>—</option>';
      fillCiudades(keepCiu);
    }
    function fillCiudades(keepCiu) {
      const geo = (Orbit.GEO && Orbit.GEO[selPais.value]) || {};
      const ciudades = geo[selDep.value] || ['—'];
      selCiu.innerHTML = ciudades.map(ci => `<option ${ci === keepCiu ? 'selected' : ''}>${ci}</option>`).join('');
    }
    selPais.addEventListener('change', () => fillDeptos());
    selDep.addEventListener('change', () => fillCiudades());
    fillDeptos(c.departamento, c.ciudad);
    back.querySelector('#ce-save').addEventListener('click', () => {
      S().update('clientes', cid, {
        nombre: val('ce-nombre') || c.nombre,
        email: val('ce-email'), telefono: val('ce-tel'),
        pais: selPais.value, departamento: selDep.value, ciudad: selCiu.value, direccion: val('ce-dir'),
        canal: val('ce-canal'), sexo: (document.getElementById('ce-sexo') || {}).value || '',
        fechaNac: (document.getElementById('ce-nac') || {}).value || '',
        asesorId: val('ce-ase'), segmento: val('ce-seg'),
        moneda: selPais.value === 'CO' ? 'COP' : 'GTQ',
        driveLink: val('ce-drive'), notas: val('ce-notas'),
        contactoAlt: chk.checked ? val('ce-cont') : ''
      });
      closeM(); detalle(cid);
    });
  }
  function field(label, id, value) {
    return `<label class="ce-l">${label}<input id="${id}" class="o-sel" style="width:100%" value="${U.esc(value)}"></label>`;
  }
  function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

  /* ---- Renovar: modificar No. póliza, aseguradora, prima ---- */
  function renovar(polId) {
    const p = S().get('polizas', polId); if (!p) return;
    const asgs = S().all('aseguradoras');
    let back = document.getElementById('c360-edit'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'c360-edit'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(500px,94vw);max-height:90vh;overflow:auto;padding:0">
      <div style="padding:18px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:17px">🔄 Renovar póliza ${p.numero}</b>
        <button class="imp-x" id="rn-x">✕</button>
      </div>
      <div style="padding:18px 20px;display:grid;gap:11px">
        <div class="cfg-note">A veces el cliente renueva con nosotros pero <b>con otra aseguradora</b>. Podés ajustar los datos de la nueva póliza.</div>
        <label class="ce-l">N.º de póliza (nuevo)<input id="rn-num" class="o-sel" value="${U.esc(p.numero)}"></label>
        <label class="ce-l">Aseguradora<select id="rn-asg" class="o-sel">${asgs.map(a => `<option value="${a.id}" ${a.id === p.aseguradoraId ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">
          <label class="ce-l">Prima<input id="rn-prima" class="o-sel" type="number" value="${p.prima}"></label>
          <label class="ce-l">Producto<input id="rn-prod" class="o-sel" value="${U.esc(p.producto)}"></label>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn ghost" id="rn-cancel">Cancelar</button>
        <button class="btn primary" id="rn-ok">Confirmar renovación</button>
      </div>
    </div>`;
    document.body.appendChild(back);
    const cid = p.clienteId, close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#rn-x').addEventListener('click', close);
    back.querySelector('#rn-cancel').addEventListener('click', close);
    back.querySelector('#rn-ok').addEventListener('click', () => {
      const fin = new Date('2026-06-20'); fin.setFullYear(fin.getFullYear() + 1);
      S().update('polizas', polId, {
        numero: document.getElementById('rn-num').value || p.numero,
        aseguradoraId: document.getElementById('rn-asg').value,
        prima: +document.getElementById('rn-prima').value || p.prima,
        producto: document.getElementById('rn-prod').value || p.producto,
        estado: 'Vigente', vigenciaInicio: '2026-06-20', vigenciaFin: fin.toISOString().slice(0, 10)
      });
      S().insert('actividades', { id: 'act' + Date.now(), clienteId: cid, asesorId: p.asesorId, tipo: 'sistema', icon: '🔄', fecha: '2026-06-20', titulo: 'Póliza renovada', detalle: 'Renovación de ' + p.numero + ' procesada.' });
      close(); tab = 'renovaciones'; detalle(cid);
    });
  }

  /* ---- Comparativo inteligente: renovación vs actual ---- */
  function comparativo(polId) {
    const p = S().get('polizas', polId); if (!p) return;
    const asg = q.aseguradora(p.aseguradoraId);
    const primaNueva = Math.round(p.prima * 1.12), sumaNueva = Math.round(p.sumaAsegurada * 1.05);
    let back = document.getElementById('c360-edit'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'c360-edit'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    const rows = [
      ['Prima anual', U.money(p.prima, p.moneda), U.money(primaNueva, p.moneda), '+12%', 'warn'],
      ['Suma asegurada', U.money(p.sumaAsegurada, p.moneda), U.money(sumaNueva, p.moneda), '+5%', 'ok'],
      ['Deducible', '1.0%', '0.8%', 'mejora', 'ok'],
      ['Asistencia', 'Básica', 'Premium', 'mejora', 'ok'],
      ['Forma de pago', p.forma, p.forma, 'igual', 'neutral']
    ];
    back.innerHTML = `<div class="card" style="width:min(620px,95vw);max-height:90vh;overflow:auto;padding:0">
      <div style="padding:18px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <div><div class="nov-eyebrow">Comparativo inteligente de renovación</div><b style="font-family:var(--f-display);font-size:17px">${p.ramo} · ${asg ? U.esc(asg.nombre) : ''}</b></div>
        <button class="imp-x" id="cmp-x">✕</button>
      </div>
      <div style="padding:18px 20px">
        <div class="imp-scan" style="margin-bottom:14px"><span class="imp-spark">🧠</span> Análisis IA: la renovación <b>sube la prima 12%</b> pero <b>mejora coberturas</b> (suma +5%, deducible menor, asistencia Premium).</div>
        <table class="tbl"><thead><tr><th>Concepto</th><th>Actual</th><th>Renovación</th><th>Cambio</th></tr></thead>
          <tbody>${rows.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td><span class="badge ${r[4]}">${r[3]}</span></td></tr>`).join('')}</tbody>
        </table>
        <div class="card pad" style="margin-top:14px;border-left:3px solid var(--red)">
          <b style="font-family:var(--f-display);font-size:14px">🧠 Recomendación</b>
          <p class="muted" style="font-size:13px;margin:6px 0 0;line-height:1.55">El incremento de prima se justifica por la mejora de coberturas y suma asegurada. Conviene <b>renovar destacando el valor agregado</b>. Si el cliente es sensible al precio, ofrecer mantener la cobertura actual a prima similar como alternativa.</p>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button class="btn ghost" onclick="alert('Demo: cargar PDF de la propuesta de renovación para extraer coberturas reales.')">⬇ Cargar propuesta</button>
          <button class="btn primary" onclick="alert('Demo: enviar comparativo al cliente por WhatsApp / correo.')">Enviar al cliente</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#cmp-x').addEventListener('click', close);
  }

  /* ---- Detalle de póliza (drawer) ---- */
  function verPoliza(polId) {
    const p = Orbit.store.get('polizas', polId); if (!p) return;
    const cid = p.clienteId, asg = q.aseguradora(p.aseguradoraId), ase = q.asesor(p.asesorId);
    const veh = q.vehiculoDePoliza(polId);
    const cob = Orbit.store.where('cobros', c => c.polizaId === polId).sort((a, b) => a.vence.localeCompare(b.vence));
    const d = U.daysFromNow(p.vigenciaFin);
    const cur = p.moneda;
    const m2 = (n) => U.money(n, cur);
    // totales del cuadro de recibos
    const sum = (k) => cob.reduce((s, c) => s + (+c[k] || 0), 0);
    let back = document.getElementById('c360-edit'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'c360-edit'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    const estBadge = U.estadoBadge(p.estado);
    const renBadge = p.renovable ? '<span class="badge ok">Renovable</span>' : '<span class="badge neutral">No renovable</span>';
    back.innerHTML = `<div class="card" style="width:min(960px,96vw);max-height:92vh;overflow:auto;padding:0">
      <div class="vp-head">
        <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.8)">Póliza · ${p.tipoPoliza || 'Individual'}</div>
          <b style="font-family:var(--f-display);font-size:19px;color:#fff">${p.ramo} · ${U.esc(p.producto)}</b>
          <div class="mono" style="font-size:12.5px;margin-top:3px;color:rgba(255,255,255,.85)">${p.numero} · ${asg ? U.esc(asg.nombre) : '—'}</div></div>
        <button class="imp-x" id="vp-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button>
      </div>
      <div style="padding:18px 20px;display:grid;gap:16px">
        <div class="vp-tags">${estBadge}${renBadge}${p.multianual ? '<span class="badge info">Multianual</span>' : ''}<span class="badge neutral">${p.contadorRenovaciones || 0} renovaciones</span></div>

        <div class="vp-grid">
          ${vrow('Asesor / vendido por', (ase ? ase.nombre : (p.vendidaPor || '—')))}${vrow('Divisa', p.divisa || p.moneda)}
          ${vrow('Subramo', p.subramo || p.producto)}${vrow('Tipo de póliza', p.tipoPoliza || 'Individual')}
          ${vrow('Vigencia', U.fmtDate(p.vigenciaInicio) + ' → ' + U.fmtDate(p.vigenciaFin))}${vrow('Renueva', d < 0 ? 'venció hace ' + (-d) + ' d' : 'en ' + d + ' d')}
          ${vrow('Suma asegurada', m2(p.sumaAsegurada))}${vrow('Concepto', p.concepto || '—')}
        </div>

        <div class="vp-pay">
          <div class="vp-sec-t">💳 Conducto de pago</div>
          <div class="vp-grid">
            ${vrow('Frecuencia', p.frecuencia + ' (' + (cob.length) + (cob.length === 1 ? ' recibo)' : ' recibos)'))}
            ${vrow('Forma de pago', p.formaPago + (p.tarjeta ? ' · ' + p.tarjeta : ''))}
            ${vrow('Conducto', p.conducto || '—')}
            ${vrow('Recargo financiero', (p.gastosFinan > 0 ? p.recargoFinPct + '% · ' + m2(p.gastosFinan) : 'No aplica (contado)'))}
          </div>
        </div>

        <div class="vp-desglose">
          <div class="vp-sec-t">🧾 Desglose de prima</div>
          <table class="vp-dtbl">
            <tr><td>Prima neta</td><td class="num">${m2(p.primaNeta)}</td></tr>
            <tr><td>Gastos de expedición</td><td class="num">${m2(p.gastosEmision)}</td></tr>
            <tr><td>Gastos financieros <span class="muted">(${p.gastosFinan > 0 ? p.recargoFinPct + '%' : '—'})</span></td><td class="num">${m2(p.gastosFinan)}</td></tr>
            <tr><td>Otros / asistencias</td><td class="num">${m2(p.otros)}</td></tr>
            <tr class="vp-sub"><td>Base gravable</td><td class="num">${m2(p.baseGravable)}</td></tr>
            <tr><td>IVA <span class="muted">(${p.ivaPct}%)</span></td><td class="num">${m2(p.ivaMonto)}</td></tr>
            <tr class="vp-tot"><td>Prima total</td><td class="num">${m2(p.prima)}</td></tr>
          </table>
        </div>

        ${veh ? `<div class="card pad" style="background:var(--surface)"><b style="font-family:var(--f-display);font-size:14px">🚗 ${U.esc(veh.marca)} ${U.esc(veh.linea)} ${veh.anio}</b>
          <div class="vp-grid" style="margin-top:9px;font-size:12.5px">${vrow('Placa', veh.placa)}${vrow('Uso', veh.uso)}${vrow('Chasis', veh.chasis)}${vrow('Motor', veh.motor)}</div></div>` : ''}

        <div>
          <div class="vp-sec-t">📋 Cuadro de recibos</div>
          <div style="overflow-x:auto">
          <table class="tbl vp-rtbl"><thead><tr>
            <th>#</th><th class="num">Neta</th><th class="num">Gastos</th><th class="num">G.Finan</th><th class="num">Otros</th><th class="num">IVA</th><th class="num">Total</th><th>F. límite</th><th>Estado</th>
          </tr></thead>
          <tbody>${cob.map(c => `<tr>
            <td class="mono">${c.cuota}</td>
            <td class="num">${m2(c.neta != null ? c.neta : c.monto)}</td>
            <td class="num">${m2(c.gastosEmision || 0)}</td>
            <td class="num">${m2(c.gastosFinan || 0)}</td>
            <td class="num">${m2(c.otros || 0)}</td>
            <td class="num">${m2(c.iva || 0)}</td>
            <td class="num"><b>${m2(c.monto)}</b></td>
            <td style="font-size:12px">${U.fmtDate(c.fechaLimite || c.vence)}</td>
            <td>${U.estadoBadge(c.estado)}</td></tr>`).join('') || '<tr><td colspan="9" class="muted" style="text-align:center;padding:18px">Sin recibos.</td></tr>'}</tbody>
          <tfoot><tr class="vp-rfoot">
            <td>Total</td><td class="num">${m2(sum('neta'))}</td><td class="num">${m2(sum('gastosEmision'))}</td><td class="num">${m2(sum('gastosFinan'))}</td><td class="num">${m2(sum('otros'))}</td><td class="num">${m2(sum('iva'))}</td><td class="num"><b>${m2(sum('monto'))}</b></td><td colspan="2"></td>
          </tr></tfoot></table>
          </div>
          <div class="muted" style="font-size:11.5px;margin-top:7px">Comisión aseguradora ${p.comAseguradoraPct}% · comisión vendedor ${p.comVendedorPct}% (sobre prima neta). Recibos generados según la forma de pago; el recargo financiero solo aplica en pago fraccionado.</div>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;position:sticky;bottom:0;background:var(--card)">
        <button class="btn ghost" onclick="Orbit.ciclo.solicitarGestion('${cid}','${polId}')">🗂 Solicitar gestión</button>
        <button class="btn ghost" onclick="Orbit.modules.cliente360.comparativo('${polId}')">⚖ Comparar renovación</button>
        ${p.renovable ? `<button class="btn primary" onclick="Orbit.modules.cliente360.renovar('${polId}')">🔄 Renovar</button>` : ''}
      </div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#vp-x').addEventListener('click', close);
  }

  return { render, edit, renovar, comparativo, verPoliza };
})();
