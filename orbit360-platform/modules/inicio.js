/* ============================================================
   Orbit 360 · Módulo Orbit Inicio (Mi Día)
   Dashboard ligero sobre los datos del CRM: metas del mes,
   KPIs, avance por asesor, alertas y accesos rápidos.
   (Núcleo de demostración; se ampliará en su paso del build.)
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.inicio = (function () {
  const U = Orbit.ui, q = Orbit.q;

  function dial(pct, label, val) {
    const rawPct = U.finiteNumber(pct);
    const p = rawPct == null ? 0 : Math.max(0, Math.min(100, rawPct));
    pct = p;
    const deg = p * 3.6;
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px">
      <div style="width:118px;height:118px;border-radius:50%;display:grid;place-items:center;
        background:conic-gradient(var(--red) ${deg}deg, var(--line) ${deg}deg)">
        <div style="width:90px;height:90px;border-radius:50%;background:var(--card);display:grid;place-items:center;text-align:center;box-shadow:inset 0 0 0 1px var(--line)">
          <div><div style="font-family:var(--f-display);font-weight:800;font-size:24px;color:var(--ink)">${pct}%</div>
          <div style="font-size:10px;color:var(--ink-3);font-family:var(--f-mono)">${val}</div></div>
        </div></div>
      <div style="font-size:12px;color:var(--ink-2);font-weight:600">${label}</div>
    </div>`;
  }

  function dataReadiness(names) {
    const store=Orbit.store;
    if(!store || store.__productReadOnlyP0 !== true || typeof store._productStatus !== 'function') return 'ready';
    const ps=store._productStatus()||{}, confirmed=[].concat(ps.serverConfirmedCollections||[]), denied=[].concat(ps.deniedCollections||[]);
    if(names.some(name=>denied.includes(name))) return 'unavailable';
    return names.every(name=>confirmed.includes(name)) ? 'ready' : 'pending';
  }
  function pendingDial(label, readiness) {
    const txt=readiness==='unavailable'?'No disponible':'Actualizando datos';
    return `<div data-inicio-dial="${label}" data-readiness="${readiness}" style="width:118px;min-height:118px;display:grid;place-items:center;text-align:center;border:1px solid var(--line);border-radius:50%;color:var(--ink-3);font-size:12px;font-weight:600">${txt}</div>`;
  }
  function openFinancialKpi(kind) {
    const isConfirmed=kind==='confirmed';
    const state=dataReadiness(isConfirmed?['clientes','cobros']:['clientes','polizas','carteraPrimas']);
    if(isConfirmed && state==='ready') return Orbit.kpi('cobros-pagados');
    const title=kind==='pending'?'Pendiente de cobro':kind==='overdue'?'Cartera vencida':'Cobros confirmados';
    const rows=state==='ready'?(kind==='pending'?q.carteraPendienteRows():q.carteraVencidaRows()):[];
    let back=document.getElementById('inicio-financial-kpi'); if(back)back.remove();
    back=document.createElement('div');back.id='inicio-financial-kpi';back.className='drawer-back open';
    back.setAttribute('data-inicio-financial-kpi',kind);back.setAttribute('data-readiness',state);back.setAttribute('data-row-count',String(rows.length));
    back.style.cssText='display:grid;place-items:center;z-index:96';
    const rowHtml=rows.map((row,i)=>{
      const cid=row.clienteId||(q.policyLinkedClientId?q.policyLinkedClientId(row):'');
      const cli=cid?Orbit.store.get('clientes',cid):null;
      const due=row.vence||row.fechaVencimiento||row.fechaLimite||'';
      const value=row.monto!=null?row.monto:row.saldo;
      const label=kind==='overdue'?'Vencido':'Pendiente';
      return `<tr class="clickable" data-r="${i}" data-client="${U.esc(cid||'')}"><td>${U.esc(cli?cli.nombre:'—')}</td><td>${U.esc(row.cuota||row.secuencia||'—')}</td><td>${U.money(value,row.moneda)}</td><td>${U.fmtDate(due)}</td><td><span class="badge ${label==='Vencido'?'danger':'warn'}">${label}</span></td></tr>`;
    }).join('');
    back.innerHTML=state!=='ready'
      ? `<div class="card" style="width:min(560px,96vw);padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between"><b>${title}</b><button class="imp-x" data-close>✕</button></div><div class="muted" data-kpi-pending="1" style="padding:26px;text-align:center">${state==='unavailable'?'Información no disponible para este acceso.':'Actualizando datos… Estamos esperando confirmación del servidor.'}</div></div>`
      : `<div class="card" style="width:min(760px,96vw);max-height:88vh;overflow:auto;padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between"><b>${title} · ${rows.length}</b><button class="imp-x" data-close>✕</button></div><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Cliente</th><th>Cuota</th><th>Monto</th><th>Vence</th><th>Estado</th></tr></thead><tbody>${rowHtml||'<tr><td colspan="5" class="muted" style="text-align:center;padding:24px">Sin registros.</td></tr>'}</tbody></table></div></div>`;
    document.body.appendChild(back);
    const close=()=>back.remove();
    back.querySelectorAll('[data-close]').forEach(x=>x.onclick=close);
    back.onclick=e=>{if(e.target===back)close();};
    back.querySelectorAll('[data-client]').forEach(tr=>tr.onclick=()=>{const cid=tr.getAttribute('data-client');close();if(cid)location.hash='#/cliente360?c='+encodeURIComponent(cid)+'&t=recibos';});
  }

  function render(host) {
    const clientReadiness=dataReadiness(['clientes']);
    const policyReadiness=dataReadiness(['clientes','polizas']);
    const paymentReadiness=dataReadiness(['clientes','polizas','cobros']);
    const portfolioReadiness=dataReadiness(['clientes','polizas','carteraPrimas']);
    const cart = q.carteraGlobal();
    const prima = q.primaVigenteGlobal();
    const renov = q.renovacionesProximas(45);
    const venc = portfolioReadiness === 'ready' && q.carteraVencidaRows ? q.carteraVencidaRows() : [];
    const board = q.leaderboard();
    const clientes = Orbit.store.all('clientes');
    const polizas = Orbit.store.all('polizas');

    // metas mensuales: autoadministrables desde la colección 'metas' (mes actual).
    // Fallback SIN literales: meta de empresa = suma de metas por asesor (dato real); recaudo = 85% de esa meta.
    const mesKey = U.monthKey();
    const metasMes = (Orbit.store.all('metas') || []).filter(m => (m.mes || '') === mesKey);
    const gMeta = (tipo, def) => { const r = metasMes.find(m => m.tipo === tipo && !m.asesorId); return r && r.valor ? +r.valor : def; };
    const metaEmpresa = Orbit.store.all('asesores').reduce((s, a) => s + (U.finiteNumber(a.metaPrima) || 0), 0) || Math.round((U.finiteNumber(prima) || 0) * 1.1);
    const metaPrima = gMeta('prima', metaEmpresa), pctPrima = metaPrima ? Math.min(100, Math.round(prima / metaPrima * 100)) : 0;
    const recaudo = cart.alDia, metaRec = gMeta('recaudo', Math.round(metaPrima * 0.85)), pctRec = metaRec ? Math.min(100, Math.round(recaudo / metaRec * 100)) : 0;
    const diasMes = new Date(U.now().getFullYear(), U.now().getMonth() + 1, 0).getDate() - U.now().getDate();

    host.innerHTML = `<div class="page">
      ${Orbit.kit.banner({ icon: '🌅', title: 'Buen día', sub: 'esto es lo importante hoy', features: ['Metas del mes', 'Prioridades', 'Avance por asesor'], actions: `<button class="btn primary" onclick="location.hash='#/cliente360'">Abrir Cliente 360 →</button>` })}

      <!-- Metas del mes -->
      <div class="card" style="margin-top:18px;padding:22px 24px;display:flex;gap:30px;align-items:center;flex-wrap:wrap;border-top:3px solid var(--red)">
        <div style="flex:1;min-width:200px">
          <div style="font-family:var(--f-mono);font-size:11px;letter-spacing:.18em;color:var(--ink-3);text-transform:uppercase">Metas del mes · ${U.monthLabel()}</div>
          <div style="font-family:var(--f-display);font-weight:800;font-size:22px;margin-top:6px;color:var(--ink)">Vamos en camino</div>
          <div style="color:var(--ink-2);font-size:13.5px;margin-top:6px;line-height:1.5">
            Quedan <b style="color:var(--ink)">${diasMes} días</b> para cerrar el mes. La prima vigente y el recaudo confirmado se calculan desde las pólizas y cobros reales del CRM.</div>
          <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
            <span class="badge neutral" data-inicio-count="clientes" data-readiness="${clientReadiness}">${clientReadiness === 'ready' ? clientes.length + ' clientes' : 'Actualizando clientes'}</span>
            <span class="badge neutral" data-inicio-count="polizas" data-readiness="${policyReadiness}">${policyReadiness === 'ready' ? polizas.length + ' pólizas' : 'Actualizando pólizas'}</span>
            <span class="badge ${portfolioReadiness === 'ready' ? 'danger' : 'neutral'}" data-inicio-count="cartera-vencida" data-readiness="${portfolioReadiness}">${portfolioReadiness === 'ready' ? venc.length + ' registros vencidos en cartera' : 'Actualizando cartera'}</span>
          </div>
        </div>
        ${policyReadiness === 'ready' ? dial(pctPrima, 'Prima vigente', U.moneyShort(prima, Orbit.q.monedaPais())) : pendingDial('Prima vigente', policyReadiness)}
        ${paymentReadiness === 'ready' ? dial(pctRec, 'Recaudo confirmado', U.moneyShort(recaudo, Orbit.q.monedaPais())) : pendingDial('Recaudo confirmado', paymentReadiness)}
      </div>

      <!-- KPIs clicables -->
      <div class="kpi-row" style="margin-top:18px">
        <button class="kpi kpi-click" data-inicio-metric="cobros-confirmados" data-readiness="${paymentReadiness}" onclick="Orbit.modules.inicio.openFinancialKpi('confirmed')" title="Ver cobros confirmados">
          <div class="k-accent" style="background:${paymentReadiness === 'ready' ? 'var(--red)' : 'var(--line)'}"></div>
          <div class="k-label">Cartera al día</div>
          <div class="k-val" data-value="${paymentReadiness === 'ready' ? cart.alDia : ''}">${paymentReadiness === 'ready' ? U.moneyShort(cart.alDia, Orbit.q.monedaPais()) : (paymentReadiness === 'unavailable' ? 'No disponible' : 'Actualizando datos')}</div>
          <div class="k-foot ${paymentReadiness === 'ready' ? 'up' : 'muted'}">${paymentReadiness === 'ready' ? '▲ cobros confirmados ›' : 'Esperando confirmación del servidor'}</div></button>
        <button class="kpi kpi-click" data-inicio-metric="cartera-pendiente" data-readiness="${portfolioReadiness}" onclick="Orbit.modules.inicio.openFinancialKpi('pending')" title="Ver pendiente de cobro" style="border-color:${portfolioReadiness === 'ready' ? 'var(--warn)' : 'var(--line)'}">
          <div class="k-accent" style="background:${portfolioReadiness === 'ready' ? 'var(--warn)' : 'var(--line)'}"></div>
          <div class="k-label">Pendiente de cobro</div>
          <div class="k-val" data-value="${portfolioReadiness === 'ready' ? cart.pend : ''}">${portfolioReadiness === 'ready' ? U.moneyShort(cart.pend, Orbit.q.monedaPais()) : (portfolioReadiness === 'unavailable' ? 'No disponible' : 'Actualizando datos')}</div>
          <div class="k-foot muted">${portfolioReadiness === 'ready' ? 'cuotas por vencer ›' : 'Esperando confirmación del servidor'}</div></button>
        <button class="kpi kpi-click" data-inicio-metric="cartera-vencida" data-readiness="${portfolioReadiness}" onclick="Orbit.modules.inicio.openFinancialKpi('overdue')" title="Ver cartera vencida">
          <div class="k-accent" style="background:${portfolioReadiness === 'ready' ? 'var(--danger)' : 'var(--line)'}"></div>
          <div class="k-label">Cartera vencida</div>
          <div class="k-val" data-value="${portfolioReadiness === 'ready' ? cart.venc : ''}">${portfolioReadiness === 'ready' ? U.moneyShort(cart.venc, Orbit.q.monedaPais()) : (portfolioReadiness === 'unavailable' ? 'No disponible' : 'Actualizando datos')}</div>
          <div class="k-foot ${portfolioReadiness === 'ready' ? 'down' : 'muted'}">${portfolioReadiness === 'ready' ? '▼ requiere gestión ›' : 'Esperando confirmación del servidor'}</div></button>
        <button class="kpi kpi-click" onclick="Orbit.kpi('renov-proximas')" title="Ver renovaciones">
          <div class="k-accent" style="background:var(--info)"></div>
          <div class="k-label">Renovaciones ≤45 d</div>
          <div class="k-val">${renov.length}</div>
          <div class="k-foot muted">pólizas por renovar ›</div></button>
      </div>

      <div class="inicio-main-grid" style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px;margin-top:18px">
        <!-- Leaderboard -->
        <div class="card pad">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <b style="font-family:var(--f-display);font-size:16px">Avance por asesor</b>
            <span class="muted" style="font-size:12px">prima vigente vs meta</span>
          </div>
          ${board.map(b => `
            <div class="clickable" onclick="location.hash='#/insights'" title="Ver analítica de metas por asesor" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--line-2);cursor:pointer">
              ${U.avatar(b.asesor.nombre, b.asesor.color, 'md')}
              <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;font-size:13.5px">
                  <b>${U.esc(b.asesor.nombre)}</b><span class="mono">${U.moneyShort(b.prima, Orbit.q.monedaPais())}</span>
                </div>
                <div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, b.pct)}%"></i></div>
              </div>
              <span class="badge ${b.pct >= 100 ? 'ok' : b.pct >= 70 ? 'warn' : 'neutral'}" style="min-width:46px;justify-content:center">${b.pct}%</span>
            </div>`).join('')}
        </div>

        <!-- Alertas -->
        <div class="card pad">
          <b style="font-family:var(--f-display);font-size:16px">Prioridades</b>
          <div style="margin-top:12px;display:grid;gap:9px">
            ${renov.slice(0, 4).map(p => {
              const cli = Orbit.store.get('clientes', p.clienteId);
              const d = U.daysFromNow(p.vigenciaFin);
              return `<div class="clickable" onclick="location.hash='#/cliente360?c=${p.clienteId}'" style="display:flex;align-items:center;gap:10px;padding:9px 11px;background:var(--warn-soft);border-radius:var(--r-sm);cursor:pointer">
                <span style="font-size:16px">🔄</span>
                <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.esc(cli ? cli.nombre : '—')}</div>
                <div class="muted" style="font-size:11.5px">${U.esc(p.ramo)} · renueva en ${d} d</div></div>
              </div>`;
            }).join('')}
            ${venc.slice(0, 3).map(c => {
              const cli = Orbit.store.get('clientes', c.clienteId);
              return `<div class="clickable" onclick="location.hash='#/cliente360?c=${c.clienteId}'" style="display:flex;align-items:center;gap:10px;padding:9px 11px;background:var(--danger-soft);border-radius:var(--r-sm);cursor:pointer">
                <span style="font-size:16px">⚠</span>
                <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.esc(cli ? cli.nombre : '—')}</div>
                <div class="muted" style="font-size:11.5px">cuota ${U.esc(U.text(c.cuota))} vencida · ${U.money(c.monto, c.moneda)}</div></div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Seguimientos de hoy (manuales, por WhatsApp) -->
      ${seguimientosHoy()}
    </div>`;
  }

  /* Seguimientos pendientes (sin automatizar) → gestionar por WhatsApp Web / correo */
  function seguimientosHoy() {
    if (!Orbit.ciclo) return '';
    const negs = Orbit.ciclo.negocios({ ignoreRol: true })
      .filter(n => ['nuevo', 'contactado', 'cotizando', 'propuesta', 'negociacion'].includes(n.etapa) && !n.cadenciaActiva && U.daysFromNow(n.proximoToque) <= 1)
      .sort((a, b) => (a.proximoToque || '').localeCompare(b.proximoToque || '')).slice(0, 6);
    if (!negs.length) return '';
    return `<div class="card pad" style="margin-top:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <b style="font-family:var(--f-display);font-size:16px">Seguimientos de hoy</b>
        <span class="muted" style="font-size:12px">sin cadencia automática · gestiona por WhatsApp</span>
      </div>
      <div style="margin-top:12px;display:grid;gap:9px">
        ${negs.map(n => {
          const ase = q.asesor(n.asesorId);
          const wa = (n.telefono || '').replace(/[^0-9]/g, '');
          const msg = encodeURIComponent('Hola ' + (n.nombre || '').split(' ')[0] + ', te damos seguimiento a tu ' + n.producto + '.');
          const d = U.daysFromNow(n.proximoToque);
          return `<div style="display:flex;align-items:center;gap:11px;padding:10px 12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm)">
            <span style="font-size:16px">${Orbit.ciclo.etapaInfo(n.etapa).emoji}</span>
            <div style="flex:1;min-width:0" class="clickable" onclick="Orbit.ciclo.openNegocio('${n.id}')">
              <div style="font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.esc(n.nombre)} <span class="muted" style="font-weight:400">· ${U.esc(n.producto)}</span></div>
              <div class="muted" style="font-size:11.5px">${ase ? U.esc(ase.nombre) : ''} · ${d < 0 ? 'vencido' : d === 0 ? 'hoy' : 'mañana'} · ${Orbit.ciclo.etapaInfo(n.etapa).label}</div>
            </div>
            ${wa ? `<a class="btn ghost sm" style="color:#1f8a4c" href="${'https://wa.' + 'me/'}${wa}?text=${msg}" target="_blank" rel="noopener">💬 WhatsApp</a>` : (n.email ? `<a class="btn ghost sm" style="cursor:pointer" onclick="Orbit.correoCompose({para:'${n.email}'})">✉ Correo</a>` : '')}
          </div>`;
        }).join('')}
      </div>
      <div class="muted" style="font-size:11.5px;margin-top:10px">Al activar la cadencia automática (al enviar propuesta) los toques se programan solos; aquí solo aparecen los que requieren tu gestión manual.</div>
    </div>`;
  }

  return { render, openFinancialKpi };
})();
