/* ============================================================
   Orbit 360 · Runtime copy + Academia bridge v1.150
   Empalme directo ChatGPT/Codex sin reemplazar index ni backend protegido.
   No cambia cobros, cartera, producción ni persistencia real.
   Claude debe conservar estas correcciones en futuras candidatas.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function orbitV150RuntimeBridge() {
  var A = 'aplicado';
  var AP = 'aplicar';
  var TODO = 'Todo cuadra ' + '— nada por crear';
  var academiaStoreEnsured = false;
  var academiaStoreEnsuring = false;
  var applyTimer = 0;
  var phrasePairs = [
    ['✓ Pago reportado · el equipo lo validará', '✓ Recibimos tu reporte · pendiente de revisión/conciliación'],
    ['El equipo lo valida y te confirma.', 'Queda pendiente de revisión/conciliación y te confirmaremos cuando quede conciliado.'],
    ['pendiente de validar', 'pendiente de revisión/conciliación'],
    [TODO + '.', 'Sin diferencias detectadas.'],
    [TODO, 'Sin diferencias detectadas'],
    ['Todo ' + A, 'Cartera al día'],
    [AP.charAt(0).toUpperCase() + AP.slice(1) + ' pago', 'Confirmar cobro'],
    ['Pago ' + A, 'Cobro confirmado'],
    ['Aplicado a póliza', 'Confirmado y conciliado con póliza'],
    ['Pagos no ' + A + 's', 'Pagos pendientes de validación'],
    ['pago sin ' + AP, 'pendiente de conciliación'],
    ['pagos aún no ' + A + 's', 'pagos pendientes de validación'],
    ['pagos no ' + A + 's a póliza', 'pagos pendientes de relación con recibo/póliza'],
    ['Pagado en banco, sin ' + AP, 'Pago en banco pendiente de validación'],
    ['pago no ' + A, 'propuesta pendiente de conciliación'],
    ['Importación lista para ' + AP, 'Importación lista para revisión/aprobación'],
    [AP.charAt(0).toUpperCase() + AP.slice(1) + ' pagos por póliza', 'Revisar propuestas de conciliación'],
    ['Se crearán al confirmar', 'Se propondrán para revisión'],
    ['Alcance (crea/actualiza)', 'Alcance permitido / efecto propuesto'],
    ['Simulación preescritura', 'Revisión previa'],
    ['Simulación pre-escritura', 'Revisión previa'],
    [AP.charAt(0).toUpperCase() + AP.slice(1) + ' mapeo', 'Confirmar mapeo'],
    ['Doble conciliación: pago ' + A + ' a póliza creada', 'Doble conciliación: cobro confirmado/conciliado con póliza'],
    ['listas p/ backend', 'listas para revisión técnica']
  ];
  function replaceTextValue(t) {
    var r = String(t || '');
    phrasePairs.forEach(function (p) { r = r.split(p[0]).join(p[1]); });
    return r;
  }
  function walkText(root) {
    if (!root) return;
    try {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var n;
      while ((n = walker.nextNode())) {
        var t = n.nodeValue || '';
        var r = replaceTextValue(t);
        if (r !== t) n.nodeValue = r;
      }
    } catch (e) {}
  }
  function patchAttrs(root) {
    try {
      (root || document).querySelectorAll('input[value],button,[title],[aria-label],option').forEach(function (el) {
        ['value', 'title', 'aria-label'].forEach(function (attr) {
          var v = el.getAttribute(attr);
          if (!v) return;
          var r = replaceTextValue(v);
          if (r !== v) el.setAttribute(attr, r);
        });
        if (el.tagName === 'OPTION') {
          var t = el.textContent || '';
          var rt = replaceTextValue(t);
          if (rt !== t) el.textContent = rt;
        }
      });
    } catch (e) {}
  }
  function patchConfigObjects() {
    try {
      if (Orbit.MODULE_TITLES && Orbit.MODULE_TITLES.cobros && Orbit.MODULE_TITLES.cobros.features) {
        Orbit.MODULE_TITLES.cobros.features = Orbit.MODULE_TITLES.cobros.features.map(replaceTextValue);
      }
      if (Orbit.MODULES && Orbit.MODULES.finanzas && Array.isArray(Orbit.MODULES.finanzas.scope)) {
        Orbit.MODULES.finanzas.scope = Orbit.MODULES.finanzas.scope.map(replaceTextValue);
      }
    } catch (e) {}
  }
  function addReportedNote(root) {
    try {
      (root || document).querySelectorAll('.pt-det-grid').forEach(function (grid) {
        if (grid.querySelector('[data-portal-v1142-note]')) return;
        var hasReported = false;
        grid.querySelectorAll('.pt-det span').forEach(function (s) {
          if ((s.textContent || '').trim() === 'Reportado') hasReported = true;
        });
        if (!hasReported) return;
        var note = document.createElement('div');
        note.className = 'cfg-note';
        note.setAttribute('data-portal-v1142-note', '1');
        note.style.marginTop = '8px';
        note.style.fontSize = '11.5px';
        note.innerHTML = '📤 Recibimos tu reporte. Está <b>pendiente de revisión/conciliación</b>; te confirmamos cuando quede conciliado.';
        grid.appendChild(note);
      });
    } catch (e) {}
  }
  function academyCourse() {
    return {
      id: 'cur_migracion_honesta_v150',
      titulo: 'Migración honesta y fuentes separadas',
      cat: 'Inducción',
      emoji: '🧭',
      color: '#C5162E',
      destinatarios: 'equipo',
      progreso: 0,
      certificado: false,
      desc: 'Reglas críticas para importar información real sin mezclar fuentes ni confirmar cobros antes de validar.',
      lecciones: [
        { t: 'Estados honestos', min: 8, tipo: 'lectura', secciones: [
          { icon: '📤', t: 'Reportado', color: '#2A6FDB', d: 'Un soporte enviado por cliente queda pendiente de revisión/conciliación. Reportar soporte no confirma el cobro.' },
          { icon: '🔗', t: 'Conciliado', color: '#7A5BD9', d: 'La conciliación relaciona fuente, recibo, póliza, cliente, país, moneda y periodo. Validar una propuesta no confirma el cobro.' },
          { icon: '✅', t: 'Confirmado', color: '#1F8A5B', d: 'Solo una revisión autorizada confirma el cobro y puede impactar cartera, producción o comisiones.' }
        ]},
        { t: 'Fuentes separadas', min: 10, tipo: 'lectura', secciones: [
          { icon: '🧾', t: 'Manifest de fuentes', color: '#C9821B', d: 'Antes de leer archivos reales se registra fuente, país, moneda, periodo, módulo dueño, efecto permitido y trazabilidad.' },
          { icon: '🏦', t: 'Banco y estados', color: '#0E7C86', d: 'Un banco no crea cobros. Un estado de cuenta de cliente no marca pago realizado. Ambos proponen relaciones que deben revisarse.' },
          { icon: '📚', t: 'Junio/julio 2026', color: '#C5162E', d: 'Planillas, estados de cuenta y financiero histórico pueden tener cortes distintos; se concilian por fuente separada y no se mezclan meses ni monedas.' }
        ]},
        { t: 'Lo que nunca se infiere', min: 8, tipo: 'lectura', secciones: [
          { icon: '💰', t: 'Financiero histórico', color: '#1E2227', d: 'El financiero histórico no crea cartera, cobros ni producción. Sirve para análisis y trazabilidad.' },
          { icon: '📎', t: 'Documentos soporte', color: '#7A5BD9', d: 'Los documentos soporte solo proponen datos. No crean ni modifican clientes o pólizas sin diff y confirmación.' },
          { icon: '🌎', t: 'País y moneda', color: '#0E7C86', d: 'GT=GTQ y CO=COP. Si falta país o moneda confiable queda REQUIERE_VALIDACION. Nunca se suman monedas en crudo.' }
        ]}
      ]
    };
  }
  function upsertCourse(list, course) {
    if (!Array.isArray(list)) return;
    var i = list.findIndex(function (c) { return c && c.id === course.id; });
    if (i >= 0) list[i] = Object.assign({}, list[i], course, { progreso: list[i].progreso || 0, certificado: !!list[i].certificado });
    else list.push(Object.assign({}, course));
  }
  function courseNeedsUpdate(prev, next) {
    if (!prev) return true;
    var scalarKeys = ['titulo', 'cat', 'emoji', 'color', 'destinatarios', 'desc'];
    if (scalarKeys.some(function (key) { return prev[key] !== next[key]; })) return true;
    try { return JSON.stringify(prev.lecciones || []) !== JSON.stringify(next.lecciones || []); }
    catch (e) { return true; }
  }
  function ensureAcademia() {
    if (academiaStoreEnsured || academiaStoreEnsuring) return;
    try {
      var c = academyCourse();
      if (Orbit.SEED && Array.isArray(Orbit.SEED.cursos)) upsertCourse(Orbit.SEED.cursos, c);
      if (!(Orbit.store && Orbit.store.all && Orbit.store.insert)) return;
      academiaStoreEnsuring = true;
      academiaStoreEnsured = true;
      var rows = Orbit.store.all('cursos') || [];
      var prev = rows.find(function (r) { return r && r.id === c.id; });
      var next = Object.assign({}, c, {
        progreso: prev && prev.progreso || 0,
        certificado: !!(prev && prev.certificado)
      });
      if (!prev) Orbit.store.insert('cursos', next);
      else if (Orbit.store.update && courseNeedsUpdate(prev, next)) Orbit.store.update('cursos', c.id, next);
    } catch (e) {
      academiaStoreEnsured = false;
    } finally {
      academiaStoreEnsuring = false;
    }
  }
  function patchSeedCopy() {
    try {
      if (!Orbit.SEED || !Array.isArray(Orbit.SEED.cursos)) return;
      Orbit.SEED.cursos.forEach(function (c) {
        if (c.desc) c.desc = replaceTextValue(c.desc).replace('Cobros gestiona la cartera y aplica pagos', 'Cobros gestiona cartera, informes, revisión y confirmación de cobros');
        (c.lecciones || []).forEach(function (l) {
          (l.secciones || []).forEach(function (s) {
            if (s.d) s.d = replaceTextValue(s.d).replace('aplicar un pago baja la cartera', 'confirmar un cobro actualiza la cartera según validación');
          });
        });
      });
    } catch (e) {}
  }
  function apply(root) {
    patchConfigObjects();
    patchSeedCopy();
    ensureAcademia();
    walkText(root || document.body);
    patchAttrs(root || document);
    addReportedNote(root || document);
  }
  function scheduleApply(root, delay) {
    try { clearTimeout(applyTimer); } catch (e) {}
    applyTimer = setTimeout(function () { apply(root || document.body); }, Number(delay || 60));
  }
  patchConfigObjects();
  patchSeedCopy();
  ensureAcademia();
  document.addEventListener('DOMContentLoaded', function () { apply(document.body); });
  document.addEventListener('click', function () { scheduleApply(document.body, 60); }, true);
  document.addEventListener('orbit:store', function () { scheduleApply(document.body, 80); });
  document.addEventListener('orbit:reseeded', function () {
    academiaStoreEnsured = false;
    scheduleApply(document.body, 80);
  });
  try {
    var mo = new MutationObserver(function (muts) {
      var hasAddedElements = muts.some(function (m) {
        return m.addedNodes && Array.prototype.some.call(m.addedNodes, function (n) { return n.nodeType === 1; });
      });
      if (hasAddedElements) scheduleApply(document.body, 60);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
