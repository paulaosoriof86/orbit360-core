/* ============================================================
   Orbit 360 · Aseguradoras OP-2 · owner visual canónico v1.221
   Carga Excel directa, dry-run/diff, escritura controlada,
   confirmación protegida, lectura posterior y rollback.
   Sustituye la doble lectura del guard anterior por una sola ejecución.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (Orbit.__aseguradorasOp2ImportUiGuardV1221) return;
  Orbit.__aseguradorasOp2ImportUiGuardV1221 = true;

  var VERSION = '20260720.1';
  var TENANT = 'alianzas-soluciones';
  var PHRASE = 'CONFIRMO DIRECTORIO';
  var state = { result: null, rollback: [], done: null, busy: false };

  function clean(value, max) { return String(value == null ? '' : value).trim().slice(0, max || 500); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (e) { return {}; } }
  function esc(value) { return Orbit.ui && Orbit.ui.esc ? Orbit.ui.esc(clean(value, 1000)) : clean(value, 1000); }
  function toast(value) { try { if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast(value); } catch (e) {} }
  function tenantId() {
    try { if (Orbit.access && Orbit.access.tenantId) return clean(Orbit.access.tenantId(), 120); } catch (e) {}
    return clean(window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant), 120);
  }
  function actorId() {
    try { if (window.firebase && firebase.auth && firebase.auth().currentUser) return clean(firebase.auth().currentUser.uid, 180); } catch (e) {}
    try { var actor = Orbit.access && Orbit.access.actorUser && Orbit.access.actorUser(); return clean(actor && (actor.id || actor.uid || actor.email), 180); } catch (e) {}
    return '';
  }
  function ready() {
    var D = Orbit.insurerDirectoryImport;
    return !!(D && D.parseFile && D.applySecureOnly && Orbit.importaWriteP0 && Orbit.importaWriteP0.writeBatch && Orbit.importaWriteP0.rollback && Orbit.store && Orbit.store.get);
  }
  function authorized() {
    var D = Orbit.insurerDirectoryImport;
    try { return tenantId() === TENANT && D.canManage() && (!D.backendWriteAllowed || D.backendWriteAllowed()); } catch (e) { return false; }
  }
  function validOps(result) {
    return [].concat(result && result.report && result.report._operations || []).filter(function (op) {
      return op && op.collection === 'aseguradoras' && op.data && op.data.requiereValidacion !== true && op.data.validationStatus === 'validado';
    });
  }
  function blockedCount(result) {
    var all = [].concat(result && result.report && result.report._operations || []);
    return Math.max(0, all.length - validOps(result).length);
  }
  function eligibleProtectedCount(result) {
    var valid = validOps(result);
    return [].concat(result && result.candidates || []).reduce(function (sum, candidate) {
      var op = valid.find(function (item) { return clean(item && item.sourceSheet, 240) === clean(candidate && candidate.sourceSheet, 240); });
      var count = Number(candidate && candidate.record && candidate.record.sensitiveImportStatus && candidate.record.sensitiveImportStatus.credentialsDetected || 0);
      return sum + (op ? count : 0);
    }, 0);
  }
  function allowCollection() {
    var W = Orbit.importaWriteP0;
    if (!W || !Array.isArray(W.ALLOWED_COLLECTIONS)) return false;
    if (!W.ALLOWED_COLLECTIONS.includes('aseguradoras')) W.ALLOWED_COLLECTIONS.push('aseguradoras');
    return W.isAllowedCollection('aseguradoras');
  }
  function batchOf(result) {
    var report = result.report || {};
    return {
      batchId: 'dir_asg_' + Date.now().toString(36), tenantId: tenantId(), sourceType: 'directorio_aseguradoras',
      sourceFileName: clean(report.sourceFileName, 260), sourceHash: clean(report.sourceHash, 128),
      status: 'dry_run_aprobado', hasBlockingErrors: false,
      operations: validOps(result).map(function (op) {
        return { action: op.action, collection: 'aseguradoras', id: clean(op.id, 180), data: clone(op.data), sourceSheet: clean(op.sourceSheet, 240) };
      })
    };
  }
  function refresh() {
    try {
      if (window.OrbitLabImportReadiness && OrbitLabImportReadiness.loadCriticalCollections) return Promise.resolve(OrbitLabImportReadiness.loadCriticalCollections(true)).catch(function () {});
    } catch (e) {}
    return Promise.resolve();
  }
  async function waitWritten(write, batch) {
    var ids = [].concat(write && write.rollback || []).map(function (item) { return clean(item && item.targetId, 180); }).filter(Boolean);
    var until = Date.now() + 120000;
    while (Date.now() < until) {
      var rows = ids.map(function (id) { return Orbit.store.get('aseguradoras', id); });
      if (rows.some(function (row) { return row && row._syncStatus === 'failed'; })) return false;
      if (rows.length === ids.length && rows.every(function (row) { return row && clean(row.importBatchId, 180) === batch.batchId && clean(row.sourceHash, 128) === batch.sourceHash; })) {
        await refresh(); rows = ids.map(function (id) { return Orbit.store.get('aseguradoras', id); });
        if (rows.every(function (row) { return row && clean(row.importBatchId, 180) === batch.batchId; })) return true;
      }
      await new Promise(function (resolve) { setTimeout(resolve, 700); });
    }
    return false;
  }
  function rollback(reason) {
    if (!state.rollback.length) return { ok: false };
    return Orbit.importaWriteP0.rollback(state.rollback, { approved: true, phrase: 'CONFIRMO ROLLBACK', userId: actorId(), reason: clean(reason, 500) });
  }
  async function execute(result, reason) {
    if (state.busy) return { ok: false, errors: ['ejecucion_en_curso'] };
    state.busy = true; state.rollback = []; state.done = null;
    try {
      if (!ready() || !authorized() || !allowCollection()) return { ok: false, errors: ['contrato_no_disponible'] };
      var uid = actorId(), batch = batchOf(result);
      if (!uid || !batch.operations.length) return { ok: false, errors: ['sin_operaciones_validadas'] };
      var write = Orbit.importaWriteP0.writeBatch(batch, { approved: true, phrase: 'CONFIRMO ESCRITURA CONTROLADA', userId: uid, reason: clean(reason, 500) });
      state.rollback = [].concat(write && write.rollback || []);
      if (!write || write.ok !== true || Number(write.written || 0) !== batch.operations.length || !(await waitWritten(write, batch))) {
        rollback('Reversión automática por escritura o lectura incompleta.');
        return { ok: false, errors: [].concat(write && write.errors || ['lectura_posterior_incompleta']), rollbackApplied: true };
      }
      var protectedTotal = Number(result && result.report && result.report.sensitiveSummary && result.report.sensitiveSummary.credentials || 0);
      var protectedEligible = eligibleProtectedCount(result);
      var protectedResult = { ok: true, imported: 0, skipped: 0, mappings: [] };
      if (protectedEligible > 0) {
        protectedResult = await Orbit.insurerDirectoryImport.applySecureOnly(result, { approved: true, phrase: PHRASE, reason: clean(reason, 500) });
        if (!protectedResult || protectedResult.ok !== true || Number(protectedResult.imported || 0) !== protectedEligible || [].concat(protectedResult.mappings || []).length !== protectedEligible) {
          rollback('Reversión automática por confirmación protegida incompleta.');
          return { ok: false, errors: [].concat(protectedResult && protectedResult.errors || ['confirmacion_protegida_incompleta']), rollbackApplied: true };
        }
        await refresh();
      }
      state.done = {
        ok: true, batchId: batch.batchId, written: batch.operations.length,
        created: batch.operations.filter(function (op) { return op.action === 'insert'; }).length,
        updated: batch.operations.filter(function (op) { return op.action === 'update'; }).length,
        blocked: blockedCount(result), protectedImported: Number(protectedResult.imported || 0),
        protectedSkipped: Math.max(0, protectedTotal - protectedEligible),
        accountResourcesPending: Number(result && result.report && result.report.sensitiveSummary && result.report.sensitiveSummary.accounts || 0),
        rollbackAvailable: state.rollback.length > 0, containsProtectedValues: false
      };
      return clone(state.done);
    } catch (e) {
      if (state.rollback.length) rollback('Reversión automática por fallo del importador.');
      return { ok: false, errors: [clean(e && (e.code || e.message) || 'fallo_importador', 160)], rollbackApplied: state.rollback.length > 0 };
    } finally { state.busy = false; }
  }
  function rowsHtml(result) {
    var operations = [].concat(result && result.report && result.report._operations || []);
    return [].concat(result && result.report && result.report.sheetSummary || []).map(function (row) {
      var op = operations.find(function (item) { return clean(item && item.sourceSheet, 240) === clean(row.sheet, 240); });
      var blocked = !op || !op.data || op.data.requiereValidacion === true || op.data.validationStatus !== 'validado';
      return '<tr><td>' + esc(row.sheet) + '</td><td>' + esc(row.country) + '</td><td>' + (blocked ? 'Requiere validación' : op.action === 'update' ? 'Actualizar' : 'Crear') + '</td><td class="num">' + Number(row.contacts || 0) + '</td><td class="num">' + Number(row.platforms || 0) + '</td><td class="num">' + Number(row.accounts || 0) + '</td><td>' + (blocked ? '<span class="badge warn">Revisar</span>' : '<span class="badge ok">Lista</span>') + '</td></tr>';
    }).join('');
  }
  function close() { var root = document.getElementById('ins-dir-execution-20260720'); if (root) root.remove(); state.result = null; }
  function paint() {
    var root = document.getElementById('ins-dir-execution-20260720'); if (!root) return;
    var result = state.result, done = state.done, totals = result && result.report && result.report.totals || {}, protectedSummary = result && result.report && result.report.sensitiveSummary || {};
    var body = !result ? '<div class="cfg-note">Guatemala y Colombia se cargan como fuentes separadas. Selecciona el país correspondiente al archivo.</div><div class="cgrid" style="margin-top:12px"><label class="ce-l">País *<select id="dir-country-20260720" class="o-sel"><option value="">— Seleccionar —</option><option value="GT">Guatemala · GTQ</option><option value="CO">Colombia · COP</option></select></label><label class="ce-l">Archivo Excel *<input id="dir-file-20260720" type="file" accept=".xlsx,.xls" class="o-sel"></label></div><div id="dir-status-20260720" class="muted" style="margin-top:12px">No se ha aplicado ningún cambio.</div>' : done ? '<div class="cfg-note"><b>Carga verificada.</b> El directorio fue escrito y leído nuevamente; los accesos confirmados quedaron disponibles mediante referencia protegida.</div><div class="asg197-info-grid" style="margin-top:12px"><div><small>Creadas</small><b>' + done.created + '</b></div><div><small>Actualizadas</small><b>' + done.updated + '</b></div><div><small>Retenidas</small><b>' + done.blocked + '</b></div><div><small>Accesos confirmados</small><b>' + done.protectedImported + '</b></div><div><small>Cuentas pendientes</small><b>' + done.accountResourcesPending + '</b></div></div>' : '<div class="cfg-note"><b>Dry-run y diff:</b> revisa qué hojas se actualizarán, crearán o quedarán retenidas. Ningún cambio se aplica hasta confirmar.</div><div class="asg197-info-grid" style="margin-top:12px"><div><small>Operaciones</small><b>' + Number(totals.operations || 0) + '</b></div><div><small>Crear</small><b>' + Number(totals.insert || 0) + '</b></div><div><small>Actualizar</small><b>' + Number(totals.update || 0) + '</b></div><div><small>Retenidas</small><b>' + Number(totals.blocked || 0) + '</b></div><div><small>Accesos detectados</small><b>' + Number(protectedSummary.credentials || 0) + '</b></div><div><small>Cuentas protegidas</small><b>' + Number(protectedSummary.accounts || 0) + '</b></div></div><div style="overflow:auto;margin-top:12px"><table class="tbl"><thead><tr><th>Hoja</th><th>País</th><th>Acción</th><th class="num">Contactos</th><th class="num">Portales</th><th class="num">Bancos</th><th>Estado</th></tr></thead><tbody>' + rowsHtml(result) + '</tbody></table></div>';
    root.innerHTML = '<div class="card" style="width:min(1080px,97vw);max-height:94vh;display:flex;flex-direction:column;padding:0"><div style="padding:17px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between"><div><small style="color:rgba(255,255,255,.65)">Importación directa · fuente separada</small><b style="display:block;color:#fff;font-family:var(--f-display);font-size:18px">Directorio de aseguradoras</b></div><button class="imp-x" data-close>✕</button></div><div style="padding:18px 20px;overflow:auto;flex:1">' + body + '</div><div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">' + (result && !done ? '<button class="btn ghost" data-reset>Elegir otro archivo</button><button class="btn primary" data-apply>Confirmar registros validados</button>' : '') + (done ? '<button class="btn ghost" data-view>Revisar aseguradoras</button><button class="btn secondary" data-rollback>Rollback del directorio</button>' : '') + '<button class="btn ghost" data-close>Cerrar</button></div></div>';
    root.querySelectorAll('[data-close]').forEach(function (button) { button.onclick = close; });
    var file = root.querySelector('#dir-file-20260720');
    if (file) file.onchange = async function () {
      var country = clean((root.querySelector('#dir-country-20260720') || {}).value, 8).toUpperCase(), status = root.querySelector('#dir-status-20260720');
      if (!country) { file.value = ''; return toast('Selecciona el país del directorio.'); }
      if (!file.files || !file.files[0]) return;
      status.textContent = 'Leyendo, clasificando y comparando hojas…';
      try { state.result = await Orbit.insurerDirectoryImport.parseFile(file.files[0], { country: country }); state.done = null; paint(); }
      catch (e) { status.textContent = 'No fue posible completar la revisión del archivo. Verifica su formato y repite el proceso.'; }
    };
    var reset = root.querySelector('[data-reset]'); if (reset) reset.onclick = function () { state.result = null; state.done = null; state.rollback = []; paint(); };
    var view = root.querySelector('[data-view]'); if (view) view.onclick = function () { close(); location.hash = '#/aseguradoras'; };
    var undo = root.querySelector('[data-rollback]');
    if (undo) undo.onclick = async function () {
      var reason = clean(await Orbit.ui.prompt('Motivo del rollback:', { title: 'Revertir directorio' }), 500); if (!reason) return;
      var phrase = clean(await Orbit.ui.prompt('Escribe exactamente: CONFIRMO ROLLBACK', { title: 'Confirmación reforzada' }), 80); if (phrase !== 'CONFIRMO ROLLBACK') return toast('La frase no coincide.');
      var out = rollback(reason); toast(out.ok ? 'Rollback solicitado.' : 'No fue posible completar el rollback.'); if (out.ok) { state.done = null; state.rollback = []; paint(); }
    };
    var apply = root.querySelector('[data-apply]');
    if (apply) apply.onclick = async function () {
      var reason = clean(await Orbit.ui.prompt('Motivo de la importación:', { title: 'Confirmar directorio' }), 500); if (!reason) return;
      var phrase = clean(await Orbit.ui.prompt('Escribe exactamente: ' + PHRASE, { title: 'Confirmación reforzada' }), 80); if (phrase !== PHRASE) return toast('La frase no coincide.');
      apply.disabled = true; apply.textContent = 'Aplicando y verificando…';
      var out = await execute(state.result, reason);
      if (!out.ok) { apply.disabled = false; apply.textContent = 'Confirmar registros validados'; return toast('La carga no se cerró: ' + [].concat(out.errors || ['revisión requerida']).join(', ')); }
      paint(); toast(out.written + ' aseguradora(s) confirmadas · ' + out.protectedImported + ' acceso(s) disponibles.');
    };
  }
  function open() {
    if (!ready()) return toast('El importador se está preparando. Reabre esta opción en unos segundos.');
    if (!authorized()) return toast('Tu rol o la conexión no permiten confirmar esta importación.');
    close(); var root = document.createElement('div'); root.id = 'ins-dir-execution-20260720'; root.className = 'drawer-back open'; root.style.cssText = 'display:grid;place-items:center;z-index:260'; document.body.appendChild(root); state.result = null; state.rollback = []; state.done = null; paint();
  }
  function install() {
    var D = Orbit.insurerDirectoryImport;
    if (!ready() || !D || !D.__op2SourceGuardV1220 || !D.__backendWriteGuardV1220) return false;
    if (D.open && D.open.__canonicalDirectoryExecution20260720) return true;
    open.__canonicalDirectoryExecution20260720 = true; D.open = open; D.executeCanonical = execute; D.rollbackCanonicalDirectory = rollback; D.canonicalExecutionVersion = VERSION; D.__op2ImportUiGuardV1217 = { version: VERSION, canonicalOwner: true, singleFileRead: true, controlledWrite: true }; return true;
  }
  Orbit.__insurerDirectoryExecution20260720 = { version: VERSION, install: install, execute: execute, rollback: rollback, directExcelUpload: true, controlledWrite: true, readAfterWrite: true, protectedConfirmation: true, directoryRollback: true, accountProviderPending: true };
  var attempts = 0, timer = setInterval(function () { attempts += 1; if (install() || attempts > 120) clearInterval(timer); }, 250); setTimeout(install, 0);
})();
