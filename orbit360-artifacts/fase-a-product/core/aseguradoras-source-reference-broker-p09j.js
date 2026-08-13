/* ============================================================
   Orbit 360 · P0.9j · Broker seguro de referencias documentales
   Fecha: 2026-07-10

   Mantiene referencias backend en memoria efímera y entrega a la UI solo
   disponibilidad. No usa red directa, no persiste referencias y no habilita
   Cotizador o Comparativo.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var VERSION = 'p09j-v1';
  var TTL_MS = 5 * 60 * 1000;
  var MAX_TICKETS = 20;
  var tickets = Object.create(null);
  var lastPublicState = null;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (error) { return value; }
  }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function stableId(prefix, parts) {
    var text = (parts || []).map(clean).join('|'), hash = 0;
    for (var i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return prefix + '_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
  }
  function actorIdentity(actor) {
    actor = actor || {};
    return {
      id: clean(actor.id || actor.uid || actor.userId || actor.email),
      tenantId: clean(actor.tenantId || actor.tenant),
      activeRole: clean(actor.activeRole || actor.rolActivo || actor.role || actor.rol)
    };
  }
  function bridge() { return window.OrbitBackendDocumentBridge || Orbit.backendDocumentBridge || null; }
  function adminApi() { return Orbit.aseguradorasBatchAdminActionsP09i; }
  function bridgeMethod(value) {
    if (!value) return null;
    var names = ['resolveBatchReferences', 'prepareBatchReferences', 'resolveSourceReferences', 'referencesForBatch'];
    var name = names.find(function (candidate) { return typeof value[candidate] === 'function'; });
    return name ? function (request) { return value[name](request); } : null;
  }
  function emit(detail) {
    lastPublicState = clone(detail || {});
    try { window.dispatchEvent(new CustomEvent('orbit:aseguradoras:source-reference-state', { detail: clone(lastPublicState) })); } catch (error) {}
  }
  function purgeExpired() {
    var now = Date.now();
    Object.keys(tickets).forEach(function (id) {
      if (!tickets[id] || tickets[id].expiresAt <= now) delete tickets[id];
    });
    var ids = Object.keys(tickets).sort(function (a, b) { return tickets[a].createdAt - tickets[b].createdAt; });
    while (ids.length > MAX_TICKETS) delete tickets[ids.shift()];
  }
  function normalizeReferences(result, documentIds) {
    result = result || {};
    var allowed = Object.create(null), refs = Object.create(null);
    documentIds.forEach(function (id) { allowed[clean(id)] = true; });
    var source = result.sourceRefs || result.references || result.refs || {};
    if (Array.isArray(source)) {
      source.forEach(function (item) {
        var id = clean(item && (item.documentId || item.id));
        var ref = clean(item && (item.fileRef || item.sourceRef || item.reference || item.ref));
        if (allowed[id] && ref) refs[id] = ref;
      });
    } else if (source && typeof source === 'object') {
      Object.keys(source).forEach(function (id) {
        var ref = clean(source[id] && typeof source[id] === 'object'
          ? (source[id].fileRef || source[id].sourceRef || source[id].reference || source[id].ref)
          : source[id]);
        if (allowed[clean(id)] && ref) refs[clean(id)] = ref;
      });
    }
    [].concat(result.items || []).forEach(function (item) {
      var id = clean(item && (item.documentId || item.id));
      var ref = clean(item && (item.fileRef || item.sourceRef || item.reference || item.ref));
      if (allowed[id] && ref) refs[id] = ref;
    });
    return refs;
  }
  function availability(documentIds, refs) {
    var items = documentIds.map(function (id) {
      return { documentId: id, provided: !!refs[id], referenceValueExposed: false };
    });
    return {
      total: items.length,
      provided: items.filter(function (item) { return item.provided; }).length,
      missing: items.filter(function (item) { return !item.provided; }).map(function (item) { return item.documentId; }),
      items: items,
      containsReferences: false,
      containsPaths: false
    };
  }
  async function resolve(input) {
    input = input || {};
    purgeExpired();
    var documentIds = unique([].concat(input.documentIds || []).map(clean));
    var actor = actorIdentity(input.actor);
    var method = bridgeMethod(input.bridge || bridge());
    var refs = Object.create(null), code = 'BACKEND_REQUIRED', connected = false;
    if (method && documentIds.length) {
      try {
        var result = await method({
          tenantId: clean(input.tenantId),
          batchId: clean(input.batchId),
          documentIds: documentIds.slice(),
          purpose: clean(input.purpose || 'training'),
          actor: actor,
          returnPaths: false,
          returnUrls: false,
          returnRawBytes: false,
          returnBase64: false
        });
        refs = normalizeReferences(result, documentIds);
        connected = result && result.connected !== false;
        code = clean(result && result.code) || (connected ? 'SOURCE_REFERENCES_RESOLVED' : 'BACKEND_REQUIRED');
      } catch (error) {
        code = clean(error && error.code) || 'SOURCE_REFERENCE_RESOLUTION_FAILED';
      }
    }
    var ticketId = stableId('source_ticket', [input.tenantId, input.batchId, actor.id, documentIds.join(',')]);
    var createdAt = Date.now();
    tickets[ticketId] = {
      id: ticketId,
      tenantId: clean(input.tenantId),
      batchId: clean(input.batchId),
      actorId: actor.id,
      documentIds: documentIds.slice(),
      refs: refs,
      createdAt: createdAt,
      expiresAt: createdAt + TTL_MS,
      consumed: false
    };
    purgeExpired();
    var publicState = {
      ok: connected,
      code: code,
      ticketId: ticketId,
      expiresAt: new Date(createdAt + TTL_MS).toISOString(),
      availability: availability(documentIds, refs),
      referencesExposed: false,
      containsPaths: false,
      writeAllowed: false,
      enablesCotizador: false,
      enablesComparativo: false
    };
    emit(publicState);
    return clone(publicState);
  }
  function ticketFor(id, actor, plan) {
    purgeExpired();
    var ticket = tickets[clean(id)], identity = actorIdentity(actor), errors = [];
    if (!ticket) errors.push('SOURCE_REFERENCE_TICKET_REQUIRED');
    else {
      if (ticket.expiresAt <= Date.now()) errors.push('SOURCE_REFERENCE_TICKET_EXPIRED');
      if (ticket.consumed) errors.push('SOURCE_REFERENCE_TICKET_CONSUMED');
      if (identity.id && ticket.actorId && identity.id !== ticket.actorId) errors.push('SOURCE_REFERENCE_ACTOR_MISMATCH');
      if (plan && clean(plan.tenantId) !== ticket.tenantId) errors.push('SOURCE_REFERENCE_TENANT_MISMATCH');
      if (plan && clean(plan.batchId) !== ticket.batchId) errors.push('SOURCE_REFERENCE_BATCH_MISMATCH');
      if (plan) {
        var expected = unique([].concat(plan.documentIds || []).map(clean)).sort().join('|');
        var actual = ticket.documentIds.slice().sort().join('|');
        if (expected !== actual) errors.push('SOURCE_REFERENCE_DOCUMENT_MISMATCH');
      }
    }
    return { ok: errors.length === 0, errors: errors, ticket: ticket || null };
  }
  async function prepare(input) {
    input = input || {};
    var admin = adminApi();
    if (!admin || typeof admin.preview !== 'function') return { ok: false, code: 'BATCH_ADMIN_ACTIONS_REQUIRED', referencesExposed: false };
    var reference = await resolve(input);
    var check = ticketFor(reference.ticketId, input.actor, {
      tenantId: input.tenantId,
      batchId: input.batchId,
      documentIds: input.documentIds
    });
    var refs = check.ok ? check.ticket.refs : {};
    var preview = admin.preview(Object.assign({}, input, { sourceRefs: refs }));
    var result = {
      ok: preview.ok === true,
      code: preview.code,
      preview: preview,
      ticket: reference,
      executable: preview.ok === true && reference.availability.missing.length === 0 && reference.ok === true,
      referencesExposed: false,
      enablesCotizador: false,
      enablesComparativo: false,
      writeAllowed: false
    };
    emit(result);
    return clone(result);
  }
  async function execute(ticketId, plan, input) {
    input = input || {};
    var admin = adminApi();
    if (!admin || typeof admin.execute !== 'function') return { ok: false, code: 'BATCH_ADMIN_ACTIONS_REQUIRED', writeAllowed: false };
    var check = ticketFor(ticketId, input.actor || plan && plan.actor, plan);
    if (!check.ok) return { ok: false, code: check.errors[0], errors: check.errors, referencesExposed: false, writeAllowed: false };
    var missing = availability(check.ticket.documentIds, check.ticket.refs).missing;
    if (missing.length) return { ok: false, code: 'SOURCE_REFERENCES_INCOMPLETE', missingDocumentIds: missing, referencesExposed: false, writeAllowed: false };
    var result = await admin.execute(plan, Object.assign({}, input, { sourceRefs: check.ticket.refs }));
    if (result && result.ok) check.ticket.consumed = true;
    var publicResult = Object.assign({}, result || {}, {
      referencesExposed: false,
      enablesCotizador: false,
      enablesComparativo: false,
      writeAllowed: false
    });
    delete publicResult.sourceRefs;
    delete publicResult.references;
    emit(publicResult);
    return clone(publicResult);
  }
  function release(ticketId) {
    if (tickets[clean(ticketId)]) delete tickets[clean(ticketId)];
    return { ok: true, code: 'SOURCE_REFERENCE_TICKET_RELEASED', referencesExposed: false };
  }
  function status() {
    purgeExpired();
    return {
      version: VERSION,
      activeTickets: Object.keys(tickets).length,
      lastPublicState: clone(lastPublicState),
      backendMethodAvailable: !!bridgeMethod(bridge()),
      referencesExposed: false,
      containsPaths: false,
      writesDirectly: false,
      enablesCotizador: false,
      enablesComparativo: false
    };
  }
  function resetForTest() { tickets = Object.create(null); lastPublicState = null; }

  Orbit.aseguradorasSourceReferenceBrokerP09j = {
    VERSION: VERSION,
    resolve: resolve,
    prepare: prepare,
    execute: execute,
    release: release,
    status: status,
    resetForTest: resetForTest
  };
})();