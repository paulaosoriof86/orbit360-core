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
  renovaciones:  { icon: '🔄', title: 'Orbit Renovaciones', sub: 'Pipeline por vencer', features: ['90 días', 'Por urgencia', 'Gestión'] },
  cancelaciones: { icon: '✕', title: 'Orbit Cancelaciones', sub: 'Fuga de cartera', features: ['Motivos', 'Valor perdido', 'Tasa de fuga'] },
  comisiones:    { icon: '💼', title: 'Orbit Comisiones', sub: 'Devengado y liquidado', features: ['Por asesor', 'Por aseguradora', 'Por periodo'] },
  historial:     { icon: '📝', title: 'Orbit Historial', sub: 'Actividades de la cartera', features: ['Llamadas', 'WhatsApp', 'Reuniones'] },
  importar:      { icon: '⬇', title: 'Orbit Importa', sub: 'Importación inteligente', features: ['Cualquier formato', 'Mapeo automático', 'Adaptable'] },
  calidad:       { icon: '🩺', title: 'Calidad de datos', sub: 'Expedientes a completar', features: ['Prioridad teléfono', 'Clientes con póliza vigente', 'Notificar por WA/correo'] },
  plantillas:    { icon: '✉', title: 'Plantillas de mensajes', sub: 'WhatsApp y correo', features: ['Propuestas', 'Primas pendientes', 'Actualización de datos'] },
  finanzas:      { icon: '💰', title: 'Orbit Finanzas', sub: 'Liquidaciones y conciliación', features: ['Movimientos', 'Liquidación empresa/asesores', 'Conciliación bancaria'] },
  aseguradoras:  { icon: '🏢', title: 'Aseguradoras', sub: 'Directorio operativo', features: ['Fichas completas', 'Ejecutivos de cuenta', 'Documentos', 'Comisiones por ramo'] }
};

/* Operación multipaís — el cliente puede operar uno o varios países. */
Orbit.PAISES = [
  { id: 'TODOS', label: 'Todos los países' },
  { id: 'GT', label: 'Guatemala', moneda: 'GTQ' },
  { id: 'CO', label: 'Colombia', moneda: 'COP' }
];
Orbit.pais = 'TODOS';

/* Catálogo geográfico (departamentos → ciudades) por país. Configurable por cliente. */
Orbit.GEO = {
  GT: { 'Guatemala': ['Guatemala', 'Mixco', 'Villa Nueva'], 'Quetzaltenango': ['Quetzaltenango', 'Coatepeque'], 'Escuintla': ['Escuintla', 'Santa Lucía'], 'Sacatepéquez': ['Antigua Guatemala'] },
  CO: { 'Cundinamarca': ['Bogotá', 'Soacha', 'Chía'], 'Antioquia': ['Medellín', 'Envigado', 'Itagüí'], 'Valle del Cauca': ['Cali', 'Palmira'], 'Atlántico': ['Barranquilla', 'Soledad'] }
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
  'Dirección': { nivel: 4, desc: 'Acceso total + configuración + comisión empresa.' },
  'Admin':     { nivel: 3, desc: 'Operación completa + configuración self-service.' },
  'Finanzas':  { nivel: 3, desc: 'Cobros, comisiones, finanzas, conciliación.' },
  'Asesor':    { nivel: 2, desc: 'Su cartera; ve solo su comisión.' },
  'Asistente': { nivel: 1, desc: 'Captura y gestión, sin comisiones ni config.' }
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
  return {
    rol: () => d.rol,
    asesorId: () => d.asesorId,
    esAsesor,
    verEmpresa: () => ['Dirección', 'Admin', 'Finanzas'].includes(d.rol),
    canSee: (route) => !(esAsesor() && route === 'ops'),
    set: (rol, asesorId) => { d.rol = rol; if (asesorId) d.asesorId = asesorId; save(); document.dispatchEvent(new CustomEvent('orbit:session')); }
  };
})();

Orbit.tenant = (function () {
  const KEY = 'orbit360_tenant';
  const DEFAULT = {
    empresa: 'Tu marca',
    plan: 'personalizado',
    paises: ['GT', 'CO'],
    monedaBase: 'GTQ',
    branding: { logo: '', sidebar: 'oscuro', paleta: 'rojo', tipografia: 'Manrope' },
    // módulos activos (config INTERNA nuestra) — todos los del nav
    modulosActivos: ['inicio', 'ops', 'leads', 'cotizador', 'comparativo', 'cliente360', 'polizas', 'cobros', 'renovaciones', 'cancelaciones', 'historial', 'comisiones', 'importar', 'calidad', 'plantillas', 'reportes', 'aseguradoras', 'ia', 'academia', 'insights', 'notificaciones', 'marketing', 'portal', 'finanzas', 'equipo', 'configuracion'],
    addons: { make: false, drive: true, whatsapp: true },
    portalVisibility: { polizas: true, recibos: true, documentos: true, asesor: true, comisiones: false, drive: false },
    apis: []
  };
  let data = null;
  try { const raw = localStorage.getItem(KEY); if (raw) data = JSON.parse(raw); } catch (e) {}
  if (!data) data = JSON.parse(JSON.stringify(DEFAULT));
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  return {
    get: () => data,
    set: (patch) => { Object.assign(data, patch); save(); document.dispatchEvent(new CustomEvent('orbit:tenant')); },
    setDeep: (k, v) => { data[k] = v; save(); document.dispatchEvent(new CustomEvent('orbit:tenant')); },
    isActive: (route) => data.modulosActivos.includes(route),
    reset: () => { data = JSON.parse(JSON.stringify(DEFAULT)); save(); document.dispatchEvent(new CustomEvent('orbit:tenant')); },
    DEFAULT
  };
})();

