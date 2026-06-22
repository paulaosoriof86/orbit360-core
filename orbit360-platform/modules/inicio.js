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
    const p = Math.min(100, pct);
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

  function render(host) {
    const cart = q.carteraGlobal();
    const prima = q.primaVigenteGlobal();
    const renov = q.renovacionesProximas(45);
    const venc = q.cobrosVencidos();
    const board = q.leaderboard();
    const clientes = Orbit.store.all('clientes');
    const polizas = Orbit.store.all('polizas');

    // metas mensuales (demo): % avance
    const metaPrima = 820000, pctPrima = Math.min(100, Math.round(prima / metaPrima * 100));
    const recaudo = cart.alDia, metaRec = 760000, pctRec = Math.min(100, Math.round(recaudo / metaRec * 100));
    const diasMes = 30 - new Date(U.NOW).getDate();

    host.innerHTML = `<div class="page">
      ${Orbit.kit.banner({ icon: '🌅', title: 'Buen día', sub: 'esto es lo importante hoy', features: ['Metas del mes', 'Prioridades', 'Avance por asesor'], actions: `<button class="btn primary" onclick="location.hash='#/cliente360'">Abrir Cliente 360 →</button>` })}

      <!-- Metas del mes -->
      <div class="card" style="margin-top:18px;padding:22px 24px;display:flex;gap:30px;align-items:center;flex-wrap:wrap;border-top:3px solid var(--red)">
        <div style="flex:1;min-width:200px">
          <div style="font-family:var(--f-mono);font-size:11px;letter-spacing:.18em;color:var(--ink-3);text-transform:uppercase">Metas del mes · Junio 2026</div>
          <div style="font-family:var(--f-display);font-weight:800;font-size:22px;margin-top:6px;color:var(--ink)">Vamos en camino</div>
          <div style="color:var(--ink-2);font-size:13.5px;margin-top:6px;line-height:1.5">
            Quedan <b style="color:var(--ink)">${diasMes} días</b> para cerrar el mes. La prima vigente y el recaudo aplicado se calculan desde las pólizas y cobros reales del CRM.</div>
          <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
            <span class="badge neutral">${clientes.length} clientes</span>
            <span class="badge neutral">${polizas.length} pólizas</span>
            <span class="badge danger">${venc.length} cobros vencidos</span>
          </div>
        </div>
        ${dial(pctPrima, 'Prima vigente', U.moneyShort(prima, 'GTQ'))}
        ${dial(pctRec, 'Recaudo aplicado', U.moneyShort(recaudo, 'GTQ'))}
      </div>

      <!-- KPIs -->
      <div class="kpi-row" style="margin-top:18px">
        <div class="kpi"><div class="k-accent"></div>
          <div class="k-label">Cartera al día</div>
          <div class="k-val">${U.moneyShort(cart.alDia, 'GTQ')}</div>
          <div class="k-foot up">▲ cobros aplicados</div></div>
        <div class="kpi"><div class="k-accent" style="background:var(--warn)"></div>
          <div class="k-label">Pendiente de cobro</div>
          <div class="k-val">${U.moneyShort(cart.pend, 'GTQ')}</div>
          <div class="k-foot muted">cuotas por vencer</div></div>
        <div class="kpi"><div class="k-accent" style="background:var(--danger)"></div>
          <div class="k-label">Cartera vencida</div>
          <div class="k-val">${U.moneyShort(cart.venc, 'GTQ')}</div>
          <div class="k-foot down">▼ requiere gestión</div></div>
        <div class="kpi"><div class="k-accent" style="background:var(--info)"></div>
          <div class="k-label">Renovaciones ≤45 d</div>
          <div class="k-val">${renov.length}</div>
          <div class="k-foot muted">pólizas por renovar</div></div>
      </div>

      <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:18px;margin-top:18px">
        <!-- Leaderboard -->
        <div class="card pad">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <b style="font-family:var(--f-display);font-size:16px">Avance por asesor</b>
            <span class="muted" style="font-size:12px">prima vigente vs meta</span>
          </div>
          ${board.map(b => `
            <div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--line-2)">
              ${U.avatar(b.asesor.nombre, b.asesor.color, 'md')}
              <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;font-size:13.5px">
                  <b>${U.esc(b.asesor.nombre)}</b><span class="mono">${U.moneyShort(b.prima, 'GTQ')}</span>
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
                <div class="muted" style="font-size:11.5px">cuota ${c.cuota} vencida · ${U.money(c.monto, c.moneda)}</div></div>
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
            ${wa ? `<a class="btn ghost sm" style="color:#1f8a4c" href="https://wa.me/${wa}?text=${msg}" target="_blank" rel="noopener">💬 WhatsApp</a>` : (n.email ? `<a class="btn ghost sm" href="mailto:${n.email}" target="_blank" rel="noopener">✉ Correo</a>` : '')}
          </div>`;
        }).join('')}
      </div>
      <div class="muted" style="font-size:11.5px;margin-top:10px">Al activar la cadencia automática (al enviar propuesta) los toques se programan solos; aquí solo aparecen los que requieren tu gestión manual.</div>
    </div>`;
  }

  return { render };
})();
