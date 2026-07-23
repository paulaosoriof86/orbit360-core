/* Orbit 360 · Academia 1.231 · Directorio operativo, edición y responsive */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var Orbit = window.Orbit;
  var VERSION = '1.231';
  if (Orbit.academiaOperationalDirectoryV20260722 && Orbit.academiaOperationalDirectoryV20260722.version === VERSION) return;

  function rows() {
    return [
      {
        id: 'm1_operational_directory_direccion_1231',
        titulo: 'Directorio operativo y edición · Dirección', rol: 'Dirección', obligatoria: true, _m1operationalv: 1231,
        secciones: [
          { icon:'👤', title:'Usuario visible', body:'El usuario del portal es operativo y permanece visible. La contraseña es el único secreto y se revela temporalmente.' },
          { icon:'🏦', title:'Cuenta visible', body:'El número bancario se muestra completo y se copia directamente. accountRef se conserva como respaldo, nunca como condición de lectura.' },
          { icon:'✏️', title:'Editar sin perder datos', body:'El editor hace merge por identidad estable. Debe preservar credentialRef, accountRef y campos no visibles; Cancelar no escribe y Guardar exige motivo.' },
          { icon:'✅', title:'Aseguradoras A&S activas', body:'Para el tenant A&S, las 26 aseguradoras son operadas y permanecen activas. Una inactivación futura solo puede hacerse manualmente, con motivo y auditoría.' },
          { icon:'🧪', title:'Defecto y validador', body:'Pantalla en blanco o títulos desbordados son FUNCTIONAL_DEFECT. Un validador que los aprueba es VALIDATOR_STALE y debe corregirse antes de cerrar M1.' }
        ]
      },
      {
        id: 'm1_operational_directory_operativo_1231',
        titulo: 'Directorio operativo y contactos · Operativo', rol: 'Operativo', obligatoria: true, _m1operationalv: 1231,
        secciones: [
          { icon:'📋', title:'Lectura operativa', body:'Consultar usuario, cuenta y contactos no concede permisos para borrar o desactivar aseguradoras.' },
          { icon:'📞', title:'Acciones derivadas', body:'Correo aparece cuando existe email; Llamar cuando existe teléfono; WhatsApp cuando hay al menos ocho dígitos. Tras guardar, las acciones se actualizan automáticamente.' },
          { icon:'↩️', title:'Edición segura', body:'Cambiar pestaña no debe perder el borrador. Guardar conserva referencias protegidas y nunca escribe contraseñas en el directorio.' }
        ]
      },
      {
        id: 'm1_operational_directory_asesor_1231',
        titulo: 'Directorio operativo responsive · Asesor', rol: 'Asesor', obligatoria: true, _m1operationalv: 1231,
        secciones: [
          { icon:'📱', title:'Títulos y acciones móviles', body:'Títulos, pestañas, campos y botones deben adaptarse a 320, 360, 390 y 430 píxeles sin ocultar información ni generar desplazamiento lateral.' },
          { icon:'⚠️', title:'Pendientes honestos', body:'Sin usuario registrado o Pendiente de registrar solo se muestran cuando realmente falta el dato.' },
          { icon:'🔒', title:'Permisos separados', body:'Ver datos operativos no autoriza editar. La contraseña continúa sujeta a rol, sesión y revelado temporal.' }
        ]
      }
    ];
  }
  function quiz() {
    return {
      id: 'eval_m1_operational_directory_1231', titulo: 'Caso aplicado · Edición del directorio', _m1operationalv: 1231,
      preguntas: [
        { p:'¿Qué debe preservar el editor al guardar un portal?', ops:['Solo lo visible','credentialRef y usuario operativo','La contraseña en texto'], ok:1 },
        { p:'¿Qué debe ocurrir con las aseguradoras de A&S?', ops:['Todas activas hasta inactivación manual','Inactivas sin credencial','Activas según documentos'], ok:0 },
        { p:'¿Cuándo aparece WhatsApp?', ops:['Siempre','Cuando existe teléfono con al menos ocho dígitos','Solo con correo'], ok:1 },
        { p:'¿Qué hacer si Editar deja la ficha en blanco?', ops:['Aceptar el PASS estático','Clasificar defecto y corregir la barrera edit-aware','Reimportar datos'], ok:1 }
      ]
    };
  }
  function apply() {
    var store = Orbit.store;
    if (!store || !store.all || !store.get || !store.insert || !store.update) return { ok:false, code:'STORE_REQUIRED' };
    var lessons = (store.all('lecciones') || []).filter(function (row) { return row && row._m1operationalv !== 1230 && row._m1operationalv !== 1231; }).concat(rows());
    var evaluations = (store.all('evaluaciones') || []).filter(function (row) { return row && row._m1operationalv !== 1230 && row._m1operationalv !== 1231; }).concat([quiz()]);
    lessons.forEach(function (row) { store.get('lecciones', row.id) ? store.update('lecciones', row.id, row) : store.insert('lecciones', row); });
    evaluations.forEach(function (row) { store.get('evaluaciones', row.id) ? store.update('evaluaciones', row.id, row) : store.insert('evaluaciones', row); });
    try {
      var config = store.get('config', 'academia') || {};
      store.update('config', 'academia', Object.assign({}, config, { contenidoDirectorioOperativo:'1.231', actualizadoAt:new Date().toISOString() }));
    } catch (error) {}
    return { ok:true, contentVersion:'1.231', roles:['Dirección','Operativo','Asesor'], editModeAware:true, allAysInsurersActive:true, manualDeactivationOnly:true, responsiveSemanticTitles:true, passwordOnlySecret:true, writesThroughOrbitStoreOnly:true };
  }

  Orbit.academiaOperationalDirectoryV20260722 = {
    version: VERSION,
    contentVersion: '1.231',
    operationalDirectorySemantics: true,
    editModeAware: true,
    allAysInsurersActive: true,
    manualDeactivationOnly: true,
    contactActionsDerived: true,
    responsiveSemanticTitles: true,
    usernameOperational: true,
    bankNumberOperational: true,
    passwordOnlySecret: true,
    apply: apply
  };
  setTimeout(apply, 0);
  document.addEventListener('orbit:session', apply);
})();
