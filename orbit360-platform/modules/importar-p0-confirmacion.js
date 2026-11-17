/* ============================================================
   Orbit 360 · P0 confirmacion reforzada de importadores
   Fecha: 2026-07-09

   UI minima/aditiva para revisar impacto, riesgos, frase exacta
   y motivo antes de llamar Orbit.importaWriteP0.writeBatch.
   No escribe por si sola sin dry-run aprobado y confirmacion.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.importarP0Confirmacion = (function () {
  const REQUIRED_PHRASE = 'CONFIRMO ESCRITURA CONTROLADA';
  const ROLLBACK_PHRASE = 'CONFIRMO ROLLBACK';

  function esc(s) {
    if (Orbit.ui && Orbit.ui.esc) return Orbit.ui.esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function summarizeBatch(batch) {
    const operations = Array.isArray(batch && batch.operations) ? batch.operations : [];
    const byCollection = {};
    const byAction = { insert: 0, update: 0, other: 0 };
    let blocked = 0;
    let validation = 0;
    operations.forEach(op => {
      const coll = op.collection || 'sin_coleccion';
      const action = op.action || 'insert';
      byCollection[coll] = (byCollection[coll] || 0) + 1;
      if (action === 'insert') byAction.insert += 1;
      else if (action === 'update') byAction.update += 1;
      else byAction.other += 1;
      const data = op.data || op.record || {};
      if (data.requiereValidacion || data.estado === 'requiere_validacion' || data.validationStatus && data.validationStatus !== 'validado') validation += 1;
      if (Orbit.importaWriteP0 && !Orbit.importaWriteP0.isAllowedCollection(op.collection)) blocked += 1;
    });
    return { total: operations.length, byCollection, byAction, blocked, validation };
  }

  function riskList(batch) {
    const s = summarizeBatch(batch);
    const risks = [];
    if (!batch || batch.status !== 'dry_run_aprobado') risks.push('El dry-run no esta aprobado.');
    if (batch && batch.hasBlockingErrors) risks.push('El lote tiene bloqueos declarados.');
    if (s.blocked) risks.push(`${s.blocked} operacion(es) apuntan a colecciones no permitidas.`);
    if (s.validation) risks.push(`${s.validation} registro(s) requieren validacion.`);
    if (!s.total) risks.push('No hay operaciones para escribir.');
    if (!batch || !batch.batchId) risks.push('Falta batchId.');
    if (!batch || !batch.sourceType) risks.push('Falta tipo de fuente.');
    return risks;
  }

  function confirmationFromForm(host) {
    return {
      approved: !!host.querySelector('[data-p0-confirm-approved]')?.checked,
      phrase: host.querySelector('[data-p0-confirm-phrase]')?.value || '',
      reason: host.querySelector('[data-p0-confirm-reason]')?.value || '',
      userId: host.querySelector('[data-p0-confirm-user]')?.value || 'usuario_actual'
    };
  }

  function renderSummary(batch) {
    const s = summarizeBatch(batch || {});
    const collectionRows = Object.entries(s.byCollection).map(([coll, count]) => `<tr><td>${esc(coll)}</td><td class="num">${count}</td></tr>`).join('') || '<tr><td>Sin operaciones</td><td class="num">0</td></tr>';
    return `<div class="card" style="border:1px solid var(--line);overflow:hidden">
      <div style="padding:10px 13px;border-bottom:1px solid var(--line)"><b style="font-family:var(--f-display)">Impacto del lote</b></div>
      <div style="padding:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px">
        <span class="badge info">${s.total} operaciones</span>
        <span class="badge info">${s.byAction.insert} crear</span>
        <span class="badge info">${s.byAction.update} actualizar</span>
        <span class="badge warn">${s.validation} validar</span>
        <span class="badge ${s.blocked ? 'warn' : 'ok'}">${s.blocked} bloqueadas</span>
      </div>
      <div style="overflow:auto"><table class="tbl"><thead><tr><th>Coleccion</th><th class="num">Operaciones</th></tr></thead><tbody>${collectionRows}</tbody></table></div>
    </div>`;
  }

  function render(host, batch) {
    const risks = riskList(batch || {});
    const canAttempt = !risks.length && !!Orbit.importaWriteP0;
    host.innerHTML = `<div class="card pad" style="margin-top:16px;border:1px solid var(--line)">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start">
        <div>
          <div class="page-sub" style="margin:0 0 4px">P0 · Escritura controlada</div>
          <h3 style="margin:0;font-family:var(--f-display)">Confirmacion reforzada</h3>
          <p class="muted" style="margin:6px 0 0;max-width:760px;font-size:13px;line-height:1.5">Este flujo solo habilita escritura despues de dry-run aprobado, sin bloqueos y con frase exacta. La escritura se ejecuta por Orbit.store y deja auditoria/rollback.</p>
        </div>
        <span class="badge ${canAttempt ? 'ok' : 'warn'}">${canAttempt ? 'listo para confirmar' : 'bloqueado'}</span>
      </div>
      <div style="margin-top:14px">${renderSummary(batch || {})}</div>
      <div class="card" style="border:1px solid var(--line);margin-top:12px;padding:12px">
        <b style="font-family:var(--f-display)">Riesgos / bloqueos</b>
        ${risks.length ? `<ul style="margin:8px 0 0;padding-left:18px;color:var(--muted)">${risks.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : '<p class="muted" style="margin:8px 0 0">Sin bloqueos detectados para intentar confirmacion.</p>'}
      </div>
      <div class="card" style="border:1px solid var(--line);margin-top:12px;padding:12px;display:grid;gap:10px">
        <label style="font-size:13px"><input type="checkbox" data-p0-confirm-approved> Confirmo que revise el dry-run, impactos y riesgos.</label>
        <label style="font-size:12px;color:var(--muted)">Frase exacta requerida</label>
        <input data-p0-confirm-phrase class="input" placeholder="${REQUIRED_PHRASE}">
        <label style="font-size:12px;color:var(--muted)">Motivo de escritura</label>
        <textarea data-p0-confirm-reason class="input" rows="3" placeholder="Motivo obligatorio para auditoria"></textarea>
        <label style="font-size:12px;color:var(--muted)">Usuario confirmador</label>
        <input data-p0-confirm-user class="input" value="usuario_actual">
        <button class="btn primary" data-p0-write ${canAttempt ? '' : 'disabled'}>Ejecutar escritura controlada</button>
        <div data-p0-confirm-result class="muted" style="font-size:12.5px"></div>
      </div>
    </div>`;

    const button = host.querySelector('[data-p0-write]');
    if (button) button.addEventListener('click', () => {
      const confirmation = confirmationFromForm(host);
      const resultEl = host.querySelector('[data-p0-confirm-result]');
      if (!Orbit.importaWriteP0) {
        resultEl.textContent = 'Contrato de escritura no disponible.';
        return;
      }
      const result = Orbit.importaWriteP0.writeBatch(batch, confirmation);
      resultEl.textContent = result.ok ? `Escritura controlada completa: ${result.written} registro(s). Rollback disponible.` : `Bloqueado: ${(result.errors || []).join(', ')}`;
    });
  }

  function mount(host, batch) { if (host) render(host, batch || { status: 'sin_lote', operations: [] }); }

  // The source intake is deliberately separate from the legacy store writer:
  // one original document, explicit mapping, server-owned sources/proposals,
  // and a durable response. It never applies a receipt, payment or commission.
  const SOURCE_KINDS = ['estados-cuenta', 'planillas-comision'];
  const SOURCE_TYPES = {
    INSURER_STATEMENT_PENDING_FROM_N: 'Estado de cuenta: cuotas pendientes desde N',
    COMMISSION_STATEMENT_INSTALLMENT_N: 'Planilla de comisión: cuota documentada',
    INVOICE_INSTALLMENT_N: 'Factura de aseguradora: cuota documentada',
    BANK_STATEMENT_MATCH: 'Banco: pago identificado documentalmente'
  };
  const SOURCE_FIELDS = {
    policyNumber: ['Póliza', 'policyNumber', 'policy number', 'poliza', 'numero poliza', 'numero de poliza', 'no poliza'],
    receiptNumber: ['Recibo / requerimiento', 'receiptNumber', 'receipt number', 'recibo', 'numero recibo', 'requerimiento', 'numero requerimiento'],
    policyId: ['ID de póliza (si consta)', 'policyId', 'polizaId'],
    receiptId: ['ID de recibo (si consta)', 'receiptId', 'reciboId'],
    installment: ['Cuota', 'installment', 'cuota', 'numero cuota', 'no cuota'],
    totalInstallments: ['Total de cuotas', 'totalInstallments', 'total cuotas', 'total de cuotas'],
    explicitInstallmentException: ['Excepción de cuotas documentada (sí/no)', 'explicitInstallmentException', 'excepcion de cuotas documentada'],
    installmentExceptionReference: ['Referencia Drive de la excepción de cuotas', 'installmentExceptionReference', 'referencia excepcion de cuotas'],
    amount: ['Prima / pago de la cuota, no comisión', 'amount', 'monto pagado', 'total pagado', 'prima pagada', 'prima total cuota', 'importe prima', 'saldo recibo'],
    paidDate: ['Fecha real de pago', 'paidDate', 'fecha pago', 'fecha de pago', 'fecha real de pago'],
    actualPaidDateEvidence: ['Fecha real demostrada (sí/no)', 'actualPaidDateEvidence', 'fecha real demostrada'],
    paymentConfirmed: ['Pago confirmado en fuente (sí/no)', 'paymentConfirmed', 'pago confirmado'],
    invoiceNumber: ['Número de factura', 'invoiceNumber', 'factura', 'numero factura', 'numero de factura'],
    invoiceDate: ['Fecha de factura', 'invoiceDate', 'factura fecha', 'fecha factura', 'fecha de factura'],
    applicationDate: ['Fecha de aplicación aseguradora', 'applicationDate', 'fecha aplicacion', 'fecha de aplicacion'],
    policyStartDate: ['Inicio de vigencia', 'policyStartDate', 'inicio vigencia', 'vigencia desde'],
    policyEndDate: ['Fin de vigencia', 'policyEndDate', 'fin vigencia', 'vigencia hasta'],
    paymentMethod: ['Medio de pago documentado', 'paymentMethod', 'medio pago', 'medio de pago'],
    partialPayment: ['Pago parcial (sí/no)', 'partialPayment', 'pago parcial'],
    reversal: ['Reversión (sí/no)', 'reversal', 'reversion'],
    conflictingEvidence: ['Evidencia contradictoria (sí/no)', 'conflictingEvidence', 'evidencia contradictoria'],
    country: ['País de fila (control de consistencia)', 'country', 'pais'],
    currency: ['Moneda de fila (control de consistencia)', 'currency', 'moneda', 'divisa']
  };
  const str = value => String(value == null ? '' : value).trim();
  const key = value => str(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const sourceKind = kind => SOURCE_KINDS.includes(kind);
  const sourceError = (code, detail) => Object.assign(new Error(code), { code, detail: detail || '' });
  function freezeSource(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freezeSource); Object.freeze(value); } return value; }
  async function fileSha256(file) {
    if (!file || typeof file.arrayBuffer !== 'function' || !str(file.name)) throw sourceError('SOURCE_ORIGINAL_FILE_REQUIRED');
    if (file.size > 25 * 1024 * 1024) throw sourceError('SOURCE_FILE_TOO_LARGE');
    if (!window.crypto || !window.crypto.subtle) throw sourceError('SOURCE_HASH_UNAVAILABLE');
    const bytes = await file.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 25 * 1024 * 1024) throw sourceError('SOURCE_FILE_SIZE_INVALID');
    return Array.from(new Uint8Array(await window.crypto.subtle.digest('SHA-256', bytes))).map(n => n.toString(16).padStart(2, '0')).join('');
  }
  async function rowDigest(value) {
    if (!window.crypto || !window.crypto.subtle || typeof TextEncoder !== 'function') throw sourceError('SOURCE_HASH_UNAVAILABLE');
    return Array.from(new Uint8Array(await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(n => n.toString(16).padStart(2, '0')).join('');
  }
  function sourceTable(text, sheet) {
    const input = String(text || '').replace(/^\uFEFF/, ''), first = input.split(/\r?\n/, 1)[0];
    const scores = [',', ';', '\t'].map(delimiter => ({ delimiter, count: first.split(delimiter).length - 1 })).sort((a, b) => b.count - a.count);
    if (!scores[0].count) throw sourceError('SOURCE_TABLE_HEADERS_REQUIRED');
    const delimiter = scores[0].delimiter, all = []; let row = [], cell = '', quoted = false, closed = false, line = 1, start = 1;
    function endRow() { row.push(cell); if (row.some(v => str(v))) { row._origenHoja = sheet || 'CSV'; row._numeroFila = start; all.push(row); } row = []; cell = ''; closed = false; start = line + 1; }
    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      if (c === '"') { if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else { if (!quoted && (cell || closed)) throw sourceError('SOURCE_TABLE_QUOTES_INVALID'); if (quoted) closed = true; quoted = !quoted; } }
      else if (c === delimiter && !quoted) { row.push(cell); cell = ''; closed = false; }
      else if (c === '\n') { if (quoted) cell += '\n'; else endRow(); line++; }
      else if (c !== '\r') { if (closed && !quoted) throw sourceError('SOURCE_TABLE_QUOTES_INVALID'); cell += c; }
    }
    if (quoted) throw sourceError('SOURCE_TABLE_QUOTES_INVALID');
    if (cell || row.length) endRow();
    if (all.length < 2) throw sourceError('SOURCE_TABLE_ROWS_REQUIRED');
    const headers = all.shift().map(str);
    if (headers.length > 100 || headers.some(h => !h) || new Set(headers.map(key)).size !== headers.length) throw sourceError('SOURCE_TABLE_HEADERS_AMBIGUOUS');
    if (all.length > 5000 || all.some(r => r.length > headers.length)) throw sourceError('SOURCE_TABLE_ROW_BOUND');
    return { headers, rows: all };
  }
  function mapSourceHeaders(headers) {
    const normalized = headers.map(key), mapping = {};
    for (const [field, aliases] of Object.entries(SOURCE_FIELDS)) {
      const hits = normalized.map((h, i) => aliases.slice(1).some(a => key(a) === h) ? i : -1).filter(i => i >= 0);
      if (hits.length === 1) mapping[field] = hits[0];
    }
    return mapping;
  }
  async function sourceFileTable(file, context) {
    const ext = str(file.name).split('.').pop().toLowerCase();
    if (['csv', 'tsv', 'txt'].includes(ext)) return sourceTable(await file.text(), 'CSV');
    if (['xlsx', 'xls'].includes(ext)) {
      const reader = window.XLSX || context && typeof context.spreadsheetReader === 'function' && await context.spreadsheetReader();
      if (!reader || typeof reader.read !== 'function') throw sourceError('SOURCE_SPREADSHEET_READER_UNAVAILABLE');
      const workbook = reader.read(await file.arrayBuffer(), { type: 'array', cellDates: false }), headers = [], index = new Map(), rows = [];
      for (const name of workbook.SheetNames || []) {
        const matrix = reader.utils.sheet_to_json(workbook.Sheets[name], { header: 1, blankrows: true, defval: '', raw: false });
        const headerIndex = matrix.findIndex(r => r.some(v => str(v))); if (headerIndex < 0) continue;
        const local = matrix[headerIndex].map(str);
        if (local.some(h => !h) || new Set(local.map(key)).size !== local.length) throw sourceError('SOURCE_TABLE_HEADERS_AMBIGUOUS', name);
        const positions = local.map(h => { const k = key(h); if (!index.has(k)) { index.set(k, headers.length); headers.push(h); } return index.get(k); });
        matrix.slice(headerIndex + 1).forEach((cells, i) => { if (!cells.some(v => str(v))) return; if (cells.length > local.length) throw sourceError('SOURCE_TABLE_ROW_BOUND', name); const row = []; cells.forEach((v, n) => { row[positions[n]] = str(v); }); row._origenHoja = name; row._numeroFila = headerIndex + i + 2; rows.push(row); });
      }
      if (!headers.length || !rows.length) throw sourceError('SOURCE_TABLE_ROWS_REQUIRED');
      if (headers.length > 100 || rows.length > 5000) throw sourceError('SOURCE_TABLE_ROW_BOUND');
      return { headers, rows };
    }
    throw sourceError('SOURCE_VERIFIED_EXTRACTION_REQUIRED');
  }
  function sourceDate(value, format) {
    const raw = str(value); if (!raw) return '';
    let iso = raw;
    if (format === 'DMY') { const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (m) iso = m[3] + '-' + m[2] + '-' + m[1]; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(Date.parse(iso + 'T00:00:00Z')) || new Date(iso + 'T00:00:00Z').toISOString().slice(0, 10) !== iso) throw sourceError('SOURCE_DATE_INVALID');
    return iso;
  }
  function sourceAmount(value, currency) {
    let raw = str(value); if (!raw) return undefined;
    const explicit = raw.match(/^(GTQ|COP|USD|EUR|Q)\s*/i); if (explicit) { if ((explicit[1].toUpperCase() === 'Q' ? 'GTQ' : explicit[1].toUpperCase()) !== currency) throw sourceError('SOURCE_CURRENCY_CONFLICT'); raw = raw.slice(explicit[0].length); }
    raw = raw.replace(/\s/g, ''); let normalized;
    if (/^\d+(?:\.\d{1,2})?$/.test(raw)) normalized = raw;
    else if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(raw)) normalized = raw.replace(/,/g, '');
    else if (/^\d+(?:,\d{1,2})$/.test(raw)) normalized = raw.replace(',', '.');
    else if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(raw)) normalized = raw.replace(/\./g, '').replace(',', '.');
    else throw sourceError('SOURCE_AMOUNT_INVALID');
    const amount = Number(normalized); if (!Number.isFinite(amount) || amount < 0 || amount > 1000000000 || !Number.isSafeInteger(Math.round(amount * 100))) throw sourceError('SOURCE_AMOUNT_INVALID'); return amount;
  }
  function sourceBoolean(value) {
    const v = key(value); if (!v) return undefined;
    if (['true', 'si', 'yes', '1'].includes(v)) return true;
    if (['false', 'no', '0'].includes(v)) return false;
    throw sourceError('SOURCE_BOOLEAN_INVALID');
  }
  function sourceInteger(value) { const raw = str(value); if (!/^[1-9]\d{0,2}$/.test(raw) || Number(raw) > 100) throw sourceError('SOURCE_INSTALLMENT_INVALID'); return Number(raw); }
  async function buildSourceIntakeDraft(prepared, values, mapping) {
    const domain = Orbit.reconciliationDomain;
    if (!prepared || !prepared.file || !prepared.table || !prepared.sha256 || !domain || typeof domain.sourceIntakePayload !== 'function') throw sourceError('SOURCE_PREPARATION_REQUIRED');
    if (!values.sourceAttestation) throw sourceError('SOURCE_INTAKE_ATTESTATION_REQUIRED');
    const source = { sourceId: str(values.sourceId) || 'sha256:' + prepared.sha256, documentRef: domain.sourceDocumentRef(str(values.documentRef)), fileName: str(prepared.file.name), sha256: prepared.sha256,
      evidenceAsOfDate: sourceDate(values.evidenceAsOfDate, 'ISO'), country: str(values.country), currency: str(values.currency), evidenceType: str(values.evidenceType), insurerId: str(values.insurerId) };
    if (values.completePolicyGroups === true) source.completePolicyGroups = true;
    if (prepared.extractionFile) source.extractionFile = Object.assign({}, prepared.extractionFile);
    const table = prepared.table, map = mapping || mapSourceHeaders(table.headers), assigned = Object.values(map).filter(n => Number.isInteger(n) && n >= 0);
    if (!Number.isInteger(map.policyNumber) || new Set(assigned).size !== assigned.length || assigned.some(n => n >= table.headers.length)) throw sourceError('SOURCE_MAPPING_AMBIGUOUS');
    if (Number.isInteger(map.amount) && /comisi[oó]n|commission|net[ao]|net premium/i.test(table.headers[map.amount])) throw sourceError('SOURCE_COMMISSION_IS_NOT_PREMIUM');
    const rows = [], ids = new Set();
    for (let i = 0; i < table.rows.length; i++) {
      const cells = table.rows[i], row = {}, get = field => Number.isInteger(map[field]) && map[field] >= 0 ? str(cells[map[field]]) : '';
      row.policyNumber = get('policyNumber'); if (!row.policyNumber) throw sourceError('SOURCE_POLICY_NUMBER_REQUIRED', 'Fila ' + (cells._numeroFila || i + 2));
      for (const field of ['receiptNumber', 'policyId', 'receiptId', 'invoiceNumber', 'paymentMethod']) if (get(field)) row[field] = get(field);
      const installment = get('installment'); if (installment) { const pair = installment.match(/^([1-9]\d{0,2})\s*(?:\/|de)\s*([1-9]\d{0,2})$/i); if (pair) { row.installment = sourceInteger(pair[1]); row.totalInstallments = sourceInteger(pair[2]); } else row.installment = sourceInteger(installment); }
      if (get('totalInstallments')) { const total = sourceInteger(get('totalInstallments')); if (row.totalInstallments != null && row.totalInstallments !== total) throw sourceError('SOURCE_INSTALLMENT_CONFLICT'); row.totalInstallments = total; }
      if (row.installment && row.totalInstallments && row.installment > row.totalInstallments) throw sourceError('SOURCE_INSTALLMENT_CONFLICT');
      if (get('amount')) row.amount = sourceAmount(get('amount'), source.currency);
      for (const field of ['paidDate', 'invoiceDate', 'applicationDate', 'policyStartDate', 'policyEndDate']) if (get(field)) row[field] = sourceDate(get(field), values.dateFormat || 'ISO');
      for (const field of ['actualPaidDateEvidence', 'paymentConfirmed', 'partialPayment', 'reversal', 'conflictingEvidence', 'explicitInstallmentException']) if (get(field)) row[field] = sourceBoolean(get(field));
      if (get('installmentExceptionReference')) row.installmentExceptionReference = domain.sourceDocumentRef(get('installmentExceptionReference'));
      if (row.explicitInstallmentException === true && !row.installmentExceptionReference || row.explicitInstallmentException !== true && get('installmentExceptionReference')) throw sourceError('SOURCE_INSTALLMENT_EXCEPTION_REFERENCE_REQUIRED');
      if (get('country') && str(get('country')).toUpperCase() !== source.country || get('currency') && str(get('currency')).toUpperCase() !== source.currency) throw sourceError('SOURCE_ROW_SCOPE_CONFLICT');
      row.sheet = str(cells._origenHoja) || (prepared.extractionFile ? 'EXTRACTION' : 'CSV');
      row.rowNumber = cells._numeroFila || i + 2;
      if (!Number.isSafeInteger(row.rowNumber) || row.rowNumber < 1) throw sourceError('SOURCE_ROW_LOCATION_REQUIRED');
      row.rowId = 'row_' + (await rowDigest([source.sha256, prepared.extractionFile && prepared.extractionFile.sha256 || '', row.sheet, row.rowNumber].join('|'))).slice(0, 40);
      if (ids.has(row.rowId)) throw sourceError('SOURCE_ROW_LOCATION_DUPLICATE'); ids.add(row.rowId); rows.push(row);
    }
    const batches = planSourceIntakeBatches(source, rows);
    batches.forEach(batch => domain.sourceIntakePayload(batch));
    return freezeSource({ source, rows, batches, totalRows: rows.length, financialWrites: 0 });
  }
  function planSourceIntakeBatches(source, rows) {
    if (!Array.isArray(rows) || !rows.length || rows.length > 5000) throw sourceError('SOURCE_TABLE_ROW_BOUND');
    const groups = new Map();
    for (const row of rows) { if (!str(row.policyNumber)) throw sourceError('SOURCE_POLICY_NUMBER_REQUIRED'); const group = JSON.stringify([str(row.policyNumber), str(row.policyId), str(row.policyStartDate), str(row.policyEndDate)]); if (!groups.has(group)) groups.set(group, []); groups.get(group).push(row); }
    const chunks = []; let current = [];
    for (const group of groups.values()) {
      if (group.length > 100) throw sourceError('SOURCE_POLICY_GROUP_OVER_100');
      if (source.evidenceType === 'INSURER_STATEMENT_PENDING_FROM_N') {
        if (source.completePolicyGroups !== true) throw sourceError('SOURCE_INTAKE_COMPLETE_POLICY_GROUPS_REQUIRED');
        const totals = new Set(group.map(r => r.totalInstallments)), nums = group.map(r => r.installment).sort((a, b) => a - b), total = group[0].totalInstallments;
        if (totals.size !== 1 || !Number.isInteger(total) || nums.some(n => !Number.isInteger(n) || n < 1) || new Set(nums).size !== group.length || nums[nums.length - 1] !== total || nums.some((n, i) => n !== nums[0] + i)) throw sourceError('SOURCE_PENDING_GROUP_INCOMPLETE');
      }
      if (current.length + group.length > 100) { chunks.push(current); current = []; } current.push(...group);
    }
    if (current.length) chunks.push(current);
    return chunks.map(chunk => ({ schemaVersion: 'gi-cobros-source-intake-v2', source: Object.assign({}, source), sourceAttestation: true, rows: chunk }));
  }
  const intakeDraftWork = new WeakMap();
  async function submitSourceIntakeDraft(draft, options) {
    if (!draft || !Array.isArray(draft.batches) || !draft.batches.length) throw sourceError('SOURCE_PREPARATION_REQUIRED');
    if (intakeDraftWork.has(draft)) return intakeDraftWork.get(draft);
    const work = (async () => {
      const results = [];
      try { for (const batch of draft.batches) { const out = await Orbit.reconciliationDomain.intakeSourceRun(batch, options); results.push(out); if (options && typeof options.onProgress === 'function') options.onProgress(results.length, draft.batches.length); } }
      catch (error) { error.sourceIntakePartialResults = results; throw error; }
      return { ok: true, status: 'SOURCE_INTAKE_COMPLETE', sourceSha256: draft.source.sha256, financialWrites: 0, results,
        counts: results.reduce((sum, item) => { for (const k of ['sourceRows', 'proposals', 'holds', 'supportingRows', 'duplicates']) sum[k] += item.counts[k]; return sum; }, { sourceRows: 0, proposals: 0, holds: 0, supportingRows: 0, duplicates: 0 }) };
    })();
    intakeDraftWork.set(draft, work); try { return await work; } finally { if (intakeDraftWork.get(draft) === work) intakeDraftWork.delete(draft); }
  }
  function sourceFailure(error) {
    const code = str(error && (error.code || error.message));
    const messages = {
      SOURCE_VERIFIED_EXTRACTION_REQUIRED: 'El original no es una tabla verificable. Adjunta debajo una extracción CSV/TSV revisada contra este mismo original; su hash se conserva por separado.',
      SOURCE_INTAKE_ATTESTATION_REQUIRED: 'Confirma que revisaste el documento original, el mapeo y las filas.',
      SOURCE_INTAKE_COMPLETE_POLICY_GROUPS_REQUIRED: 'Confirma que el estado pendiente contiene los grupos completos de cuotas por póliza.',
      SOURCE_PENDING_GROUP_INCOMPLETE: 'Hay un grupo de cuotas pendientes incompleto, duplicado o sin total. No se inferirá un pago a partir de esa ausencia.',
      SOURCE_COMMISSION_IS_NOT_PREMIUM: 'La columna de comisión o prima neta no puede usarse como importe total pagado de la cuota.',
      SOURCE_POLICY_GROUP_OVER_100: 'Una póliza supera 100 filas. No se fragmentará su grupo: requiere revisión del lote.',
      SOURCE_INTAKE_ORIGINAL_DOCUMENT_REQUIRED: 'Falta original, referencia Drive durable o aseguradora canónica.',
      SOURCE_MAPPING_AMBIGUOUS: 'Revisa el mapeo: póliza obligatoria y cada columna debe tener un único significado.',
      SOURCE_INTAKE_DURABLE_READBACK_REQUIRED: 'El servidor no confirmó el readback durable. No se declara éxito; reintenta el mismo lote.',
      COBROS_RECONCILIATION_BACKEND_NOT_ACTIVE: 'El servicio de conciliación no está disponible para la sesión actual. No se guardó el lote desde esta pantalla.'
    };
    return messages[code] || 'Ingreso bloqueado: ' + (code.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 120) || 'error_de_verificacion') + (error && error.detail ? ' · ' + str(error.detail) : '');
  }
  function mountSourceIntake(host, context) {
    if (!host || !context || !sourceKind(context.kind)) return null;
    const files = Array.from(context.filesReal || []), metadata = context.sourceMetadata || {};
    let prepared = null, mapping = {}, frozenDraft = null, busy = false, locked = false, completed = false, preparation = 0, reviewRevision = 0;
    const insurerRows = () => Orbit.store && typeof Orbit.store.all === 'function' ? Orbit.store.all('aseguradoras').filter(r => r && str(r.id)) : [];
    const insurers = insurerRows(); let insurerUnsubscribe = null;
    host.innerHTML = `<section data-source-intake="1" class="card pad"><h3 style="margin-top:0">Ingresar fuente de conciliación</h3><p class="muted">Se guardan únicamente fuente, filas y propuestas. <b>No se aplican pagos ni se cambian primas, comisiones o saldos.</b></p><p data-intake-original role="status">Verificando archivo original…</p>
      <fieldset data-intake-fields style="border:0;padding:0;min-width:0"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px">
      <label>Referencia durable del original en Drive<input class="input" data-intake-field="documentRef" value="${esc(metadata.documentRef || '')}" placeholder="https://drive.google.com/file/d/…/view"></label>
      <label>Identificador documental (SHA por defecto)<input class="input" data-intake-field="sourceId" value="${esc(metadata.sourceId || '')}"></label>
      <label>Aseguradora<select class="o-sel" data-intake-field="insurerId"><option value="">Selecciona la aseguradora</option>${insurers.map(r => `<option value="${esc(r.id)}" ${r.id === (metadata.insurerId || context.scope && context.scope.aseguradoraId) ? 'selected' : ''}>${esc(r.nombre || r.name || r.id)}</option>`).join('')}</select></label>
      <label>País del documento<select class="o-sel" data-intake-field="country"><option value="">Selecciona país</option>${['GT', 'CO'].map(v => `<option ${metadata.country === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>Moneda explícita<select class="o-sel" data-intake-field="currency"><option value="">Selecciona moneda</option>${['GTQ', 'COP', 'USD'].map(v => `<option ${metadata.currency === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>Fecha de corte de la evidencia<input type="date" class="input" data-intake-field="evidenceAsOfDate" value="${esc(metadata.evidenceAsOfDate || '')}"></label>
      <label>Tipo de evidencia<select class="o-sel" data-intake-field="evidenceType"><option value="">Clasifica la evidencia</option>${Object.entries(SOURCE_TYPES).map(([v, label]) => `<option value="${v}" ${metadata.evidenceType === v ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
      <label>Formato de las fechas de columnas<select class="o-sel" data-intake-field="dateFormat"><option value="ISO">AAAA-MM-DD</option><option value="DMY">DD/MM/AAAA</option></select></label>
      <label>Extracción revisada separada (opcional)<input type="file" accept=".csv,.tsv,.txt" data-intake-extraction><small>Para PDF/imagen: tabla revisada, sin sustituir el archivo ni su hash original.</small></label></div>
      <div data-intake-mapping style="margin-top:12px"></div><div data-intake-rows style="overflow:auto;max-height:280px;margin-top:12px"></div>
      <p class="muted">La fecha de corte, la fecha real de pago, la fecha de factura y la fecha de aplicación son independientes. Una comisión no equivale a la prima pagada.</p>
      <label style="display:block;margin-top:12px"><input type="checkbox" data-intake-field="completePolicyGroups"> El estado pendiente contiene las cuotas completas de cada póliza, desde N hasta el total declarado.</label>
      <label style="display:block;margin-top:12px"><input type="checkbox" data-intake-field="sourceAttestation"> Revisé estas filas y su mapeo contra el original de Drive. Confirmo país, moneda, corte y tipo de evidencia; no declaro como real una fecha inferida.</label>
      <label style="display:block;margin-top:12px">Motivo para la auditoría<input class="input" data-intake-field="reason" placeholder="Ingreso documental para conciliación"></label></fieldset>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><button class="btn ghost" data-intake-back>Volver al archivo</button><button class="btn ghost" data-intake-preview>Revisar lotes sin guardar</button><button class="btn primary" data-intake-submit disabled>Guardar fuente y propuestas</button><a class="btn ghost" data-intake-conciliaciones href="#/conciliaciones" hidden>Ver en Conciliaciones →</a></div><p data-intake-result role="status" aria-live="polite"></p></section>`;
    const find = selector => host.querySelector(selector), result = find('[data-intake-result]'), submit = find('[data-intake-submit]'), fields = find('[data-intake-fields]');
    function invalidateReview() { reviewRevision++; frozenDraft = null; submit.disabled = true; }
    function refreshInsurers() {
      if (!host.isConnected) { if (insurerUnsubscribe) insurerUnsubscribe(); insurerUnsubscribe = null; return; }
      const select = find('[data-intake-field="insurerId"]'), current = select.value || metadata.insurerId || context.scope && context.scope.aseguradoraId || '';
      const rows = insurerRows(); select.innerHTML = '<option value="">Selecciona la aseguradora</option>' + rows.map(r => '<option value="' + esc(r.id) + '"' + (r.id === current ? ' selected' : '') + '>' + esc(r.nombre || r.name || r.id) + '</option>').join('');
      if (select.value !== current && frozenDraft) invalidateReview();
    }
    // Demand-load through the existing protected store, without granting a role
    // or converting a local option into canonical insurer evidence.
    try {
      if (Orbit.store && typeof Orbit.store.on === 'function') insurerUnsubscribe = Orbit.store.on('*', event => { if (!event || !event.collection || event.collection === 'aseguradoras') refreshInsurers(); });
      if (Orbit.store && typeof Orbit.store._ensureCollections === 'function') Orbit.store._ensureCollections(['aseguradoras']);
    } catch (_) { result.textContent = 'No se pudo solicitar el directorio autorizado de aseguradoras.'; }
    function formValues() { const out = {}; host.querySelectorAll('[data-intake-field]').forEach(el => { out[el.dataset.intakeField] = el.type === 'checkbox' ? el.checked : el.value; }); return out; }
    function paintTable() {
      const table = prepared && prepared.table;
      find('[data-intake-mapping]').innerHTML = !table ? '' : `<details open><summary>Mapeo explícito de columnas (${table.rows.length} filas)</summary><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:10px">${Object.entries(SOURCE_FIELDS).map(([field, labels]) => `<label>${esc(labels[0])}<select class="o-sel" data-intake-map="${field}"><option value="-1">No consta / no mapear</option>${table.headers.map((h, i) => `<option value="${i}" ${mapping[field] === i ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></label>`).join('')}</div></details>`;
      find('[data-intake-rows]').innerHTML = !table ? '' : `<table class="tbl"><thead><tr><th>Ubicación</th>${table.headers.map(h => '<th>' + esc(h) + '</th>').join('')}</tr></thead><tbody>${table.rows.slice(0, 30).map((row, i) => '<tr><td>' + esc((row._origenHoja || 'CSV') + ':' + (row._numeroFila || i + 2)) + '</td>' + table.headers.map((_, n) => '<td>' + esc(row[n] || '') + '</td>').join('') + '</tr>').join('')}</tbody></table>${table.rows.length > 30 ? '<p class="muted">Vista de las primeras 30 filas; la validación incluye las ' + table.rows.length + ' filas.</p>' : ''}`;
      host.querySelectorAll('[data-intake-map]').forEach(el => el.addEventListener('change', () => { const n = Number(el.value); if (n >= 0) mapping[el.dataset.intakeMap] = n; else delete mapping[el.dataset.intakeMap]; invalidateReview(); }));
    }
    async function prepare(extraction) {
      const ticket = ++preparation; invalidateReview(); prepared = null;
      if (files.length !== 1) { result.textContent = 'Selecciona exactamente un original por ingreso. No se mezclarán archivos bajo una sola huella.'; return; }
      const file = files[0];
      try {
        const sha256 = await fileSha256(file), next = { file, sha256, table: null };
        if (extraction) { const ext = str(extraction.name).split('.').pop().toLowerCase(); if (!['csv', 'tsv', 'txt'].includes(ext)) throw sourceError('SOURCE_TABLE_HEADERS_REQUIRED'); next.extractionFile = { fileName: str(extraction.name), sha256: await fileSha256(extraction) }; next.table = sourceTable(await extraction.text(), 'EXTRACTION'); }
        else next.table = await sourceFileTable(file, context);
        if (ticket !== preparation) return;
        prepared = next; mapping = mapSourceHeaders(next.table.headers); paintTable();
        find('[data-intake-original]').textContent = 'Original: ' + file.name + ' · SHA256 ' + sha256 + (next.extractionFile ? ' · Extracción separada: ' + next.extractionFile.fileName + ' · SHA256 ' + next.extractionFile.sha256 : '');
        const id = find('[data-intake-field="sourceId"]'); if (!str(id.value)) id.value = 'sha256:' + sha256;
        result.textContent = 'Archivo leído. Revisa mapeo, metadatos y evidencia antes de guardar; todavía no hay escrituras.';
      } catch (error) { if (ticket !== preparation) return; find('[data-intake-original]').textContent = 'Original seleccionado: ' + file.name + ' · ingreso pendiente de verificación'; result.textContent = sourceFailure(error); paintTable(); }
    }
    function lock() { locked = true; fields.disabled = true; find('[data-intake-preview]').disabled = true; }
    async function review() {
      if (busy || locked) return;
      invalidateReview(); const revision = reviewRevision;
      try { const draft = await buildSourceIntakeDraft(prepared, formValues(), Object.assign({}, mapping)); if (revision !== reviewRevision || locked) return; frozenDraft = draft; submit.disabled = false; result.textContent = frozenDraft.totalRows + ' filas en ' + frozenDraft.batches.length + ' lote(s) de hasta 100 filas, sin partir una póliza. Solo fuentes/propuestas; pagos: 0.'; }
      catch (error) { if (revision !== reviewRevision) return; frozenDraft = null; submit.disabled = true; result.textContent = sourceFailure(error); }
    }
    host.querySelectorAll('[data-intake-field]').forEach(el => { for (const event of ['change', 'input']) el.addEventListener(event, () => { if (!locked) invalidateReview(); }); });
    find('[data-intake-extraction]').addEventListener('change', event => { if (!locked) prepare(event.target.files && event.target.files[0]); });
    find('[data-intake-preview]').addEventListener('click', review);
    find('[data-intake-back]').addEventListener('click', () => { if (!busy && typeof context.onBack === 'function') context.onBack(); });
    submit.addEventListener('click', async () => {
      if (busy || completed || submit.disabled || !frozenDraft) return;
      busy = true; submit.disabled = true; lock(); result.textContent = 'Guardando fuente; esperando readback durable del servidor…';
      try {
        const out = await submitSourceIntakeDraft(frozenDraft, { reason: str(formValues().reason) || 'Ingreso documental para conciliación', onProgress: (done, total) => { result.textContent = 'Readback confirmado: ' + done + '/' + total + ' lotes. Sin aplicar pagos.'; } });
        completed = true; Orbit.__lastSourceIntakeReadback = out;
        result.textContent = 'Fuente confirmada por el servidor: ' + out.counts.sourceRows + ' filas, ' + out.counts.proposals + ' propuestas, ' + out.counts.holds + ' en revisión y ' + out.counts.duplicates + ' duplicadas sin nueva escritura. Pagos aplicados: 0.';
        find('[data-intake-conciliaciones]').hidden = false;
        if (typeof context.onComplete === 'function') context.onComplete(out);
      } catch (error) { const done = (error.sourceIntakePartialResults || []).length; result.textContent = (done ? done + ' lote(s) ya confirmados. ' : '') + sourceFailure(error) + ' Se conserva el mismo borrador para reintentar sin duplicar.'; submit.textContent = 'Reintentar el mismo ingreso'; submit.disabled = false; }
      finally { busy = false; }
    });
    find('[data-intake-conciliaciones]').addEventListener('click', event => { if (!completed) { event.preventDefault(); return; } if (typeof context.onNavigate === 'function') context.onNavigate(); });
    const ready = prepare();
    return { ready, review, dispose: () => { if (insurerUnsubscribe) insurerUnsubscribe(); insurerUnsubscribe = null; }, status: () => ({ prepared: !!prepared, busy, locked, completed, hasDraft: !!frozenDraft }) };
  }

  return { REQUIRED_PHRASE, ROLLBACK_PHRASE, summarizeBatch, riskList, render, mount, SOURCE_TYPES, SOURCE_FIELDS, sourceKind, fileSha256, sourceTable, mapSourceHeaders, sourceFileTable, sourceDate, sourceAmount, buildSourceIntakeDraft, planSourceIntakeBatches, submitSourceIntakeDraft, mountSourceIntake };
})();
