/* ============================================================
   Orbit 360 · Configuración de navegación + metadatos de módulos
   Una sola fuente de verdad para el sidebar y el router.
   estado: 'core' (Núcleo) · 'beta' · 'road' (Roadmap)
   ============================================================ */
window.Orbit = window.Orbit || {};

/* Títulos de módulo (banda de header) — plantilla personalizable por cliente.
   Cada cliente/plan puede sobreescribir icon, title, sub y features. */
Orbit.MODULE_TITLES = {
  ops:           { icon: '🗂', title: 'Orbit Ops', sub: 'Gestiones operativas', features: ['Kanban', 'Listas personalizables', 'Enlazado con Leads'] },
  leads:         { icon: '🎯', title: 'Orbit Leads', sub: 'Pipeline comercial', features: ['Cadencias', 'Probabilidad', 'Convierte a cliente'] },
  inicio:        { icon: '🌅', title: 'Orbit Inicio', sub: 'Mi día', features: ['Metas del mes', 'Prioridades', 'Avance por asesor'] },
  cliente360:    { icon: '🧑‍💼', title: 'Orbit Clientes', sub: 'Base de asegurados', features: ['Expediente 360', 'Autogestionable', 'Importación inteligente'] },
  polizas:       { icon: '📑', title: 'Orbit Pólizas', sub: 'Cartera completa', features: ['Multi-aseguradora', 'Vigencias', 'Ramos y productos'] },
  cobros:        { icon: '💳', title: 'Orbit Cobros', sub: 'Cartera y conciliación', features: ['Aging', 'Recibos', 'Conciliación pago↔póliza'] },
  conciliaciones: { icon: '🔗', title: 'Orbit Conciliaciones', sub: 'Bandeja de propuestas', features: ['Score', 'Validación', 'No aplica pagos'] },
  renovaciones:  { icon: '🔄', title: 'Orbit Renovaciones', sub: 'Pipeline por vencer', features: ['90 días', 'Por urgencia', 'Gestión'] },
  cancelaciones: { icon: '✕', title: 'Orbit Cancelaciones', sub: 'Fuga de cartera', features: ['Motivos', 'Valor perdido', 'Tasa de fuga'] },
  comisiones:    { icon: '💼', title: 'Orbit Comisiones', sub: 'Devengado y liquidado', features: ['Por asesor', 'Por aseguradora', 'Por periodo'] },
  historial:     { icon: '📝', title: 'Orbit Historial', sub: 'Actividades de la cartera', features: ['Llamadas', 'WhatsApp', 'Reuniones'] },
  importar:      { icon: '⬇', title: 'Orbit Importa', sub: 'Importación inteligente', features: ['Cualquier formato', 'Mapeo automático', 'Adaptable'] },
  calidad:       { icon: '🩺', title: 'Calidad de datos', sub: 'Expedientes a completar', features: ['Prioridad teléfono', 'Clientes con póliza vigente', 'Notificar por WA/correo'] },
  plantillas:    { icon: '✉', title: 'Plantillas de mensajes', sub: 'WhatsApp y correo', features: ['Propuestas', 'Primas pendientes', 'Actualización de datos'] },
  finanzas:      { icon: '💰', title: 'Orbit Finanzas', sub: 'Liquidaciones y conciliación', features: ['Movimientos', 'Liquidación empresa/asesores', 'Conciliación bancaria'] },
  aseguradoras:  { icon: '🏢', title: 'Aseguradoras', sub: 'Directorio operativo', features: ['Fichas completas', 'Ejecutivos de cuenta', 'Documentos', 'Comisiones por ramo'] },
  insights:      { icon: '📊', title: 'Orbit Insights', sub: 'Analítica del CRM', features: ['Producción', 'Cartera y aging', 'Pipeline', 'Renovaciones'] }
};

/* Operación multipaís — el cliente puede operar uno o varios países.
   Cada país define moneda + impuestos/recargos configurables (se editan
   al dar de alta el país). Demo: IVA GT 12% · CO 19%. */
Orbit.PAISES = [
  { id: 'TODOS', label: 'Todos los países' },
  { id: 'GT', label: 'Guatemala', moneda: 'GTQ', iva: 12, recargoFinanciero: 5, gastosEmision: 0 },
  { id: 'CO', label: 'Colombia', moneda: 'COP', iva: 19, recargoFinanciero: 6, gastosEmision: 0 }
];
Orbit.paisCfg = function (id) { return Orbit.PAISES.find(p => p.id === id) || { iva: 12, recargoFinanciero: 5, gastosEmision: 0 }; };
Orbit.pais = 'TODOS';

/* Glosario de seguros (colaboradores + clientes). Configurable. */
Orbit.GLOSARIO = [
  { t: 'Prima', d: 'El precio que pagas por tu seguro durante la vigencia.' },
  { t: 'Prima neta', d: 'Valor base del seguro, antes de impuestos y gastos.' },
  { t: 'Deducible', d: 'Monto que asumes tú antes de que la aseguradora pague un siniestro.' },
  { t: 'Suma asegurada', d: 'Cantidad máxima que cubre la póliza ante una pérdida.' },
  { t: 'Cobertura', d: 'Los riesgos y situaciones que tu póliza protege.' },
  { t: 'Vigencia', d: 'Período en el que tu póliza está activa (inicio y fin).' },
  { t: 'Siniestro', d: 'El evento cubierto que da lugar a un reclamo (choque, robo, etc.).' },
  { t: 'Reclamo', d: 'La solicitud para que la aseguradora pague por un siniestro.' },
  { t: 'Endoso', d: 'Modificación que se hace a una póliza ya emitida.' },
  { t: 'Renovación', d: 'Extender la póliza por un nuevo período al vencer.' },
  { t: 'Beneficiario', d: 'Persona que recibe la indemnización en caso de siniestro.' },
  { t: 'Indemnización', d: 'Pago que hace la aseguradora tras un siniestro aprobado.' },
  { t: 'Recargo por fraccionamiento', d: 'Costo adicional por pagar la prima en cuotas.' },
  { t: 'Gastos de emisión', d: 'Cargo administrativo por emitir la póliza.' },
  { t: 'Pérdida total', d: 'Cuando el daño supera cierto % del valor del bien asegurado.' },
  { t: 'Asistencia', d: 'Servicios incluidos (grúa, médico, vial) además de la cobertura.' }
];

