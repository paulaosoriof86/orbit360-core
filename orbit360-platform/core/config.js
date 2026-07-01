/* ============================================================
   CXOrbia · Core configuration (white-label + navigation)
   Everything tenant-specific lives here. Re-theme and re-label
   the whole product without touching module code.
   ============================================================ */
window.CX = window.CX || {};

/* ---------- Brand / white-label ---------- */
CX.BRAND = {
  name: 'CXOrbia',
  tagline: 'Field Operations Platform',
  // "Plataforma desarrollada para <client>" en el login. Vacío = marca propia.
  clientName: '',
  logoText: 'CX',     // fallback cuando no hay imagen de logo
  logoUrl: '',        // data-URL o ruta de imagen del cliente
  theme: 'cxorbia',   // id de CX.THEMES
  demoMode: true,
  showAITag: true,
  // colors se sincroniza desde el tema activo (no editar a mano)
  colors: {},
};

/* ---------- Temas (plantillas de marca seleccionables) ----------
   Cada cliente puede partir de una plantilla y ajustarla. La de T&A
   reproduce exactamente la plataforma actual (Segoe UI, azul/rojo, sidebar claro). */
CX.THEMES = {
  cxorbia: {
    label: 'CXOrbia (oscuro)', font: "'Manrope', system-ui, sans-serif", railStyle:'dark',
    colors:{ brand:'#2196d3', brandDark:'#1565a8', brandMid:'#4ab4e6', brandLight:'#e8f4fd',
             navy:'#0d2740', navy2:'#123553', accent:'#c8232c' },
  },
  tya: {
    label: 'Corporativo claro (Segoe UI)', font: "'Segoe UI', Tahoma, system-ui, sans-serif", railStyle:'light',
    colors:{ brand:'#2196d3', brandDark:'#1565a8', brandMid:'#4ab4e6', brandLight:'#e8f4fd',
             navy:'#ffffff', navy2:'#fafbfd', accent:'#c8232c' },
  },
  esmeralda: {
    label: 'Esmeralda (banca)', font: "'Manrope', system-ui, sans-serif", railStyle:'dark',
    colors:{ brand:'#0e9c6e', brandDark:'#0a7050', brandMid:'#3fbf93', brandLight:'#e2f7ef',
             navy:'#0c2a22', navy2:'#123a30', accent:'#d97706' },
  },
  violeta: {
    label: 'Violeta (retail/food)', font: "'Manrope', system-ui, sans-serif", railStyle:'dark',
    colors:{ brand:'#7c3aed', brandDark:'#5b21b6', brandMid:'#a78bfa', brandLight:'#f3eeff',
             navy:'#1e1530', navy2:'#2a1f42', accent:'#ec4899' },
  },
  grisOscuro: {
    label: 'Corporativo gris oscuro', font: "'Manrope', system-ui, sans-serif", railStyle:'graydark',
    colors:{ brand:'#2196d3', brandDark:'#1565a8', brandMid:'#4ab4e6', brandLight:'#e8f4fd',
             navy:'#2b2f36', navy2:'#363b44', accent:'#c8232c' },
  },
  grisClaro: {
    label: 'Corporativo gris claro', font: "'Manrope', system-ui, sans-serif", railStyle:'graylight',
    colors:{ brand:'#2196d3', brandDark:'#1565a8', brandMid:'#4ab4e6', brandLight:'#e8f4fd',
             navy:'#e4e7ec', navy2:'#d8dce3', accent:'#c8232c' },
  },
  indigo: {
    label: 'Índigo (consultoría)', font: "'Manrope', system-ui, sans-serif", railStyle:'dark',
    colors:{ brand:'#4f46e5', brandDark:'#3730a3', brandMid:'#818cf8', brandLight:'#eef0ff',
             navy:'#161a36', navy2:'#1f244a', accent:'#f59e0b' },
  },
  teal: {
    label: 'Teal (salud/servicios)', font: "'Manrope', system-ui, sans-serif", railStyle:'dark',
    colors:{ brand:'#0d9488', brandDark:'#0a6e66', brandMid:'#2dd4bf', brandLight:'#e0f5f2',
             navy:'#0c2522', navy2:'#123733', accent:'#f97316' },
  },
};

