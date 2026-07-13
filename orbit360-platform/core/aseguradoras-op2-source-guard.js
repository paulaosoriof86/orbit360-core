/* ============================================================
   Orbit 360 · Aseguradoras OP-2 · guard de alias y duplicados v1.217
   Marca variantes probables dentro del archivo o contra el directorio
   existente. Nunca fusiona automáticamente ni toca recursos sensibles.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  const D = Orbit.insurerDirectoryImport;
  if (!D || Orbit.__aseguradorasOp2SourceGuardV1217) return;
  Orbit.__aseguradorasOp2SourceGuardV1217 = true;

  function clean(v) { return String(v == null ? '' : v).replace(/\u00a0/g, ' ').trim(); }
  function fold(v) {
    return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function canonical(v) {
    return fold(v)
      .replace(/\b(v(?:ersion)?\s*)?\d+(?:\s*\.\s*\d+)*\b/g, ' ')
      .replace(/\b(copia|copy|nuevo|anterior|actualizado|actualizada|backup)\b/g, ' ')
      .replace(/\b(aseguradora|seguros|seguro|compania|company|cooperativa|sociedad|s a s|s a|sa|de colombia|de guatemala)\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function distance(a, b) {
    a = canonical(a); b = canonical(b);
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const prev = Array.from({ length:n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      for (let j = 0; j <= n; j++) prev[j] = cur[j];
    }
    return prev[n];
  }
  function near(a, b) {
    const x = canonical(a), y = canonical(b);
    if (!x || !y) return false;
    if (x === y) return true;
    if (Math.min(x.length, y.length) < 4) return false;
    if (x.includes(y) || y.includes(x)) return Math.abs(x.length - y.length) <= 3;
    return distance(x, y) <= 1;
  }
  function addAlert(target, code) {
    if (!target) return;
    target.validacionAlertas = Array.from(new Set([].concat(target.validacionAlertas || [], code)));
    target.requiereValidacion = true;
    target.validationStatus = 'requiere_validacion';
  }
  function operationFor(result, sheet) {
    return result && result.report && (result.report._operations || []).find(op => op.sourceSheet === sheet);
  }
  function markResult(result) {
    if (!result || !Array.isArray(result.candidates) || !result.report) return result;
    const reviews = [];
    const candidates = result.candidates;

    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i], b = candidates[j];
        if (a.country !== b.country || !near(a.identityName || a.sourceSheet, b.identityName || b.sourceSheet)) continue;
        const opA = operationFor(result, a.sourceSheet), opB = operationFor(result, b.sourceSheet);
        if (opA && opA.data) addAlert(opA.data, 'duplicado_probable_dentro_del_archivo');
        if (opB && opB.data) addAlert(opB.data, 'duplicado_probable_dentro_del_archivo');
        reviews.push({ type:'within_file', country:a.country, sheets:[a.sourceSheet,b.sourceSheet] });
      }
    }

    let existing = [];
    try { existing = Orbit.store && Orbit.store.all ? (Orbit.store.all('aseguradoras') || []) : []; } catch (e) {}
    candidates.forEach(candidate => {
      const op = operationFor(result, candidate.sourceSheet);
      if (!op || op.action !== 'insert' || !op.data) return;
      const found = existing.find(row => (!row.pais || row.pais === candidate.country) && near(row.nombre, candidate.identityName || candidate.sourceSheet));
      if (!found) return;
      addAlert(op.data, 'duplicado_probable_con_directorio');
      reviews.push({ type:'existing_directory', country:candidate.country, sheet:candidate.sourceSheet, existingId:found.id || '' });
    });

    const operations = result.report._operations || [];
    result.report.totals = Object.assign({}, result.report.totals || {}, {
      operations: operations.length,
      insert: operations.filter(op => op.action === 'insert').length,
      update: operations.filter(op => op.action === 'update').length,
      blocked: operations.filter(op => op.data && (op.data.requiereValidacion || op.data.validationStatus !== 'validado')).length
    });
    result.report.hasBlockingErrors = result.report.totals.blocked > 0;
    (result.report.sheetSummary || []).forEach(summary => {
      const op = operationFor(result, summary.sheet);
      summary.alerts = Array.from(new Set([].concat(summary.alerts || [], op && op.data && op.data.validacionAlertas || [])));
    });
    result.report.duplicateReview = reviews;
    return result;
  }

  const originalParseMatrices = D.parseMatrices.bind(D);
  const originalParseFile = D.parseFile.bind(D);
  D.parseMatrices = function () { return markResult(originalParseMatrices.apply(D, arguments)); };
  D.parseFile = async function () { return markResult(await originalParseFile.apply(D, arguments)); };
  D.op2CanonicalName = canonical;
  D.op2NamesNear = near;
  D.__op2SourceGuardV1217 = { originalParseMatrices, originalParseFile, markResult };
})();