/* Catálogo geográfico (departamentos → ciudades) por país. Configurable por cliente. */
Orbit.GEO = {
  GT: { 'Guatemala': ['Guatemala', 'Mixco', 'Villa Nueva', 'San Miguel Petapa', 'Amatitlán', 'Chinautla'], 'Quetzaltenango': ['Quetzaltenango', 'Coatepeque', 'Salcajá'], 'Escuintla': ['Escuintla', 'Santa Lucía Cotzumalguapa', 'Tiquisate', 'Puerto San José'], 'Sacatepéquez': ['Antigua Guatemala', 'Jocotenango', 'Ciudad Vieja'], 'Sololá': ['Sololá', 'Panajachel'], 'Chimaltenango': ['Chimaltenango', 'Tecpán'], 'Huehuetenango': ['Huehuetenango'], 'Petén': ['Flores', 'San Benito'], 'Izabal': ['Puerto Barrios', 'Morales'], 'Alta Verapaz': ['Cobán'] },
  CO: { 'Cundinamarca': ['Bogotá', 'Soacha', 'Chía', 'Zipaquirá', 'Facatativá', 'Fusagasugá'], 'Antioquia': ['Medellín', 'Envigado', 'Itagüí', 'Bello', 'Rionegro', 'Sabaneta'], 'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago'], 'Atlántico': ['Barranquilla', 'Soledad', 'Malambo'], 'Santander': ['Bucaramanga', 'Floridablanca', 'Girón'], 'Bolívar': ['Cartagena', 'Magangué'], 'Risaralda': ['Pereira', 'Dosquebradas'], 'Caldas': ['Manizales'], 'Norte de Santander': ['Cúcuta'], 'Magdalena': ['Santa Marta'] }
};

/* =========================================================
   TENANT — configuración del cliente (white-label / plan).
   Dos niveles: el cliente administra parte (según plan) y
   nosotros administramos lo interno (módulos activos, plan).
   Persistente. Una sola fuente de verdad para sidebar/router.
   ========================================================= */
Orbit.PLANES = {
  estandar:      { id: 'estandar', nombre: 'Estándar', personalizacion: false, addons: false, apis: false, desc: 'Plantillas predefinidas, sin auto-branding.' },
  profesional:   { id: 'profesional', nombre: 'Profesional', personalizacion: true, addons: true, apis: false, desc: 'Marca configurable + add-ons.' },
  personalizado: { id: 'personalizado', nombre: 'Personalizado', personalizacion: true, addons: true, apis: true, desc: 'White-label completo, auto-branding por manual de marca, APIs.' }
};
Orbit.ROLES = {
  'Dirección':   { nivel: 5, desc: 'Acceso total + configuración + comisión empresa + análitica completa.', color: '#C5162E',
    modulos: ['inicio','cronograma','ops','leads','aseguradoras','cotizador','comparativo','cliente360','polizas','cobros','conciliaciones','renovaciones','cancelaciones','siniestros','historial','comisiones','importar','calidad','plantillas','finanzas','insights','reportes','automatizaciones','correo','marketing','academia','portal','equipo','configuracion'] },
  'Admin':       { nivel: 4, desc: 'Operación completa + configuración. Sin módulo Finanzas completo.', color: '#1f3a5f',
    modulos: ['inicio','cronograma','ops','leads','aseguradoras','cotizador','comparativo','cliente360','polizas','cobros','conciliaciones','renovaciones','cancelaciones','siniestros','historial','comisiones','importar','calidad','plantillas','insights','reportes','automatizaciones','correo','academia','equipo','configuracion'] },
  'Comercial':   { nivel: 3, desc: 'CRM + Ops/Leads + Cotizador. Sin Finanzas ni Config.', color: '#1f8a4c',
    modulos: ['inicio','cronograma','ops','leads','aseguradoras','cotizador','comparativo','cliente360','polizas','cobros','renovaciones','siniestros','historial','importar','calidad','correo','marketing'] },
  'Finanzas':    { nivel: 3, desc: 'Cobros, comisiones, finanzas, conciliación. Sin Ops/Leads.', color: '#c9821b',
    modulos: ['inicio','cronograma','cliente360','polizas','cobros','conciliaciones','renovaciones','cancelaciones','comisiones','historial','finanzas','reportes','correo'] },
  'Marketing':   { nivel: 2, desc: 'Marketing, Academia, Reportes, CRM básico.', color: '#6b4ea0',
    modulos: ['inicio','cronograma','marketing','academia','cliente360','correo','reportes'] },
  'Operativo':   { nivel: 2, desc: 'Ops + CRM operativo. Sin Finanzas ni Config.', color: '#0f766e',
    modulos: ['inicio','cronograma','ops','leads','aseguradoras','cliente360','polizas','cobros','renovaciones','siniestros','historial','importar','calidad','correo'],
    scopes: { negocios: 'equipo' } },
  'Asesor':      { nivel: 2, desc: 'Su cartera; ve solo su comisión. Sin Ops ni Config.', color: '#2563a8',
    modulos: ['inicio','cronograma','leads','aseguradoras','cliente360','polizas','cobros','renovaciones','siniestros','historial','cotizador','comparativo','correo'],
    scopes: { cliente360: 'propia', polizas: 'propia', cobros: 'propia', renovaciones: 'propia', siniestros: 'propia', comisiones: 'propia', negocios: 'propia' } },
  'Asistente':   { nivel: 1, desc: 'Captura y gestión básica. Sin comisiones ni finanzas.', color: '#7a818e',
    modulos: ['inicio','cronograma','cliente360','polizas','cobros','renovaciones','historial','importar','correo'] }
};
/* =========================================================
   CATÁLOGOS configurables (para que TODO sea desplegable →
   analítica). Persistentes; editables desde Configuración.
   Cualquier desplegable ofrece "➕ Otro…" que agrega aquí.
   ========================================================= */
