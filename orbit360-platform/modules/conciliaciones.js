/* ============================================================
   Orbit 360 · Bandeja de Conciliaciones
   Lee y actualiza SOLO propuestas en Orbit.store('conciliaciones').
   No toca cobros, comisiones, cartera, producción ni finmovs.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};

(function setupConciliacionesRoute() {
  function addAfter(arr, value, after) {
    if (!Array.isArray(arr) || arr.indexOf(value) >= 0) return;
    var i = arr.indexOf(after);
    if (i >= 0) arr.splice(i + 1, 0, value); else arr.push(value);
  }
  function addRoute() {
    Orbit.MODULE_TITLES = Orbit.MODULE_TITLES || {};
    Orbit.MODULE_TITLES.conciliaciones = Orbit.MODULE_TITLES.conciliaciones || {
      icon: '🔗', title: 'Orbit Conciliaciones', sub: 'Bandeja de propuestas',
      features: ['Score', 'Validación', 'No aplica pagos']
    };
    if (Orbit.ROLES) {
      ['Dirección', 'Admin', 'Finanzas'].forEach(function (r) {
        if (Orbit.ROLES[r]) addAfter(Orbit.ROLES[r].modulos, 'conciliaciones', 'cobros');
      });
    }
    if (Orbit.tenant) {
      try { addAfter(Orbit.tenant.DEFAULT && Orbit.tenant.DEFAULT.modulosActivos, 'conciliaciones', 'cobros'); } catch (e) {}
      try { addAfter(Orbit.tenant.get && Orbit.tenant.get().modulosActivos, 'conciliaciones', 'cobros'); } catch (e) {}
    }
    if (Array.isArray(Orbit.NAV)) {
      var exists = false;
      Orbit.NAV.forEach(function (g) { (g.items || []).forEach(function (it) { if (it.route === 'conciliaciones') exists = true; }); });
      if (!exists) {
        var crm = Orbit.NAV.find(function (g) { return g.label === 'Orbit CRM'; }) || Orbit.NAV.find(function (g) { return (g.items || []).some(function (it) { return it.route === 'cobros'; }); });
        if (crm && Array.isArray(crm.items)) {
          var pos = crm.items.findIndex(function (it) { return it.route === 'cobros'; });
          crm.items.splice(pos >= 0 ? pos + 1 : crm.items.length, 0, { route: 'conciliaciones', icon: '🔗', label: 'Conciliaciones', estado: 'core' });
        }
      }
    }
  }
  addRoute();

  function sanitizeCopy() {
    try {
      var root = document.body;
      if (!root) return;
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var n;
      while ((n = walker.nextNode())) {
        var t = n.nodeValue;
        var r = t
          .replace(/En el paso siguiente podés aplicar pagos por póliza\./g, 'En el paso siguiente podrás revisar propuestas de conciliación por póliza. No aplica pagos por sí sola.')
          .replace(/En el paso siguiente puedes aplicar pagos por póliza\./g, 'En el paso siguiente podrás revisar propuestas de conciliación por póliza. No aplica pagos por sí sola.')
          .replace(/Se aplicarán sin duplicar\./g, 'Se propondrán para validación sin duplicar.')
          .replace(/Sin pagos pendientes de aplicar\./g, 'Sin pagos pendientes de validación.')
          .replace(/Pendiente de aplicar/g, 'Propuesta pendiente');
        if (r !== t) n.nodeValue = r;
      }
    } catch (e) {}
  }
  document.addEventListener('click', function () { setTimeout(sanitizeCopy, 80); }, true);
  document.addEventListener('orbit:store', function () { setTimeout(sanitizeCopy, 80); });
  document.addEventListener('DOMContentLoaded', sanitizeCopy);
})();

Orbit.modules.conciliaciones = (function () {
  var ESTADOS = ['PROPUESTA', 'EN_REVISION', 'VALIDADA', 'RECHAZADA', 'BLOQUEADA', 'ANULADA', 'APLICADA'];
  var LABELS = {
    PROPUESTA: 'Propuesta pendiente', EN_REVISION: 'En revisión', VALIDADA: 'Validada para aplicación controlada',
    RECHAZADA: 'Rechazada', BLOQUEADA: 'Bloqueada', ANULADA: 'Anulada', APLICADA: 'Aplicada con auditoría'
  };
  var ACTIONS = {
    PROPUESTA: ['tomar_en_revision', 'bloquear', 'anular'],
    EN_REVISION: ['validar', 'rechazar', 'bloquear', 'anular'],
    VALIDADA: ['preparar_aplicacion_controlada', 'rechazar', 'anular'],
    RECHAZADA: [], BLOQUEADA: [], ANULADA: [], APLICADA: []
  };
  var NEXT = { tomar_en_revision: 'EN_REVISION', validar: 'VALIDADA', rechazar: 'RECHAZADA', bloquear: 'BLOQUEADA', anular: 'ANULADA' };
  var AL = { tomar_en_revision: 'Tomar en revisión', validar: 'Validar', rechazar: 'Rechazar', bloquear: 'Bloquear', anular: 'Anular', preparar_aplicacion_controlada: 'Preparar aplicación' };
  var filtro = '';

  function esc(v) { return (Orbit.ui && Orbit.ui.esc) ? Orbit.ui.esc(v == null ? '' : v) : String(v == null ? '' : v).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function all() { try { return (Orbit.store && Orbit.store.all && Orbit.store.all('conciliaciones')) || []; } catch (e) { return []; } }
  function src(p) { var s = p.source_ref || p.sourceRef || {}; return [p.source_type || p.fuente || 'Fuente', s.file || s.archivo || '', s.sheet || s.hoja || '', s.row_ref || s.fila || ''].filter(Boolean).join(' · '); }
  function link(p) { var l = p.links || {}; return [l.cliente_id && ('cliente ' + l.cliente_id), l.poliza_id && ('póliza ' + l.poliza_id), l.cobro_id && ('cobro ' + l.cobro_id), l.comision_id && ('comisión ' + l.comision_id)].filter(Boolean).join(' · ') || 'Sin vínculo operativo'; }
  function monto(p) { var a = p.amount || {}; var v = a.value || p.amount_value || p.monto; var m = a.currency || p.currency || p.moneda || ''; return v ? (m + ' ' + v).trim() : '—'; }
  function state(p) { return p.queue_state || p.estado_bandeja || p.estado || 'PROPUESTA'; }
  function score(p) { return p.score_decision || p.decision || p.resultado_score || 'REQUIERE_VALIDACION'; }

  function patch(id, data) {
    try {
      if (!Orbit.store || !Orbit.store.update) throw new Error('Store no disponible');
      Orbit.store.update('conciliaciones', id, Object.assign({}, data, { updatedAt: new Date().toISOString() }));
      if (Orbit.notify && Orbit.notify.ok) Orbit.notify.ok('Propuesta actualizada. No se aplicó ningún pago.');
      render();
    } catch (e) {
      if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast('No se pudo actualizar la propuesta: ' + e.message, 'danger');
    }
  }

  function action(id, act) {
    if (act === 'preparar_aplicacion_controlada') {
      if (Orbit.ui && Orbit.ui.alert) return Orbit.ui.alert('Esta acción requiere validación backend y ejecutor autorizado. No aplica pagos ni modifica cobros.', { title: 'Aplicación controlada' });
      alert('Requiere validación backend. No aplica pagos.');
      return;
    }
    var next = NEXT[act];
    if (!next) return;
    patch(id, { queue_state: next, review_state: next === 'VALIDADA' ? 'VALIDADA' : (next === 'RECHAZADA' || next === 'BLOQUEADA' ? next : 'PENDIENTE') });
  }

  function detail(id) {
    var p = null;
    try { p = Orbit.store.get('conciliaciones', id); } catch (e) {}
    if (!p) p = all().find(function (x) { return (x.id || x.proposal_id) === id; });
    if (!p) return;
    var html = '<div class="grid2">'
      + '<div class="card"><h3>Propuesta</h3><p><b>Estado:</b> ' + esc(LABELS[state(p)] || state(p)) + '</p><p><b>Score:</b> ' + esc(score(p)) + '</p><p><b>Fuente:</b> ' + esc(src(p)) + '</p></div>'
      + '<div class="card"><h3>Vínculos</h3><p>' + esc(link(p)) + '</p><p><b>Monto:</b> ' + esc(monto(p)) + '</p><p><b>País/moneda:</b> ' + esc((p.country || p.pais || '—') + '/' + (p.currency || p.moneda || '—')) + '</p></div>'
      + '</div><div class="note warn" style="margin-top:12px">Validada no significa pagada. Esta bandeja no modifica cobros ni comisiones; solo cambia el estado de la propuesta.</div>';
    if (Orbit.ui && Orbit.ui.drawer) Orbit.ui.drawer(html, { title: 'Detalle de conciliación', wide: true });
    else alert(html.replace(/<[^>]+>/g, ' '));
  }

  function row(p) {
    var id = p.id || p.proposal_id || p.proposalId;
    var st = state(p);
    var acts = (ACTIONS[st] || []).map(function (a) { return '<button class="btn tiny" data-act="' + a + '" data-id="' + esc(id) + '">' + esc(AL[a]) + '</button>'; }).join(' ');
    return '<tr><td><span class="badge info">' + esc(LABELS[st] || st) + '</span></td><td>' + esc(score(p)) + '</td><td>' + esc(src(p)) + '</td><td>' + esc((p.country || p.pais || '—') + '/' + (p.currency || p.moneda || '—')) + '</td><td>' + esc(link(p)) + '</td><td class="num">' + esc(monto(p)) + '</td><td><button class="btn tiny ghost" data-detail="' + esc(id) + '">Ver</button> ' + acts + '</td></tr>';
  }

  function render() {
    var host = document.getElementById('host');
    if (!host) return;
    var items = all().filter(function (p) { return !filtro || state(p) === filtro; });
    host.innerHTML = '<section class="page"><div class="page-h"><div><div class="eyebrow">Cobros · validación</div><h1>Conciliaciones</h1><p class="muted">Bandeja de propuestas. No aplica pagos ni modifica cobros.</p></div><select id="conc-estado"><option value="">Todos los estados</option>' + ESTADOS.map(function (e) { return '<option value="' + e + '"' + (filtro === e ? ' selected' : '') + '>' + (LABELS[e] || e) + '</option>'; }).join('') + '</select></div>'
      + (!items.length ? '<div class="empty"><b>No hay propuestas de conciliación.</b><p class="muted">Cuando el importador genere propuestas validadas, aparecerán aquí para revisión. Estado honesto: la persistencia real/auditLog sigue en backend.</p></div>'
      : '<div class="card"><table class="tbl"><thead><tr><th>Estado</th><th>Score</th><th>Fuente</th><th>País/moneda</th><th>Vínculo</th><th>Monto</th><th>Acciones</th></tr></thead><tbody>' + items.map(row).join('') + '</tbody></table></div>')
      + '</section>';
    var sel = document.getElementById('conc-estado');
    if (sel) sel.addEventListener('change', function () { filtro = sel.value; render(); });
    host.querySelectorAll('[data-detail]').forEach(function (b) { b.addEventListener('click', function () { detail(b.dataset.detail); }); });
    host.querySelectorAll('[data-act]').forEach(function (b) { b.addEventListener('click', function () { action(b.dataset.id, b.dataset.act); }); });
  }

  return { render: render };
})();