/* Aplica un tema completo (colores + tipografía + estilo de sidebar) */
CX.applyTheme = function(id){
  const t = CX.THEMES[id] || CX.THEMES.cxorbia;
  CX.BRAND.theme = id; CX.BRAND.colors = Object.assign({}, t.colors);
  const r = document.documentElement.style, c = t.colors;
  r.setProperty('--brand', c.brand);
  r.setProperty('--brand-dark', c.brandDark);
  r.setProperty('--brand-mid', c.brandMid);
  r.setProperty('--brand-light', c.brandLight);
  r.setProperty('--navy', c.navy);
  r.setProperty('--navy-2', c.navy2);
  r.setProperty('--accent', c.accent);
  r.setProperty('--ui', t.font);
  r.setProperty('--disp', t.font);
  document.documentElement.setAttribute('data-rail', t.railStyle);
  try{ localStorage.setItem('cx_theme', id); }catch(e){}
};

/* Compat: applyBrand reaplica el tema activo */
CX.applyBrand = function(){
  let id = CX.BRAND.theme;
  try{ const saved = localStorage.getItem('cx_theme'); if(saved && CX.THEMES[saved]) id = saved; }catch(e){}
  CX.applyTheme(id);
  try{ const ten = JSON.parse(localStorage.getItem('cx_tenant')||'null'); if(ten){ Object.assign(CX.BRAND, ten); CX.applyTheme(CX.BRAND.theme); } }catch(e){}
  /* leer identidad guardada por módulo Marca (cx_brand_identity) */
  try{ const b = JSON.parse(localStorage.getItem('cx_brand_identity')||'null');
    if(b){ Object.assign(CX.BRAND, b);
      if(b.theme) CX.applyTheme(b.theme);
    }
  }catch(e){}
};

/* ---------- Módulos activos por tenant (nunca se eliminan, solo se ocultan) ---------- */
CX.tenantModules = function(){
  try{ const s = JSON.parse(localStorage.getItem('cx_modules')||'null'); if(s) return s; }catch(e){}
  return null; // null = todos activos
};
CX.moduleEnabled = function(id){
  /* módulos de administración/configuración: SIEMPRE activos para admin, ignorando el mapa de plan guardado */
  const adminAlways=['cuestionarios','usuarios','config','automatizaciones','integraciones','correo','marca',
    'clientes','proyectos','financiero','movimientos','liquidaciones','lotes','costos','crm','marketing',
    'informes','soporte','tablon','documentos','aprendizaje','cert','rutas','postulaciones','shoppers',
    'visitas','reservas','shoppers','dashboard','midia'];
  if(adminAlways.includes(id)) return true;
  const s = CX.tenantModules(); return !s || s[id] !== false;
};
CX.setModuleEnabled = function(id, on){
  const s = CX.tenantModules() || {}; s[id] = on;
  try{ localStorage.setItem('cx_modules', JSON.stringify(s)); }catch(e){}
};

