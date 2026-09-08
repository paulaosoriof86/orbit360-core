from pathlib import Path


def once(path, old, new):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'PATCH_PRECONDITION_FAIL:{path}:count={n}:{old[:100]!r}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


store = 'orbit360-platform/data/store-firestore-product-readonly-p0.js'
old_accept = """    function acceptRows(collection, rows, snapshotMeta) { var accepted = [], quarantined = [], fromCache = !!(snapshotMeta && snapshotMeta.fromCache === true); (rows || []).forEach(function (row) { var normalized = Object.assign({}, row); if (!normalized.tenantId) normalized.tenantId = state.tenantId; if (normalized.tenantId !== state.tenantId || !rowId(normalized)) quarantined.push(normalized); else accepted.push(normalized); }); cache[collection] = accepted; state.quarantinedRows[collection] = quarantined.map(function (row) { return { id: rowId(row) || '', reason: row.tenantId !== state.tenantId ? 'tenant_mismatch' : 'id_missing' }; }); if (state.observedCollections.indexOf(collection) < 0) state.observedCollections.push(collection); if (state.attachedCollections.indexOf(collection) < 0) state.attachedCollections.push(collection); state.snapshotSources[collection] = fromCache ? 'cache' : 'server'; if (fromCache) { if (state.serverConfirmedCollections.indexOf(collection) < 0 && state.cacheOnlyCollections.indexOf(collection) < 0) state.cacheOnlyCollections.push(collection); } else { if (state.serverConfirmedCollections.indexOf(collection) < 0) state.serverConfirmedCollections.push(collection); state.cacheOnlyCollections = state.cacheOnlyCollections.filter(function (name) { return name !== collection; }); } state.ready = state.serverConfirmedCollections.length > 0; state.status = state.ready ? 'authoritative-snapshots-progress' : 'waiting-authoritative-snapshots'; state.lastSnapshotAt = new Date().toISOString(); emit(collection); maybeAttachDeferred(); }"""
new_accept = """    function sameRows(a, b) { if (a === b) return true; if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false; for (var i = 0; i < a.length; i += 1) { if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false; } return true; }
    function acceptRows(collection, rows, snapshotMeta) { var accepted = [], quarantined = [], fromCache = !!(snapshotMeta && snapshotMeta.fromCache === true), alreadyServerConfirmed = state.serverConfirmedCollections.indexOf(collection) >= 0; if (fromCache && authoritativeFirstReadRequired && alreadyServerConfirmed) { state.snapshotSources[collection] = 'server'; return; } (rows || []).forEach(function (row) { var normalized = Object.assign({}, row); if (!normalized.tenantId) normalized.tenantId = state.tenantId; if (normalized.tenantId !== state.tenantId || !rowId(normalized)) quarantined.push(normalized); else accepted.push(normalized); }); var dataChanged = !sameRows(cache[collection] || [], accepted); cache[collection] = accepted; state.quarantinedRows[collection] = quarantined.map(function (row) { return { id: rowId(row) || '', reason: row.tenantId !== state.tenantId ? 'tenant_mismatch' : 'id_missing' }; }); if (state.observedCollections.indexOf(collection) < 0) state.observedCollections.push(collection); if (state.attachedCollections.indexOf(collection) < 0) state.attachedCollections.push(collection); state.snapshotSources[collection] = fromCache ? 'cache' : 'server'; if (fromCache) { if (state.serverConfirmedCollections.indexOf(collection) < 0 && state.cacheOnlyCollections.indexOf(collection) < 0) state.cacheOnlyCollections.push(collection); } else { if (state.serverConfirmedCollections.indexOf(collection) < 0) state.serverConfirmedCollections.push(collection); state.cacheOnlyCollections = state.cacheOnlyCollections.filter(function (name) { return name !== collection; }); } state.ready = state.serverConfirmedCollections.length > 0; state.status = state.ready ? 'authoritative-snapshots-progress' : 'waiting-authoritative-snapshots'; state.lastSnapshotAt = new Date().toISOString(); if (!alreadyServerConfirmed || dataChanged) emit(collection); maybeAttachDeferred(); }"""
once(store, old_accept, new_accept)

router = 'orbit360-platform/core/router.js'
old_init = """  function init() { host = document.getElementById('host'); sidebar = document.getElementById('sidebar'); start(); const defer = window.requestIdleCallback || function (fn) { return setTimeout(fn, 0); }; defer(function () { loadRuntimeContracts(function () { try { if (Orbit.session && Orbit.session.syncFromAuth) Orbit.session.syncFromAuth(); } catch (e) {} try { buildSidebar(); setActive((Orbit.route && Orbit.route.key) || 'inicio'); onHash(); } catch (e) {} runtimeSignal('router-optional-contracts-ready', '1'); }); }); const pwaReady = window.OrbitPwaWorkerReady;"""
new_init = """  function init() { host = document.getElementById('host'); sidebar = document.getElementById('sidebar'); start(); const defer = window.requestIdleCallback || function (fn) { return setTimeout(fn, 0); }; defer(function () { loadRuntimeContracts(function () { let roleBefore = '', roleAfter = ''; try { roleBefore = String(Orbit.session && Orbit.session.rol ? Orbit.session.rol() : ''); if (Orbit.session && Orbit.session.syncFromAuth) Orbit.session.syncFromAuth(); roleAfter = String(Orbit.session && Orbit.session.rol ? Orbit.session.rol() : ''); } catch (e) {} try { buildSidebar(); setActive((Orbit.route && Orbit.route.key) || 'inicio'); if (current == null || roleBefore !== roleAfter) onHash(); } catch (e) {} runtimeSignal('router-optional-contracts-ready', '1'); }); }); const pwaReady = window.OrbitPwaWorkerReady;"""
once(router, old_init, new_init)

s = Path(store).read_text(encoding='utf-8')
r = Path(router).read_text(encoding='utf-8')
checks = {
    'cache_downgrade_blocked': 'fromCache && authoritativeFirstReadRequired && alreadyServerConfirmed' in s,
    'equivalent_server_emit_suppressed': 'if (!alreadyServerConfirmed || dataChanged) emit(collection)' in s,
    'first_server_confirmation_still_emits': '!alreadyServerConfirmed || dataChanged' in s,
    'router_optional_contract_no_unconditional_onhash': 'if (current == null || roleBefore !== roleAfter) onHash();' in r,
    'write_contract_unchanged': 'writeEnabled: false' in s and 'insert: fail' in s and 'update: fail' in s and 'remove: fail' in s,
}
bad = [k for k, v in checks.items() if not v]
if bad:
    raise SystemExit('HYDRATION_FIX_STATIC_CONTRACT_FAIL:' + ','.join(bad))
print('HYDRATION_FIX_STATIC_CONTRACT=' + ','.join(k + '=PASS' for k in checks))
