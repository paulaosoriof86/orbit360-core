/* ============================================================
   Orbit 360 · Orbit Leads  — BETA (pipeline comercial)
   Prospectos por etapa con probabilidad y CADENCIAS de
   seguimiento. Enlazado con Ops: un lead en "Cotizando" genera
   una gestión de cotización; al "Cierre" → convierte a cliente.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.leads = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  const ETAPAS = ['Nuevo', 'Contactado', 'Cotizando', 'Propuesta', 'Cierre'];
  const COLOR = { 'Nuevo': '#767f8a', 'Contactado': '#1f3a5f', 'Cotizando': '#c9821b', 'Propuesta': '#6b4ea0', 'Cierre': '#1f8a4c' };

  function render(host) {
    const leads = S().all('leads');
    const tot = leads.reduce((s, l) => s + q.norm(l.primaEst, l.moneda), 0);
    const ponderado = leads.reduce((s, l) => s + q.norm(l.primaEst, l.moneda) * l.prob / 100, 0);
    host.innerHTML = `<div class="page">
      ${K.bannerFor('leads', `<button class="btn primary" onclick="alert('Demo: nuevo lead')">+ Nuevo lead</button>`)}
      ${K.kpis([
        { label: 'Leads activos', val: leads.length, color: 'var(--red)', foot: 'en pipeline' },
        { label: 'Prima estimada', val: U.moneyShort(tot, 'GTQ'), color: 'var(--info)', foot: 'potencial' },
        { label: 'Pronóstico ponderado', val: U.moneyShort(ponderado, 'GTQ'), color: 'var(--ok)', foot: 'por probabilidad', footTone: 'up' },
        { label: 'En cierre', val: leads.filter(l => l.etapa === 'Cierre').length, color: 'var(--warn)', foot: 'por convertir' }
      ])}
      <div class="cfg-note" style="margin-bottom:14px">🎯 Pipeline con <b>cadencias automáticas</b> de seguimiento. <b>Enlazado con Ops</b>: al cotizar se crea una gestión; al cerrar, el lead <b>se convierte en cliente</b> heredando sus datos (sin recapturar).</div>
      <div class="kanban">
        ${ETAPAS.map(et => {
          const items = leads.filter(l => l.etapa === et);
          const subt = items.reduce((s, l) => s + q.norm(l.primaEst, l.moneda), 0);
          return `<div class="kcol">
            <div class="kcol-h" style="border-top:3px solid ${COLOR[et]}">
              <b>${et}</b><span class="kcount">${items.length}</span>
            </div>
            <div class="ksub">${U.moneyShort(subt, 'GTQ')}</div>
            <div class="kcol-body">
              ${items.map(l => card(l)).join('') || '<div class="kempty">—</div>'}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
    host.querySelectorAll('[data-lead]').forEach(el => el.addEventListener('click', () => {
      const l = S().get('leads', el.dataset.lead);
      alert('Lead: ' + l.nombre + '\nEtapa: ' + l.etapa + ' · Prob. ' + l.prob + '%\nCadencia: ' + l.cadencia + '\nPróximo toque: ' + U.fmtDate(l.proximoToque) + '\n\n(Demo: abre ficha de lead con acciones y conversión a cliente.)');
    }));
  }

  function card(l) {
    const ase = q.asesor(l.asesorId);
    const d = U.daysFromNow(l.proximoToque);
    return `<div class="kcard" data-lead="${l.id}">
      <div class="kcard-top"><span class="badge ${l.prob >= 70 ? 'ok' : l.prob >= 40 ? 'warn' : 'neutral'}">${l.prob}%</span><span class="badge neutral">${l.ramo}</span></div>
      <div class="kcard-t">${U.esc(l.nombre)}</div>
      <div class="kcard-meta"><span class="mono" style="font-size:11px">${U.moneyShort(l.primaEst, l.moneda)}</span> · ${l.canal}</div>
      <div class="kcad">🔁 ${U.esc(l.cadencia)}</div>
      <div class="kcard-foot">
        ${U.avatar(ase ? ase.nombre : '?', ase ? ase.color : '#999', 'sm')}
        <span class="kvence ${d < 0 ? 'over' : ''}" title="Próximo toque">${d < 0 ? 'vencido' : 'en ' + d + 'd'}</span>
      </div>
    </div>`;
  }
  return { render };
})();