Orbit.cat = (function () {
  const KEY = 'orbit360_cat';
  const DEF = {
    canales: ['Referido', 'Conocido', 'Cliente actual', 'Cliente antiguo', 'Web / sitio', 'WhatsApp', 'Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'Campaña', 'Telemarketing', 'Evento / feria'],
    ramos: ['Auto', 'Vida', 'Gastos Médicos', 'Hogar', 'Daños', 'Fianzas', 'Transporte', 'RC', 'Accidentes'],
    // Ramos y subramos con LENGUAJE POR PAÍS (GT/CO) — fuente única para
    // desplegables, analítica, trazabilidad y estandarización.
    ramosPais: {
      GT: {
        'Automóviles': ['Vehículo Liviano', 'Vehículo Pesado', 'Motocicleta', 'Grúa / Equipo Especial', 'Pérdidas Totales', 'Pérdidas Parciales', 'Responsabilidad Civil Vehículos', 'Seguro por Kilómetros', 'Flotilla'],
        'Vida': ['Vida Individual', 'Vida Colectivo', 'Vida Deudores', 'Vida Temporal', 'Dotal', 'Renta / Retiro'],
        'Gastos Médicos': ['GM Individual', 'GM Familiar', 'GM Colectivo', 'GM Internacional', 'Enfermedades Graves'],
        'Incendio y Líneas Aliadas': ['Hogar', 'Edificio / Comercio', 'Todo Riesgo Construcción', 'Lucro Cesante'],
        'Daños': ['Multirriesgo PYME', 'Multirriesgo Hogar', 'Robo y Hurto', 'Rotura de Maquinaria', 'Equipo Electrónico', 'Dinero y Valores'],
        'Fianzas': ['Fianza de Cumplimiento', 'Fianza de Anticipo', 'Fianza de Sostenimiento de Oferta', 'Fianza de Calidad / Conservación de Obra', 'Fianza Judicial', 'Fianza Aduanera'],
        'Transporte': ['Carga Terrestre', 'Carga Marítima', 'Carga Aérea', 'Casco', 'Importación / Exportación'],
        'Responsabilidad Civil': ['RC General', 'RC Profesional', 'RC Productos', 'RC Patronal', 'RC Directores y Funcionarios (D&O)'],
        'Accidentes Personales': ['AP Individual', 'AP Colectivo', 'AP Escolar', 'Viajero / Asistencia']
      },
      CO: {
        'Automóviles': ['Todo Riesgo Liviano', 'Todo Riesgo Pesado', 'Pérdidas Totales', 'Pérdidas Parciales', 'Responsabilidad Civil', 'Motos', 'Grúa / Maquinaria', 'Seguro por Kilómetros', 'SOAT', 'Flotas'],
        'Vida': ['Vida Individual', 'Vida Grupo', 'Vida Deudores', 'Temporal', 'Exequias', 'Renta Voluntaria'],
        'Salud': ['Salud Individual', 'Salud Familiar', 'Medicina Prepagada', 'Plan Complementario', 'Hospitalización y Cirugía', 'Salud Internacional'],
        'Incendio y Terremoto': ['Hogar', 'PYME', 'Copropiedades', 'Todo Riesgo Daño Material', 'Lucro Cesante'],
        'Daños': ['Multirriesgo Empresarial', 'Multirriesgo Hogar', 'Sustracción', 'Rotura de Maquinaria', 'Equipo y Maquinaria', 'Manejo'],
        'Cumplimiento': ['Cumplimiento Particular', 'Cumplimiento Estatal', 'Seriedad de la Oferta', 'Buen Manejo de Anticipo', 'Estabilidad de Obra', 'Calidad del Servicio'],
        'Transporte': ['Mercancías', 'Automotor de Carga', 'Casco Marítimo', 'Importación / Exportación'],
        'Responsabilidad Civil': ['RC Extracontractual', 'RC Profesional', 'RC Directores y Administradores (D&O)', 'RC Clínicas y Hospitales', 'RC Contractual'],
        'ARL / Riesgos Laborales': ['ARL', 'Accidentes Personales', 'AP Estudiantil', 'Viajero']
      }
    },
    productos: ['Auto Total', 'Auto Plus', 'Auto Básico', 'Vida Entera', 'Vida Temporal', 'Salud Integral', 'Salud Familiar', 'Salud Premium', 'Hogar Protegido', 'Hogar Plus', 'Multirriesgo PYME', 'Responsabilidad Civil', 'Transporte de Carga', 'Fianza Cumplimiento', 'Accidentes Personales'],
    prioridades: ['Alta', 'Media', 'Baja'],
    tiposGestion: [
      { t: 'Solicitar condiciones de renovación', lista: 'Renovaciones / Modif.' },
      { t: 'Renovación de póliza', lista: 'Renovaciones / Modif.' },
      { t: 'Modificar suma asegurada', lista: 'Renovaciones / Modif.' },
      { t: 'Sustitución de vehículo', lista: 'Renovaciones / Modif.' },
      { t: 'Cambio de propietario', lista: 'Renovaciones / Modif.' },
      { t: 'Actualizar datos de cliente', lista: 'Gestiones Admin' },
      { t: 'Endoso de beneficiario', lista: 'Gestiones Admin' },
      { t: 'Solicitud de cancelación', lista: 'Gestiones Admin' },
      { t: 'Carta de no adeudo', lista: 'Gestiones Admin' },
      { t: 'Emisión de certificado', lista: 'Gestiones Admin' },
      { t: 'Reclamo / Siniestro', lista: 'Gestiones Admin' }
    ],
    // Listas de los tableros — EDITABLES (crear/renombrar/recolor/reordenar/eliminar).
    // Las marcadas fixed están atadas a una etapa del ciclo (no se eliminan, sí se renombran/recolor/reordenan).
    opsListas: [
      { id: 'l-admin', nombre: 'Gestiones Admin', emoji: '🗂', color: '#1f3a5f', kind: 'gestion' },
      { id: 'l-cotiz', nombre: 'Cotizaciones', emoji: '🧮', color: '#c9821b', kind: 'negocio', etapa: 'cotizando', fixed: true },
      { id: 'l-insp', nombre: 'Inspecciones', emoji: '🔍', color: '#0f766e', kind: 'negocio', etapa: 'inspeccion', fixed: true },
      { id: 'l-emis', nombre: 'Emisiones', emoji: '📝', color: '#1f8a4c', kind: 'negocio', etapa: 'emision', fixed: true },
      { id: 'l-renov', nombre: 'Renovaciones / Modif.', emoji: '🔄', color: '#6b4ea0', kind: 'gestion' }
    ],
    leadsListas: [
      { id: 'q-nuevo', nombre: 'Nuevo', emoji: '🌱', color: '#6b7280', etapa: 'nuevo', fixed: true },
      { id: 'q-cont', nombre: 'Contactado', emoji: '📞', color: '#1f3a5f', etapa: 'contactado', fixed: true },
      { id: 'q-cotiz', nombre: 'Cotizando', emoji: '🧮', color: '#c9821b', etapa: 'cotizando', espejo: true, fixed: true },
      { id: 'q-prop', nombre: 'Propuesta', emoji: '📨', color: '#6b4ea0', etapa: 'propuesta', fixed: true },
      { id: 'q-nego', nombre: 'Negociación', emoji: '🤝', color: '#2563a8', etapa: 'negociacion', fixed: true },
      { id: 'q-insp', nombre: 'Inspección', emoji: '🔍', color: '#0f766e', etapa: 'inspeccion', espejo: true, fixed: true },
      { id: 'q-emis', nombre: 'Emisión', emoji: '📝', color: '#1f8a4c', etapa: 'emision', espejo: true, fixed: true },
      { id: 'q-cierre', nombre: 'Cierre', emoji: '🏆', color: '#15803d', etapa: 'emitido', fixed: true }
    ]
  };
  let d = null;
  try { const r = localStorage.getItem(KEY); if (r) d = JSON.parse(r); } catch (e) {}
  if (!d) d = JSON.parse(JSON.stringify(DEF));
  // merge claves nuevas si la versión cambió en el código
  Object.keys(DEF).forEach(k => { if (d[k] == null) d[k] = JSON.parse(JSON.stringify(DEF[k])); });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} document.dispatchEvent(new CustomEvent('orbit:cat')); }
  return {
    get: (k) => d[k] || [],
    all: () => d,
    // Ramos/subramos por país (lenguaje local GT/CO) para listas desplegables y analítica
    ramosDe: (pais) => { const m = (d.ramosPais || {})[pais]; return m ? Object.keys(m) : (d.ramos || []); },
    subramosDe: (pais, ramo) => { const m = (d.ramosPais || {})[pais]; return (m && m[ramo]) ? m[ramo].slice() : []; },
    addRamo: (pais, ramo) => { d.ramosPais = d.ramosPais || {}; d.ramosPais[pais] = d.ramosPais[pais] || {}; if (!d.ramosPais[pais][ramo]) { d.ramosPais[pais][ramo] = []; save(); } },
    addSubramo: (pais, ramo, sub) => { d.ramosPais = d.ramosPais || {}; d.ramosPais[pais] = d.ramosPais[pais] || {}; d.ramosPais[pais][ramo] = d.ramosPais[pais][ramo] || []; if (d.ramosPais[pais][ramo].indexOf(sub) < 0) { d.ramosPais[pais][ramo].push(sub); save(); } },
    add: (k, v) => { if (!v) return; d[k] = d[k] || []; if (d[k].indexOf(v) < 0) { d[k].push(v); save(); } },
    setList: (k, arr) => { d[k] = arr; save(); },
    save,
    reset: () => { d = JSON.parse(JSON.stringify(DEF)); save(); },
    DEF
  };
})();