Orbit.NAV = [
  { type: 'home', route: 'inicio', icon: '🌅', label: 'Orbit Inicio' },
  {
    type: 'group', label: 'Operación', open: true, items: [
      { route: 'ops', icon: '🗂', label: 'Orbit Ops', estado: 'beta' },
      { route: 'leads', icon: '🎯', label: 'Orbit Leads', estado: 'beta' },
      { route: 'cotizador', icon: '🧮', label: 'Cotizador', estado: 'road' },
      { route: 'comparativo', icon: '📋', label: 'Comparativo', estado: 'road' }
    ]
  },
  {
    type: 'group', label: 'Orbit CRM', open: true, items: [
      { route: 'cliente360', icon: '🧑‍💼', label: 'Clientes 360', estado: 'core' },
      { route: 'polizas', icon: '📑', label: 'Pólizas', estado: 'core' },
      { route: 'cobros', icon: '💳', label: 'Cobros y cartera', estado: 'core' },
      { route: 'renovaciones', icon: '🔄', label: 'Renovaciones', estado: 'core' },
      { route: 'cancelaciones', icon: '✕', label: 'Cancelaciones', estado: 'core' },
      { route: 'historial', icon: '📝', label: 'Historial y actividades', estado: 'core' },
      { route: 'comisiones', icon: '💼', label: 'Comisiones', estado: 'core' }
    ]
  },
  {
    type: 'group', label: 'Datos e importación', open: false, items: [
      { route: 'importar', icon: '⬇', label: 'Importación inteligente', estado: 'beta' },
      { route: 'calidad', icon: '🩺', label: 'Calidad de datos', estado: 'beta' },
      { route: 'plantillas', icon: '✉', label: 'Plantillas de mensajes', estado: 'beta' },
      { route: 'reportes', icon: '📈', label: 'Reportes', estado: 'road' }
    ]
  },
  {
    type: 'group', label: 'Gestión y recursos', open: false, items: [
      { route: 'aseguradoras', icon: '🏢', label: 'Orbit Aseguradoras', estado: 'beta' },
      { route: 'ia', icon: '🤖', label: 'Orbit IA', estado: 'beta' },
      { route: 'academia', icon: '🎓', label: 'Orbit Academia', estado: 'road' }
    ]
  },
  {
    type: 'group', label: 'Analítica', open: false, items: [
      { route: 'insights', icon: '📊', label: 'Orbit Insights', estado: 'beta' }
    ]
  },
  {
    type: 'group', label: 'Comunicación', open: false, items: [
      { route: 'notificaciones', icon: '💬', label: 'Notificaciones WA', estado: 'road' },
      { route: 'marketing', icon: '📣', label: 'Orbit Marketing', estado: 'beta' },
      { route: 'portal', icon: '🚪', label: 'Portal del Cliente', estado: 'road' }
    ]
  },
  {
    type: 'group', label: 'Administración', open: false, items: [
      { route: 'finanzas', icon: '💰', label: 'Orbit Finanzas', estado: 'beta' },
      { route: 'equipo', icon: '👥', label: 'Equipo y permisos', estado: 'road' },
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
  finanzas: { icon: '💰', title: 'Orbit Finanzas', estado: 'beta', desc: 'Movimientos, liquidaciones (empresa + asesores), import de estados de cuenta y planillas, con DOBLE conciliación pago↔póliza.', scope: ['Movimientos mensuales', 'Liquidación de comisiones empresa y asesores', 'Importar estados de cuenta y planillas', 'Doble conciliación: pago aplicado a póliza creada'] },
  equipo: { icon: '👥', title: 'Equipo y permisos', estado: 'road', desc: 'Gestión de usuarios, roles y permisos sin escribir código.', scope: ['Roles y permisos por módulo', 'Metas por asesor', 'Estructura por equipo / país', 'Sin código'] },
  configuracion: { icon: '⚙', title: 'Configuración', estado: 'road', desc: 'Parámetros del intermediario: países, ramos, aseguradoras, plantillas y metas — todo sin código.', scope: ['Países y ramos', 'Catálogo de aseguradoras', 'Plantillas y metas', 'White-label / marca'] },
  reportes: { icon: '📈', title: 'Reportes', estado: 'road', desc: 'Zona de reportes exportables sobre todos los datos del CRM y Finanzas.', scope: ['Reportes de cartera, recaudo y comisiones', 'Filtros por país, asesor, aseguradora y periodo', 'Exportar a Excel / PDF', 'Reportes programados por correo'] },
  portal: { icon: '🚪', title: 'Portal del Cliente', estado: 'road', desc: 'Portal externo para el cliente final: sus pólizas, recibos, documentos y contacto directo con su asesor.', scope: ['Consulta de pólizas y vigencias', 'Recibos y estado de pagos', 'Documentos (enlace a Drive)', 'Contacto con su asesor y solicitudes'] }
};
