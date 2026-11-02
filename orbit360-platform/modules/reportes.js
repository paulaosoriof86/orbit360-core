/* ============================================================
   Orbit 360 · Orbit Reportes
   Reportes exportables sobre datos en vivo: producción, cartera,
   comisiones, renovaciones, siniestros. Filtros por país/periodo;
   vista previa en tabla + exportar (CSV) + programar por correo.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.reportes = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store, q = Orbit.q;
  let host, sel = 'produccion', groupBy = '', anioSel = '';
  let insurerLookupStore = null, unsubscribeInsurerLookup = null;
  // Reportes is often opened before the deferred insurer directory is ready.
  // Never group rows under an empty insurer or export incomplete names.
  function insurerLookupReadiness() {
    const store = S();
    if (!store || typeof store._productStatus !== 'function') return { ready: true, blocked: false };
    const status = store._productStatus() || {};
    const confirmed = (status.serverConfirmedCollections || []).includes('aseguradoras');
    const denied = (status.deniedCollections || []).includes('aseguradoras');
    const error = !!(status.snapshotErrors || {}).aseguradoras;
    return { ready: confirmed, blocked: denied || error };
  }
  function ensureInsurerLookup() {
    const store = S();
    if (!store) return;
    if (store !== insurerLookupStore) {
      if (typeof unsubscribeInsurerLookup === 'function') unsubscribeInsurerLookup();
      insurerLookupStore = store;
      unsubscribeInsurerLookup = typeof store.on === 'function' ? store.on('aseguradoras', changed => {
        if (changed !== 'aseguradoras' && changed !== '*') return;
        if (!host || !host.isConnected) return;
        if (typeof location !== 'undefined' && !/^#\/reportes(?:[?\/]|$)/.test(location.hash || '')) return;
        render(host);
      }) : null;
    }
    if (typeof store._ensureCollections === 'function') store._ensureCollections(['aseguradoras']);
  }
  const countryCode = v => { const p = String(v == null ? '' : v).trim().toUpperCase(); return p === 'GT' || p === 'CO' ? p : ''; };
  const currencyFor = p => p === 'CO' ? 'COP' : p === 'GT' ? 'GTQ' : '';
  const currentCountry = () => countryCode(Orbit.pais);
  const paisOK = p => !!p && (!currentCountry() || p === currentCountry());
  const insurerCountry = row => countryCode(row && row.aseguradoraId && (S().get('aseguradoras', row.aseguradoraId) || {}).pais);
  // A policy's verified country takes precedence over the client's domicile.
  // Contradictory policy/insurer evidence is quarantined in EVERY report, not
  // silently assigned to Guatemala or included in the global universe.
  function policyCountry(p) {
    if (!p || !p.clienteId || !S().get('clientes', p.clienteId)) return '';
    const own = countryCode(p.pais || p.country), insurer = insurerCountry(p);
    return own && insurer && own !== insurer ? '' : (own || insurer);
  }
  function linkedCountry(row) {
    if (!row) return '';
    const pol = row.polizaId ? S().get('polizas', row.polizaId) : null;
    if (row.polizaId && !pol) return '';
    if (pol) {
      const parent = policyCountry(pol), own = countryCode(row.pais || row.country), insurer = insurerCountry(row);
      if (!parent || (row.clienteId && String(row.clienteId) !== String(pol.clienteId)) ||
          (own && own !== parent) || (insurer && insurer !== parent)) return '';
      // Reuse the financial-parent verifier, including its fail-closed handling
      // of child/parent inconsistencies and unresolved policy references.
      if (typeof q.policyLinkedCountry === 'function' && countryCode(q.policyLinkedCountry(row)) !== parent) return '';
      return parent;
    }
    const own = countryCode(row.pais || row.country), insurer = insurerCountry(row);
    const client = countryCode((S().get('clientes', row.clienteId) || {}).pais);
    if ((own && insurer && own !== insurer) || (own && client && !insurer && own !== client)) return '';
    return own || insurer || client;
  }
  // Keep explicit QA fixtures available for audit and controlled cleanup, but
  // never count them as commercial source in production, financial or pilot
  // reports. The source-of-truth flag is already used by Renovaciones.
  // Classify linked child records and policies belonging to a QA client too.
  const hasSyntheticFlag = row => !!row && (row.__syntheticQa === true || row.syntheticQa === true);
  function isSyntheticRecord(row) {
    if (!row) return false;
    if (hasSyntheticFlag(row)) return true;
    const policy = row.polizaId ? S().get('polizas', row.polizaId) : null;
    if (hasSyntheticFlag(policy)) return true;
    const client = row.clienteId ? S().get('clientes', row.clienteId) : null;
    return hasSyntheticFlag(client);
  }
  function yearOf(value) {
    const str = String(value == null ? '' : value).trim();
    const m = /^(\d{4})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?(?:$|T)/.exec(str);
    if (!m) return '';
    if (m[3] && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toISOString().slice(0, 10) !== str.slice(0, 10)) return '';
    return m[1];
  }
  const moneySource = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  const moneyCell = (value, currency) => { const amount = moneySource(value); return amount == null ? '—' : U.money(amount, currency); };
  function rowData(id, cells, date, currency, amounts) {
    return { id, cells, year: yearOf(date), currency: String(currency || '').toUpperCase(), amounts: amounts || {} };
  }
  function monedaCliente(cid) {
    const c = S().get('clientes', cid) || {};
    return c.moneda || currencyFor(countryCode(c.pais));
  }
  function monedaPoliza(polId, cid) {
    const p = S().get('polizas', polId) || {};
    return p.moneda || currencyFor(policyCountry(p)) || monedaCliente(cid || p.clienteId);
  }
  function monedaMixtaActiva() { return !Orbit.pais || Orbit.pais === 'TODOS'; }

  const REPORTES = {
    produccion: { t: 'Producción', icon: '📈', desc: 'Pólizas por emisión o inicio de vigencia, con prima neta.', yearLabel: 'emisión / inicio de vigencia', moneyCols: [5], countryMode: 'policy', sourceRows: () => S().all('polizas'), cols: ['Póliza', 'Cliente', 'Ramo', 'Aseguradora', 'Asesor', 'Prima neta', 'Estado'], nav: id => `#/cliente360?c=${(S().get('polizas', id) || {}).clienteId || ''}`, rows: () => S().all('polizas').filter(p => !isSyntheticRecord(p) && paisOK(policyCountry(p))).map(p => { const cur = p.moneda || currencyFor(policyCountry(p)); const prima = p.primaNeta != null ? p.primaNeta : p.prima; return rowData(p.id, [p.numero, (S().get('clientes', p.clienteId) || {}).nombre || '', p.ramo, (q.aseguradora(p.aseguradoraId) || {}).nombre || '', (q.asesor(p.asesorId) || {}).nombre || '', moneyCell(prima, cur), p.estado], p.emisionEn || p.fechaEmision || p.vigenciaInicio || p.vigenciaIni, cur, { 5: moneySource(prima) }); }) },
    cartera: { t: 'Cartera y cobros', icon: '💳', desc: 'Recibos por estado, con vencimiento y conciliación.', yearLabel: 'vencimiento', moneyCols: [3], sourceRows: () => S().all('cobros').filter(c => c.estado !== 'Anulado'), cols: ['Recibo', 'Cliente', 'Cuota', 'Monto', 'Vence', 'Estado', 'Conciliado'], nav: id => { const c = S().get('cobros', id) || {}; return `#/cliente360?c=${c.clienteId || ''}`; }, act: id => Orbit.modules.cobros && Orbit.modules.cobros.detalle(id), rows: () => S().all('cobros').filter(c => c.estado !== 'Anulado' && !isSyntheticRecord(c) && paisOK(linkedCountry(c))).map(c => { const cur = c.moneda || monedaPoliza(c.polizaId, c.clienteId); return rowData(c.id, ['REC-' + c.id.slice(-5).toUpperCase(), (S().get('clientes', c.clienteId) || {}).nombre || '', c.cuota, moneyCell(c.monto, cur), U.fmtDate(c.vence), c.estado, c.conciliado ? 'Sí' : 'No'], c.vence || c.fechaLimite, cur, { 3: moneySource(c.monto) }); }) },
    comisiones: { t: 'Comisiones', icon: '💵', desc: 'Comisión generada por póliza, periodo y estado.', yearLabel: 'periodo de comisión', moneyCols: [3, 5], sourceRows: () => S().all('comisiones'), cols: ['Periodo', 'Cliente', 'Póliza', 'Base neta', '%', 'Comisión', 'Estado'], nav: id => `#/cliente360?c=${(S().get('comisiones', id) || {}).clienteId || ''}`, rows: () => S().all('comisiones').filter(c => !isSyntheticRecord(c) && paisOK(linkedCountry(c))).map(c => { const cur = c.moneda || monedaPoliza(c.polizaId, c.clienteId); return rowData(c.id, [c.periodo || '', (S().get('clientes', c.clienteId) || {}).nombre || '', (S().get('polizas', c.polizaId) || {}).numero || '', moneyCell(c.base, cur), c.pct == null ? '—' : c.pct + '%', moneyCell(c.monto, cur), c.estado], c.periodo || c.fecha, cur, { 3: moneySource(c.base), 5: moneySource(c.monto) }); }) },
    renovaciones: { t: 'Renovaciones', icon: '🔄', desc: 'Pólizas por vencer en los próximos 60 días.', yearLabel: 'fin de vigencia', moneyCols: [4], countryMode: 'policy', sourceRows: () => q.renovacionesProximas(60), cols: ['Póliza', 'Cliente', 'Ramo', 'Aseguradora', 'Prima', 'Vence'], nav: id => `#/cliente360?c=${(S().get('polizas', id) || {}).clienteId || ''}`, rows: () => q.renovacionesProximas(60).filter(p => !isSyntheticRecord(p) && paisOK(policyCountry(p))).map(p => { const cur = p.moneda || currencyFor(policyCountry(p)); return rowData(p.id, [p.numero, (S().get('clientes', p.clienteId) || {}).nombre || '', p.ramo, (q.aseguradora(p.aseguradoraId) || {}).nombre || '', moneyCell(p.prima, cur), U.fmtDate(p.vigenciaFin)], p.vigenciaFin, cur, { 4: moneySource(p.prima) }); }) },
    siniestros: { t: 'Siniestros', icon: '🚨', desc: 'Reclamos con estado, montos y aseguradora.', yearLabel: 'reporte del siniestro', moneyCols: [4, 5], sourceRows: () => S().all('reclamos'), cols: ['N.º', 'Cliente', 'Tipo', 'Aseguradora', 'Reclamado', 'Aprobado', 'Estado'], nav: id => `#/cliente360?c=${(S().get('reclamos', id) || {}).clienteId || ''}`, rows: () => S().all('reclamos').filter(r => !isSyntheticRecord(r) && paisOK(linkedCountry(r))).map(r => { const cur = r.moneda || monedaPoliza(r.polizaId, r.clienteId); return rowData(r.id, [r.numero, (S().get('clientes', r.clienteId) || {}).nombre || '', r.tipo, (q.aseguradora(r.aseguradoraId) || {}).nombre || '', moneyCell(r.montoReclamado, cur), moneyCell(r.montoAprobado, cur), r.estado], r.fecha || r.fechaReclamo, cur, { 4: moneySource(r.montoReclamado), 5: moneySource(r.montoAprobado) }); }) },
    cancelaciones: { t: 'Cancelaciones', icon: '✕', desc: 'Pólizas canceladas con motivo y valor perdido.', yearLabel: 'cancelación', moneyCols: [4], sourceRows: () => S().all('cancelaciones'), cols: ['Fecha', 'Cliente', 'Póliza', 'Motivo', 'Valor perdido'], nav: id => `#/cliente360?c=${(S().get('cancelaciones', id) || {}).clienteId || ''}`, rows: () => S().all('cancelaciones').filter(c => !isSyntheticRecord(c) && paisOK(linkedCountry(c))).map(c => { const pol = S().get('polizas', c.polizaId) || {}; const cur = c.moneda || pol.moneda || monedaPoliza(c.polizaId, c.clienteId); return rowData(c.id, [U.fmtDate(c.fecha), (S().get('clientes', c.clienteId) || {}).nombre || '', pol.numero || '', c.motivo, moneyCell(c.valorPerdido, cur)], c.fecha, cur, { 4: moneySource(c.valorPerdido) }); }) }
  };
  // compat: build() devuelve solo las celdas (para export)
  Object.values(REPORTES).forEach(r => { r.build = () => r.rows().map(x => x.cells); });

  function render(h) {
    host = h;
    const r = REPORTES[sel];
    if (r.cols.includes('Aseguradora')) {
      // Fail closed only on insurer-dependent reports. Other reports can still
      // render without making the entire report center depend on this source.
      ensureInsurerLookup();
      const insurerStatus = insurerLookupReadiness();
      if (!insurerStatus.ready) {
        host.innerHTML = `<div class="page" data-report-insurer-readiness="${insurerStatus.blocked ? 'blocked' : 'loading'}">
          ${K.banner({ icon: '📊', title: 'Orbit Reportes', sub: 'Reportes exportables sobre datos en vivo' })}
          <div class="cfg-note" role="status">${insurerStatus.blocked
            ? 'No fue posible confirmar el directorio de aseguradoras autorizado. No se muestran cifras incompletas ni se habilitan exportes.'
            : 'Confirmando aseguradoras con el servidor… El reporte y sus exportes aparecerán cuando los nombres estén verificados.'}</div>
        </div>`;
        return;
      }
    }
    let rows2 = r.rows();
    const paisLbl = (Orbit.PAISES.find(p => p.id === (Orbit.pais || 'TODOS')) || {}).label || 'Todos los países';
    const sourceRows = r.sourceRows();
    const syntheticSourceRows = sourceRows.filter(isSyntheticRecord).length;
    const unverifiedCountryRows = sourceRows.filter(row => !isSyntheticRecord(row) &&
      !(r.countryMode === 'policy' ? policyCountry(row) : linkedCountry(row))).length;
    // An actual source date/period, NEVER text from an insurer, policy number
    // or money cell, controls the selected year. Unknown dates are not guessed.
    const missingYear = rows2.filter(x => !x.year).length;
    if (anioSel) rows2 = rows2.filter(x => x.year === anioSel);
    const data = rows2.map(x => x.cells);
    // agrupación general→particular
    const gi = groupBy ? r.cols.indexOf(groupBy) : -1;
    const expectedCurrency = currencyFor(currentCountry());
    let resumen = null;
    if (gi >= 0) {
      // En vista multipaís no se suman columnas monetarias: GTQ y COP se mantienen separadas por filtro.
      const mixedMoney = monedaMixtaActiva();
      const numCols = mixedMoney ? [] : r.moneyCols.filter(i => i !== gi);
      const grp = {};
      let nonSummable = 0;
      rows2.forEach(row => {
        const k = row.cells[gi] || '—';
        grp[k] = grp[k] || { n: 0, sums: {}, counts: {} };
        grp[k].n++;
        numCols.forEach(ci => {
          const v = row.amounts[ci];
          if (row.currency !== expectedCurrency || v == null) { nonSummable++; return; }
          grp[k].sums[ci] = (grp[k].sums[ci] || 0) + v;
          grp[k].counts[ci] = (grp[k].counts[ci] || 0) + 1;
        });
      });
      resumen = { rows: Object.entries(grp).sort((a, b) => b[1].n - a[1].n), numCols, mixedMoney, nonSummable };
    }
    const prog = S().all('reportes_prog') || [];
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '📊', title: 'Orbit Reportes', sub: 'Reportes exportables sobre datos en vivo', features: [], actions: `<span class="ins-paisbadge">🌎 ${paisLbl}</span>` })}
      <div class="rep-grid">
        <div class="rep-side">${Object.entries(REPORTES).map(([k, v]) => `<button class="rep-item ${sel === k ? 'on' : ''}" data-r="${k}"><span>${v.icon}</span><span>${v.t}</span></button>`).join('')}
          ${prog.length ? `<div style="margin-top:14px;padding:10px 8px;border-top:1px solid var(--line)"><div class="muted" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:7px">⏰ Programados</div>${prog.map(p => `<div style="font-size:11.5px;padding:5px 6px;background:var(--soft);border-radius:6px;margin-bottom:5px;display:flex;justify-content:space-between;gap:6px"><span>${REPORTES[p.rep] ? REPORTES[p.rep].icon : '📄'} ${p.freq}</span><span onclick="Orbit.modules.reportes.quitarProg('${p.id}')" style="cursor:pointer;color:var(--danger)" title="Quitar">✕</span></div>`).join('')}</div>` : ''}
        </div>
        <div class="rep-main">
          <div class="rep-head">
            <div><b style="font-family:var(--f-display);font-size:17px">${r.icon} ${r.t}</b><div class="muted" style="font-size:12.5px;margin-top:3px">${r.desc} · <b>${data.length}</b> registros</div></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary sm" id="rep-ia">🤖 Analizar con IA</button><button class="btn ghost sm" id="rep-mail">📧 Programar</button><button class="btn ghost sm" id="rep-exp">⬇ CSV</button><button class="btn ghost sm" id="rep-excel">📊 Excel</button><button class="btn ghost sm" id="rep-pdf">🖨 PDF</button></div>
          </div>
          <div class="card pad" style="margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <label style="font-size:12px;color:var(--muted)">Agrupar por</label>
            <select id="rep-group" class="o-sel" style="width:auto"><option value="">Sin agrupar (general)</option>${r.cols.map(c => `<option ${groupBy === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
            <label style="font-size:12px;color:var(--muted);margin-left:8px">Año (${U.esc(r.yearLabel)})</label>
            <select id="rep-anio" class="o-sel" style="width:auto"><option value="">Todos</option>${['2024', '2025', '2026'].map(y => `<option ${anioSel === y ? 'selected' : ''}>${y}</option>`).join('')}</select>
            ${groupBy ? `<span class="badge info" style="margin-left:auto">Resumen de ${resumen.rows.length} grupos</span>` : ''}
          </div>
          ${anioSel && missingYear ? `<div class="cfg-note" data-report-unknown-period="${missingYear}">⚠ ${missingYear} registros sin fecha de ${U.esc(r.yearLabel)} verificable; no se imputan al año ${U.esc(anioSel)}.</div>` : ''}
          ${syntheticSourceRows ? `<div class="cfg-note" data-report-qa-quarantine="${syntheticSourceRows}">🧪 ${syntheticSourceRows} registros sintéticos QA excluidos de métricas y exportes comerciales. Se conservan en su fuente para auditoría.</div>` : ''}
          ${unverifiedCountryRows ? `<div class="cfg-note" data-report-country-quarantine="${unverifiedCountryRows}">⚠ ${unverifiedCountryRows} registros de origen no se contabilizan por país, aseguradora o vínculo cliente/póliza sin verificar. Se mantienen en su fuente para conciliación.</div>` : ''}
          ${resumen ? `<div class="card" style="overflow:hidden;margin-top:12px"><div style="padding:9px 13px;background:var(--soft);font-weight:700;font-size:13px">📊 Resumen por ${U.esc(groupBy)}${resumen.mixedMoney ? ' <span class="badge warn" style="font-size:10px;margin-left:8px">Monedas separadas: filtra por país para sumar</span>' : ''}${resumen.nonSummable ? ` <span class="badge warn" data-report-unverified-amounts="${resumen.nonSummable}">${resumen.nonSummable} importes sin moneda/monto compatible omitidos de sumas</span>` : ''}</div><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>${U.esc(groupBy)}</th><th class="num">Registros</th>${resumen.numCols.map(ci => `<th class="num">Σ ${U.esc(r.cols[ci])}</th>`).join('')}</tr></thead><tbody>${resumen.rows.map(([k, v]) => `<tr><td><b>${U.esc(k)}</b></td><td class="num">${v.n}</td>${resumen.numCols.map(ci => `<td class="num">${v.counts[ci] ? U.money(v.sums[ci], expectedCurrency) : '—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>` : ''}
          <div class="card" style="overflow:hidden;margin-top:14px"><div style="overflow-x:auto;max-height:520px"><table class="tbl">
            <thead><tr>${r.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>${rows2.slice(0, 200).map(x => `<tr class="clickable" onclick="Orbit.modules.reportes.verFila('${x.id}')" title="Ver detalle del registro">${x.cells.map((cell, i) => `<td${i >= r.cols.length - 2 ? ' class="num"' : ''} style="font-size:12.5px">${U.esc(String(cell))}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${r.cols.length}" class="muted" style="text-align:center;padding:24px">Sin datos.</td></tr>`}</tbody>
          </table></div>${data.length > 200 ? `<div class="muted" style="padding:10px 14px;font-size:12px">Mostrando 200 de ${data.length}. Exporta para ver todos.</div>` : ''}</div>
        </div>
      </div>
    </div>`;
    host.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { sel = b.dataset.r; groupBy = ''; render(host); }));
    host.querySelector('#rep-group').addEventListener('change', e => { groupBy = e.target.value; render(host); });
    host.querySelector('#rep-anio').addEventListener('change', e => { anioSel = e.target.value; render(host); });
    host.querySelector('#rep-exp').addEventListener('click', () => exportCSV(r, data));
    host.querySelector('#rep-excel').addEventListener('click', () => exportExcel(r, data));
    host.querySelector('#rep-pdf').addEventListener('click', () => exportPDF(r, data));
    host.querySelector('#rep-mail').addEventListener('click', () => programar(r));
    host.querySelector('#rep-ia').addEventListener('click', () => analizarIA(r, data));
  }

  function programar(r) {
    let back = document.getElementById('rep-prog'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'rep-prog'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    back.innerHTML = `<div class="card" style="width:min(460px,94vw);padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">📧 Programar “${r.t}”</b><button class="imp-x" id="rp-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <label class="ce-l">Frecuencia<select id="rp-freq" class="o-sel"><option>Diario</option><option selected>Semanal (lunes)</option><option>Mensual (día 1)</option></select></label>
        <label class="ce-l">Destinatarios (correos separados por coma)<input id="rp-dest" class="o-sel" placeholder="gerencia@correo.com, admin@correo.com"></label>
        <label class="ce-l">Formato<select id="rp-fmt" class="o-sel"><option>PDF</option><option>Excel</option><option>CSV</option></select></label>
        <div class="cfg-note">Queda programado/preparado en Orbit. El envío real requiere integración de correo activa y confirmada.</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="rp-cancel">Cancelar</button><button class="btn primary" id="rp-ok">Programar en Orbit</button></div>
    </div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s); const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#rp-x').addEventListener('click', close); $('#rp-cancel').addEventListener('click', close);
    $('#rp-ok').addEventListener('click', () => {
      S().insert('reportes_prog', { id: 'rp' + Date.now().toString().slice(-7), rep: sel, freq: $('#rp-freq').value, dest: $('#rp-dest').value, fmt: $('#rp-fmt').value, estado: 'Preparado', envioReal: 'pendiente_integracion_correo' });
      close(); toast('✓ Reporte programado en Orbit — envío pendiente de integración activa'); render(host);
    });
  }
  function quitarProg(id) { S().remove('reportes_prog', id); render(host); }

  function verFila(id) {
    const r = REPORTES[sel];
    if (r.act) { const done = r.act(id); if (done !== undefined || sel === 'cartera') return; }
    const route = r.nav ? r.nav(id) : '';
    if (route && !route.endsWith('c=')) location.hash = route;
    else toast('Registro sin ficha asociada');
  }

  function exportCSV(r, data) {
    const esc = s => '"' + String(s).replace(/"/g, '""') + '"';
    const csv = [r.cols.map(esc).join(',')].concat(data.map(row => row.map(esc).join(','))).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Orbit_' + r.t.replace(/\s+/g, '_') + '.csv'; a.click();
    toast('✓ Reporte exportado (CSV)');
  }
  function exportExcel(r, data) {
    // HTML-table trick: Excel abre .xls con HTML table
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">'
      + '<head><meta charset="UTF-8"><style>th{background:#1E2227;color:white}td,th{border:1px solid #ccc;padding:6px}</style></head>'
      + '<body><table><thead><tr>' + r.cols.map(c => `<th>${esc(c)}</th>`).join('') + '</tr></thead>'
      + '<tbody>' + data.map(row => '<tr>' + row.map(c => `<td>${esc(String(c))}</td>`).join('') + '</tr>').join('') + '</tbody></table></body></html>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Orbit_' + r.t.replace(/\s+/g, '_') + '.xls'; a.click();
    toast('✓ Reporte exportado (Excel)');
  }
  function exportPDF(r, data) {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<html><head><title>${r.t}</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:sans-serif;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#1E2227;color:#fff;padding:7px;text-align:left}td{padding:6px;border-bottom:1px solid #eee}h2{color:#C5162E}</style></head><body><h2>${r.icon} ${r.t}</h2><table><thead><tr>${r.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${data.slice(0, 500).map(row => `<tr>${row.map(c => `<td>${String(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 300);
    toast('🖨 Abre el diálogo de impresión — selecciona "Guardar como PDF"');
  }

  /* ---- Análisis IA del reporte: lectura ejecutiva + acciones (centralizado en Orbit.ia) ---- */
  function ctxReporte(r, rows) {
    const expectedCurrency = currencyFor(currentCountry());
    const numCols = monedaMixtaActiva() ? [] : r.moneyCols;
    const totales = numCols.map(ci => ({ col: r.cols[ci], sum: rows.reduce((s, row) => s + (row.currency === expectedCurrency ? (row.amounts[ci] || 0) : 0), 0) }));
    const catIdx = Math.max(0, r.cols.findIndex((c, i) => numCols.indexOf(i) < 0));
    const grp = {}; rows.forEach(row => { const k = row.cells[catIdx] || '—'; grp[k] = (grp[k] || 0) + 1; });
    const top = Object.entries(grp).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { numCols, totales, catIdx, top, catLbl: r.cols[catIdx], mixedMoney: monedaMixtaActiva(), excluded: monedaMixtaActiva() ? 0 : rows.filter(row => row.currency !== expectedCurrency || numCols.some(ci => row.amounts[ci] == null)).length };
  }
  function fallbackAnalisis(r, data, ctx) {
    const tot = ctx.totales.map(t => t.col + ' ≈ ' + U.money(t.sum, Orbit.q.monedaPais())).join(' · ');
    const top = ctx.top.map(([k, n]) => k + ' (' + n + ')').join(', ');
    const lider = ctx.top[0];
    return '**Lectura ejecutiva**\n' + r.t + ': ' + data.length + ' registros. ' + (ctx.mixedMoney ? 'Los importes no se suman porque la vista incluye múltiples monedas; filtra por país para interpretar totales. ' : (tot ? 'Totales: ' + tot + '. ' : '')) + (lider ? 'Mayor concentración en **' + lider[0] + '** (' + lider[1] + ' registros, ' + Math.round(lider[1] / data.length * 100) + '%).' : '') +
      '\n\n**Acciones sugeridas**\n' + '1. Revisar la concentración en ' + (lider ? lider[0] : 'el grupo principal') + ' y diversificar si supera el 35%.\n2. Priorizar seguimiento de los ' + ctx.catLbl.toLowerCase() + ' con mayor volumen (' + top + ').\n3. Exportar y contrastar contra el mes anterior para detectar desviaciones.';
  }
  function mdLite(s) {
    let h = U.esc(String(s || '')).trim();
    h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    h = h.replace(/^\s*(\d+)\.\s+(.*)$/gm, '<div style="margin:3px 0 3px 2px"><b>$1.</b> $2</div>');
    h = h.replace(/^\s*[-•]\s+(.*)$/gm, '<div style="margin:3px 0 3px 10px">• $1</div>');
    h = h.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
    return h;
  }
  async function analizarIA(r, data) {
    let back = document.getElementById('rep-ia-p'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'rep-ia-p'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 98;
    const disponible = !!(Orbit.ia && Orbit.ia.disponible && Orbit.ia.disponible());
    back.innerHTML = `<div class="card" style="width:min(560px,95vw);max-height:90vh;display:flex;flex-direction:column;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">🤖 Análisis IA · ${r.icon} ${U.esc(r.t)}</b><button class="imp-x" id="ria-x">✕</button></div>
      <div style="padding:20px;overflow:auto;flex:1" id="ria-body"><div class="muted" style="display:flex;align-items:center;gap:8px"><span class="spin" style="display:inline-block;width:14px;height:14px;border:2px solid var(--line);border-top-color:var(--red);border-radius:50%;animation:spin .7s linear infinite"></span> Analizando ${data.length} registros${disponible ? ' con IA' : ''}…</div></div>
      <div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><span class="muted" style="font-size:11px">${disponible ? 'Generado por Orbit IA sobre datos en vivo' : 'Lectura automática (IA no conectada)'}</span><button class="btn ghost" id="ria-close">Cerrar</button></div>
    </div>`;
    document.body.appendChild(back);
    if (!document.getElementById('ria-spin-style')) { const st = document.createElement('style'); st.id = 'ria-spin-style'; st.textContent = '@keyframes spin{to{transform:rotate(360deg)}}'; document.head.appendChild(st); }
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#ria-x').onclick = close; back.querySelector('#ria-close').onclick = close;
    const rows = r.rows().filter(row => !anioSel || row.year === anioSel);
    const ctx = ctxReporte(r, rows);
    let out = '';
    if (disponible) {
      const resumen = 'Reporte: ' + r.t + '\nRegistros: ' + data.length + '\nTotales: ' + (ctx.mixedMoney ? 'No se suman importes en vista multipaís' : ctx.totales.map(t => t.col + '=' + Math.round(t.sum)).join(', ')) + '\nImportes parciales o no validados: ' + ctx.excluded + '\nTop ' + ctx.catLbl + ': ' + ctx.top.map(([k, n]) => k + '(' + n + ')').join(', ');
      const prompt = 'Eres analista de un corredor de seguros. Con base en este resumen de un reporte en vivo, responde en español y en formato markdown con EXACTAMENTE dos secciones: "**Lectura ejecutiva**" (2-3 frases sobre qué está pasando y por qué importa) y "**Acciones sugeridas**" (3 acciones concretas y priorizadas, numeradas). Sé específico con los datos. Datos:\n' + resumen;
      try { out = await Promise.race([Orbit.ia.complete(prompt), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))]); } catch (e) {}
    }
    if (!out || !String(out).trim()) out = fallbackAnalisis(r, data, ctx);
    const bodyEl = back.querySelector('#ria-body'); if (bodyEl) bodyEl.innerHTML = '<div style="font-size:13.5px;line-height:1.65">' + mdLite(out) + '</div>';
  }

  function toast(msg) { const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

  return { render, quitarProg, verFila };
})();
