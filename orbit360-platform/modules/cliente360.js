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
  const ROLE = () => (Orbit.auth && Orbit.auth.user() && Orbit.auth.user().rol) || 'Dirección';
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
      ${Orbit.kit.bannerFor('cliente360', `<button class="btn primary" onclick="alert('Demo: alta de cliente — formulario en el siguiente paso del build.')">+ Nuevo cliente</button>`)}

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
      ['resumen', 'Resumen'], ['polizas', 'Pólizas'], ['vehiculos', 'Vehículos'], ['cobros', 'Cobros'],
      ['recibos', 'Recibos y pagos'], ['renovaciones', 'Renovaciones'], ['comisiones', 'Comisiones'], ['historial', 'Historial']
    ];
    const saludCol = r.salud >= 70 ? '#1f8a4c' : r.salud >= 45 ? '#c9821b' : '#C5162E';

    host.innerHTML = `<div class="page">
      <div class="crumb" style="margin-bottom:14px"><a style="cursor:pointer;color:var(--red)" onclick="location.hash='#/cliente360'">‹ Clientes 360</a> / ${U.esc(c.nombre)}</div>

      <!-- HEADER cerebro -->
      <div class="card" style="overflow:hidden">
        <div style="display:flex;gap:18px;padding:20px 22px;flex-wrap:wrap;align-items:flex-start;background:linear-gradient(120deg,#fff, #faf9f6)">
          <div style="position:relative">
            ${U.avatar(c.nombre, c.tipo === 'Empresa' ? '#1E2227' : '#C5162E', 'lg')}
          </div>
          <div style="flex:1;min-width:240px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <h2 style="font-family:var(--f-display);font-weight:800;font-size:24px;letter-spacing:-.02em;margin:0">${U.esc(c.nombre)}</h2>
              <span class="badge ${c.tipo === 'Empresa' ? 'info' : 'neutral'}">${c.tipo}</span>
              ${c.etiquetas.map(t => `<span class="badge ${t === 'VIP' ? 'danger' : 'neutral'}">${t}</span>`).join('')}
            </div>
            <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px;color:var(--ink-2);font-size:13.5px">
              <span>🆔 ${U.esc(c.identificacion)}</span>
              <span>✉ ${U.esc(c.email)}</span>
              <span>📞 ${U.esc(c.telefono)}</span>
              <span>📍 ${U.esc(c.ciudad)}, ${c.pais}</span>
            </div>
            <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:8px;color:var(--ink-3);font-size:12.5px">
              <span>Asesor: <b style="color:${ase ? ase.color : '#333'}">${U.esc(ase ? ase.nombre : '—')}</b></span>
              <span>Segmento: <b>${c.segmento}</b></span>
              <span>Canal: <b>${c.canal}</b></span>
              <span>Cliente desde: <b>${U.fmtDate(c.fechaAlta)}</b></span>
            </div>
            <div style="margin-top:10px">
              ${c.driveLink
                ? `<a href="${U.esc(c.driveLink)}" target="_blank" rel="noopener" class="badge info" style="text-decoration:none">📁 Documentos en Drive ↗</a>`
                : `<span class="badge neutral" style="cursor:pointer" onclick="Orbit.modules.cliente360.edit('${cid}')">📁 Agregar link de Drive</span>`}
            </div>
          </div>
          <!-- salud -->
          <div style="text-align:center;min-width:120px">
            <div style="width:104px;height:104px;border-radius:50%;margin:0 auto;display:grid;place-items:center;background:conic-gradient(${saludCol} ${r.salud * 3.6}deg, #ececec ${r.salud * 3.6}deg)">
              <div style="width:80px;height:80px;border-radius:50%;background:#fff;display:grid;place-items:center">
                <div><div style="font-family:var(--f-display);font-weight:800;font-size:26px;color:${saludCol}">${r.salud}</div>
                <div style="font-size:9px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.08em">Salud</div></div>
              </div>
            </div>
            <div style="display:flex;gap:6px;justify-content:center;margin-top:10px;flex-wrap:wrap">
              <button class="btn ghost sm" title="Enviar WhatsApp" onclick="alert('Demo: abre Notificaciones WA')">💬</button>
              <button class="btn ghost sm" title="Importar estado de cuenta / pólizas" onclick="Orbit.importa.open('estados-cuenta')">⬇</button>
              <button class="btn primary sm" onclick="Orbit.modules.cliente360.edit('${cid}')">Editar</button>
            </div>
          </div>
        </div>

        <!-- KPI band -->
        <div style="display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid var(--line)">
          ${kpiCell('Pólizas vigentes', r.nVigentes + ' / ' + r.nPolizas, '')}
          ${kpiCell('Prima anual', U.money(r.primaAnual, r.moneda), '')}
          ${kpiCell('Cartera al día', U.money(r.cobrado, r.moneda), 'ok')}
          ${kpiCell('Cartera vencida', U.money(r.vencido, r.moneda), r.vencido > 0 ? 'danger' : '')}
          ${kpiCell('Comisión generada', U.money(r.comisionGen, r.moneda), '')}
        </div>
      </div>

      <!-- tabs -->
      <div class="tabs" style="margin:18px 0 16px;max-width:640px">
        ${tabs.map(t => `<div class="tab ${tab === t[0] ? 'active' : ''}" data-tab="${t[0]}">${t[1]}</div>`).join('')}
      </div>
      <div id="c360-body"></div>
    </div>`;

    host.querySelectorAll('.tab').forEach(el => el.addEventListener('click', () => { tab = el.dataset.tab; detalle(cid); }));
    renderTab(cid, r);
  }

  function kpiCell(label, val, tone) {
    const col = tone === 'ok' ? 'var(--ok)' : tone === 'danger' ? 'var(--danger)' : 'var(--ink)';
    return `<div style="padding:14px 16px;border-right:1px solid var(--line-2)">
      <div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.05em;font-weight:600">${label}</div>
      <div style="font-family:var(--f-display);font-weight:800;font-size:18px;margin-top:5px;color:${col}">${val}</div></div>`;
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
      <thead><tr><th>Póliza</th><th>Ramo / Producto</th><th>Aseguradora</th><th>Forma</th><th class="num">Prima</th><th>Vigencia</th><th>Estado</th></tr></thead>
      <tbody>${r.pol.map(p => {
        const asg = q.aseguradora(p.aseguradoraId);
        return `<tr>
          <td><span class="mono" style="font-size:12.5px;font-weight:600">${p.numero}</span></td>
          <td><b>${p.ramo}</b><div class="muted" style="font-size:12px">${p.producto}</div></td>
          <td><span style="display:flex;align-items:center;gap:7px"><span class="dot-s" style="background:${asg ? asg.color : '#999'}"></span>${U.esc(asg ? asg.nombre : '—')}</span></td>
          <td>${p.forma}</td>
          <td class="num">${U.money(p.prima, p.moneda)}</td>
          <td style="font-size:12.5px">${U.fmtDate(p.vigenciaInicio)}<div class="muted">→ ${U.fmtDate(p.vigenciaFin)}</div></td>
          <td>${U.estadoBadge(p.estado)}</td>
        </tr>`;
      }).join('')}${r.pol.length === 0 ? '<tr><td colspan="7" class="muted" style="text-align:center;padding:28px">Sin pólizas.</td></tr>' : ''}</tbody>
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
        <button class="btn ghost sm" onclick="alert('Demo: inicia el flujo de renovación para todas las pólizas por vencer de este cliente.')">Gestionar todas</button>
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
          <button class="btn ${gestionable ? 'primary' : 'ghost'} sm" ${gestionable ? '' : 'disabled style="opacity:.4"'} onclick="alert('Demo: gestionar renovación de ${p.numero}')">Gestionar</button>
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
            <button class="btn ghost sm" onclick="location.hash='#/cliente360?c=${cid}'" >Ver póliza</button>
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
        <button class="btn ghost sm" onclick="Orbit.importa.open('estados-cuenta')">⬇ Importar estado de cuenta</button>
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
      <div style="padding:11px 14px;border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-3)">Al importar el estado de cuenta se despliegan los recibos según forma de pago; <b>aplicar pago</b> concilia el recibo con su póliza.</div>
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
          <div class="muted" style="font-size:11.5px">Se guarda en la capa de datos (localStorage) y queda disponible para Insights y Marketing.</div>
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
        ${field('Nombre', 'ce-nombre', c.nombre)}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">
          ${field('Correo', 'ce-email', c.email)}
          ${field('Teléfono', 'ce-tel', c.telefono)}
        </div>
        ${field('Contacto alterno (si es diferente al asegurado)', 'ce-cont', c.contactoAlt || '')}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">
          <label class="ce-l">Asesor<select id="ce-ase" class="o-sel" style="width:100%">${asesores.map(a => `<option value="${a.id}" ${a.id === c.asesorId ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select></label>
          <label class="ce-l">Segmento<select id="ce-seg" class="o-sel" style="width:100%">${['Premium', 'Recurrente', 'Estándar', 'Nuevo'].map(s => `<option ${s === c.segmento ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        </div>
        ${field('Link de Drive (documentos)', 'ce-drive', c.driveLink || '')}
        <label class="ce-l">Notas<textarea id="ce-notas" class="o-sel" style="width:100%;min-height:70px;resize:vertical;padding:9px 11px">${U.esc(c.notas || '')}</textarea></label>
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
    back.querySelector('#ce-save').addEventListener('click', () => {
      S().update('clientes', cid, {
        nombre: val('ce-nombre') || c.nombre,
        email: val('ce-email'), telefono: val('ce-tel'),
        asesorId: val('ce-ase'), segmento: val('ce-seg'),
        driveLink: val('ce-drive'), notas: val('ce-notas'), contactoAlt: val('ce-cont')
      });
      closeM(); detalle(cid);
    });
  }
  function field(label, id, value) {
    return `<label class="ce-l">${label}<input id="${id}" class="o-sel" style="width:100%" value="${U.esc(value)}"></label>`;
  }
  function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

  return { render, edit };
})();
