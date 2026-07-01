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
  let host, sel = 'produccion', groupBy = '', anioSel = '', progOpen = false;
  const norm = (m, cur) => q.norm(m, cur);
  const parseNum = s => { const n = parseFloat(String(s).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n; };
  function paisOK(cid) { const c = S().get('clientes', cid); return !Orbit.pais || Orbit.pais === 'TODOS' || (c && c.pais === Orbit.pais); }

  const REPORTES = {
    produccion: { t: 'Producción', icon: '📈', desc: 'Pólizas emitidas con prima neta, por asesor y aseguradora.', cols: ['Póliza', 'Cliente', 'Ramo', 'Aseguradora', 'Asesor', 'Prima neta', 'Estado'], nav: id => `#/cliente360?c=${(S().get('polizas', id) || {}).clienteId || ''}`, rows: () => S().all('polizas').filter(p => paisOK(p.clienteId)).map(p => ({ id: p.id, cells: [p.numero, (S().get('clientes', p.clienteId) || {}).nombre || '', p.ramo, (q.aseguradora(p.aseguradoraId) || {}).nombre || '', (q.asesor(p.asesorId) || {}).nombre || '', U.money(p.primaNeta || p.prima, p.moneda), p.estado] })) },
    cartera: { t: 'Cartera y cobros', icon: '💳', desc: 'Recibos por estado, con vencimiento y conciliación.', cols: ['Recibo', 'Cliente', 'Cuota', 'Monto', 'Vence', 'Estado', 'Conciliado'], nav: id => { const c = S().get('cobros', id) || {}; return `#/cliente360?c=${c.clienteId || ''}`; }, act: id => Orbit.modules.cobros && Orbit.modules.cobros.detalle(id), rows: () => S().all('cobros').filter(c => c.estado !== 'Anulado' && paisOK(c.clienteId)).map(c => ({ id: c.id, cells: ['REC-' + c.id.slice(-5).toUpperCase(), (S().get('clientes', c.clienteId) || {}).nombre || '', c.cuota, U.money(c.monto, c.moneda), U.fmtDate(c.vence), c.estado, c.conciliado ? 'Sí' : 'No'] })) },
    comisiones: { t: 'Comisiones', icon: '💵', desc: 'Comisión generada por póliza, periodo y estado.', cols: ['Periodo', 'Cliente', 'Póliza', 'Base neta', '%', 'Comisión', 'Estado'], nav: id => `#/cliente360?c=${(S().get('comisiones', id) || {}).clienteId || ''}`, rows: () => S().all('comisiones').filter(c => paisOK(c.clienteId)).map(c => ({ id: c.id, cells: [c.periodo || '', (S().get('clientes', c.clienteId) || {}).nombre || '', (S().get('polizas', c.polizaId) || {}).numero || '', U.money(c.base, c.moneda), c.pct + '%', U.money(c.monto, c.moneda), c.estado] })) },
    renovaciones: { t: 'Renovaciones', icon: '🔄', desc: 'Pólizas por vencer en los próximos 60 días.', cols: ['Póliza', 'Cliente', 'Ramo', 'Aseguradora', 'Prima', 'Vence'], nav: id => `#/cliente360?c=${(S().get('polizas', id) || {}).clienteId || ''}`, rows: () => q.renovacionesProximas(60).filter(p => paisOK(p.clienteId)).map(p => ({ id: p.id, cells: [p.numero, (S().get('clientes', p.clienteId) || {}).nombre || '', p.ramo, (q.aseguradora(p.aseguradoraId) || {}).nombre || '', U.money(p.prima, p.moneda), U.fmtDate(p.vigenciaFin)] })) },
    siniestros: { t: 'Siniestros', icon: '🚨', desc: 'Reclamos con estado, montos y aseguradora.', cols: ['N.º', 'Cliente', 'Tipo', 'Aseguradora', 'Reclamado', 'Aprobado', 'Estado'], nav: id => `#/cliente360?c=${(S().get('reclamos', id) || {}).clienteId || ''}`, rows: () => S().all('reclamos').filter(r => paisOK(r.clienteId)).map(r => ({ id: r.id, cells: [r.numero, (S().get('clientes', r.clienteId) || {}).nombre || '', r.tipo, (q.aseguradora(r.aseguradoraId) || {}).nombre || '', U.money(r.montoReclamado, 'GTQ'), U.money(r.montoAprobado || 0, 'GTQ'), r.estado] })) },
    cancelaciones: { t: 'Cancelaciones', icon: '✕', desc: 'Pólizas canceladas con motivo y valor perdido.', cols: ['Fecha', 'Cliente', 'Póliza', 'Motivo', 'Valor perdido'], nav: id => `#/cliente360?c=${(S().get('cancelaciones', id) || {}).clienteId || ''}`, rows: () => S().all('cancelaciones').filter(c => paisOK(c.clienteId)).map(c => ({ id: c.id, cells: [U.fmtDate(c.fecha), (S().get('clientes', c.clienteId) || {}).nombre || '', (S().get('polizas', c.polizaId) || {}).numero || '', c.motivo, U.money(c.valorPerdido, 'GTQ')] })) }
  };
  // compat: build() devuelve solo las celdas (para export)
  Object.values(REPORTES).forEach(r => { r.build = () => r.rows().map(x => x.cells); });

  function render(h) {
    host = h;
    const r = REPORTES[sel];
    let rows2 = r.rows();
    let data = rows2.map(x => x.cells);
    const paisLbl = (Orbit.PAISES.find(p => p.id === (Orbit.pais || 'TODOS')) || {}).label || 'Todos los países';
    // filtro de periodo (año) — aplica si alguna columna contiene el año
    if (anioSel) { rows2 = rows2.filter(x => x.cells.some(c => String(c).includes(anioSel))); data = rows2.map(x => x.cells); }
    // agrupación general→particular
    const gi = groupBy ? r.cols.indexOf(groupBy) : -1;
    let resumen = null;
    if (gi >= 0) {
      // detectar columnas numéricas (money) para sumar
      const numCols = r.cols.map((c, i) => data.some(row => parseNum(row[i]) !== null) && i !== gi ? i : -1).filter(i => i >= 0);
      const grp = {};
      data.forEach(row => { const k = row[gi] || '—'; grp[k] = grp[k] || { n: 0, sums: {} }; grp[k].n++; numCols.forEach(ci => { const v = parseNum(row[ci]); if (v !== null) grp[k].sums[ci] = (grp[k].sums[ci] || 0) + v; }); });
      resumen = { rows: Object.entries(grp).sort((a, b) => b[1].n - a[1].n), numCols };
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
            <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" id="rep-mail">📧 Programar</button><button class="btn ghost sm" id="rep-exp">⬇ CSV</button><button class="btn ghost sm" id="rep-excel">📊 Excel</button><button class="btn ghost sm" id="rep-pdf">🖨 PDF</button></div>
          </div>
          <div class="card pad" style="margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <label style="font-size:12px;color:var(--muted)">Agrupar por</label>
            <select id="rep-group" class="o-sel" style="width:auto"><option value="">Sin agrupar (general)</option>${r.cols.map(c => `<option ${groupBy === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
            <label style="font-size:12px;color:var(--muted);margin-left:8px">Año</label>
            <select id="rep-anio" class="o-sel" style="width:auto"><option value="">Todos</option>${['2024', '2025', '2026'].map(y => `<option ${anioSel === y ? 'selected' : ''}>${y}</option>`).join('')}</select>
            ${groupBy ? `<span class="badge info" style="margin-left:auto">Resumen de ${resumen.rows.length} grupos</span>` : ''}
          </div>
          ${resumen ? `<div class="card" style="overflow:hidden;margin-top:12px"><div style="padding:9px 13px;background:var(--soft);font-weight:700;font-size:13px">📊 Resumen por ${U.esc(groupBy)}</div><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>${U.esc(groupBy)}</th><th class="num">Registros</th>${resumen.numCols.map(ci => `<th class="num">Σ ${U.esc(r.cols[ci])}</th>`).join('')}</tr></thead><tbody>${resumen.rows.map(([k, v]) => `<tr><td><b>${U.esc(k)}</b></td><td class="num">${v.n}</td>${resumen.numCols.map(ci => `<td class="num">${v.sums[ci] ? U.money(v.sums[ci], 'GTQ') : '—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>` : ''}
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
        <div class="cfg-note">Se envía por la integración de correo configurada. Queda listado en la barra lateral y se puede quitar.</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="rp-cancel">Cancelar</button><button class="btn primary" id="rp-ok">Programar</button></div>
    </div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s); const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#rp-x').addEventListener('click', close); $('#rp-cancel').addEventListener('click', close);
    $('#rp-ok').addEventListener('click', () => {
      S().insert('reportes_prog', { id: 'rp' + Date.now().toString().slice(-7), rep: sel, freq: $('#rp-freq').value, dest: $('#rp-dest').value, fmt: $('#rp-fmt').value });
      close(); toast('✓ Reporte programado — ' + $('#rp-freq').value); render(host);
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

  function toast(msg) { const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

  return { render, quitarProg, verFila };
})();
