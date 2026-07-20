/* Orbit 360 · Academia v1.225 — Importadores completos y evidencia E2E */
window.Orbit = window.Orbit || {};
Orbit.ACADEMIA_V1225_IMPORTERS_E2E = (function () {
  'use strict';

  function section(icon, title, text) {
    return { icon: icon, t: title, color: '#C5162E', d: text };
  }
  function lesson(title, sections) {
    return { t: title, min: 10, tipo: 'lectura', secciones: sections };
  }
  function quiz(role) {
    return {
      t: 'Comprobación aplicada', min: 7, tipo: 'quiz', preguntas: [
        {
          p: '¿Qué demuestra que un archivo fue leído correctamente?',
          ops: ['Que la importación ya quedó aplicada', 'Que el sistema pudo interpretar la fuente y producir un resultado preliminar', 'Que todos los datos son válidos'],
          ok: 1
        },
        {
          p: '¿Cuándo puede mostrarse una importación como completada?',
          ops: ['Cuando aparece el dry-run', 'Cuando la escritura se confirma y la información puede releerse', 'Cuando el archivo tiene varias hojas'],
          ok: 1
        },
        {
          p: '¿Qué debe ocurrir con una prueba sintética?',
          ops: ['Debe quedarse como dato de demostración', 'Debe eliminarse mediante rollback y restaurar los conteos', 'Debe mezclarse con datos reales'],
          ok: 1
        },
        {
          p: role === 'Asesor' ? '¿Qué debe hacer un Asesor ante un dato que no corresponde a su cartera?' : '¿Qué diferencia existe entre defecto funcional y validador obsoleto?',
          ops: role === 'Asesor'
            ? ['Modificarlo directamente', 'Crear una gestión de corrección sin abrir información restringida', 'Eliminar el registro']
            : ['Ninguna', 'El defecto está en el producto; el validador obsoleto contradice el contrato vigente', 'El validador obsoleto siempre obliga a cambiar datos'],
          ok: 1
        }
      ]
    };
  }
  function course(id, role, roleText) {
    return {
      id: id,
      titulo: 'Importadores completos y verificables — ' + role,
      cat: 'Operación',
      emoji: '🧭',
      color: '#1E2227',
      desc: 'Cómo distinguir lectura, dry-run, aplicación real, auditoría y rollback en cualquier fuente.',
      destinatarios: role,
      recursos: [],
      metaLeccion: {
        sirve: 'Evitar que una carga parezca terminada cuando solo se leyó o clasificó el archivo.',
        importa: 'Protege la calidad de clientes, aseguradoras, pólizas, cobros, bancos, planillas, documentos y configuración.',
        datos: 'Usa trazabilidad de archivo, hoja, fila, bloque, país, moneda, resultado y responsable.',
        impacto: 'Permite migraciones confiables y evita reintentos, duplicados, escrituras parciales y estados engañosos.'
      },
      lecciones: [
        lesson('Las etapas no son equivalentes', [
          section('📄', 'Archivo leído', 'El sistema reconoce la fuente y sus hojas. Todavía no significa que haya escrito información.'),
          section('🧩', 'Mapeo y normalización', 'Los encabezados y sinónimos se relacionan con campos canónicos. Las dudas deben quedar visibles y corregibles.'),
          section('🔎', 'Dry-run', 'Muestra crear, actualizar, omitir y requerir validación. Es una propuesta; no es la aplicación final.'),
          section('✅', 'Aplicación confirmada', 'Solo existe cuando el servicio autorizado confirma la escritura y la plataforma puede releer el resultado.'),
          section('↩️', 'Rollback', 'Las pruebas ficticias deben retirarse por completo y restaurar los conteos anteriores.')
        ]),
        lesson('Gate integral y estados honestos', [
          section('👤', 'Identidad y rol', 'La misma identidad, tenant y rol activo deben conservarse desde la pantalla hasta la operación autorizada.'),
          section('🎯', 'Destino único', 'Cada registro debe llegar con un destino interno inequívoco. No se vuelve a deducir en capas diferentes.'),
          section('🧾', 'Auditoría', 'Deben quedar comprobados tanto el resultado aceptado como un rechazo controlado, sin registrar valores protegidos.'),
          section('🛡️', 'Sin secretos en datos operativos', 'Usuarios, contraseñas y números completos permanecen en el servicio seguro; la ficha guarda solo referencias opacas.'),
          section('🚦', 'Cierre', 'Un importador solo se declara funcional cuando el gate integral produce evidencia sanitizada positiva.'),
          section('👥', roleText, role === 'Asesor'
            ? 'Trabaja solo dentro de tu alcance. Cuando falte una relación o pertenezca a otra cartera, crea una gestión de corrección.'
            : 'Revisa origen, diferencias, alcance, responsable, resultado de escritura y evidencia antes de aprobar una migración.')
        ]),
        lesson('Defecto funcional o validador obsoleto', [
          section('🧱', 'Defecto funcional', 'El producto no cumple el contrato: no llega al destino, escribe parcialmente, muestra un éxito falso o no puede releer.'),
          section('📐', 'Validador obsoleto', 'La regla automatizada ya no representa el contrato vigente. Se congela el producto y se corrigen juntos registro, validador, workflow y documentación.'),
          section('🔁', 'Dos fallos iguales', 'No se repite ni se agrega otro parche. Se detienen los intentos y se diagnostica la causa raíz de la etapa.'),
          section('🧭', 'Una fuente por migración', 'Clientes, pólizas, vehículos, cobros, planillas, bancos, histórico, documentos y configuración conservan contratos separados.')
        ]),
        quiz(role)
      ]
    };
  }

  var courses = [
    course('cur_importers_e2e_dir_v1225', 'Dirección', 'Dirección decide la aprobación y exige evidencia completa, motivo y trazabilidad.'),
    course('cur_importers_e2e_op_v1225', 'Operativo', 'Operativo prepara fuentes, revisa diferencias y no confunde dry-run con escritura.'),
    course('cur_importers_e2e_asesor_v1225', 'Asesor', 'Asesor completa faltantes permitidos y solicita corrección cuando la relación no corresponde.')
  ];

  function apply() {
    try {
      if (!Orbit.store || !Orbit.store.all || !Orbit.store.insert) return false;
      var current = Orbit.store.all('cursos') || [];
      if (!current.length) return false;
      var byId = {};
      current.forEach(function (courseRow) { byId[courseRow.id] = courseRow; });
      courses.forEach(function (courseRow) {
        var previous = byId[courseRow.id];
        if (!previous) {
          Orbit.store.insert('cursos', Object.assign({ progreso: 0, certificado: false, _cv: 1225 }, courseRow));
        } else if ((previous._cv || 0) < 1225) {
          Orbit.store.update('cursos', courseRow.id, Object.assign({}, courseRow, {
            progreso: previous.progreso || 0,
            certificado: Boolean(previous.certificado),
            _cv: 1225
          }));
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  var tries = 0;
  (function loop() {
    if (apply() || tries++ > 50) return;
    setTimeout(loop, 150);
  })();
  document.addEventListener('orbit:reseeded', apply);
  return { version: '1.225', contentVersion: '1.225', courses: courses, apply: apply };
})();
