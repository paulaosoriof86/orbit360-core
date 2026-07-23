/* Orbit 360 · Academia 1.230 · Directorio operativo y secretos */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var Orbit = window.Orbit;
  var VERSION = '1.230';
  if (Orbit.academiaOperationalDirectoryV20260722 && Orbit.academiaOperationalDirectoryV20260722.version === VERSION) return;

  function rows() {
    return [
      {
        id: 'm1_operational_directory_direccion_1230',
        titulo: 'Directorio operativo · Dirección',
        rol: 'Dirección',
        obligatoria: true,
        _m1operationalv: 1230,
        secciones: [
          { icon:'👤', title:'Usuario visible', body:'El usuario del portal es un dato operativo. Debe permanecer visible y copiarse junto con la contraseña únicamente cuando el rol tenga permiso.' },
          { icon:'🔐', title:'Contraseña protegida', body:'La contraseña es el único secreto de acceso en este alcance. Permanece en el proveedor seguro, se revela temporalmente y vuelve a Oculta.' },
          { icon:'🏦', title:'Número bancario operativo', body:'El número completo permanece visible en el directorio y se copia directamente con banco, tipo, moneda y titular. accountRef es respaldo, no requisito de visualización.' },
          { icon:'🧪', title:'Defecto, contrato y validador', body:'Si un validador exige ocultar usuario o cuenta, se clasifica VALIDATOR_STALE. Si el producto los elimina o depende de la bóveda para mostrarlos, se clasifica DATA_CONTRACT_FAILURE y FUNCTIONAL_DEFECT.' }
        ]
      },
      {
        id: 'm1_operational_directory_operativo_1230',
        titulo: 'Directorio operativo · Operativo',
        rol: 'Operativo',
        obligatoria: true,
        _m1operationalv: 1230,
        secciones: [
          { icon:'📋', title:'Lectura operativa', body:'Operativo consulta usuarios y cuentas completas según su acceso al módulo. La visibilidad no autoriza crear, borrar o reasignar recursos.' },
          { icon:'🔑', title:'Acceso seguro', body:'Copiar acceso seguro combina el usuario visible con la contraseña recuperada temporalmente. La contraseña nunca se escribe en el directorio.' },
          { icon:'↩️', title:'Importación controlada', body:'El importador conserva usuario y número después de confirmar el proveedor. Toda escritura usa diff, motivo, lectura posterior, auditoría y rollback.' }
        ]
      },
      {
        id: 'm1_operational_directory_asesor_1230',
        titulo: 'Directorio operativo · Asesor',
        rol: 'Asesor',
        obligatoria: true,
        _m1operationalv: 1230,
        secciones: [
          { icon:'📱', title:'Lectura móvil honesta', body:'El Asesor con acceso a Aseguradoras puede ver el usuario y el número bancario completos. Las acciones administrativas continúan restringidas por scope.' },
          { icon:'⚠️', title:'Pendientes honestos', body:'Sin usuario registrado o Pendiente de registrar solo se muestran cuando realmente falta el dato. No sustituyen información existente.' }
        ]
      }
    ];
  }
  function quiz() {
    return {
      id: 'eval_m1_operational_directory_1230',
      titulo: 'Caso aplicado · Directorio operativo',
      _m1operationalv: 1230,
      preguntas: [
        { p:'¿Cuál es el único secreto de acceso en este alcance?', ops:['Usuario','Contraseña','Número bancario'], ok:1 },
        { p:'¿Cómo debe mostrarse el número bancario?', ops:['Visible y copiable directamente','Solo mediante revelado temporal','Nunca en el directorio'], ok:0 },
        { p:'¿Qué función cumple accountRef?', ops:['Condición para visualizar','Respaldo, trazabilidad y rollback','Reemplazo del número'], ok:1 },
        { p:'¿Qué hacer si un validador exige Cuenta protegida?', ops:['Modificar el producto para ocultarla','Clasificar VALIDATOR_STALE y corregir el contrato','Reimportar aseguradoras'], ok:1 }
      ]
    };
  }
  function apply() {
    var store = Orbit.store;
    if (!store || !store.all || !store.get || !store.insert || !store.update) return { ok:false, code:'STORE_REQUIRED' };
    var lessons = (store.all('lecciones') || []).filter(function (row) { return row && row._m1operationalv !== 1230; }).concat(rows());
    var evaluations = (store.all('evaluaciones') || []).filter(function (row) { return row && row._m1operationalv !== 1230; }).concat([quiz()]);
    lessons.forEach(function (row) { store.get('lecciones', row.id) ? store.update('lecciones', row.id, row) : store.insert('lecciones', row); });
    evaluations.forEach(function (row) { store.get('evaluaciones', row.id) ? store.update('evaluaciones', row.id, row) : store.insert('evaluaciones', row); });
    try {
      var config = store.get('config', 'academia') || {};
      store.update('config', 'academia', Object.assign({}, config, { contenidoDirectorioOperativo:'1.230', actualizadoAt:new Date().toISOString() }));
    } catch (error) {}
    return { ok:true, contentVersion:'1.230', roles:['Dirección','Operativo','Asesor'], passwordOnlySecret:true, usernameOperational:true, bankNumberOperational:true, writesThroughOrbitStoreOnly:true };
  }

  Orbit.academiaOperationalDirectoryV20260722 = {
    version: VERSION,
    contentVersion: '1.230',
    operationalDirectorySemantics: true,
    usernameOperational: true,
    bankNumberOperational: true,
    passwordOnlySecret: true,
    apply: apply
  };
  setTimeout(apply, 0);
  document.addEventListener('orbit:session', apply);
})();
