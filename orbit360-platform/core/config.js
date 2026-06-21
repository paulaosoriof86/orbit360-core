/* ============================================================
   Orbit 360 · Configuración de navegación + metadatos de módulos
   Una sola fuente de verdad para el sidebar y el router.
   estado: 'core' (Núcleo) · 'beta' · 'road' (Roadmap)
   ============================================================ */
window.Orbit = window.Orbit || {};

/* Títulos de módulo (banda de header) — plantilla personalizable por cliente.
   Cada cliente/plan puede sobreescribir icon, title, sub y features. */
Orbit.MODULE_TITLES = {
  inicio:        { icon: '🌅', title: 'Orbit Inicio', sub: 'Mi día', features: ['Metas del mes', 'Prioridades', 'Avance por asesor'] },
  cliente360:    { icon: '🧑‍💼', title: 'Orbit Clientes', sub: 'Base de asegurados', features: ['Expediente 360', 'Autogestionable', 'Importación inteligente'] },
  polizas:       { icon: '📑', title: 'Orbit Pólizas', sub: 'Cartera completa', features: ['Multi-aseguradora', 'Vigencias', 'Ramos y productos'] },
  cobros:        { icon: '💳', title: 'Orbit Cobros', sub: 'Cartera y conciliación', features: ['Aging', 'Recibos', 'Conciliación pago↔póliza'] },
  renovaciones:  { icon: '🔄', title: 'Orbit Renovaciones', sub: 'Pipeline por vencer', features: ['90 días', 'Por urgencia', 'Gestión'] },
  cancelaciones: { icon: '✕', title: 'Orbit Cancelaciones', sub: 'Fuga de cartera', features: ['Motivos', 'Valor perdido', 'Tasa de fuga'] },
  comisiones:    { icon: '💼', title: 'Orbit Comisiones', sub: 'Devengado y liquidado', features: ['Por asesor', 'Por aseguradora', 'Por periodo'] },
  historial:     { icon: '📝', title: 'Orbit Historial', sub: 'Actividades de la cartera', features: ['Llamadas', 'WhatsApp', 'Reuniones'] },
  importar:      { icon: '⬇', title: 'Orbit Importa', sub: 'Importación inteligente', features: ['Cualquier formato', 'Mapeo automático', 'Adaptable'] },
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
