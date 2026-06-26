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
  let host, sel = 'produccion';
  const norm = (m, cur) => q.norm(m, cur);
  function paisOK(cid) { const c = S().get('clientes', cid); return !Orbit.pais || Orbit.pais === 'TODOS' || (c && c.pais === Orbit.pais); }

  const REPORTES = {
    produccion: { t: 'Producción', icon: '📈', desc: 'Pólizas emitidas con prima neta, por asesor y aseguradora.', cols: ['Póliza', 'Cliente', 'Ramo', 'Aseguradora', 'Asesor', 'Prima neta', 'Estado'], build: () => S().all('polizas').filter(p => paisOK(p.clienteId)).map(p => [p.numero, (S().get('clientes', p.clienteId) || {}).nombre || '', p.ramo, (q.aseguradora(p.aseguradoraId) || {}).nombre || '', (q.asesor(p.asesorId) || {}).nombre || '', U.money(p.primaNeta || p.prima, p.moneda), p.estado]) },
    cartera: { t: 'Cartera y cobros', icon: '💳', desc: 'Recibos por estado, con vencimiento y conciliación.', cols: ['Recibo', 'Cliente', 'Cuota', 'Monto', 'Vence', 'Estado', 'Conciliado'], build: () => S().all('cobros').filter(c => c.estado !== 'Anulado' && paisOK(c.clienteId)).map(c => ['REC-' + c.id.slice(-5).toUpperCase(), (S().get('clientes', c.clienteId) || {}).nombre || '', c.cuota, U.money(c.monto, c.moneda), U.fmtDate(c.vence), c.estado, c.conciliado ? 'Sí' : 'No']) },
    comisiones: { t: 'Comisiones', icon: '💵', desc: 'Comisión generada por póliza, periodo y estado.', cols: ['Periodo', 'Cliente', 'Póliza', 'Base neta', '%', 'Comisión', 'Estado'], build: () => S().all('comisiones').filter(c => paisOK(c.clienteId)).map(c => [c.periodo || '', (S().get('clientes', c.clienteId) || {}).nombre || '', (S().get('polizas', c.polizaId) || {}).numero || '', U.money(c.base, c.moneda), c.pct + '%', U.money(c.monto, c.moneda), c.estado]) },
    renovaciones: { t: 'Renovaciones', icon: '🔄', desc: 'Pólizas por vencer en los próximos 60 días.', cols: ['Póliza', 'Cliente', 'Ramo', 'Aseguradora', 'Prima', 'Vence'], build: () => q.renovacionesProximas(60).filter(p => paisOK(p.clienteId)).map(p => [p.numero, (S().get('clientes', p.clienteId) || {}).nombre || '', p.ramo, (q.aseguradora(p.aseguradoraId) || {}).nombre || '', U.money(p.prima, p.moneda), U.fmtDate(p.vigenciaFin)]) },
    siniestros: { t: 'Siniestros', icon: '🚨', desc: 'Reclamos con estado, montos y aseguradora.', cols: ['N.º', 'Cliente', 'Tipo', 'Aseguradora', 'Reclamado', 'Aprobado', 'Estado'], build: () => S().all('reclamos').filter(r => paisOK(r.clienteId)).map(r => [r.numero, (S().get('clientes', r.clienteId) || {}).nombre || '', r.tipo, (q.aseguradora(r.aseguradoraId) || {}).nombre || '', U.money(r.montoReclamado, 'GTQ'), U.money(r.montoAprobado || 0, 'GTQ'), r.estado]) },
    cancelaciones: { t: 'Cancelaciones', icon: '✕', desc: 'Pólizas canceladas con motivo y valor perdido.', cols: ['Fecha', 'Cliente', 'Póliza', 'Motivo', 'Valor perdido'], build: () => S().all('cancelaciones').filter(c => paisOK(c.clienteId)).map(c => [U.fmtDate(c.fecha), (S().get('clientes', c.clienteId) || {}).nombre || '', (S().get('polizas', c.polizaId) || {}).numero || '', c.motivo, U.money(c.valorPerdido, 'GTQ')]) }
  };

  function render(h) {
    host = h;
    const r = REPORTES[sel];
    const data = r.build();
    const paisLbl = (Orbit.PAISES.find(p => p.id === (Orbit.pais || 'TODOS')) || {}).label || 'Todos los países';
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '📊', title: 'Orbit Reportes', sub: 'Reportes exportables sobre datos en vivo', features: [], actions: `<span class="ins-paisbadge">🌎 ${paisLbl}</span>` })}
      <div class="rep-grid">
        <div class="rep-side">${Object.entries(REPORTES).map(([k, v]) => `<button class="rep-item ${sel === k ? 'on' : ''}" data-r="${k}"><span>${v.icon}</span><span>${v.t}</span></button>`).join('')}</div>
        <div class="rep-main">
          <div class="rep-head">
            <div><b style="font-family:var(--f-display);font-size:17px">${r.icon} ${r.t}</b><div class="muted" style="font-size:12.5px;margin-top:3px">${r.desc} · <b>${data.length}</b> registros</div></div>
            <div style="display:flex;gap:8px"><button class="btn ghost sm" id="rep-mail">📧 Programar por correo</button><button class="btn ghost sm" id="rep-exp">⬇ CSV</button><button class="btn ghost sm" id="rep-excel">📊 Excel</button><button class="btn ghost sm" id="rep-pdf">🖨 PDF</button></div>
          </div>
          <div class="card" style="overflow:hidden;margin-top:14px"><div style="overflow-x:auto;max-height:540px"><table class="tbl">
            <thead><tr>${r.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>${data.slice(0, 200).map(row => `<tr>${row.map((cell, i) => `<td${i >= r.cols.length - 2 ? ' class="num"' : ''} style="font-size:12.5px">${U.esc(String(cell))}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${r.cols.length}" class="muted" style="text-align:center;padding:24px">Sin datos.</td></tr>`}</tbody>
          </table></div>${data.length > 200 ? `<div class="muted" style="padding:10px 14px;font-size:12px">Mostrando 200 de ${data.length}. Exporta para ver todos.</div>` : ''}</div>
        </div>
      </div>
    </div>`;
    host.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { sel = b.dataset.r; render(host); }));
    host.querySelector('#rep-exp').addEventListener('click', () => exportCSV(r, data));
    host.querySelector('#rep-excel').addEventListener('click', () => exportExcel(r, data));
    host.querySelector('#rep-pdf').addEventListener('click', () => exportPDF(r, data));
    host.querySelector('#rep-mail').addEventListener('click', () => alert('Programar reporte: define frecuencia (diaria/semanal/mensual) y destinatarios. Se envía vía la integración de correo.'));
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

  return { render };
})();