/* =========================================================
   SESSION — vista activa del usuario (multi-rol "ver como").
   Un usuario puede tener varios roles; elige cuál tablero ver.
   El asesor NO ve Orbit Ops (interno del equipo); ve sus
   gestiones vía Orbit Leads. Persistente.
   ========================================================= */
Orbit.session = (function () {
  const KEY = 'orbit360_sessionview';
  const def = { rol: 'Dirección', asesorId: 'ase001' };
  let d = null;
  try { const r = localStorage.getItem(KEY); if (r) d = JSON.parse(r); } catch (e) {}
  if (!d) d = JSON.parse(JSON.stringify(def));
  function save() { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function esAsesor() { return d.rol === 'Asesor'; }
  /* Normaliza etiquetas libres del seed ("Asesor Sr.", "Asesora Jr.", etc.) al rol
     CANÓNICO de Orbit.ROLES por coincidencia de substring — evita que el fail-closed
     de rolesAsignados() rechace usuarios legacy cuyo campo `rol` es solo una etiqueta. */
  function rolCanonico(rolLibre) {
    if (!rolLibre) return null;
    if (Orbit.ROLES && Orbit.ROLES[rolLibre]) return rolLibre;
    const claves = Orbit.ROLES ? Object.keys(Orbit.ROLES) : [];
    const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const rl = norm(rolLibre);
    const found = claves.find(k => rl.indexOf(norm(k)) >= 0 || norm(k).indexOf(rl) >= 0);
    return found || null;
  }
  /* Roles asignables del usuario ficticio actual: si el asesor vinculado declara roles[],
     solo esos son seleccionables. Sin roles[] declarado, FAIL-CLOSED: solo su rol único (a.rol),
     nunca todo el catálogo. */
  function rolesAsignados() {
    if (!(window.Orbit && Orbit.store)) return null; // store aún no cargó (bootstrap pendiente) — YA NO asume [d.rol]
    try {
      const a = d.asesorId ? Orbit.store.get('asesores', d.asesorId) : null;
      if (!a || a.inactivo || a.status === 'blocked' || a.status === 'suspended') return []; // usuario inexistente/inactivo/suspendido: FAIL-CLOSED
      if (a.roles && a.roles.length) return a.roles;
      if (a.rol) { const c = rolCanonico(a.rol); if (c) return [c]; }
      // Registro existe pero sin roles[]/rolDefault/rol válido: FAIL-CLOSED.
      return [];
    } catch (e) { return []; }
  }
  /* Si el rol activo persistido ya no está entre los asignados del asesor vinculado
     (p.ej. se le quitó ese rol en Equipo), vuelve a rolDefault o al primero asignado
     en vez de quedarse en un rol inválido. */
  function normalizarRolActivo() {
    try {
      const asignados = rolesAsignados();
      if (asignados === null || !asignados.length) return; // bootstrap pendiente o sin roles resolubles: nada a qué normalizar aún
      if (asignados.indexOf(d.rol) < 0) {
        const a = (Orbit.store && d.asesorId) ? Orbit.store.get('asesores', d.asesorId) : null;
        d.rol = (a && a.rolDefault && asignados.indexOf(a.rolDefault) >= 0) ? a.rolDefault : asignados[0];
        save();
      }
    } catch (e) {}
  }
  try { normalizarRolActivo(); } catch (e) {}
  return {
    rol: () => {
      try { normalizarRolActivo(); } catch (e) {}
      try {
        const asignados = rolesAsignados();
        if (asignados === null) return d.rol; // bootstrap pendiente: la app aún no puede consultar datos reales
        if (!asignados.length) return ''; // identidad inválida/inactiva/sin rol resoluble: FAIL-CLOSED real
      } catch (e) { return ''; }
      return d.rol;
    },
    asesorId: () => d.asesorId,
    esAsesor,
    rolesAsignados,
    verEmpresa: () => ['Dirección', 'Admin', 'Finanzas'].includes(d.rol),
    canSee: (route) => { try { normalizarRolActivo(); } catch (e) {} const a = (d.asesorId && Orbit.store) ? Orbit.store.get('asesores', d.asesorId) : null; if (!a || a.inactivo || a.status === 'blocked' || a.status === 'suspended') return false; if (a.modulosOverride && a.modulosOverride.length) return a.modulosOverride.includes(route); const r = Orbit.ROLES[d.rol]; if (!r) return false; return !r.modulos || r.modulos.includes(route); },
    /* set(rol, asesorId): SIEMPRE valida contra los roles asignados del asesor DESTINO
       (el que quedará activo tras el cambio) — incluso cuando se cambia de asesor
       explícitamente. Antes, cambiar de asesor evadía la validación de rol. */
    set: (rol, asesorId) => {
      const asesorDestino = asesorId || d.asesorId;
      const a = (Orbit.store && asesorDestino) ? Orbit.store.get('asesores', asesorDestino) : null;
      if (!a || a.inactivo || a.status === 'blocked' || a.status === 'suspended') { try { Orbit.ui && Orbit.ui.toast && Orbit.ui.toast('Usuario inexistente, inactivo o suspendido.'); } catch (e) {} return false; }
      const permitidos = (a.roles && a.roles.length) ? a.roles : (a.rol && rolCanonico(a.rol) ? [rolCanonico(a.rol)] : []);
      if (permitidos.indexOf(rol) < 0) { try { Orbit.ui && Orbit.ui.toast && Orbit.ui.toast('Ese rol no está asignado a ese usuario.'); } catch (e) {} return false; }
      d.rol = rol; if (asesorId) d.asesorId = asesorId; save(); document.dispatchEvent(new CustomEvent('orbit:session')); return true;
    }
  };
})();

Orbit.tenant = (function () {
  const KEY = 'orbit360_tenant';
  const DEFAULT = {
    empresa: 'Tu marca',
    plan: 'personalizado',
    paises: ['GT', 'CO'],
    monedaBase: 'GTQ',
    // Config fiscal por país (fuente ÚNICA multi-tenant): IVA, moneda, gastos de emisión.
    // La leen facturaAseg (Finanzas), el motor de primas y la creación de pólizas.
    paisesCfg: {
      GT: { iva: 12, moneda: 'GTQ', gastosEmisionPct: 5 },
      CO: { iva: 19, moneda: 'COP', gastosEmisionPct: 0 }
    },
    branding: { logo: '', sidebar: 'oscuro', paleta: 'rojo', tipografia: 'Manrope' },
    // Producto comercializable: etiquetas técnicas (NÚCLEO/BETA/PRÓX) ocultas por defecto.
    // Poner en false SOLO en modo interno/demo desde Configuración → Marca.
    hideTechnicalBadges: true,
    // módulos activos (config INTERNA nuestra) — todos los del nav
    modulosActivos: ['inicio', 'cronograma', 'ops', 'leads', 'aseguradoras', 'cotizador', 'comparativo', 'cliente360', 'polizas', 'cobros', 'conciliaciones', 'renovaciones', 'cancelaciones', 'siniestros', 'historial', 'comisiones', 'importar', 'calidad', 'plantillas', 'reportes', 'ia', 'academia', 'insights', 'correo', 'automatizaciones', 'notificaciones', 'marketing', 'portal', 'finanzas', 'equipo', 'configuracion'],
    addons: { make: false, drive: true, whatsapp: true, correo: true, metricool: false, facebook: false, linkedin: false, web: true, canva: false, gamma: false, heygen: false, ia: false, mailchimp: false, sheets: false },
    portalVisibility: { polizas: true, recibos: true, documentos: true, asesor: true, comisiones: false, drive: false },
    // Glosario/localización POR TENANT: sobreescribe términos por clave (opcional, por país).
    // Formato: { GT: { poliza: 'Póliza', ... }, CO: {...}, '*': {...} }. Vacío = usa defaults de Orbit.TERMINOS.
    glosario: {},
    // Catálogo financiero editable por tenant (P6): categorías de ingresos/egresos + especiales.
    // Incluye las clases usadas por el seed para no romper movimientos existentes.
    catalogoFinanciero: {
      ingresos: ['Comisiones aseguradora', 'Incentivos', 'Honorarios', 'Reintegros', 'Aportes', 'Otros'],
      egresos: ['Comisiones asesores', 'Gastos fijos', 'Marketing', 'Operación', 'Tecnología', 'Administración', 'Impuestos', 'Bancos', 'Devolución de préstamo', 'Otros'],
      especiales: ['Saldo inicial', 'Transferencia interna', 'Ajuste', 'Sin clasificar']
    },
    // Plantilla de impresión del Comparativo, configurable por tenant (secciones visibles + etiquetas).
    // No copia formato/datos reales de A&S — son defaults genéricos editables.
    comparativoPlantilla: {
      secciones: { primaTotal: true, formaPago: true, primaNeta: true, ivaRecargos: true, coberturas: true },
      etiquetas: { primaTotal: 'Prima total', formaPago: 'Forma de pago', primaNeta: 'Prima neta', ivaRecargos: 'IVA / recargos', coberturas: 'Coberturas' }
    },
    // Ponderación del criterio "Equilibrio" del Comparativo, configurable por tenant (% precio vs % cobertura, suman 100).
    comparativoPonderacion: { precio: 50, cobertura: 50 },
    // Etiquetas/iconos de los 3 criterios de recomendación, configurables por tenant (el cálculo
    // sigue siendo precio/cobertura/equilibrio — se personaliza cómo se llaman y su ícono).
    comparativoCriterios: {
      precio: { label: 'Precio', icon: '💵' },
      cobertura: { label: 'Cobertura', icon: '🛡️' },
      equilibrio: { label: 'Equilibrio', icon: '⚖️' }
    },
    // Cierre financiero por tenant (P5): último periodo consolidado. Vacío = se calcula
    // relativo a la fecha viva (2 meses atrás). Configurable por país en Configuración.
    cierreFinanciero: {},
    apis: []
  };
  let data = null;
  try { const raw = localStorage.getItem(KEY); if (raw) data = JSON.parse(raw); } catch (e) {}
  if (!data) data = JSON.parse(JSON.stringify(DEFAULT));
  else { // heredar claves nuevas del DEFAULT sin pisar lo que el cliente ya configuró
    for (const k in DEFAULT) { if (!(k in data)) data[k] = JSON.parse(JSON.stringify(DEFAULT[k])); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  return {
    get: () => data,
    set: (patch) => { Object.assign(data, patch); save(); document.dispatchEvent(new CustomEvent('orbit:tenant')); },
    setDeep: (k, v) => { data[k] = v; save(); document.dispatchEvent(new CustomEvent('orbit:tenant')); },
    isActive: (route) => (data.modulosActivos.includes(route) || (DEFAULT.modulosActivos.indexOf(route) >= 0 && !(data.modulosDesactivados || []).includes(route))),
    reset: () => { data = JSON.parse(JSON.stringify(DEFAULT)); save(); document.dispatchEvent(new CustomEvent('orbit:tenant')); },
    DEFAULT
  };
})();

/* ============================================================
   Localización por país — términos configurables por tenant.
   Uso en módulos:  Orbit.termino('poliza')  ó  Orbit.termino('poliza', 'CO')
   Resolución:  tenant.glosario[pais][clave]  →  tenant.glosario['*'][clave]
                →  Orbit.TERMINOS[pais][clave]  →  Orbit.TERMINOS['*'][clave]  →  clave
   Todo es override opcional; sin config usa los defaults de abajo. NO rompe textos existentes.
   ============================================================ */
Orbit.TERMINOS = {
  '*': {
    poliza: 'Póliza', recibo: 'Recibo', prima: 'Prima', prima_neta: 'Prima neta',
    cliente: 'Cliente', asegurado: 'Asegurado', aseguradora: 'Aseguradora',
    comision: 'Comisión', ramo: 'Ramo', vigencia: 'Vigencia', deducible: 'Deducible',
    siniestro: 'Siniestro', cobro: 'Cobro', tomador: 'Tomador', id_fiscal: 'ID fiscal',
    corredor: 'Corredor', gestion: 'Gestión'
  },
  GT: { id_fiscal: 'NIT', tomador: 'Contratante', corredor: 'Corredor de seguros' },
  CO: { id_fiscal: 'NIT', tomador: 'Tomador', corredor: 'Intermediario de seguros', comision: 'Comisión de intermediación' },
  MX: { id_fiscal: 'RFC', tomador: 'Contratante', corredor: 'Agente de seguros' },
  PA: { id_fiscal: 'RUC', poliza: 'Póliza' },
  CR: { id_fiscal: 'Cédula jurídica', corredor: 'Corredor de seguros' }
};
Orbit.termino = function (clave, pais) {
  if (!clave) return '';
  try {
    const t = (Orbit.tenant && Orbit.tenant.get) ? Orbit.tenant.get() : {};
    const p = pais || Orbit.pais || (t.paises && t.paises[0]) || '*';
    const g = t.glosario || {};
    const src = [ g[p], g['*'], Orbit.TERMINOS[p], Orbit.TERMINOS['*'] ];
    for (const o of src) { if (o && o[clave] != null && o[clave] !== '') return o[clave]; }
  } catch (e) {}
  return clave;
};

Orbit.NAV = [
  { type: 'home', route: 'inicio', icon: '🌅', label: 'Orbit Inicio' },
  {
    type: 'group', label: 'Operación', open: true, items: [
      { route: 'cronograma', icon: '📅', label: 'Cronograma', estado: 'beta' },
      { route: 'ops', icon: '🗂', label: 'Orbit Ops', estado: 'beta' },
      { route: 'leads', icon: '🎯', label: 'Orbit Leads', estado: 'beta' },
      { route: 'aseguradoras', icon: '🏢', label: 'Orbit Aseguradoras', estado: 'beta' },
      { route: 'cotizador', icon: '🧮', label: 'Cotizador', estado: 'beta' },
      { route: 'comparativo', icon: '📋', label: 'Comparativo', estado: 'beta' }
    ]
  },
  {
    type: 'group', label: 'Orbit CRM', open: true, items: [
      { route: 'cliente360', icon: '🧑‍💼', label: 'Clientes 360', estado: 'core' },
      { route: 'polizas', icon: '📑', label: 'Pólizas', estado: 'core' },
      { route: 'cobros', icon: '💳', label: 'Cobros y cartera', estado: 'core' },
      { route: 'conciliaciones', icon: '🔗', label: 'Conciliaciones', estado: 'core' },
      { route: 'renovaciones', icon: '🔄', label: 'Renovaciones', estado: 'core' },
      { route: 'cancelaciones', icon: '✕', label: 'Cancelaciones', estado: 'core' },
      { route: 'siniestros', icon: '🚨', label: 'Siniestros', estado: 'beta' },
      { route: 'historial', icon: '📝', label: 'Historial y actividades', estado: 'core' },
      { route: 'comisiones', icon: '💼', label: 'Comisiones', estado: 'core' }
    ]
  },
  {
    type: 'group', label: 'Datos e importación', open: false, items: [
      { route: 'importar', icon: '⬇', label: 'Importación inteligente', estado: 'beta' },
      { route: 'calidad', icon: '🩺', label: 'Calidad de datos', estado: 'beta' },
      { route: 'plantillas', icon: '✉', label: 'Plantillas de mensajes', estado: 'beta' },
      { route: 'reportes', icon: '📈', label: 'Reportes', estado: 'beta' }
    ]
  },
  {
    type: 'group', label: 'Gestión y recursos', open: false, items: [
      { route: 'ia', icon: '🤖', label: 'Orbit IA', estado: 'beta' },
      { route: 'academia', icon: '🎓', label: 'Orbit Academia', estado: 'beta' }
    ]
  },
  {
    type: 'group', label: 'Analítica', open: false, items: [
      { route: 'insights', icon: '📊', label: 'Orbit Insights', estado: 'beta' }
    ]
  },
  {
    type: 'group', label: 'Comunicación', open: false, items: [
      { route: 'correo', icon: '✉', label: 'Correo', estado: 'beta' },
      { route: 'automatizaciones', icon: '⚡', label: 'Automatizaciones', estado: 'beta' },
      { route: 'notificaciones', icon: '💬', label: 'Notificaciones WA', estado: 'beta' },
      { route: 'marketing', icon: '📣', label: 'Orbit Marketing', estado: 'beta' },
      { route: 'portal', icon: '🚪', label: 'Portal del Cliente', estado: 'beta' }
    ]
  },
  {
    type: 'group', label: 'Administración', open: false, items: [
      { route: 'finanzas', icon: '💰', label: 'Orbit Finanzas', estado: 'beta' },
      { route: 'equipo', icon: '👥', label: 'Equipo y permisos', estado: 'beta' },
      { route: 'configuracion', icon: '⚙', label: 'Configuración', estado: 'road' }
    ]
  }
];

/* Metadatos para módulos aún no construidos (pantalla placeholder honesta) */
Orbit.MODULE_META = {
  ops: { icon: '🗂', title: 'Orbit Ops', estado: 'beta', desc: 'Kanban colaborativo de gestiones del intermediario: cotizaciones, leads, inspecciones, emisiones, renovaciones y modificaciones — con ficha editable y flujos personalizables.', scope: ['6 columnas reales con color y conteo', 'Tarjeta con asesor, aseguradora, producto, prioridad y checklist documental', 'Ficha 360 editable por gestión', 'Flujos personalizables por tipo de actividad', 'Sincronía con Cliente 360 y Finanzas'] },
  leads: { icon: '🎯', title: 'Orbit Leads', estado: 'beta', desc: 'Pipeline comercial con cadencias automáticas de seguimiento de prospectos.', scope: ['Embudo por etapa con probabilidad de cierre', 'Cadencias automáticas (toques programados)', 'Origen y canal de cada lead', 'Conversión de lead → cliente sin recapturar datos'] },
  cotizador: { icon: '🧮', title: 'Cotizador multicompañía', estado: 'road', desc: 'Wizard Tipo → Cliente → Cotizaciones que consulta varias aseguradoras a la vez con tarifas oficiales. Útil para equipo, asesores y clientes.', scope: ['Multicompañía en paralelo', 'Wizard de 3 pasos integrado al shell', 'País GT / CO y tarifas oficiales', 'Resultado lleva directo a emisión y a Cliente 360'] },
  comparativo: { icon: '📋', title: 'Comparativo IA', estado: 'road', desc: 'Extrae coberturas de PDFs y genera una recomendación consultiva — mucho más que una tabla.', scope: ['Lectura de coberturas desde PDF (IA)', 'Tabla visual lado a lado', 'Recomendación consultiva argumentada', 'Imprimir / enviar por WhatsApp'] },
  aseguradoras: { icon: '🏢', title: 'Orbit Aseguradoras', estado: 'beta', desc: 'Directorio + repositorio por aseguradora (contactos, logos, cotizadores, clausulados, pólizas ejemplo) que además alimenta a Orbit IA.', scope: ['Directorio con contactos y accesos', 'Repositorio de clausulados y cotizadores', 'Pólizas ejemplo por ramo', 'Fuente de conocimiento para Orbit IA'] },
  ia: { icon: '🤖', title: 'Orbit IA', estado: 'beta', desc: 'Un cerebro, tres usuarios: asesora al equipo interno, a los asesores (mejores argumentos de venta) y a los clientes, usando el repositorio y la biblioteca de conocimiento.', scope: ['Asesoría según tipo de usuario', 'Argumentos de venta por propuesta', 'Responde sobre una propuesta puntual', 'Usa repositorio de aseguradoras + biblioteca'] },
  academia: { icon: '🎓', title: 'Orbit Academia', estado: 'road', desc: 'Centro de formación: certificación, inducción, capacitación técnica/comercial/blandas y piezas comerciales.', scope: ['Rutas de certificación e inducción', 'Capacitación técnica, comercial y habilidades blandas', 'Biblioteca de piezas comerciales', 'Progreso por asesor'] },
  insights: { icon: '📊', title: 'Orbit Insights', estado: 'beta', desc: 'Analítica integral en 9 vistas sobre los datos del CRM.', scope: ['Resumen · Metas · Cumplimiento', 'Recaudo · Cartera · Devengado', 'Top clientes · Vencidas s/renovar · Análisis crítico', 'Se alimenta de Cliente 360, Cobros y Comisiones'] },
  notificaciones: { icon: '💬', title: 'Notificaciones WhatsApp', estado: 'road', desc: 'Mensajería transaccional y de seguimiento por WhatsApp, automatizada por cadencia.', scope: ['Recordatorios de pago y renovación', 'Cadencias automáticas de seguimiento', 'Encuestas de satisfacción', 'Plantillas configurables'] },
  marketing: { icon: '📣', title: 'Orbit Marketing', estado: 'beta', desc: 'Calendario real (cada día con sus piezas), creación/automatización de contenidos y segmentación desde la cartera real → campañas inteligentes.', scope: ['Calendario por día con piezas', 'Automatización de creación de piezas', 'Segmentación desde info real de clientes', 'Campañas inteligentes medibles'] },
  finanzas: { icon: '💰', title: 'Orbit Finanzas', estado: 'beta', desc: 'Movimientos, liquidaciones (empresa + asesores), import de estados de cuenta y planillas, con DOBLE conciliación cobro confirmado/conciliado↔póliza.', scope: ['Movimientos mensuales', 'Liquidación de comisiones empresa y asesores', 'Importar estados de cuenta y planillas', 'Doble conciliación: cobro confirmado/conciliado con póliza'] },
  equipo: { icon: '👥', title: 'Equipo y permisos', estado: 'road', desc: 'Gestión de usuarios, roles y permisos sin escribir código.', scope: ['Roles y permisos por módulo', 'Metas por asesor', 'Estructura por equipo / país', 'Sin código'] },
  configuracion: { icon: '⚙', title: 'Configuración', estado: 'road', desc: 'Parámetros del intermediario: países, ramos, aseguradoras, plantillas y metas — todo sin código.', scope: ['Países y ramos', 'Catálogo de aseguradoras', 'Plantillas y metas', 'White-label / marca'] },
  reportes: { icon: '📈', title: 'Reportes', estado: 'road', desc: 'Zona de reportes exportables sobre todos los datos del CRM y Finanzas.', scope: ['Reportes de cartera, recaudo y comisiones', 'Filtros por país, asesor, aseguradora y periodo', 'Exportar a Excel / PDF', 'Reportes programados por correo'] },
  portal: { icon: '🚪', title: 'Portal del Cliente', estado: 'road', desc: 'Portal externo para el cliente final: sus pólizas, recibos, documentos y contacto directo con su asesor.', scope: ['Consulta de pólizas y vigencias', 'Recibos y estado de pagos', 'Documentos (enlace a Drive)', 'Contacto con su asesor y solicitudes'] }
};