/* ---------- Module registry metadata ----------
   status: 'ready'  -> fully built
           'beta'   -> functional, being deepened
           'soon'   -> scaffold placeholder
   The render fn is attached by each file in /app/modules via CX.module(id, fn).
*/
CX.MODULES = {
  // Operación (admin + shopper)
  midia:         { icon:'☀️', label:'Mi Día',              roles:['admin','shopper'], status:'ready' },
  dashboard:     { icon:'📊', label:'Dashboard Operativo',  roles:['admin'],           status:'ready' },
  clientes:      { icon:'🏢', label:'Clientes',             roles:['admin'],           status:'ready' },
  importador:    { icon:'📥', label:'Importador',           roles:['admin'],           status:'ready' },
  proyectos:     { icon:'🗂️', label:'Proyectos',            roles:['admin'],           status:'ready' },
  visitas:       { icon:'📋', label:'Visitas Disponibles',  roles:['admin','shopper'], status:'ready' },
  postulaciones: { icon:'📩', label:'Postulaciones',        roles:['admin'], badge:true, status:'ready' },
  reservas:      { icon:'🙋', label:'Reservas & Asignación', roles:['admin','shopper'], status:'ready' },
  misvisitas:    { icon:'🧭', label:'Mis Visitas',          roles:['shopper'],         status:'ready' },
  shoppers:      { icon:'👥', label:'Shoppers',             roles:['admin'],           status:'ready' },
  miperfil:      { icon:'👤', label:'Mi Perfil',            roles:['shopper'],         status:'ready' },
  rutas:         { icon:'🗺️', label:'Hojas de Ruta',        roles:['admin'],           status:'ready' },
  documentos:    { icon:'📎', label:'Recursos del proyecto', roles:['admin','shopper'], status:'ready' },
  aprendizaje:   { icon:'📚', label:'Academia',          roles:['admin','shopper'], status:'ready' },
  cert:          { icon:'🏆', label:'Certificación',        roles:['admin','shopper'], status:'ready' },
  tablon:        { icon:'📢', label:'Tablón / Novedades',   roles:['admin','shopper'], badgeNotif:true, status:'ready' },
  soporte:       { icon:'🤖', label:'Soporte IA',           roles:['admin','shopper'], status:'ready' },
  informes:      { icon:'📑', label:'Reportes & KPIs',      roles:['admin'],           status:'ready' },
  // Finanzas (admin)
  financiero:    { icon:'💹', label:'Dashboard Financiero', roles:['admin'],           status:'ready' },
  movimientos:   { icon:'🧾', label:'Movimientos',          roles:['admin'],           status:'ready' },
  liquidaciones: { icon:'💸', label:'Liquidaciones',        roles:['admin'],           status:'ready' },
  lotes:         { icon:'📦', label:'Lotes de Pago',        roles:['admin'],           status:'ready' },
  beneficios:    { icon:'💰', label:'Mis Beneficios',       roles:['shopper'],         status:'ready' },
  // Configuración (admin)
  cuestionarios: { icon:'🧩', label:'Cuestionarios',        roles:['admin'],           status:'ready' },
  usuarios:      { icon:'🔐', label:'Usuarios & Permisos',  roles:['admin'],           status:'ready' },
  config:        { icon:'⚙️', label:'Configuración',         roles:['admin'],           status:'ready' },
  automatizaciones: { icon:'⚡', label:'Automatizaciones',     roles:['admin'],           status:'ready' },
  integraciones: { icon:'🔌', label:'Integraciones & Add-ons',roles:['admin'],           status:'ready' },
  correo:        { icon:'✉️',  label:'Correo integrado',     roles:['admin'],           status:'ready' },
  marca:         { icon:'🎨',  label:'Identidad de Marca',   roles:['admin'],           status:'ready' },
  // Comercial / consultora (CRM + marketing) — roadmap del ecosistema
  costos:        { icon:'🧮', label:'Costos & Propuestas',  roles:['admin'],           status:'ready' },
  crm:           { icon:'🤝', label:'CRM Comercial',         roles:['admin'],           status:'ready' },
  marketing:     { icon:'📣', label:'Marketing & Contenidos',roles:['admin'],           status:'ready' },
  // Portal Estratégico del Cliente final (marca evaluada)
  cli_dashboard:   { icon:'📈', label:'Panorama',             roles:['cliente'], status:'ready' },
  cli_sucursales:  { icon:'🏬', label:'Sucursales & Score',   roles:['cliente'], status:'ready' },
  cli_acciones:    { icon:'🎯', label:'Planes de Acción',     roles:['cliente'], status:'ready' },
  cli_capacitacion:{ icon:'🎓', label:'Capacitación',         roles:['cliente'], status:'ready' },
  cli_reportes:    { icon:'📤', label:'Reportes',             roles:['cliente'], status:'ready' },
  cli_programa:    { icon:'🧮', label:'Mi Programa',          roles:['cliente'], status:'ready' },
  cli_market:      { icon:'✨', label:'Servicios & Add-ons',  roles:['cliente'], status:'ready' },
};

/* ---------- Navigation layout per role ---------- */
CX.NAV = {
  admin: [
    { sec:'Operación', items:['midia','dashboard','visitas','postulaciones','reservas','shoppers','informes'] },
    { sec:'Admin del Proyecto', items:['clientes','proyectos','rutas','cuestionarios','importador'] },
    { sec:'Capacitación & IA', items:['aprendizaje','cert','documentos','soporte'] },
    { sec:'Finanzas',  items:['financiero','movimientos','liquidaciones','lotes'] },
    { sec:'Comercial', items:['costos','crm','marketing'] },
    { sec:'Configuración', items:['config','usuarios','automatizaciones','integraciones','correo','marca'] },
  ],
  shopper: [
    { sec:'Operación', items:['midia','miperfil','visitas','reservas','misvisitas'] },
    { sec:'Capacitación & IA', items:['aprendizaje','cert','documentos','soporte'] },
    { sec:'Mis Beneficios', items:['beneficios'] },
  ],
  cliente: [
    { sec:'Estrategia',  items:['cli_dashboard','cli_sucursales','cli_acciones'] },
    { sec:'Desarrollo',  items:['cli_capacitacion','cli_reportes','cli_programa'] },
    { sec:'Crecimiento', items:['cli_market'] },
  ],
};

