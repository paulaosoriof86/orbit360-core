/* ============================================================
   Orbit 360 · Visor documental transversal v1.197
   Los módulos entregan documentRef + metadatos. Solo este componente
   conversa con Orbit.secureResources. Sin proveedor, muestra un estado
   honesto y conserva el fallback "Abrir en Drive/origen".
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.documentViewer = (function () {
  function esc(v) { return Orbit.ui && Orbit.ui.esc ? Orbit.ui.esc(String(v == null ? '' : v)) : String(v || ''); }
  function close() { const el = document.getElementById('orbit-document-viewer'); if (el) el.remove(); }

  function safeUrl(value) {
    const s = String(value || '').trim();
    return /^https:\/\/[^\s]+$/i.test(s) ? s : '';
  }

  function icon(value) {
    const s = String(value || '').toLowerCase();
    if (/pdf/.test(s)) return '📄';
    if (/png|jpg|jpeg|gif|webp|imagen|foto/.test(s)) return '🖼️';
    if (/xls|xlsx|csv|sheet|planilla/.test(s)) return '📊';
    if (/doc|docx|documento/.test(s)) return '📝';
    if (/ppt|pptx|slide/.test(s)) return '📽️';
    return '📎';
  }

  function metaRows(doc) {
    const rows = [
      ['Tipo', doc.tipo || doc.mimeType || '—'],
      ['Origen', doc.origen || '—'],
      ['País', doc.pais || '—'],
      ['Versión', doc.version || '—'],
      ['Vigencia', doc.vigencia || doc.vigenciaHasta || '—'],
      ['Estado', doc.estado || doc.storageEstado || '—'],
      ['Responsable', doc.responsable || '—']
    ];
    return rows.map(row => `<div class="dv-meta-row"><span>${esc(row[0])}</span><b>${esc(row[1])}</b></div>`).join('');
  }

  function previewMarkup(doc) {
    const preview = safeUrl(doc.previewUrl || doc.embedUrl);
    const type = String(doc.tipo || doc.mimeType || doc.nombre || '').toLowerCase();
    if (!preview) return `<div class="dv-empty"><span>${icon(type)}</span><b>Vista previa no disponible</b><p>El documento conserva su referencia y podrá abrirse aquí cuando la conexión documental esté disponible.</p></div>`;
    if (/image|png|jpg|jpeg|gif|webp/.test(type)) return `<div class="dv-preview"><img src="${esc(preview)}" alt="${esc(doc.nombre || 'Documento')}"></div>`;
    return `<div class="dv-preview"><iframe src="${esc(preview)}" title="${esc(doc.nombre || 'Documento')}" loading="lazy" referrerpolicy="no-referrer"></iframe></div>`;
  }

  async function open(input, options) {
    options = options || {};
    const original = Object.assign({}, input || {});
    const ref = original.documentRef || original.archivoRef || original.fileId || '';
    close();

    const modal = document.createElement('div');
    modal.id = 'orbit-document-viewer';
    modal.className = 'dv-back';
    modal.innerHTML = `<section class="dv-card" role="dialog" aria-modal="true" aria-label="Visor de documentos">
      <header class="dv-head"><div><small>Documentos</small><h2>${icon(original.tipo || original.nombre)} ${esc(original.nombre || 'Documento')}</h2></div><button class="imp-x" data-dv-close>✕</button></header>
      <div class="dv-layout">
        <div class="dv-main" data-dv-preview><div class="dv-empty"><span>⏳</span><b>Preparando vista previa</b></div></div>
        <aside class="dv-side"><div data-dv-meta>${metaRows(original)}</div><div class="dv-actions">
          <button class="btn ghost" data-dv-download disabled>Descargar</button>
          <button class="btn ghost" data-dv-external disabled>Abrir en Drive</button>
          <button class="btn primary" data-dv-close>Cerrar</button>
        </div><p class="muted dv-message" data-dv-message></p></aside>
      </div>
    </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-dv-close]').forEach(b => b.addEventListener('click', close));
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    let resolved = Object.assign({}, original);
    if (ref && Orbit.secureResources && Orbit.secureResources.resolveDocument) {
      const out = await Orbit.secureResources.resolveDocument(ref, options.context || {});
      resolved = Object.assign(resolved, out || {});
    }

    const external = safeUrl(resolved.externalUrl || resolved.driveUrl || resolved.url);
    const message = modal.querySelector('[data-dv-message]');
    message.textContent = resolved.message || (resolved.previewUrl || resolved.embedUrl ? 'Vista previa disponible.' : 'La referencia está registrada. La vista previa depende de la conexión documental y de tus permisos.');
    modal.querySelector('[data-dv-preview]').innerHTML = previewMarkup(resolved);
    modal.querySelector('[data-dv-meta]').innerHTML = metaRows(resolved);

    const externalBtn = modal.querySelector('[data-dv-external]');
    if (external) {
      externalBtn.disabled = false;
      externalBtn.addEventListener('click', () => window.open(external, '_blank', 'noopener,noreferrer'));
    }

    const downloadBtn = modal.querySelector('[data-dv-download]');
    if (ref && resolved.downloadAvailable && Orbit.secureResources && Orbit.secureResources.downloadDocument) {
      downloadBtn.disabled = false;
      downloadBtn.addEventListener('click', async () => {
        downloadBtn.disabled = true;
        const out = await Orbit.secureResources.downloadDocument(ref, options.context || {});
        if (out && out.url && safeUrl(out.url)) window.open(out.url, '_blank', 'noopener,noreferrer');
        downloadBtn.disabled = false;
      });
    }
  }

  return { open, close, safeUrl };
})();
