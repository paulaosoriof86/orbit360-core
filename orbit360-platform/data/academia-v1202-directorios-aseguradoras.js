/* ============================================================
   Orbit 360 · Academia v1.202 — Directorios de aseguradoras
   Rutas por rol; conserva progreso y certificados.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ACADEMIA_V1202 = (function () {
  function section(icon, title, text) { return { icon, t: title, color: '#C5162E', d: text }; }
  function lesson(title, sections) { return { t: title, min: 12, tipo: 'lectura', secciones: sections }; }
  function quiz(role) {
    return { t: 'Evaluación aplicada', min: 8, tipo: 'quiz', preguntas: [
      { p: '¿Qué debe indicarse antes de importar un directorio?', ops: ['Solo el nombre del archivo', 'El país correcto del archivo', 'Una tasa de cambio'], ok: 1 },
      { p: '¿Qué ocurre con una hoja duplicada o cuya identidad no coincide?', ops: ['Se importa automáticamente', 'Queda bloqueada para validación', 'Se convierte en cliente'], ok: 1 },
      { p: '¿Dónde deben quedar usuarios, contraseñas y cuentas completas?', ops: ['En la ficha visible', 'En referencias seguras administradas por backend', 'En observaciones'], ok: 1 },
      { p: role === 'Asesor' ? '¿Qué puede hacer un Asesor en Aseguradoras?' : '¿Qué exige aplicar el dry-run?', ops: role === 'Asesor' ? ['Importar y revelar secretos', 'Consultar la ficha y usar los recursos autorizados', 'Crear pólizas desde el directorio'] : ['Importar todo sin revisar', 'Motivo, frase reforzada y solo filas validadas', 'Crear clientes y pólizas'], ok: 1 }
    ]};
  }
  function course(id, role, roleText) {
    return {
      id, titulo: 'Directorio operativo de aseguradoras — ' + role, cat: 'Operación', emoji: '🏢', color: '#1E2227',
      desc: 'Cómo importar, validar y utilizar contactos, plataformas, bancos, productos y documentos por país.',
      destinatarios: role, recursos: [], metaLeccion: {
        sirve: 'Mantener un directorio operativo confiable que alimente atención, cotización, emisión, cobros y siniestros.',
        importa: 'Evita duplicados, accesos expuestos, cuentas incorrectas y datos de otro país o entidad.',
        datos: 'Usa archivos multihoja, país, identidad, contactos, plataformas, bancos, referencias documentales y trazabilidad.',
        impacto: 'Conecta Aseguradoras con Cotizador, Comparativo, Cliente 360, Pólizas, Cobros, Ops y Documentos.'
      },
      lecciones: [
        lesson('Importación segura por fuente', [
          section('🌎', 'País explícito', 'Guatemala y Colombia se importan como fuentes separadas. El país define moneda, catálogos y reglas; nunca se infiere silenciosamente.'),
          section('📚', 'Libro multihoja', 'Cada hoja operativa se trata como candidata. Índices, diagnósticos, resúmenes y hojas técnicas se excluyen antes del mapeo.'),
          section('🔍', 'Dry-run y calidad', 'Orbit propone crear, actualizar, bloquear o requerir validación. Identidades incompatibles, aliados y duplicados no se aplican automáticamente.'),
          section('🧾', 'Trazabilidad', 'Cada contacto, plataforma y cuenta conserva archivo, hoja, fila, bloque y país. El archivo real no se sube al repositorio.')
        ]),
        lesson('Recursos operativos y seguridad', [
          section('👥', 'Contactos por área', 'Comercial, operaciones, renovaciones, cobros, siniestros y finanzas deben quedar diferenciados para usar el canal correcto.'),
          section('🔐', 'Accesos seguros', 'La ficha conserva nombre de plataforma, enlace seguro y referencias. Usuarios y contraseñas completas solo se recuperan mediante un proveedor backend autorizado.'),
          section('🏦', 'Bancos y pagos', 'País, moneda, banco, tipo, uso y vigencia deben verificarse. Los números completos usan accountRef y no se guardan en el navegador.'),
          section('⚖️', 'Relación con Cotizador', 'El directorio identifica a la aseguradora y sus recursos. Las tarifas y ofertas requieren fuentes vigentes y validadas; no se inventan desde contactos o cuentas.'),
          section('👤', roleText, role === 'Asesor' ? 'Consulta únicamente los recursos autorizados dentro de tu alcance y crea una gestión cuando detectes información faltante o incorrecta.' : 'Revisa bloqueos, motivo, país, diferencias y trazabilidad antes de confirmar la aplicación.')
        ]),
        quiz(role)
      ]
    };
  }

  const courses = [
    course('cur_dir_aseg_dir_v1202', 'Dirección', 'Como Dirección, valida clasificación, permisos y conexión de recursos sensibles.'),
    course('cur_dir_aseg_op_v1202', 'Operativo', 'Como Operativo, administra contactos, vigencias y recursos necesarios para la operación.'),
    course('cur_dir_aseg_asesor_v1202', 'Asesor', 'Como Asesor, utiliza el directorio para atender su cartera sin modificar datos protegidos.')
  ];

  function apply() {
    try {
      if (!Orbit.store || !Orbit.store.all || !Orbit.store.insert) return false;
      const current = Orbit.store.all('cursos') || [];
      if (!current.length) return false;
      const byId = {}; current.forEach(c => { byId[c.id] = c; });
      courses.forEach(c => {
        const prev = byId[c.id];
        if (!prev) Orbit.store.insert('cursos', Object.assign({ progreso: 0, certificado: false, _cv: 1202 }, c));
        else if ((prev._cv || 0) < 1202) Orbit.store.update('cursos', c.id, Object.assign({}, c, { progreso: prev.progreso || 0, certificado: !!prev.certificado, _cv: 1202 }));
      });
      return true;
    } catch (e) { return false; }
  }

  let tries = 0;
  (function loop() { if (apply() || tries++ > 50) return; setTimeout(loop, 150); })();
  document.addEventListener('orbit:reseeded', apply);
  return { courses, apply };
})();