/* ---------- Roles del Portal del Cliente (scope de datos) ---------- */
CX.CLIENTE_ROLES = [
  { id:'director', label:'Director / C-level',        scope:'all',      desc:'Toda la marca' },
  { id:'regional', label:'Gerente Regional',          scope:'region',   desc:'Su región' },
  { id:'sucursal', label:'Responsable de Sucursal',   scope:'sucursal', desc:'Su sucursal' },
];

/* ---------- Catálogo de rubros/industrias (compartido: Clientes, Proyectos, CRM) ---------- */
CX.RUBROS = ['Retail · Cadena de tiendas','Banca · Red de agencias','Restaurantes · Multimarca','Salud · Clínicas','Telecomunicaciones','Automotriz · Concesionarios','Seguros','Combustibles · Estaciones','Hotelería','Educación','Supermercados','Farmacias','Belleza & Cuidado personal','Electrodomésticos','Moda & Calzado','Aerolíneas & Turismo','Inmobiliario','Gimnasios & Fitness','Entretenimiento','Otra'];

/* ---------- Catálogo de países + moneda (lista larga, no limitar) ---------- */
CX.COUNTRIES = [
  {c:'GT',n:'Guatemala',cur:'Q'},   {c:'HN',n:'Honduras',cur:'L'},
  {c:'SV',n:'El Salvador',cur:'$'}, {c:'NI',n:'Nicaragua',cur:'C$'},
  {c:'CR',n:'Costa Rica',cur:'₡'},  {c:'PA',n:'Panamá',cur:'B/.'},
  {c:'MX',n:'México',cur:'$'},      {c:'CO',n:'Colombia',cur:'$'},
  {c:'PE',n:'Perú',cur:'S/'},       {c:'EC',n:'Ecuador',cur:'$'},
  {c:'CL',n:'Chile',cur:'$'},       {c:'AR',n:'Argentina',cur:'$'},
  {c:'DO',n:'Rep. Dominicana',cur:'RD$'}, {c:'US',n:'Estados Unidos',cur:'US$'},
  {c:'ES',n:'España',cur:'€'},
];
/* etiqueta de país genérica (bandera emoji desde el código ISO + nombre) — funciona para cualquier país */
CX.paisName = function(c){ const f=CX.COUNTRIES.find(x=>x.c===c); return f?f.n:c; };
CX.paisFlag = function(c){ if(!c||c.length!==2) return '🏳️'; try{return String.fromCodePoint(...[...c.toUpperCase()].map(ch=>0x1F1E6+ch.charCodeAt(0)-65));}catch(e){return '🏳️';} };
CX.paisLabel = function(c){ return CX.paisFlag(c)+' '+CX.paisName(c); };
CX.moneda = function(p,c){ return (p.currency&&p.currency[c]) || (CX.COUNTRIES.find(x=>x.c===c)||{}).cur || '$'; };

/* ---------- Catálogo de tipografías seleccionables ---------- */
CX.FONTS = [
  { id:'segoe',   label:'Segoe UI (corporativa)', stack:"'Segoe UI', Tahoma, system-ui, sans-serif" },
  { id:'manrope', label:'Manrope',                stack:"'Manrope', system-ui, sans-serif" },
  { id:'inter',   label:'Inter',                  stack:"'Inter', system-ui, sans-serif" },
  { id:'system',  label:'Sistema',                stack:"system-ui, -apple-system, sans-serif" },
  { id:'georgia', label:'Georgia (serif)',        stack:"Georgia, 'Times New Roman', serif" },
];
CX.applyFont = function(id){
  const f=CX.FONTS.find(x=>x.id===id); if(!f)return;
  document.documentElement.style.setProperty('--ui', f.stack);
  document.documentElement.style.setProperty('--disp', f.stack);
  CX.BRAND.font=id; try{localStorage.setItem('cx_font',id);}catch(e){}
};

/* ---------- Patrón de credenciales (configurable por el cliente) ----------
   Tokens disponibles en los patrones:
     {nombre} {apellido}     → minúsculas sin tildes ni espacios
     {Nombre} {Apellido}     → capitalizado
     {inicial}               → primera letra del nombre (minúscula)
   Por defecto: usuario = nombre.apellido · contraseña = Nombre123*  */
