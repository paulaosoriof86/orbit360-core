/* Orbit 360 · Visor documental transversal
   Modal único y consistente para "ver" cualquier documento/adjunto del sistema,
   sin importar el módulo. Los documentos de Orbit son METADATA-ONLY (nombre, tipo,
   tamaño, fecha, origen) — no se guarda el binario. El visor es honesto sobre eso:
   muestra la ficha del documento y, si corresponde, un enlace a dónde vive el
   archivo real (integración de storage), en vez de simular una previsualización
   de un archivo que no existe.
   Uso: Orbit.documentViewer.open({ nombre, tipo, tamano, fecha, origen, estado,
        notas, motivo, historial, storageEstado, onDescargar })
*/
window.Orbit = window.Orbit || {};
Orbit.documentViewer = (function () {
  const U = () => Orbit.ui;

  function iconFor(tipoOrNombre) {
    const s = String(tipoOrNombre || '').toLowerCase();
    if (/\.pdf$|pdf/.test(s)) return '📕';
    if (/\.(png|jpg|jpeg|gif|webp)$|imagen|foto/.test(s)) return '🖼';
    if (/\.(xls|xlsx|csv)$|excel|planilla/.test(s)) return '📊';
    if (/\.(doc|docx)$|word/.test(s)) return '📝';
    return '📎';
  }

  function close() {
    const el = document.getElementById('docviewer-modal');
    if (el) el.remove();
  }

  function open(doc) {
    doc = doc || {};
    close();
    const nombre = doc.nombre || doc.tipo || 'Documento';
    const badge = doc.estado ? `<span class="badge ${doc.estadoTone || 'info'}">${Orbit.ui.esc(doc.estado)}</span>` : '';
    const storageNote = doc.storageEstado === 'pendiente_storage' || !doc.storageEstado
      ? 'Este documento está registrado como <b>referencia</b> (nombre, tipo, tamaño, fecha) — el archivo original vive fuera de Orbit (correo, WhatsApp o carpeta compartida) hasta conectar una integración de almacenamiento (Drive/OneDrive).'
      : 'Archivo disponible en la integración de almacenamiento conectada.';
    const rows = [
      ['Nombre', Orbit.ui.esc(nombre)],
      ['Tipo', Orbit.ui.esc(doc.tipo || '—')],
      ['Tamaño', doc.tamano ? Orbit.ui.esc(doc.tamano) : '—'],
      ['Fecha', doc.fecha ? Orbit.ui.fmtDate(doc.fecha) : '—'],
      ['Origen', Orbit.ui.esc(doc.origen || '—')],
    ].map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line);font-size:12.5px"><span class="muted">${k}</span><b>${v}</b></div>`).join('');

    const histHtml = (doc.historial && doc.historial.length)
      ? '<div style="margin-top:12px"><b style="font-size:12px">Trazabilidad</b>' + doc.historial.slice().reverse().map(h => `<div class="muted" style="font-size:11px;margin-top:5px;padding-top:5px;border-top:1px dashed var(--line)">${Orbit.ui.esc(h.accion || '')} · ${Orbit.ui.esc(h.por || '')} · ${Orbit.ui.fmtDate(h.fecha || '')}${h.motivo ? ' · "' + Orbit.ui.esc(h.motivo) + '"' : ''}</div>`).join('') + '</div>'
      : '';

    const modal = document.createElement('div');
    modal.id = 'docviewer-modal';
    modal.className = 'modal-back';
    modal.innerHTML = `<div class="modal-card" style="max-width:440px">
      <div class="modal-h" style="background:var(--graf);color:#fff">
        <b style="font-family:var(--f-display);font-size:16px;color:#fff">${iconFor(doc.tipo || nombre)} ${Orbit.ui.esc(nombre)}</b>
        <button class="imp-x" id="dv-x" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.22);color:#fff">✕</button>
      </div>
      <div style="padding:16px 18px">
        ${badge ? `<div style="margin-bottom:10px">${badge}</div>` : ''}
        ${rows}
        <div class="cfg-note" style="margin-top:12px">${storageNote}</div>
        ${doc.notas ? `<div class="muted" style="font-size:12px;margin-top:10px">${Orbit.ui.esc(doc.notas)}</div>` : ''}
        ${histHtml}
        <div style="display:flex;gap:8px;margin-top:16px">
          ${doc.onDescargar ? `<button class="btn ghost sm" id="dv-desc">⬇ Ir al origen</button>` : ''}
          <button class="btn ghost sm" id="dv-cerrar">Cerrar</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#dv-x').addEventListener('click', close);
    modal.querySelector('#dv-cerrar').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    if (doc.onDescargar) modal.querySelector('#dv-desc').addEventListener('click', () => { close(); doc.onDescargar(); });
  }

  return { open, close };
})();