CX.CREDS = {
  userPattern: '{nombre}.{apellido}',
  passPattern: '{Nombre}123*',
  load(){ try{ const s=JSON.parse(localStorage.getItem('cx_creds')||'null'); if(s){ this.userPattern=s.userPattern||this.userPattern; this.passPattern=s.passPattern||this.passPattern; } }catch(e){} },
  save(){ try{ localStorage.setItem('cx_creds',JSON.stringify({userPattern:this.userPattern,passPattern:this.passPattern})); }catch(e){} },
  _slug(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''); },
  _cap(s){ const t=this._slug(s); return t.charAt(0).toUpperCase()+t.slice(1); },
  _fill(pattern, nombre, apellido){
    return (pattern||'')
      .replace(/\{Nombre\}/g, this._cap(nombre))
      .replace(/\{Apellido\}/g, this._cap(apellido))
      .replace(/\{nombre\}/g, this._slug(nombre))
      .replace(/\{apellido\}/g, this._slug(apellido))
      .replace(/\{inicial\}/g, this._slug(nombre).charAt(0));
  },
  user(nombre, apellido){ return this._fill(this.userPattern, nombre, apellido) || 'usuario'; },
  pass(nombre, apellido){ return this._fill(this.passPattern, nombre, apellido) || 'Cambiar123*'; },
  /* descripción legible del patrón para la UI */
  userExample(){ return this.user('Nombre','Apellido'); },
  passExample(){ return this.pass('Nombre','Apellido'); },
};
try{ CX.CREDS.load(); }catch(e){}

/* ---------- Planes comerciales (preconfiguran el tenant) ---------- */
CX.PLANS = {
  basico:    { label:'Básico',     temas:['cxorbia','tya'], integraciones:['whatsapp_web','sheets_import'],
               modulos:['midia','dashboard','proyectos','visitas','postulaciones','shoppers','misvisitas','miperfil','documentos','tablon','soporte','beneficios'] },
  estandar:  { label:'Estándar',   temas:['cxorbia','tya','esmeralda','violeta'], integraciones:['whatsapp_web','sheets','excel_online','gmail'],
               modulos:'+aprendizaje,cert,rutas,informes' },
  pro:       { label:'Pro',        temas:'all', integraciones:['make','whatsapp_api','sheets','excel_online','gmail','outlook','mailchimp'],
               modulos:'+financiero,movimientos,liquidaciones,lotes,cuestionarios' },
  enterprise:{ label:'Enterprise', temas:'all', integraciones:'all', modulos:'all' },
};
/* devuelve la lista de módulos habilitados por un plan */
CX.planModules = function(planId){
  const order=Object.keys(CX.PLANS), idx=order.indexOf(planId);
  if(planId==='enterprise') return Object.keys(CX.MODULES);
  let set=new Set(CX.PLANS.basico.modulos);
  for(let i=1;i<=idx;i++){ const m=CX.PLANS[order[i]].modulos;
    if(m==='all'){return Object.keys(CX.MODULES);}
    if(typeof m==='string'&&m[0]==='+'){ m.slice(1).split(',').forEach(x=>set.add(x)); }
  }
  return [...set];
};
CX.applyPlan = function(planId){
  const mods=CX.planModules(planId), all=Object.keys(CX.MODULES), map={};
  /* Módulos de administración/configuración: SIEMPRE disponibles para admin, independiente del plan */
  const adminAlways=['cuestionarios','usuarios','config','automatizaciones','integraciones','correo','marca','clientes','proyectos','financiero','movimientos','liquidaciones','lotes','costos','crm','marketing','informes','soporte','tablon','documentos','aprendizaje','cert'];
  all.forEach(id=>map[id]=mods.includes(id)||adminAlways.includes(id));
  try{localStorage.setItem('cx_modules',JSON.stringify(map));localStorage.setItem('cx_plan',planId);}catch(e){}
  CX.BRAND.plan=planId;
};

/* ---------- Roles (for Usuarios module) ---------- */
CX.ROLES = [
  { id:'super',  label:'Super Admin',     desc:'Acceso total a toda la plataforma' },
  { id:'admin',  label:'Equipo administrativo', desc:'Operación + finanzas' },
  { id:'ops',    label:'Equipo operativo', desc:'Solo operación' },
  { id:'coordinador', label:'Coordinador / Representante', desc:'Administra proyectos y HR de su(s) país(es) asignado(s)', scopeCountry:true },
  { id:'aliado', label:'Aliado / Franquiciado', desc:'Opera proyectos regionales delegados · su país y sus shoppers', scopeCountry:true },
  { id:'shopper',label:'Shopper / Evaluador', desc:'Portal móvil' },
];

/* ---------- Firebase (optional) ----------
   Leave blank to run fully on local mock data. Fill keys to connect
   a real backend; the data layer auto-detects and switches.
*/
CX.FIREBASE = {
  apiKey: '', authDomain: '', databaseURL: '', projectId: '', storageBucket: '', appId: ''
};
