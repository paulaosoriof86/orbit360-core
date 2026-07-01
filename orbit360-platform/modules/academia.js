/* ============================================================
   CXOrbia · Academia — cursos por lecciones, por audiencia y categoría
   Modelo: curso → lecciones (5-6 por curso, profundas) → evaluación
   Igual a Orbit Academia: sidebar, progress, verify por pregunta, certificación.
   ============================================================ */
window.CX=window.CX||{};

/* ─ Catálogo de cursos ─ */
CX.acadData={
  CATS:(()=>{try{const s=JSON.parse(localStorage.getItem('cx_acad_cats')||'null');if(s&&Array.isArray(s)&&s.length)return s;}catch(e){}return ['Todos','Inducción','Operación','Set-up','Finanzas','Comercial','Técnico','IA','Industria MS'];})(),
  /* ── Persistencia de cursos personalizados ── */
  _ck:'cx_acad_cust',
  getCustom(r){ try{return JSON.parse(localStorage.getItem(this._ck+'_'+r)||'[]');}catch(e){return[];} },
  saveCustom(r,arr){ try{localStorage.setItem(this._ck+'_'+r,JSON.stringify(arr));}catch(e){} CX.bus&&CX.bus.emit('acad'); },
  addCourse(r,c){ const arr=this.getCustom(r); arr.unshift(Object.assign({id:'cu'+Date.now().toString(36),lessons:[]},c)); this.saveCustom(r,arr); },
  editCourse(r,cid,patch){ const cs=[...this.COURSES[r]||[],...this.getCustom(r)]; const c=cs.find(x=>x.id===cid); if(c)Object.assign(c,patch); const custom=this.getCustom(r); const cu=custom.find(x=>x.id===cid); if(cu)Object.assign(cu,patch); this.saveCustom(r,custom); },
  addLesson(r,cid,lesson){ const cs=[...this.COURSES[r]||[],...this.getCustom(r)]; const c=cs.find(x=>x.id===cid); if(c){c.lessons=c.lessons||[];c.lessons.push(Object.assign({id:'ls'+Date.now().toString(36)},lesson));} CX.bus&&CX.bus.emit('acad'); },
  editLesson(r,cid,lid,patch){ const cs=[...this.COURSES[r]||[],...this.getCustom(r)]; const c=cs.find(x=>x.id===cid); if(c){const l=(c.lessons||[]).find(x=>x.id===lid);if(l)Object.assign(l,patch);} CX.bus&&CX.bus.emit('acad'); },
  delLesson(r,cid,lid){ const cs=[...this.COURSES[r]||[],...this.getCustom(r)]; const c=cs.find(x=>x.id===cid); if(c){c.lessons=(c.lessons||[]).filter(x=>x.id!==lid);} CX.bus&&CX.bus.emit('acad'); },
  delCourse(r,cid){ this.saveCustom(r,this.getCustom(r).filter(x=>x.id!==cid)); },
  COURSES:{
    admin:[
      /* ─── INDUCCIÓN ─── */
      {id:'a_ind',cat:'Inducción',ic:'🚀',color:'#e0004d',n:'Inducción CXOrbia 360',
       desc:'Conoce la plataforma, el ciclo operativo y tu día a día como consultora.',
       cert:true,mins:65,
       lessons:[
         {id:'l1',ic:'🎯',n:'Bienvenida y visión',content:`
<h2>Bienvenida a CXOrbia</h2>
<p>CXOrbia es el ecosistema operativo y estratégico para consultoras de <strong>mystery shopping, auditoría de campo y experiencia al cliente</strong>.</p>
<div class="acad-cards">
  <div class="acad-card"><div>🏢</div><b>Admin</b><p>Operación, finanzas, comercial, IA. El cerebro de la consultora.</p></div>
  <div class="acad-card"><div>🕵️</div><b>Shopper</b><p>App de campo: visitas, OKRs, certificación, pagos.</p></div>
  <div class="acad-card"><div>🏬</div><b>Cliente</b><p>Portal estratégico: score, ranking, hallazgos, acciones.</p></div>
</div>
<h3>¿Por qué no es una herramienta estática?</h3>
<ul><li>Una visita realizada genera automáticamente la liquidación, actualiza el dashboard y notifica al equipo — sin captura manual.</li>
<li>La IA (Gemini) es transversal: cuestionarios, propuestas, actas, análisis crítico, marketing.</li>
<li>Conecta con Make, WhatsApp, Google Sheets, Outlook y 30+ herramientas sin programar.</li>
<li>Multi-tenant: cada consultora tiene su propia instancia con marca, plan y módulos.</li></ul>`},
         {id:'l2',ic:'🗺️',n:'La plataforma: módulos y menú',content:`
<h2>Arquitectura del menú (admin)</h2>
<div class="acad-section"><b>Operación</b> — lo que uses a diario<br>Mi Día · Dashboard · Visitas · Postulaciones · Reservas · Shoppers · Informes</div>
<div class="acad-section"><b>Admin del Proyecto</b> — set-up y configuración<br>Clientes · Proyectos · Hojas de Ruta · Cuestionarios · Importador</div>
<div class="acad-section"><b>Capacitación & IA</b><br>Academia · Certificación · Documentos · Soporte</div>
<div class="acad-section"><b>Finanzas</b><br>Dashboard Financiero · Movimientos · Liquidaciones · Lotes</div>
<div class="acad-section"><b>Comercial</b><br>CRM · Costos & Propuestas · Marketing</div>
<div class="acad-section"><b>Configuración</b><br>Usuarios & Permisos · Plan · Automatizaciones · Integraciones</div>
<h3>Tip clave: el sidebar es colapsable</h3>
<p>Usa el botón ☰ arriba a la izquierda para colapsar el menú y tener más espacio de trabajo. El proyecto activo siempre se muestra en la parte superior del rail.</p>`},
         {id:'l3',ic:'☀️',n:'Mi Día: el punto de partida',content:`
<h2>Mi Día — tu cockpit diario</h2>
<p>Mi Día es la primera pantalla que verás al entrar. Muestra en un calendario mensual todas las visitas y tareas del periodo, con KPIs de la operación en tiempo real.</p>
<h3>KPIs de Mi Día (todos clickeables)</h3>
<ul>
<li><b>Agendadas</b>: visitas con fecha confirmada. Clic → lista filtrada con opción de ir a Postulaciones.</li>
<li><b>Por aprobar</b>: postulaciones de shoppers esperando revisión. Clic → ir directo a Postulaciones para aprobar.</li>
<li><b>Realizadas</b>: visitas cuyo cuestionario puede estar pendiente. Clic → lista con estado de cada una.</li>
<li><b>Sin asignar</b>: visitas publicadas sin shopper asignado. Clic → ir a Visitas para asignar.</li>
</ul>
<h3>Filtro por proyecto</h3>
<p>Puedes ver el cronograma de un proyecto específico o de todos los proyectos simultáneamente usando el selector en la parte superior del calendario.</p>`},
         {id:'l4',ic:'🔄',n:'El ciclo operativo completo',content:`
<h2>Ciclo de vida de una visita</h2>
<p>Entender este ciclo es fundamental. Cada etapa tiene responsables y genera acciones automáticas:</p>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>Publicar</b><p>El equipo carga la HR o publica visitas manualmente. Nacen en estado "disponible".</p></div>
  <div class="acad-step"><span>2</span><b>Reservar/Postular</b><p>El shopper reserva sucursales o se postula. El equipo recibe notificación.</p></div>
  <div class="acad-step"><span>3</span><b>Asignar</b><p>El equipo aprueba la postulación o asigna manualmente. La visita pasa a "asignada" y el shopper recibe WhatsApp automático.</p></div>
  <div class="acad-step"><span>4</span><b>Agendar</b><p>El shopper elige fecha y franja. El equipo recibe notificación.</p></div>
  <div class="acad-step"><span>5</span><b>Realizar</b><p>El shopper ejecuta la visita y la marca como realizada. Se habilita el cuestionario.</p></div>
  <div class="acad-step"><span>6</span><b>Cuestionario</b><p>El shopper llena el cuestionario el mismo día con evidencias. El score se calcula automáticamente.</p></div>
  <div class="acad-step"><span>7</span><b>Validar y Pagar</b><p>El equipo valida la liquidación y la incluye en un lote de pago. Se generan los egresos automáticamente.</p></div>
</div>
<p><b>Sincronía automática</b>: cada cambio de estado notifica al equipo, actualiza el dashboard, sincroniza la HR externa (Google Sheets) y mueve la liquidación.</p>`},
         {id:'l4b',ic:'🔗',n:'Sincronía entre módulos: cómo todo se conecta',content:`
<h2>La sincronía es el corazón de CXOrbia</h2>
<p>Ninguna acción vive aislada. Un solo evento dispara una cadena de actualizaciones automáticas en toda la plataforma. Entender esto te evita el trabajo manual duplicado y los errores de datos.</p>
<h3>Ejemplo real: un shopper envía su cuestionario</h3>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>Visita</b><p>La visita pasa de "realizada" a "cuestionario enviado". Su estado cambia en Visitas y en Mi Día.</p></div>
  <div class="acad-step"><span>2</span><b>Score</b><p>El cuestionario calcula el score ponderado por sección y lo guarda. El Portal del Cliente lo muestra en vivo.</p></div>
  <div class="acad-step"><span>3</span><b>Liquidación</b><p>Nace la liquidación con honorario + reembolso y su fecha estimada de pago (viernes + días configurados).</p></div>
  <div class="acad-step"><span>4</span><b>Beneficios</b><p>El shopper ve la liquidación en Mis Beneficios con estado y fecha.</p></div>
  <div class="acad-step"><span>5</span><b>Dashboard</b><p>Los KPIs de realizadas, cuestionarios y avance vs ideal se recalculan al instante.</p></div>
  <div class="acad-step"><span>6</span><b>Notificación</b><p>El equipo recibe aviso; si Make está activo, dispara WhatsApp/correo.</p></div>
</div>
<h3>El bus de eventos</h3>
<p>Internamente, cada cambio emite un evento (<code>visit-flow</code>, <code>fin</code>, <code>crm</code>) al que se suscriben todas las vistas abiertas. Por eso no necesitas refrescar: si tienes el Dashboard abierto y en otra pestaña se paga un lote, el Dashboard se actualiza solo.</p>
<h3>Anti-duplicación con HR externa</h3>
<p>Cuando la HR vive en Google Sheets y también gestionas desde la plataforma, el sistema usa una <b>llave natural inmutable</b> (documento del shopper + id de visita) para reconciliar. Aunque asignes en ambos lados, nunca se duplica el registro.</p>
<h3>Por qué te importa como consultora</h3>
<ul>
<li>No capturas nada dos veces: una acción propaga a todos los módulos.</li>
<li>Los números siempre cuadran: finanzas, operación y portal del cliente leen la misma fuente.</li>
<li>La trazabilidad es total: cada gestión queda registrada con quién y cuándo.</li>
</ul>`},
         {id:'l5',ic:'❓',n:'Evaluación de inducción',tipo:'quiz',quiz:[
           {q:'¿Cuál es el flujo correcto para que una visita pase de disponible a pagada?',o:['Disponible → Asignada → Realizada → Cuestionario → Pagada','Publicada → Postulación → Asignación → Agenda → Realización → Cuestionario → Liquidada/Pagada','Solo hay que marcarla como realizada y automáticamente se paga','El shopper la marca como pagada desde su app'],a:1,exp:'El ciclo completo es: Publicar → Postular/Reservar → Asignar → Agendar → Realizar → Cuestionario → Validar → Pagar. Cada etapa tiene responsables y genera notificaciones automáticas. Saltarse una etapa rompe la sincronía de la liquidación.'},
           {q:'¿Qué sección del menú contiene el Dashboard, Visitas y Postulaciones?',o:['Admin del Proyecto','Configuración','Operación','Finanzas'],a:2,exp:'El menú de Operación contiene todo lo que se usa a diario: Mi Día, Dashboard, Visitas, Postulaciones, Reservas, Shoppers e Informes. Admin del Proyecto contiene el set-up (Clientes, Proyectos, HR, Cuestionarios).'},
           {q:'¿Qué herramienta de IA usa CXOrbia por defecto y por qué?',o:['ChatGPT, porque es la más conocida','Gemini Flash, por su relación costo-beneficio para operaciones de alto volumen','No usa IA — todo es manual','Claude, porque es el más preciso'],a:1,exp:'CXOrbia usa Gemini Flash de Google por su excelente relación costo-beneficio con tokens económicos. Es configurable por tenant desde Configuración → Automatizaciones → Asistente de IA. Sin configurar, los generadores usan heurística local sin costo.'},
           {q:'¿Qué ocurre cuando el equipo aprueba una postulación?',o:['Solo cambia el estado en la plataforma, nada más','La visita pasa a "asignada", el shopper recibe notificación automática (WhatsApp/push) y la HR externa se actualiza','El shopper debe verificar manualmente si fue aprobado','Se genera automáticamente la liquidación'],a:1,exp:'Al aprobar una postulación, la plataforma: (1) mueve la visita a "asignada", (2) notifica al shopper por WhatsApp/push vía Make, (3) escribe de vuelta a la HR externa (Google Sheets) si está activa, y (4) registra quién gestionó la aprobación para trazabilidad.'},
         ]}
       ]},
      /* ─── OPERACIÓN ─── */
      {id:'a_ops',cat:'Operación',ic:'📊',color:'#2a6fdb',n:'Dashboard y gestión operativa',
       desc:'Domina el cockpit: KPIs, estado por fases, Tablón, gestión de shoppers y reportes.',
       cert:false,mins:80,
       lessons:[
         {id:'o1',ic:'📊',n:'Dashboard Operativo',content:`
<h2>Dashboard Operativo — el cockpit</h2>
<h3>Avance real vs. ideal por país</h3>
<p>La barra de progreso compara el % de visitas realizadas contra el % esperado según el día del mes (curva lineal). Si a día 15 se esperaba 50% y tienes 30%, el semáforo es rojo y hay riesgo de incumplimiento.</p>
<ul><li>🟢 En rango: avance real ≥ ideal</li><li>🟡 Al límite: real está 1-15 pts por debajo del ideal</li><li>🔴 En riesgo: real más de 15 pts por debajo del ideal</li></ul>
<h3>Estado operativo de visitas (buckets)</h3>
<p>Cada bucket es clickeable y muestra la lista completa de visitas en esa etapa con:</p>
<ul><li>Sucursal, shopper asignado, escenario y fecha</li><li>WhatsApp individual por fila</li><li>Recordatorio masivo a todos los del bucket</li><li>Selección múltiple para recordar a los que elijas</li></ul>
<h3>Comparativo trimestral (8 KPIs)</h3>
<p>Compara los últimos 3 meses: cumplimiento, días real→submit, visitas realizadas, cuestionarios a tiempo, calidad QA, tasa de reprogramación, cobertura de sucursales y margen neto.</p>`},
         {id:'o2',ic:'📋',n:'Postulaciones y asignaciones',content:`
<h2>Gestión de Postulaciones</h2>
<h3>¿Qué es una postulación?</h3>
<p>Cuando un shopper ve una visita disponible y solicita realizarla, se crea una postulación. El equipo decide si aprobar, poner en standby o rechazar.</p>
<h3>Acciones disponibles por postulación</h3>
<ul>
<li><b>Aprobar</b>: la visita pasa a "asignada" y el shopper recibe notificación.</li>
<li><b>Standby</b>: se reserva pero no confirma todavía.</li>
<li><b>Rechazar</b>: la visita queda disponible para otro shopper.</li>
<li><b>Ver perfil</b>: abre la ficha del shopper con KPIs, historial y verificación de requisitos (perfil completo, datos bancarios, certificación).</li>
<li><b>Editar</b>: cambia la fecha o franja; sincroniza con la HR externa.</li>
<li><b>Reasignar</b>: transfiere a otro shopper con trazabilidad.</li>
<li><b>Cancelar</b>: la visita vuelve a disponible y el shopper es notificado.</li>
</ul>
<h3>Asignación manual</h3>
<p>Usa "＋ Asignar visita manual" para asignar directamente sin que el shopper se postule. Puedes buscar por sucursal y por nombre de shopper. Si el shopper no existe, créalo al vuelo con nombre, apellido y WhatsApp.</p>
<h3>Trazabilidad</h3>
<p>Cada gestión queda registrada con "gestionado por [quién]". Esto es crítico cuando varias personas del equipo operan la plataforma al mismo tiempo.</p>`},
         {id:'o3',ic:'👥',n:'Gestión de shoppers',content:`
<h2>Shoppers — red de evaluadores</h2>
<h3>KPIs del módulo</h3>
<ul>
<li><b>En este proyecto</b>: shoppers activos para el proyecto seleccionado.</li>
<li><b>Activos</b>: con estado distinto a "Pendiente".</li>
<li><b>Perfiles incompletos</b>: no tienen todos los datos — riesgo en pagos.</li>
<li><b>Preferentes</b>: con tarifa de honorario preferente configurada.</li>
</ul>
<h3>Perfil del shopper (clickeable desde cualquier módulo)</h3>
<p>Al hacer clic en un shopper desde el Top del Dashboard o el Ranking, se abre su ficha con:</p>
<ul><li>KPIs de desempeño (visitas, realizadas, liquidadas, en curso)</li><li>Verificación de requisitos (perfil completo, datos bancarios, WhatsApp, certificado)</li><li>Historial de visitas por categoría (todas, realizadas, liquidadas, en curso)</li><li>Acceso directo a "Ver perfil completo" y "WhatsApp"</li></ul>
<h3>Datos bancarios</h3>
<p>Es obligatorio completar banco, tipo de cuenta, número, titular y moneda para incluir al shopper en un lote de pago. El shopper puede actualizar sus propios datos desde Mi Perfil (autoservicio). Cualquier cambio bancario genera una notificación al equipo.</p>`},
         {id:'o4',ic:'📝',n:'Reportes operativos',content:`
<h2>Reportes & KPIs</h2>
<h3>Reportes disponibles</h3>
<ul>
<li><b>Cumplimiento por sucursal</b>: ranking de tiendas por % de visitas realizadas.</li>
<li><b>Cobertura por país y quincena</b>: distribución geográfica del cumplimiento.</li>
<li><b>Ranking de shoppers</b>: por efectividad (realizadas/asignadas).</li>
<li><b>Hallazgos más frecuentes</b>: los top errores recurrentes — base para planes de capacitación.</li>
<li><b>Liquidaciones del periodo</b>: detalle de honorarios y reembolsos.</li>
</ul>
<h3>Crear reportes personalizados</h3>
<p>Cada reporte puede personalizarse (nombre, notas, columnas adicionales) y descargarse. Usa el botón "＋ Nuevo reporte personalizado" para añadir variantes basadas en los reportes estándar.</p>
<h3>Conexión con el portal del cliente</h3>
<p>Los reportes de cumplimiento, ranking y hallazgos se reflejan automáticamente en el portal del cliente de la marca. No hay que enviar PDFs — el cliente los ve en tiempo real.</p>`},
         {id:'o5',ic:'❓',n:'Evaluación operación',tipo:'quiz',quiz:[
           {q:'Un shopper tiene visitas asignadas pero no tiene número de WhatsApp registrado. ¿Qué riesgo implica?',o:['Ninguno, el WhatsApp es opcional','No recibirá notificaciones automáticas (Make) ni mensajes manuales de WA Web, afectando la comunicación y el seguimiento de la visita','Solo afecta si tiene Make configurado','El sistema le envía SMS automáticamente'],a:1,exp:'El número de WhatsApp es crítico para la comunicación operativa. Sin él: no recibe confirmaciones de asignación, no recibe recordatorios automáticos de Make, y el equipo no puede contactarlo por WhatsApp Web desde la plataforma. Además, cualquier automatización de Make que envíe WA al shopper fallará silenciosamente.'},
           {q:'¿Qué diferencia hay entre el Dashboard en modo "Todos los proyectos" vs. proyecto específico?',o:['Son iguales','El modo general agrega KPIs de todos los proyectos activos; el modo específico filtra por el proyecto seleccionado. Ambos son en tiempo real','El modo general solo muestra el trimestre anterior','No existe el modo "Todos los proyectos"'],a:1,exp:'El selector en el Dashboard permite ver: (a) la operación general de toda la consultora (todos los proyectos agregados) o (b) un proyecto específico. El avance real vs. ideal, los buckets de estado y el comparativo trimestral cambian según la selección.'},
           {q:'¿Qué son los "hallazgos frecuentes" en Reportes y para qué sirven?',o:['Errores técnicos de la plataforma','Los criterios del cuestionario que más frecuentemente obtienen puntuación negativa en las visitas — base para planes de capacitación dirigidos','Las visitas que el equipo olvidó asignar','Los shoppers con más rechazos'],a:1,exp:'Los hallazgos frecuentes identifican automáticamente los criterios del cuestionario con más fallas recurrentes. Esta información es gold: permite al equipo y al cliente diseñar planes de capacitación específicos para el personal que falla en esos puntos, en vez de capacitar sobre todo sin foco.'},
         ]}
       ]},
      /* ─── SET-UP ─── */
      {id:'a_setup',cat:'Set-up',ic:'⚙️',color:'#7c3aed',n:'Configurar un programa completo',
       desc:'Crea cliente, proyecto, HR, cuestionario ponderado, instructivo y certificación con IA.',
       cert:true,mins:90,
       lessons:[
         {id:'s1',ic:'🏢',n:'Crear cliente y proyecto',content:`
<h2>Paso 1: Crear el cliente</h2>
<p>Ve a Admin del Proyecto → Clientes → Nuevo cliente.</p>
<ul><li>Nombre, rubro (catálogo compartido CX.RUBROS), país, contactos.</li><li>Si el prospecto ya está en el CRM y lo marcas como ganado, el cliente se crea automáticamente sin recapturar.</li></ul>
<h2>Paso 2: Crear el proyecto</h2>
<p>Ve a Proyectos → Nuevo proyecto (o abre uno existente y usa el botón ⚙️).</p>
<ul>
<li><b>Periodicidad de rondas</b>: mensual, bimensual, trimestral, semestral o anual.</li>
<li><b>Periodo de cumplimiento</b>: puede ser diferente a la ronda. Ej: ronda mensual + cumplimiento quincenal (la mitad de las visitas del mes debe hacerse en la primera quincena).</li>
<li><b>Países y monedas</b>: múltiples países, cada uno con su moneda. Los KPIs y las liquidaciones se separan automáticamente por moneda.</li>
<li><b>Escenarios</b>: define los tipos de evaluación. Puedes agregarlos manualmente o usar "Extraer del instructivo (IA)".</li>
</ul>`},
         {id:'s2',ic:'🗺️',n:'Hoja de Ruta inteligente',content:`
<h2>La Hoja de Ruta (HR) es la base operativa</h2>
<p>La HR define qué sucursales se evalúan, con qué escenario, en qué quincena y con qué honorario. Sin ella no hay visitas.</p>
<h3>Tres formas de crear la HR</h3>
<div class="acad-section"><b>🤖 HR Inteligente (recomendado)</b><p>Ve a Hojas de Ruta → HR Inteligente. Carga el instructivo del cliente (PDF, Word, imagen) o pégalo como texto. La IA extrae: sucursales, ciudades, escenarios, franjas horarias y honorarios sugeridos. Revisas, iteras con lenguaje natural y aceptas.</p></div>
<div class="acad-section"><b>📥 Importar HR</b><p>Si el cliente te envía un Excel o CSV con sus sucursales. El Importador Inteligente detecta las columnas automáticamente, muestra vista previa y aplica anti-duplicado por llave natural (sucursal+ciudad+escenario+quincena).</p></div>
<div class="acad-section"><b>🔗 Google Sheets en vivo</b><p>Conecta la hoja del cliente. La plataforma la lee en tiempo real y escribe de vuelta al asignar o agendar (doble vía). Las fechas que cambien en Sheets se actualizan en la plataforma; las asignaciones hechas en la plataforma aparecen en Sheets.</p></div>
<h3>Anti-duplicado crítico</h3>
<p>Si usas Sheets en vivo Y además importas manualmente, el sistema no duplica porque usa una llave natural inmutable. Esto resolvió el problema que tenían en la plataforma anterior.</p>`},
         {id:'s3',ic:'🧩',n:'Cuestionario ponderado',content:`
<h2>El cuestionario: el corazón de la medición</h2>
<h3>¿Qué es un cuestionario ponderado?</h3>
<p>Cada sección tiene un peso % y cada pregunta tiene un peso dentro de su sección. El score final es el promedio ponderado — objetivo y reproducible.</p>
<h3>Crear con IA (Set-up desde instructivo)</h3>
<ol>
<li>Ve a Cuestionarios → 🤖 Set-up desde instructivo.</li>
<li>Carga el instructivo del cliente.</li>
<li>La IA propone secciones con pesos y preguntas.</li>
<li>Usa el <b>Iterador</b>: escribe en lenguaje natural "agrega sección de limpieza", "sube el peso de atención a 35%", "menos preguntas por sección". La IA regenera.</li>
<li>Acepta cuando esté bien.</li>
</ol>
<h3>Múltiples versiones</h3>
<p>Puedes tener versiones diferentes del cuestionario para distintos tipos de sucursales: tiendas grandes, kioscos, franquicias, diferentes marcas. Cada versión se asigna a un agrupador de sucursales.</p>
<h3>Evidencia por pregunta</h3>
<p>Configura qué tipo de evidencia requiere cada pregunta: foto normal, foto geolocalizada, audio o video. Sin la evidencia correcta, el cuestionario no puede enviarse.</p>`},
         {id:'s4',ic:'📋',n:'Instructivo y certificación',content:`
<h2>Instructivo: el manual del shopper</h2>
<p>El instructivo le dice al evaluador exactamente qué hacer, qué observar y cómo actuar en el escenario.</p>
<h3>Crear el instructivo</h3>
<p>Ve a Academia → Nuevo bloque → sube el PDF o documento del protocolo del cliente. También puedes crear uno en texto con formato y adjuntar videos (YouTube, Vimeo o archivo subido).</p>
<h2>Certificación: el gate de calidad</h2>
<p>Antes de ejecutar visitas de un proyecto, el shopper debe aprobar la certificación. Esto garantiza que entendió el protocolo.</p>
<h3>Crear certificación con IA</h3>
<ol>
<li>Ve a Certificación → 🤖 Crear certificación con IA.</li>
<li>Carga el instructivo (el mismo que usaste para el set-up).</li>
<li>Define el número de preguntas (10 recomendado) y el % mínimo para aprobar (gate, usualmente 80%).</li>
<li>La IA genera el banco de preguntas con respuesta correcta y explicación para el feedback.</li>
</ol>
<h3>Re-certificación</h3>
<p>Cuando el instructivo cambia, usa "🔄 Solicitar re-certificación" para exigir que todos (o un shopper específico) se vuelvan a certificar. El shopper recibe notificación automática.</p>`},
         {id:'s5',ic:'❓',n:'Evaluación de set-up',tipo:'quiz',quiz:[
           {q:'¿Qué ocurre si no configuras el "periodo de cumplimiento" en un proyecto mensual?',o:['La plataforma da error','El periodo de cumplimiento es igual a la ronda (mensual) por defecto; si necesitas metas quincenales, debes configurarlo explícitamente','No se pueden crear visitas','Los shoppers no pueden postularse'],a:1,exp:'Si el periodo de cumplimiento no se configura, la plataforma asume que es igual a la periodicidad de la ronda. Para programas como los que tienen metas quincenales (ej: la mitad de las visitas del mes debe realizarse antes del día 15), debes configurar explícitamente "periodo de cumplimiento: quincenal" en el set-up del proyecto.'},
           {q:'¿Qué hace el botón "Iterar" en el generador de cuestionarios con IA?',o:['Genera un cuestionario completamente nuevo ignorando el anterior','Permite refinar la propuesta de la IA con instrucciones en lenguaje natural antes de aplicarla al proyecto','Sube todos los pesos al 100%','Copia el cuestionario del proyecto anterior'],a:1,exp:'El Iterador es una de las funciones más poderosas: después de que la IA propone las secciones, puedes darle instrucciones como "agrega una sección de limpieza e imagen", "reduce el peso de tiempos" o "máximo 3 preguntas por sección". La IA ajusta y regenera. Puedes iterar tantas veces como necesites antes de confirmar.'},
           {q:'¿Qué es la "llave natural" y por qué es crítica en la HR?',o:['Un código alfanumérico aleatorio','La combinación sucursal+ciudad+escenario+quincena que identifica de forma única e inmutable cada visita, evitando duplicados aunque cambie la fecha o el estado','El nombre de usuario del shopper','La URL de la Hoja de Google Sheets'],a:1,exp:'La llave natural es la solución al problema de duplicación en la doble vía HR↔plataforma. Como sucursal+ciudad+escenario+quincena no cambia (son datos estables del programa), la plataforma puede reconocer que una visita ya existente es "la misma" aunque su fecha de agenda o su estado hayan cambiado, y la actualiza en vez de crear una nueva.'},
         ]}
       ]},
      /* ─── FINANZAS ─── */
      {id:'a_fin',cat:'Finanzas',ic:'💰',color:'#059669',n:'Finanzas y liquidaciones sin Excel',
       desc:'Domina el ciclo financiero: liquidaciones automáticas, lotes, movimientos y análisis.',
       cert:false,mins:75,
       lessons:[
         {id:'f1',ic:'💸',n:'Liquidaciones — el ciclo automático',content:`
<h2>Liquidaciones: cero captura manual</h2>
<p>Cada visita que se realiza y cuyo cuestionario se envía, genera automáticamente una liquidación. No hay captura manual.</p>
<h3>Estados de la liquidación</h3>
<ol>
<li><b>Pend. cuestionario</b>: la visita fue realizada pero el shopper no ha enviado el cuestionario.</li>
<li><b>Pend. submitir</b>: el cuestionario está lleno pero no enviado.</li>
<li><b>Validada</b>: cuestionario enviado y aprobado por QA. Lista para incluir en un lote.</li>
<li><b>En lote</b>: fue movida al lote de pago en construcción.</li>
<li><b>Pagada</b>: el lote fue pagado. Se generó el egreso en Movimientos.</li>
</ol>
<h3>Estructura del total</h3>
<p>Total = Honorario + Reembolsos (consumos del escenario). Los reembolsos son un pass-through: el cliente los paga a la consultora y la consultora los paga al shopper. No son utilidad.</p>`},
         {id:'f2',ic:'📦',n:'Lotes de pago',content:`
<h2>El Lote en Construcción</h2>
<p>El lote es el mecanismo de pago por batches. En vez de pagar visita por visita, las agrupas en un lote y pagas todo de una vez.</p>
<h3>Proceso paso a paso</h3>
<ol>
<li>Ve a Finanzas → Liquidaciones.</li>
<li>Usa "▶ Mover a lote" por cada liquidación validada que quieras incluir.</li>
<li>El panel "Lote en construcción" muestra el total por moneda en tiempo real.</li>
<li>Si hay liquidaciones de meses anteriores (diferidas), usa "➕ Incluir CxP meses anteriores".</li>
<li>Haz clic en "💳 Pagar lote" → confirma → se generan los egresos en Movimientos y se actualiza el portal de Beneficios del shopper.</li>
</ol>
<h3>¿Qué pasa con las que no incluyes?</h3>
<p>Al confirmar el pago del lote, tienes la opción de "diferir" las validadas no incluidas. Se convierten en Cuentas por Pagar (CxP) del mes siguiente y aparecerán disponibles para el próximo lote.</p>`},
         {id:'f3',ic:'📊',n:'Movimientos y tesorería',content:`
<h2>Movimientos: la tesorería de la consultora</h2>
<h3>Tipos de movimientos</h3>
<ul>
<li><b>Ingresos operativos</b>: comisiones, honorarios de programa, facturación, anticipos.</li>
<li><b>Financiamientos</b>: NO son ingreso operativo. Entran como flujo y se registran automáticamente como CxP hasta devolverse.</li>
<li><b>Egresos</b>: gastos fijos, honorarios a shoppers (se generan al pagar lotes), abonos a CxP.</li>
<li><b>Remesas</b>: ingresos de casa matriz o sede regional para conciliar.</li>
</ul>
<h3>Scope: proyecto vs. global</h3>
<p>Puedes ver movimientos por proyecto (específico de un programa) o globales (gastos administrativos que no corresponden a un proyecto particular). Usa el selector en Movimientos.</p>
<h3>Presupuesto mensual</h3>
<p>En la misma pantalla, en la sección "Presupuesto mensual", define los rubros de gasto por mes. El Dashboard Financiero mostrará semáforos (en rango/al límite/excedido) comparando el real vs. el presupuestado.</p>`},
         {id:'f4',ic:'📈',n:'Dashboard Financiero',content:`
<h2>Dashboard Financiero: inteligencia del negocio</h2>
<h3>Tiles por país (clickeables)</h3>
<p>Cada país tiene su tile con: ingresos operativos, honorarios pagados, reembolsos, CxC, margen % y análisis rápido. Clic → detalle de esa métrica.</p>
<h3>Análisis crítico inteligente</h3>
<p>El sistema analiza automáticamente los datos y genera hallazgos con estrategias:</p>
<ul>
<li>🔴 Margen crítico (&lt;20%): qué hacer para recuperarlo.</li>
<li>🟡 Cobranza alta: CxC supera el 40% del ingreso → riesgo de liquidez.</li>
<li>🟦 Financiamientos activos: no son utilidad, están como CxP.</li>
<li>📊 Gasto sobre presupuesto: qué rubro excedió y cuánto.</li>
</ul>
<h3>Comparativos</h3>
<ul>
<li><b>Intermensual</b>: margen % mes vs. mes anterior (barras de columna, con Δ).</li>
<li><b>Interanual</b>: 2024 → 2025 → 2026 (evolución del margen y el ingreso).</li>
</ul>`},
         {id:'f5',ic:'❓',n:'Evaluación finanzas',tipo:'quiz',quiz:[
           {q:'¿Por qué los financiamientos NO deben contarse como ingreso operativo?',o:['Porque son en otra moneda','Porque son dinero que se debe devolver — no son utilidad generada por el programa sino deuda que aumenta el pasivo','Porque no son pagos del cliente','Porque el banco no lo permite'],a:1,exp:'Un financiamiento es un préstamo o anticipo que debe devolverse. Si lo cuentas como ingreso operativo, tu margen aparece inflado artificialmente. CXOrbia lo registra como "entrada de flujo" (para que tengas el dinero disponible) y simultáneamente como CxP (deuda), manteniendo separados el ingreso real del financiamiento.'},
          ]}
        ]},
      {id:'a_ind_ms',cat:'Industria MS',ic:'🌍',color:'#0891b2',n:'Mystery Shopping: mejores prácticas globales',
       desc:'Estándares internacionales, tipos de programa, ROI y benchmarks del sector.',
       cert:false,mins:55,
       lessons:[
         {id:'ms1',ic:'📖',n:'¿Qué es el Mystery Shopping profesional?',content:`
<h2>Mystery Shopping: más que un evaluador disfrazado</h2>
<p>El mystery shopping profesional es una <strong>metodología de investigación de mercados</strong> usada por las principales marcas del mundo para medir la experiencia del cliente con objetividad y consistencia.</p>
<h3>¿Por qué las marcas lo usan?</h3>
<ul><li>Medir la <b>brecha entre el estándar de servicio diseñado</b> y el que el cliente realmente experimenta.</li><li>Identificar <b>comportamientos del personal</b> que los supervisores no pueden observar directamente.</li><li>Tener <b>datos comparables</b> a lo largo del tiempo y entre sucursales.</li><li>Complementar el NPS (voz del cliente) con observación objetiva.</li></ul>
<h3>Tipos de programa</h3>
<div class="acad-cards">
  <div class="acad-card"><div>🕵️</div><b>Mystery Shopping presencial</b><p>Evaluador visita la sucursal como cliente real.</p></div>
  <div class="acad-card"><div>📞</div><b>Mystery Calling</b><p>Evaluación de la atención telefónica.</p></div>
  <div class="acad-card"><div>💻</div><b>Mystery Online/Digital</b><p>Evaluación de ecommerce, apps y chatbots.</p></div>
  <div class="acad-card"><div>🎯</div><b>Auditoría de imagen</b><p>Estado de la instalación, visual merchandising, precios.</p></div>
</div>
<h3>Estándares internacionales</h3>
<p>La <b>MSPA (Mystery Shopping Professionals Association)</b> establece los estándares éticos y metodológicos del sector a nivel mundial. Los programas profesionales siguen sus guías de diseño, reclutamiento y certificación de evaluadores.</p>`},
         {id:'ms2',ic:'💰',n:'ROI y valor de un programa de MS',content:`
<h2>¿Cuánto vale realmente un programa de mystery shopping?</h2>
<p>El ROI de un programa de MS es una de las preguntas más frecuentes de los clientes. La respuesta no es solo financiera.</p>
<h3>ROI directo (medible)</h3>
<ul><li><b>Reducción de reprocesos</b>: empleados que fallan consistentemente en protocolos generan costos (quejas, devoluciones, pérdida de clientes).</li><li><b>Conversión de ventas</b>: en programas de retail o banca, un aumento del 5% en score de cierre puede traducirse en millones en ventas adicionales.</li><li><b>Retención de clientes</b>: estudios muestran que mejorar 10 puntos el CX score reduce el churn hasta un 8%.</li></ul>
<h3>ROI indirecto (estratégico)</h3>
<ul><li>Información objetiva para decisiones de RRHH (reconocimiento, capacitación, desvinculación).</li><li>Evidencia real para negociaciones con proveedores de capacitación.</li><li>Benchmark contra la competencia para posicionamiento.</li></ul>
<h3>Cómo presentar el ROI a tu cliente</h3>
<p>Usa la calculadora de CXOrbia: modelo directo vs. delegado, con costos claros y desglose por sucursal. La propuesta generada con IA incluye la lógica del ROI adaptada al rubro del cliente.</p>`},
         {id:'ms3',ic:'📊',n:'Benchmarks y tendencias 2026',content:`
<h2>Estado del sector: tendencias en CX y MS (2026)</h2>
<h3>Top 5 tendencias</h3>
<ol>
<li><b>IA en análisis de cuestionarios</b>: modelos como Gemini analizan respuestas abiertas y detectan patrones que el análisis manual no ve.</li>
<li><b>Video mystery shopping</b>: evidencia en video se convierte en estándar en sectores de alto riesgo (salud, finanzas) por su trazabilidad legal.</li>
<li><b>Integración con VoC</b>: combinar mystery shopping (voz del evaluador) con NPS real (voz del cliente) para un 360° de la experiencia.</li>
<li><b>Programas de mejora continua</b>: el mystery shopping evoluciona de "medir" a "mejorar" con planes de acción vinculados directamente a los resultados.</li>
<li><b>Acceso en tiempo real del cliente</b>: los portales estratégicos (como el de CXOrbia) reemplazan los reportes PDF mensuales.</li>
</ol>
<h3>Benchmarks por sector (Latinoamérica, 2025-2026)</h3>
<ul><li><b>Retail</b>: score promedio del sector 71/100. Top performers: 85+.</li><li><b>Banca</b>: 68/100 promedio. Protocolo de ventas es el criterio más bajo.</li><li><b>Restaurantes</b>: 74/100. Tiempos de espera y despedida son las brechas principales.</li><li><b>Telecomunicaciones</b>: 65/100. El conocimiento del producto es el hallazgo más frecuente.</li></ul>`},
         {id:'ms4',ic:'❓',n:'Evaluación de industria',tipo:'quiz',quiz:[
           {q:'¿Cuál es la diferencia entre Mystery Shopping y la encuesta de NPS/satisfacción?',o:['Son lo mismo, solo diferentes nombres','El MS mide la experiencia de forma objetiva y anónima (evaluador entrenado); el NPS mide la percepción subjetiva del cliente real. Se complementan pero no se sustituyen','El MS es más barato que el NPS','El NPS es más objetivo que el MS'],a:1,exp:'Son herramientas complementarias: el mystery shopping dice "¿se cumplió el protocolo?" con objetividad y evidencia; el NPS/VoC dice "¿cómo se sintió el cliente?" con su perspectiva subjetiva. Las marcas más avanzadas usan ambas para tener el cuadro completo. CXOrbia puede conectar los resultados de MS con programas de VoC para análisis integrado.'},
           {q:'¿Qué significa que un programa de mystery shopping tiene "calibración"?',o:['Que los cuestionarios son muy largos','Que todos los evaluadores miden igual los mismos criterios (consistencia metodológica), garantizando que los datos sean comparables entre sucursales y periodos','Que el programa es muy exacto en precios','Que los evaluadores son profesionales certificados'],a:1,exp:'La calibración es el proceso de asegurar que todos los evaluadores interpretan y aplican los criterios del cuestionario de la misma manera. Sin calibración, dos evaluadores en la misma sucursal pueden dar scores muy diferentes por interpretaciones distintas del mismo criterio. En CXOrbia, la certificación + el instructivo detallado son los mecanismos de calibración.'},
         ]}
       ]},
      /* ── Admin: Backend técnico ── */
      {id:'a_backend',cat:'Técnico',ic:'⚙️',color:'#7c3aed',n:'Backend técnico: Firebase, Gemini, Make y Storage',
       desc:'Conecta el backend de producción: base de datos en tiempo real, IA generativa, automatizaciones y almacenamiento de archivos.',cert:false,mins:90,
       lessons:[
         {id:'bt1',ic:'🔥',n:'Firebase: Auth, Firestore y Realtime DB',content:`
<h2>Firebase: el backend de CXOrbia en producción</h2>
<p>Firebase (Google) es el backend recomendado. Ofrece autenticación, base de datos en tiempo real y almacenamiento sin servidor que escala automáticamente.</p>
<h3>Pasos de configuración</h3>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>console.firebase.google.com → Crear proyecto</b><p>Activa Google Analytics si lo deseas.</p></div>
  <div class="acad-step"><span>2</span><b>Authentication → Sign-in method → Email/Password</b><p>Habilita y agrega los correos de los primeros usuarios.</p></div>
  <div class="acad-step"><span>3</span><b>Firestore Database → Crear en modo producción</b><p>Elige región us-central1 para América Latina.</p></div>
  <div class="acad-step"><span>4</span><b>Configuración → Apps web → Copiar firebaseConfig</b><p>Es el objeto con apiKey, projectId, etc. que va en config.js de CXOrbia.</p></div>
</div>
<h3>Reglas de Firestore (producción)</h3>
<p>Nunca dejes el modo prueba en producción — permite acceso público sin autenticación. Define reglas que permitan lectura/escritura solo a usuarios autenticados con el rol correcto. El HANDOFF-DESARROLLO.md incluye las reglas por colección.</p>`},
         {id:'bt2',ic:'🤖',n:'Gemini: IA generativa en la plataforma',content:`
<h2>Conectar Gemini (Google AI) a CXOrbia</h2>
<p>Gemini impulsa: análisis crítico, generación de cuestionarios desde instructivos, propuestas, documentos con branding, clasificación de hallazgos e importador inteligente.</p>
<h3>Obtener API Key</h3>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>aistudio.google.com → Get API Key → Create API key</b><p>La key tiene formato AIza...</p></div>
  <div class="acad-step"><span>2</span><b>CXOrbia → Configuración → IA y Automatización → Pegar API Key</b><p>El sistema valida la key y activa el indicador “IA activa” en el topbar.</p></div>
</div>
<h3>Modelos recomendados</h3>
<ul>
<li><b>gemini-2.0-flash</b>: ultra rápido, ideal para análisis de cuestionarios, generación de contenido, clasificación. Usar por defecto.</li>
<li><b>gemini-2.0-flash-thinking</b>: para análisis financiero complejo, razonamiento profundo.</li>
</ul>
<h3>Límites del free tier</h3>
<p>~1,500 requests/día con gemini-flash. Para producción con 10+ usuarios activos, el plan pago ($0.075/1M tokens) cubre el uso normal sin problema.</p>`},
         {id:'bt3',ic:'🔗',n:'Make: automatizaciones y webhooks',content:`
<h2>Make: el motor de automatizaciones</h2>
<p>Make conecta CXOrbia con WhatsApp Business, correo, Google Sheets, Slack y cualquier API externa.</p>
<h3>Configuración básica</h3>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>Crear cuenta en make.com</b><p>El plan gratuito tiene 1,000 operaciones/mes — suficiente para empezar.</p></div>
  <div class="acad-step"><span>2</span><b>Crear escenario → Webhooks → Custom webhook → Copiar URL</b><p>Esta URL va en Configuración → Automatizaciones → URL de Make.</p></div>
  <div class="acad-step"><span>3</span><b>Router por event.type</b><p>CXOrbia envía eventos JSON. Usa un Router en Make para separar: aprobacion, pago, alerta, visita_realizada, cuestionario, correo_wa.</p></div>
</div>`},
         {id:'bt4',ic:'📦',n:'Storage: archivos y evidencias',content:`
<h2>Firebase Storage: evidencias, PDFs y logos</h2>
<h3>Activar Storage</h3>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>Firebase Console → Storage → Comenzar</b><p>Selecciona la misma región que Firestore.</p></div>
  <div class="acad-step"><span>2</span><b>Configura reglas</b><p>Lectura autenticada; escritura solo en la ruta propia del usuario (/evidencias/uid/) o admin en /logos/.</p></div>
</div>
<h3>Estructura de carpetas</h3>
<ul>
<li><code>/logos/{tenantId}/</code> — logo de la consultora y clientes</li>
<li><code>/evidencias/{proyectoId}/{visitaId}/</code> — fotos del shopper</li>
<li><code>/documentos/{tenantId}/</code> — NDAs, instructivos, propuestas</li>
<li><code>/exportaciones/{tenantId}/</code> — PDFs y reportes generados</li>
</ul>
<h3>Costo estimado</h3>
<p>Free tier: 5 GB almacenamiento + 1 GB descarga/día. A partir de ahí: $0.026/GB/mes almacenado y $0.12/GB descargado — muy bajo para uso operativo típico.</p>`},
         {id:'bt5',ic:'❓',n:'Evaluación técnica de backend',tipo:'quiz',quiz:[
           {q:'¿Por qué se debe usar Firestore en modo producción desde el inicio y no en modo prueba?',o:['Porque el modo prueba es de pago','Porque el modo prueba permite acceso público sin autenticación — cualquier persona con la URL del proyecto puede leer y escribir todos los datos','Porque el modo prueba no soporta autenticación','Porque Gemini no funciona con el modo prueba'],a:1,exp:'El modo prueba de Firestore abre acceso total sin autenticación. Para datos operativos (shoppers, visitas, finanzas, clientes), esto es un riesgo de seguridad crítico. Siempre arranca en modo producción con reglas granulares desde el día 1.'},
           {q:'¿Qué información debe incluir el payload JSON que CXOrbia envía a Make al aprobar una postulación?',o:['Solo el ID del shopper','Solo el nombre de la visita','Un objeto completo con event.type, shopperNombre, shopperTelefono, sucursal, fecha, honorario y proyectoNombre','Solo el teléfono del shopper'],a:2,exp:'El payload debe ser completo para que Make no necesite hacer una segunda llamada a Firestore. Si solo mandas el ID de la visita, Make tiene que ir a buscar los datos de Firestore — eso agrega latencia, dependencia y complejidad. La regla de oro: el evento debe contener todo lo que el mensaje final (WhatsApp al shopper) necesita.'},
         ]}
       ]},
      /* ─── FRANQUICIA / COORDINACIÓN ─── */
      {id:'a_coord',cat:'Franquicia',ic:'🌎',color:'#0891b2',n:'Coordinador, Representante y Aliado: administra tu región',
       desc:'La herramienta que la consultora te da para gestionar proyectos, HR, shoppers y liquidaciones de tu territorio.',cert:true,mins:70,
       lessons:[
         {id:'co1',ic:'🧭',n:'Tu rol en el ecosistema',content:`
<h2>Coordinador / Representante / Aliado: qué eres y qué no</h2>
<p>Eres el brazo operativo de la consultora en tu territorio. Antes, gestionar proyectos regionales significaba hojas de cálculo sueltas y correos; ahora tienes una plataforma que centraliza tu operación local con la misma potencia que usa la casa matriz — pero con alcance limitado a lo tuyo.</p>
<h3>Diferencias entre los tres roles</h3>
<div class="acad-cards">
  <div class="acad-card"><div>🧭</div><b>Coordinador</b><p>Gestiona la operación de un país o región asignada: HR, asignaciones, seguimiento. Empleado o contratado de la consultora.</p></div>
  <div class="acad-card"><div>🤝</div><b>Representante</b><p>Enfocado en lo comercial: prospecta, presenta propuestas y representa la marca en su zona.</p></div>
  <div class="acad-card"><div>🏢</div><b>Aliado / Franquiciado</b><p>Opera proyectos delegados de forma semi-autónoma, factura localmente y liquida a sus propios shoppers bajo la metodología de la consultora.</p></div>
</div>
<h3>Alcance por país (scope)</h3>
<p>Tu acceso está limitado por país: solo ves y gestionas las visitas, HR, shoppers y clientes de tu(s) territorio(s) asignado(s). No ves la operación de otras regiones. Toda tu gestión queda registrada con tu nombre para trazabilidad (bitácora de auditoría).</p>`},
         {id:'co2',ic:'🗺️',n:'Administrar tu HR y asignaciones',content:`
<h2>La hoja de ruta de tu territorio</h2>
<p>Tu día a día gira en torno a la Hoja de Ruta (HR) de tu región. Puede vivir en la plataforma o en un Google Sheet colaborativo — en ambos casos, la ves y la gestionas desde CXOrbia.</p>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>Recibes o cargas la HR</b><p>La casa matriz te asigna las visitas de tu país, o tú cargas la HR de tu programa local vía importador inteligente.</p></div>
  <div class="acad-step"><span>2</span><b>Publicas visitas</b><p>Las visitas quedan disponibles para que tus shoppers se postulen o reserven.</p></div>
  <div class="acad-step"><span>3</span><b>Asignas</b><p>Apruebas postulaciones o asignas manualmente. El shopper recibe notificación automática.</p></div>
  <div class="acad-step"><span>4</span><b>Das seguimiento</b><p>Vigilas atrasos, cuestionarios pendientes y avance vs meta de TU región desde el dashboard filtrado.</p></div>
</div>
<div class="acad-section">⚠️ <b>Anti-duplicación:</b> si trabajas la HR en Google Sheets y también en la plataforma, el sistema reconcilia por llave natural — no se duplica aunque asignes en ambos lados.</div>`},
         {id:'co3',ic:'💵',n:'Liquidar honorarios y cruzar cuentas',content:`
<h2>Control financiero de tu operación local</h2>
<p>Si tu modelo es de aliado/franquiciado, gestionas el dinero de tu territorio: pagas a tus shoppers y cruzas cuentas con la casa matriz.</p>
<h3>Liquidación a tus shoppers</h3>
<ul>
<li>Cada visita realizada y con cuestionario aprobado genera una liquidación (honorario + reembolso).</li>
<li>Agrupas las liquidaciones validadas en un <b>lote de pago</b> y pagas por quincena.</li>
<li>La fecha estimada de pago se calcula automáticamente (viernes + días configurados tras el submit).</li>
</ul>
<h3>Cruce con la casa matriz</h3>
<p>Cuando facturas localmente un programa, registras el ingreso; cuando recibes o envías remesas a la casa matriz, las concilias. El módulo financiero mantiene separadas tus comisiones/honorarios de los financiamientos, para que sepas exactamente tu margen real por proyecto.</p>`},
         {id:'co4',ic:'🤝',n:'Prospectar y presentar propuestas (Representante)',content:`
<h2>Vender en tu territorio con respaldo de la consultora</h2>
<p>Como representante, usas el CRM y la calculadora de costos para convertir prospectos en clientes, con la metodología y la marca de la consultora.</p>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>Registra el prospecto</b><p>En el CRM, como lead, con sus datos y la fuente.</p></div>
  <div class="acad-step"><span>2</span><b>Releva la necesidad</b><p>Reúnete, entiende qué quiere medir, cuántas sucursales, qué frecuencia.</p></div>
  <div class="acad-step"><span>3</span><b>Calcula y propón</b><p>Usa la calculadora de costos y genera la propuesta desde plantilla o con IA. Queda vinculada a la ficha del cliente.</p></div>
  <div class="acad-step"><span>4</span><b>Da seguimiento con cadencia</b><p>Registra actividades y recordatorios. No dejes enfriar la oportunidad.</p></div>
</div>
<p>Todo lo que produces (propuestas, actividades, correos) queda en la ficha 360 del cliente, visible para ti y para la casa matriz según los permisos.</p>`},
         {id:'co5',ic:'❓',n:'Evaluación de coordinación',tipo:'quiz',quiz:[
           {q:'Como coordinador de Honduras, ¿qué operación puedes ver y gestionar en la plataforma?',o:['Toda la operación de todos los países de la consultora','Solo las visitas, HR, shoppers y clientes de Honduras (tu territorio asignado)','Solo las visitas que tú creaste','Solo el módulo financiero'],a:1,exp:'Tu rol tiene scope por país: ves y gestionas únicamente la operación de tu(s) territorio(s) asignado(s) — en este caso Honduras. No accedes a la operación de otras regiones. Esto permite a la consultora delegar la gestión regional sin exponer toda la base de datos, y mantiene la trazabilidad de quién gestionó cada acción en tu zona.'},
           {q:'Trabajas la HR de tu región en un Google Sheet compartido, pero también apruebas postulaciones en la plataforma. ¿Qué pasa con los datos?',o:['Se duplican y tienes que borrar manualmente','El sistema reconcilia por llave natural (documento del shopper + id de visita) y no duplica, aunque gestiones en ambos lados','Debes elegir solo uno de los dos','La plataforma bloquea el Google Sheet'],a:1,exp:'CXOrbia usa una llave natural inmutable para reconciliar la HR externa con la plataforma. Aunque asignes una visita en el Google Sheet y la apruebes también en la plataforma, el sistema reconoce que es el mismo registro y no lo duplica. Esto te permite mantener tu forma de trabajo colaborativa en Sheets mientras aprovechas la inteligencia y los KPIs de la plataforma.'},
         ]}
       ]},
    ],
    shopper:[
      {id:'s_ind',cat:'Inducción',ic:'🕵️',color:'#10b981',n:'Inducción del evaluador incógnito',
       desc:'Tu rol, las reglas de oro, el anonimato y cómo crecer profesionalmente.',
       cert:true,mins:60,
       lessons:[
         {id:'si1',ic:'🎯',n:'Tu rol y responsabilidad',content:`
<h2>Ser evaluador incógnito</h2>
<p>Eres el <strong>cliente invisible</strong> que mide la experiencia real. Tu trabajo impacta directamente en decisiones de negocio de grandes marcas.</p>
<h3>Las 4 reglas de oro</h3>
<div class="acad-cards">
  <div class="acad-card"><div>🔒</div><b>Anonimato total</b><p>Nunca reveles tu rol. Ni antes, ni durante, ni al salir.</p></div>
  <div class="acad-card"><div>📊</div><b>Objetividad</b><p>Reporta hechos, no interpretaciones ni opiniones.</p></div>
  <div class="acad-card"><div>📸</div><b>Evidencia</b><p>Respalda cada hallazgo con el tipo de evidencia que pide el escenario.</p></div>
  <div class="acad-card"><div>⏱️</div><b>Mismo día</b><p>El cuestionario se completa el mismo día. Sin excepciones.</p></div>
</div>
<h3>¿Por qué importa el anonimato?</h3>
<p>Si el personal sabe que está siendo evaluado, modifica su comportamiento. La medición pierde validez. El cliente paga por ver la realidad, no un performance. Tu credibilidad como evaluador depende de mantener el anonimato impecable.</p>`},
         {id:'si2',ic:'📋',n:'El flujo de una visita',content:`
<h2>De la reserva al cobro — paso a paso</h2>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>Ver la oferta</b><p>Visitas Disponibles muestra TODAS las visitas de todos los proyectos. Filtra por proyecto, quincena, escenario o ciudad.</p></div>
  <div class="acad-step"><span>2</span><b>Reservar o postular</b><p>En Reservas puedes pedir con anticipación la sucursal que prefieres para el próximo periodo. En Visitas Disponibles te postulas para visitas activas.</p></div>
  <div class="acad-step"><span>3</span><b>Certificarte</b><p>Antes de tu primera visita de un proyecto, aprueba la certificación. El material está en Academia → Inducción del evaluador.</p></div>
  <div class="acad-step"><span>4</span><b>Agendar</b><p>Mis Visitas → Agendar → elige fecha y franja. El equipo recibe notificación automática.</p></div>
  <div class="acad-step"><span>5</span><b>Realizar</b><p>Ejecuta la visita siguiendo el instructivo. Marca "Realizada" en la plataforma el mismo día.</p></div>
  <div class="acad-step"><span>6</span><b>Cuestionario</b><p>Llena todos los campos con tus observaciones y adjunta la evidencia requerida. El score se calcula automáticamente.</p></div>
  <div class="acad-step"><span>7</span><b>Enviar y cobrar</b><p>Submit → tu liquidación nace automáticamente. Revisa en Mis Beneficios el estado y la fecha estimada de pago.</p></div>
</div>`},
         {id:'si3',ic:'⭐',n:'Tus OKRs y cómo crecer',content:`
<h2>Sistema de crecimiento del evaluador</h2>
<p>CXOrbia mide tu desempeño con 4 indicadores (OKRs). Cumplirlos consistentemente sube tu <strong>calificación (★)</strong>, que define tu acceso a más visitas y mejores honorarios.</p>
<h3>Tus 4 OKRs</h3>
<ul>
<li><b>Efectividad ≥ 90%</b>: visitas realizadas / asignadas. Si te asignan 10 visitas al mes, debes realizar al menos 9.</li>
<li><b>Cuestionarios completos ≥ 95%</b>: cuestionarios enviados / visitas realizadas. No dejes cuestionarios pendientes.</li>
<li><b>Envíos a tiempo ≥ 90%</b>: cuestionarios enviados el mismo día de la visita.</li>
<li><b>Calificación (★)</b>: se calcula de las 3 anteriores. Sube gradualmente con buen desempeño.</li>
</ul>
<h3>Beneficios de una ★ alta</h3>
<ul>
<li>Primer acceso a visitas nuevas antes que otros evaluadores.</li>
<li>Acceso a programas con honorarios preferentes.</li>
<li>Menor tasa de rechazos de postulaciones.</li>
<li>Convocatorias especiales para visitas de mayor complejidad y pago.</li>
</ul>`},
         {id:'si4',ic:'❓',n:'Evaluación de inducción',tipo:'quiz',quiz:[
           {q:'Un asesor de tienda te pregunta directamente: "¿Eres evaluador de mystery shopping?" ¿Qué haces?',o:['Dices la verdad, porque la honestidad es un valor','Niegas ser evaluador y continúas la visita como cualquier cliente real','Sales inmediatamente de la tienda y reportas la situación','Llamas al equipo desde la tienda para preguntar cómo proceder'],a:1,exp:'Niegas tu rol y continúas con naturalidad. El anonimato es la base del servicio: si confirmas que eres evaluador, el personal cambia su comportamiento, la medición pierde validez y el cliente no obtendrá información real. Después de la visita, puedes reportar al equipo que sospechan de tu identidad para que lo consideren en futuras visitas.'},
           {q:'¿Desde cuándo debes cronometrar el "tiempo de espera"?',o:['Desde que ves a un asesor disponible','Desde que llegas al establecimiento','Desde que ingresas a la fila o zona de atención del servicio','Desde que el asesor te comienza a atender'],a:2,exp:'El tiempo de espera se mide desde que el cliente ingresa a la fila o zona de atención, no desde que llega al mostrador. Medirlo desde el mostrador subestima la experiencia real del cliente, que comenzó a esperar mucho antes. Esta distinción es crítica porque determina si el estándar de servicio se cumplió o no.'},
           {q:'Tu OKR de efectividad está en 82% (meta: 90%). ¿Cuál es la causa más probable y qué debes hacer?',o:['El equipo está asignando mal las visitas — no es tu problema','Has cancelado o no realizado visitas asignadas. Debes reducir las postulaciones a lo que puedas cumplir y comunicar al equipo cualquier impedimento con anticipación','Es un error del sistema','El OKR de 90% es imposible de alcanzar'],a:1,exp:'Una efectividad de 82% (vs. meta 90%) significa que de 10 visitas asignadas, solo realizas 8.2. Las causas más comunes: te postulas a más visitas de las que puedes realizar, o cancelas sin previo aviso. La solución: postula solo a lo que puedas comprometer, y si surge un impedimento, notifica al equipo antes de la fecha agendada para que puedan reasignar a tiempo.'},
         ]}
       ]},
      /* ── Shopper: Cuestionario ── */
      {id:'s_cuest',cat:'Operación',ic:'📋',color:'#3b82f6',n:'El cuestionario: llenarlo bien',
       desc:'Tipos de pregunta, evidencias requeridas, tiempos, score y errores comunes.',cert:false,mins:30,
       lessons:[
         {id:'sc1',ic:'📝',n:'Tipos de pregunta y cómo responder',content:`
<h2>Tipos de pregunta en el cuestionario</h2>
<div class="acad-cards">
  <div class="acad-card"><div>⭐</div><b>Escala 1–5</b><p>Calificas del 1 al 5. Usa el RANGO COMPLETO: 1 y 2 para fallas claras, 4 y 5 para cumplimiento, 3 solo cuando es genuinamente intermedio.</p></div>
  <div class="acad-card"><div>✅</div><b>Sí / No</b><p>La respuesta es binaria. ¿Se cumplió o no se cumplió? No hay término medio. Sé preciso.</p></div>
  <div class="acad-card"><div>🔢</div><b>Numérico</b><p>Registra el valor exacto (tiempo en minutos, precio observado, número de personas en fila).</p></div>
  <div class="acad-card"><div>📝</div><b>Texto abierto</b><p>Describe con precisión lo que observaste: qué dijo el asesor, qué acción realizó, qué faltaba. Evita opiniones subjetivas.</p></div>
</div>
<h3>El principio de la evidencia observable</h3>
<p>Reporta solo lo que VISTE o ESCUCHASTE, no lo que interpretaste o asumiste. "El asesor no saludó al ingresar" es observable. "El asesor no quería trabajar" es una interpretación.</p>`},
         {id:'sc2',ic:'📸',n:'Evidencias: cuándo y cómo',content:`
<h2>Evidencias: la prueba de lo que evaluaste</h2>
<p>El instructivo especifica qué evidencia requiere cada pregunta. No improvises — entrega exactamente lo que se pide.</p>
<h3>Tipos de evidencia</h3>
<ul>
<li><b>📸 Foto</b>: toma la foto con discreción. Usa el celular naturalmente (simula revisar mensajes). La foto debe mostrar claramente el elemento evaluado.</li>
<li><b>🧾 Ticket/recibo</b>: consérvalo siempre. Es prueba de que realizaste la compra o consumo.</li>
<li><b>🎥 Video</b>: solo si el escenario lo pide y puedes grabarlo sin revelar tu identidad.</li>
<li><b>⏱️ Captura de tiempo</b>: screenshot del reloj del celular mostrando hora de inicio y hora de atención.</li>
<li><b>📄 Documento entregado</b>: folletería, cotizaciones, NDAs que te hayan dado.</li>
</ul>
<h3>Errores comunes en evidencias</h3>
<ul>
<li>❌ Foto borrosa o con el dedo en el lente.</li>
<li>❌ Foto que no muestra el elemento evaluado.</li>
<li>❌ No guardar el ticket después de pagar.</li>
<li>❌ Tomar foto cuando el personal te ve — rompe el anonimato.</li>
</ul>`},
         {id:'sc3',ic:'⚠️',n:'Errores comunes y cómo evitarlos',content:`
<h2>Los 7 errores más frecuentes de los evaluadores</h2>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>Llenar el cuestionario de memoria al día siguiente</b><p>El plazo es el mismo día. La memoria falla en detalles críticos (tiempos exactos, frases textuales). Si no puedes completarlo inmediatamente, toma notas físicas durante la visita.</p></div>
  <div class="acad-step"><span>2</span><b>Usar siempre el puntaje intermedio (3 de 5)</b><p>El 3 está sobre-utilizado. Si el criterio se cumplió claramente → 4 o 5. Si falló claramente → 1 o 2. El 3 es para casos genuinamente ambiguos.</p></div>
  <div class="acad-step"><span>3</span><b>Confundir tu experiencia subjetiva con el criterio</b><p>"No me gustó el servicio" ≠ "El asesor no cumplió el protocolo de saludo". El cuestionario mide comportamientos específicos, no tu satisfacción personal.</p></div>
  <div class="acad-step"><span>4</span><b>Olvidar cronometrar los tiempos</b><p>El tiempo de espera es uno de los criterios más frecuentes. Activa el cronómetro del celular desde que entras a la zona de atención.</p></div>
  <div class="acad-step"><span>5</span><b>No adjuntar las evidencias requeridas</b><p>Una visita sin evidencias puede ser rechazada. Revisa el instructivo ANTES de la visita para saber qué necesitas capturar.</p></div>
</div>`},
         {id:'sc4',ic:'❓',n:'Evaluación del cuestionario',tipo:'quiz',quiz:[
           {q:'¿Cuándo debes completar el cuestionario después de tu visita?',o:['Al día siguiente, cuando tienes más tiempo y calma','El mismo día de la visita, mientras los detalles están frescos','Dentro de los 3 días siguientes','Puedes esperar hasta el cierre de la quincena'],a:1,exp:'El cuestionario debe completarse el mismo día. La memoria humana decae rápidamente — los detalles específicos (qué dijo exactamente el asesor, tiempos en segundos, número de personas en fila) se pierden o se confunden con otras experiencias si esperas. Además, las evidencias (foto, ticket, cronómetro) solo son válidas si se adjuntan en el contexto correcto de esa visita.'},
           {q:'En una pregunta de Escala 1-5, el asesor saludó pero con tono indiferente, sin sonrisa ni contacto visual. ¿Qué puntaje asignas?',o:['5 — saludó, criterio cumplido','3 — fue intermedio, ni muy bien ni muy mal','2 — el saludo existió pero fue deficiente en forma y actitud','1 — no saludó'],a:2,exp:'La respuesta correcta es 2. El criterio no es solo "¿hubo saludo?" sino "¿el saludo cumplió el estándar de servicio?". Un saludo indiferente, sin contacto visual ni sonrisa, generalmente no cumple el protocolo de bienvenida. Un 5 sería para un saludo cálido, con nombre y bienvenida genuina. Un 3 sería para un saludo neutro pero correcto. Un 2 refleja que existió el gesto mínimo pero sin calidad.'},
         ]}
       ]},
      /* ── Shopper: Certificación ── */
      {id:'s_cert',cat:'Inducción',ic:'🏅',color:'#f59e0b',n:'Certificación: prepárate y aprueba',
       desc:'Qué evalúa el examen, cómo prepararte, qué pasa si no apruebas y cómo recertificarte.',cert:false,mins:20,
       lessons:[
         {id:'sct1',ic:'🎯',n:'Para qué sirve la certificación',content:`
<h2>¿Por qué existe la certificación?</h2>
<p>La certificación garantiza que todos los evaluadores de un programa aplican los mismos criterios de la misma manera. Sin calibración, dos evaluadores en la misma sucursal pueden dar puntajes muy diferentes — los datos dejan de ser comparables.</p>
<h3>¿Qué se evalúa en la certificación?</h3>
<ul>
<li>Conocimiento del instructivo del proyecto (protocolo del cliente).</li>
<li>Correcta interpretación de cada criterio del cuestionario.</li>
<li>Procedimiento de la visita (anonimato, tiempos, documentación).</li>
<li>Manejo de situaciones especiales (asesor que te reconoce, visita interrumpida, etc.).</li>
</ul>
<h3>¿Cuándo debes certificarte?</h3>
<p>Antes de tu primera visita de cualquier proyecto nuevo. Si ya estás certificado en un proyecto pero cambia el cuestionario o el protocolo, recibirás notificación de recertificación.</p>
<h3>¿Qué pasa si no apruebas?</h3>
<p>Tienes intentos adicionales. No perderás visitas asignadas por un primer intento fallido — el sistema permite reintento. Lee el feedback de cada pregunta fallida antes de reintentar.</p>`},
         {id:'sct2',ic:'📚',n:'Cómo prepararte para el examen',content:`
<h2>Estrategia para aprobar la certificación</h2>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>Lee el instructivo del proyecto (si está disponible)</b><p>El instructivo es la fuente primaria. El examen pregunta sobre lo que está ahí, no sobre experiencia general. Léelo al menos dos veces.</p></div>
  <div class="acad-step"><span>2</span><b>Haz los cursos de la Academia en orden</b><p>Los cursos de Inducción y Operación tienen exactamente el contenido que cubre el examen. No saltes lecciones.</p></div>
  <div class="acad-step"><span>3</span><b>Presta atención a los "quizzes" de cada lección</b><p>Las preguntas de los quizzes de la Academia son similares en estilo y dificultad a las del examen real de certificación.</p></div>
  <div class="acad-step"><span>4</span><b>Antes de intentar la cert, revisa las lecciones que fallaste</b><p>El sistema te muestra en qué lecciones tuviste más errores en los quizzes. Úsalo como guía.</p></div>
</div>`},
         {id:'sct3',ic:'❓',n:'Evaluación: certificación',tipo:'quiz',quiz:[
           {q:'¿Qué ocurre si repruebas el primer intento de certificación?',o:['Quedas bloqueado permanentemente del proyecto','Tienes que esperar 30 días para volver a intentar','Tienes intentos adicionales — lee el feedback de las preguntas fallidas antes de reintentar','Tu calificación (★) baja a 0'],a:2,exp:'Fallar en el primer intento no bloquea ni penaliza. El sistema registra el intento pero te permite reintentarlo. El feedback que aparece en cada pregunta errónea te explica la respuesta correcta y por qué — esa es tu guía de estudio antes del siguiente intento. La cert mide comprensión real, no memorización; si entiendes el razonamiento detrás de cada criterio, aprobarás.'},
         ]}
       ]},
      /* ── Shopper: Soporte y beneficios ── */
      {id:'s_soporte',cat:'Operación',ic:'💬',color:'#10b981',n:'Soporte, pagos y mis beneficios',
       desc:'Cómo pedir ayuda, interpretar tus beneficios, cuándo y cómo te pagan.',cert:false,mins:20,
       lessons:[
         {id:'ss1',ic:'💰',n:'Cómo se calcula y cuándo recibes tu pago',content:`
<h2>El ciclo de pago</h2>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>Realizas y envías el cuestionario</b><p>Al hacer submit, tu visita pasa a estado "enviada" y se genera automáticamente una liquidación pendiente con tu honorario.</p></div>
  <div class="acad-step"><span>2</span><b>Revisión del equipo</b><p>El coordinador revisa tu cuestionario y evidencias. Si hay observaciones, te notificarán por la plataforma.</p></div>
  <div class="acad-step"><span>3</span><b>Aprobación y lote de pago</b><p>Tu liquidación se incluye en el lote de pago de la quincena correspondiente. Recibirás notificación cuando el lote sea aprobado.</p></div>
  <div class="acad-step"><span>4</span><b>Transferencia a tu cuenta</b><p>El pago se procesa a los datos bancarios que registraste en Mi Perfil. Verifica que estén correctos y actualizados.</p></div>
</div>
<h3>¿Qué hacer si hay un error en tu pago?</h3>
<p>Abre un ticket de soporte con: visita afectada, monto esperado vs. monto recibido, y captura de la liquidación. El equipo responderá en máx. 48 horas hábiles.</p>`},
         {id:'ss2',ic:'🆘',n:'Canales de soporte y cuándo usarlos',content:`
<h2>Cuándo y cómo pedir ayuda</h2>
<div class="acad-cards">
  <div class="acad-card"><div>🤖</div><b>Soporte IA (inmediato)</b><p>Para dudas sobre el cuestionario, instructivo, cómo funciona la plataforma. Disponible 24/7.</p></div>
  <div class="acad-card"><div>💬</div><b>WhatsApp del equipo</b><p>Para emergencias durante la visita o problemas urgentes antes de la fecha límite.</p></div>
  <div class="acad-card"><div>🎫</div><b>Ticket de soporte</b><p>Para problemas de pago, errores en tu perfil, o solicitudes que requieren resolución formal y trazabilidad.</p></div>
  <div class="acad-card"><div>📧</div><b>Correo</b><p>Para comunicaciones que necesiten respaldo escrito (disputas, cambios de datos bancarios).</p></div>
</div>
<h3>SLA (tiempo de respuesta)</h3>
<ul>
<li>Soporte IA: inmediato.</li>
<li>WhatsApp: respuesta en horario laboral en máx. 2 horas.</li>
<li>Tickets: cierre en máx. 48 horas hábiles.</li>
<li>Correo: respuesta en máx. 24 horas hábiles.</li>
</ul>`},
         {id:'ss3',ic:'❓',n:'Evaluación de soporte y pagos',tipo:'quiz',quiz:[
           {q:'Tu cuestionario fue aprobado y aparece en tu sección de Mis Beneficios pero no ves la fecha de pago. ¿Qué significa?',o:['El pago fue cancelado','El coordinador rechazó tu visita','Tu liquidación está aprobada pero el lote de pago de esta quincena aún no ha sido procesado — recibirás notificación cuando se cierre el lote','Hay un error en tus datos bancarios'],a:2,exp:'El flujo es: visita realizada → cuestionario aprobado → liquidación generada → lote de pago formado → pago procesado. Si ya ves la liquidación en Mis Beneficios pero sin fecha de pago, significa que está en la fase "lote formado". El lote se cierra y paga en fechas de quincena definidas (por ejemplo, el 15 y el último día del mes). Recibirás una notificación automática cuando tu lote sea pagado.'},
         ]}
       ]},
      /* ── Shopper: Introducción a la profesión ── */
      {id:'s_prof',cat:'Inducción',ic:'🎓',color:'#8b5cf6',n:'Ser mystery shopper: la profesión',
       desc:'Qué es realmente el mystery shopping, tipos de programa, ética, y cómo convertirlo en un ingreso serio.',cert:false,mins:35,
       lessons:[
         {id:'sp1',ic:'🕵️',n:'¿Qué es el mystery shopping de verdad?',content:`
<h2>Más que "comprar y opinar"</h2>
<p>El mystery shopping (o cliente incógnito) es una herramienta profesional de <b>investigación de mercado y control de calidad</b>. Las empresas contratan a una consultora para medir, de forma objetiva y anónima, si sus estándares de servicio se cumplen en el punto de venta. Tú, como evaluador, eres el instrumento de medición: tus observaciones se convierten en datos que mueven decisiones reales (capacitación, incentivos, cambios de proceso).</p>
<h3>Qué NO es</h3>
<ul>
<li>❌ No es dar tu opinión personal ("me gustó" / "no me gustó").</li>
<li>❌ No es una compra gratis — es un trabajo con criterios y evidencias.</li>
<li>❌ No es delatar personas — es medir procesos y comportamientos contra un estándar.</li>
</ul>
<h3>Qué SÍ es</h3>
<ul>
<li>✅ Observación estructurada y objetiva contra un instructivo definido.</li>
<li>✅ Documentación con evidencia (fotos, tiempos, tickets).</li>
<li>✅ Reporte fiel y a tiempo que la empresa usará para mejorar.</li>
</ul>`},
         {id:'sp2',ic:'🎯',n:'Tipos de programa y modalidades',content:`
<h2>No todas las visitas son iguales</h2>
<div class="acad-cards">
  <div class="acad-card"><div>🏪</div><b>Presencial</b><p>Visitas la sucursal como cliente normal, evalúas atención, tiempos, limpieza, protocolo.</p></div>
  <div class="acad-card"><div>📞</div><b>Mystery calling</b><p>Llamas al call center o sucursal y evalúas la atención telefónica.</p></div>
  <div class="acad-card"><div>💻</div><b>Digital / e-commerce</b><p>Evalúas la web, app o compra en línea, tiempos de entrega y postventa.</p></div>
  <div class="acad-card"><div>🏆</div><b>Competitivo</b><p>Evalúas a la competencia del cliente para comparar (benchmarking).</p></div>
</div>
<h3>Franjas y escenarios</h3>
<p>Cada visita tiene un <b>escenario</b> (el rol que debes representar: "cliente interesado en un crédito", "familia buscando promoción") y una <b>franja</b> (entre semana / fin de semana). Respeta ambos: si el escenario pide preguntar por un producto específico, hazlo con naturalidad. El escenario existe para provocar el comportamiento que se quiere medir.</p>`},
         {id:'sp3',ic:'⚖️',n:'Ética profesional del evaluador',content:`
<h2>Las 6 reglas de oro de la ética</h2>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>Objetividad</b><p>Reporta hechos observables, no interpretaciones ni emociones. Tu simpatía o antipatía con el personal no cambia el dato.</p></div>
  <div class="acad-step"><span>2</span><b>Honestidad total</b><p>Nunca inventes una visita ni respondas de memoria días después. Un dato falso daña a la empresa evaluada y destruye tu reputación.</p></div>
  <div class="acad-step"><span>3</span><b>Anonimato</b><p>Jamás revelas que eres evaluador. Si te descubren, la medición se invalida.</p></div>
  <div class="acad-step"><span>4</span><b>Confidencialidad</b><p>No compartes instructivos, escenarios, cuestionarios ni resultados con nadie.</p></div>
  <div class="acad-step"><span>5</span><b>No represalias</b><p>No usas tu rol para perjudicar a un empleado por motivos personales. Mides el proceso, no a la persona.</p></div>
  <div class="acad-step"><span>6</span><b>Cumplimiento</b><p>Respetas fechas, franjas y escenarios. Una visita fuera de las reglas no sirve.</p></div>
</div>`},
         {id:'sp4',ic:'📈',n:'Convertirlo en un ingreso serio',content:`
<h2>De ocasional a evaluador top</h2>
<p>Los evaluadores con mejor rating reciben más visitas, mejores honorarios y acceso a programas premium. Así se construye:</p>
<ul>
<li><b>Rating alto</b>: cuestionarios completos, a tiempo, con evidencias correctas. Cada visita bien hecha sube tu calificación.</li>
<li><b>Confiabilidad</b>: nunca dejas una visita a medias ni cancelas a última hora. La consultora prioriza a quien cumple.</li>
<li><b>Certificación vigente</b>: mantén tus certificaciones al día para no perder acceso a proyectos.</li>
<li><b>Perfil completo</b>: datos bancarios, ubicación y disponibilidad actualizados agilizan tus pagos y asignaciones.</li>
<li><b>Cobertura</b>: si puedes cubrir varias zonas o franjas, recibes más oferta de visitas.</li>
</ul>
<div class="acad-section">💡 <b>Tip:</b> revisa "Visitas disponibles" de todos los proyectos, no solo del que tienes activo. La oferta se cruza entre programas.</div>`},
         {id:'sp5',ic:'❓',n:'Evaluación de la profesión',tipo:'quiz',quiz:[
           {q:'Durante una visita, el asesor te atendió mal y sentiste que fue grosero contigo personalmente. ¿Cómo lo reportas?',o:['Le pongo la peor nota en todo para que aprenda','Reporto objetivamente los comportamientos observables contra cada criterio del cuestionario, sin dejar que mi molestia personal infle o distorsione las notas','No reporto nada porque me incomodó','Escribo una queja larga sobre lo mal que me sentí'],a:1,exp:'La ética profesional exige objetividad. Reportas los hechos observables (¿saludó? ¿escuchó? ¿ofreció solución?) contra cada criterio, con la nota que corresponde a cada uno. Tu incomodidad personal no debe inflar artificialmente las notas negativas ni distorsionar la medición. El cuestionario mide el cumplimiento del protocolo, no tu experiencia emocional.'},
           {q:'¿Por qué el anonimato es la regla más importante del mystery shopping?',o:['Para que el evaluador no se sienta observado','Porque si el personal sabe que es evaluado, altera su comportamiento y la medición deja de reflejar la realidad','Por seguridad del evaluador únicamente','Porque lo exige la ley'],a:1,exp:'El valor del mystery shopping está en medir el comportamiento REAL del personal en condiciones normales. Si el empleado sabe que lo evalúan, se comporta distinto (efecto observador) y el dato deja de ser útil. Por eso jamás revelas tu condición: la medición solo es válida si el personal actúa como lo haría con cualquier cliente.'},
         ]}
       ]},
    ],
    /* ─── CLIENTE ─── */
    cliente:[
      {id:'cl_por',cat:'Portal',ic:'🏬',color:'#f59e0b',n:'Tu portal de resultados estratégicos',
       desc:'Lee tu score, el ranking de sucursales y toma decisiones basadas en evidencia.',
       cert:false,mins:45,
       lessons:[
         {id:'cp1',ic:'📊',n:'Entender tu score',content:`
<h2>¿Qué significa tu score?</h2>
<p>El score de tu programa es el <strong>promedio ponderado</strong> de todos los criterios evaluados en tus sucursales durante el periodo.</p>
<h3>Cómo se calcula</h3>
<p>El cuestionario tiene secciones con pesos porcentuales (ej: Atención 30%, Tiempos 25%, Limpieza 20%, Cierre y despedida 25%). Cada pregunta tiene peso dentro de su sección. El score es el promedio ponderado de todas las respuestas de todas las visitas del periodo.</p>
<h3>¿Qué significa cada rango?</h3>
<ul>
<li>⭐ 85-100: Excelente — estándares cumplidos consistentemente.</li>
<li>🟡 70-84: En desarrollo — hay brechas identificables pero no críticas.</li>
<li>🔴 Menos de 70: Crítico — requiere acción inmediata (capacitación, supervisión, revisión de procesos).</li>
</ul>
<h3>¿Con qué frecuencia se actualiza?</h3>
<p>En tiempo real. Cada visita procesada impacta el score. No esperas el reporte mensual.</p>`},
         {id:'cp2',ic:'🏆',n:'Ranking y hallazgos',content:`
<h2>Ranking de sucursales</h2>
<p>El portal clasifica automáticamente tus sucursales por cumplimiento y score. Desde aquí puedes:</p>
<ul>
<li>Ver las <b>excelentes</b>: modelos a replicar en el resto de la red.</li>
<li>Ver las <b>en desarrollo</b>: necesitan atención pero están en proceso de mejora.</li>
<li>Ver las <b>críticas</b>: prioridad de intervención inmediata.</li>
<li>Filtrar por ciudad, región o tipo de formato.</li>
</ul>
<h2>Hallazgos frecuentes</h2>
<p>El sistema identifica automáticamente los criterios que más frecuentemente obtienen puntuación negativa en toda tu red. Esto te dice <strong>dónde concentrar la capacitación</strong>.</p>
<p>Por ejemplo: si "tiempo de espera en caja" aparece como el hallazgo #1, el plan de acción es capacitar específicamente en ese proceso, no en todo el protocolo genérico.</p>`},
         {id:'cp3',ic:'⚡',n:'Planes de acción',content:`
<h2>De los datos a las decisiones</h2>
<p>El portal no es solo para ver — es para actuar. Desde "Planes de Acción" puedes:</p>
<ul>
<li>Crear un plan específico para una sucursal o grupo de sucursales.</li>
<li>Asignar responsables y fechas límite.</li>
<li>Vincular el plan al hallazgo que lo origina.</li>
<li>Hacer seguimiento del avance.</li>
</ul>
<h3>Incentivos y sanciones</h3>
<p>Basándote en el ranking, puedes definir:</p>
<ul>
<li>Reconocimiento para el top 3 de sucursales — tu consultora puede configurar tableros de reconocimiento.</li>
<li>Planes de mejora obligatoria para las críticas.</li>
<li>Criterios de escalamiento para gerentes regionales.</li>
</ul>
<h3>Solicitar servicios adicionales</h3>
<p>Desde el portal, en la sección "Servicios & Add-ons", puedes solicitar a tu consultora: NPS real (encuestas al cliente final), capacitación del personal, mystery shopping competitivo o dashboards ejecutivos en BI.</p>`},
         {id:'cp3b',ic:'⚡',n:'Planes de acción y seguimiento',content:`
<h2>Del hallazgo al plan de acción</h2>
<p>El portal no es solo para ver números — es para actuar. En la sección <b>Planes de Acción</b> puedes crear, asignar y hacer seguimiento de mejoras concretas.</p>
<h3>Cómo crear un plan de acción</h3>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>Identifica el hallazgo a atacar</b><p>Elige el criterio con más fallas frecuentes en tu red o en las sucursales críticas.</p></div>
  <div class="acad-step"><span>2</span><b>Define la acción específica</b><p>No "mejorar el servicio" — sino "capacitar a los asesores de Miraflores en protocolo de bienvenida antes del 30 de julio".</p></div>
  <div class="acad-step"><span>3</span><b>Asigna responsable y fecha límite</b><p>Sin responsable y fecha, los planes no se ejecutan. El portal rastrea quién es responsable de cada acción.</p></div>
  <div class="acad-step"><span>4</span><b>Mide el impacto en el siguiente reporte</b><p>El portal compara el score pre-plan vs. post-plan para las sucursales intervenidas. Así ves si la acción funcionó.</p></div>
</div>
<h3>Incentivos: reconoce lo que funciona</h3>
<p>Las sucursales del top 3 son modelos a replicar. Usa el portal para identificarlas y comparte sus prácticas con el resto de la red. El reconocimiento interno es tan poderoso como la corrección.</p>`},
         {id:'cp4',ic:'❓',n:'Evaluación del portal',tipo:'quiz',quiz:[
           {q:'Tu score de este mes es 71 (vs. 78 del mes anterior). ¿Qué herramienta del portal usas primero para entender la caída?',o:['Descargas el reporte PDF y lo lees en tu oficina','Revisas el ranking de sucursales para identificar cuáles bajaron y luego los hallazgos frecuentes para ver qué criterio causó la caída','Llamas al consultor para que te explique','Esperas el mes siguiente para ver si se recupera solo'],a:1,exp:'El proceso correcto: (1) Ranking de sucursales — ¿cuáles bajaron? ¿Es una sola o varias? (2) Hallazgos frecuentes — ¿qué criterio específico generó más fallas? (3) Detalle de visitas de las sucursales problemáticas — ¿hay un patrón por horario, por día o por personal específico? (4) Plan de acción dirigido. El portal tiene todo esto en tiempo real — no esperas el reporte mensual.'},
         ]}
       ]},
      /* ── Cliente: Hallazgos profundos ── */
      {id:'cl_hall',cat:'Portal',ic:'🔍',color:'#6366f1',n:'Hallazgos: del dato a la decisión',
       desc:'Cómo leer el análisis de hallazgos, priorizar acciones y medir el impacto real.',cert:false,mins:30,
       lessons:[
         {id:'ch1',ic:'📊',n:'Leer el análisis de hallazgos',content:`
<h2>Hallazgos: la inteligencia detrás del score</h2>
<p>El score te dice <em>qué tan bien</em> está tu red en general. Los hallazgos te dicen <em>por qué</em> y <em>dónde</em>.</p>
<h3>Hallazgos frecuentes vs. hallazgos críticos</h3>
<ul>
<li><b>Frecuentes</b>: criterios que fallan en más del 30% de las visitas. Son el área de mejora sistémica — afectan a muchas sucursales.</li>
<li><b>Críticos (KO)</b>: comportamientos que nunca deben ocurrir (ej: cobro incorrecto, trato irrespetuoso). Una sola falla es suficiente para que impacte negativamente el score de la sucursal.</li>
</ul>
<h3>Cómo priorizar</h3>
<p>No puedes atacar todo al mismo tiempo. Usa esta matriz:</p>
<div class="acad-cards">
  <div class="acad-card"><div>🔴</div><b>Alta frecuencia + KO</b><p>Intervención inmediata. Capacitación urgente + supervisión directa.</p></div>
  <div class="acad-card"><div>🟡</div><b>Alta frecuencia + no KO</b><p>Plan de mejora a 30-60 días. Capacitación grupal.</p></div>
  <div class="acad-card"><div>🟢</div><b>Baja frecuencia</b><p>Monitorear. No prioritario salvo que sea KO.</p></div>
</div>`},
         {id:'ch2',ic:'📈',n:'Comparativo intermensual y tendencias',content:`
<h2>¿Estás mejorando o empeorando?</h2>
<p>El portal muestra el comparativo mes a mes del score general y por criterio. Esto es más importante que el número puntual — la tendencia te dice si tus acciones están funcionando.</p>
<h3>Cómo interpretar el comparativo</h3>
<ul>
<li><b>Tendencia positiva (+3pp o más)</b>: tus acciones están funcionando. Identifica qué cambió y replica.</li>
<li><b>Estancamiento (±2pp)</b>: las acciones tomadas no están moviendo el indicador. Revisa si se implementaron realmente o si el criterio es más estructural.</li>
<li><b>Caída (−3pp o más)</b>: hay un nuevo problema o una mejora anterior se revirtió. Revisa hallazgos del período y compara qué sucursales bajaron.</li>
</ul>
<h3>Granularidad del análisis</h3>
<p>Puedes ver el comparativo a nivel de: toda la red → región → sucursal → criterio específico. El drill-down te lleva desde el panorama general hasta la causa raíz.</p>`},
         {id:'ch3',ic:'❓',n:'Evaluación de hallazgos',tipo:'quiz',quiz:[
           {q:'Tu top hallazgo frecuente este mes es "el asesor no ofreció producto adicional" en el 55% de las visitas. ¿Cuál es el plan de acción más efectivo?',o:['Bajar el peso de ese criterio en el cuestionario para mejorar el score','Capacitar específicamente en técnicas de venta cruzada y validar en el siguiente mes con un criterio de seguimiento','Despedir a los asesores con más fallas','Contratar más personal en las sucursales afectadas'],a:1,exp:'El hallazgo dice exactamente dónde está el problema: no es falta de personal sino falta de habilidad/protocolo en venta cruzada. La acción efectiva es capacitación específica (no genérica) + medición en el siguiente ciclo. El plan correcto incluye: sesión de capacitación, rol plays con el equipo, seguimiento con mystery en el próximo periodo, y comparativo pre/post. Bajar el peso del criterio esconde el problema sin resolverlo.'},
         ]}
       ]},
      /* ── Cliente: Soporte ── */
      {id:'cl_soporte',cat:'Inducción',ic:'🤝',color:'#0891b2',n:'Solicitar servicios y soporte',
       desc:'Cómo abrir un ticket, solicitar visitas adicionales, NPS y nuevos servicios.',cert:false,mins:20,
       lessons:[
         {id:'cls1',ic:'🎫',n:'Soporte y solicitudes desde el portal',content:`
<h2>Tu canal de comunicación con la consultora</h2>
<p>Desde el portal puedes hacer solicitudes formales sin necesidad de llamar o enviar un correo por fuera del sistema.</p>
<h3>Tipos de solicitudes</h3>
<div class="acad-cards">
  <div class="acad-card"><div>🎫</div><b>Ticket de soporte</b><p>Preguntas sobre el reporte, aclaraciones de score, errores en datos. Respuesta en 24h hábiles.</p></div>
  <div class="acad-card"><div>📋</div><b>Visitas adicionales</b><p>Solicita visitas fuera del programa estándar: campaña específica, semana de seguimiento, sucursal crítica.</p></div>
  <div class="acad-card"><div>🎯</div><b>NPS + VoC</b><p>Solicita encuestas de satisfacción al cliente final para complementar los datos de mystery shopping.</p></div>
  <div class="acad-card"><div>📊</div><b>Reporte personalizado</b><p>Solicita un análisis específico: región, temporada, campaña, benchmarking vs. competencia.</p></div>
</div>
<h3>Add-ons disponibles</h3>
<p>Desde la sección Servicios & Add-ons puedes ver el catálogo completo de servicios adicionales de tu consultora y solicitar cotización directamente desde el portal.</p>`},
         {id:'cls2',ic:'❓',n:'Evaluación final del cliente',tipo:'quiz',quiz:[
           {q:'¿Cuál es la diferencia entre un ticket de soporte y una solicitud de servicio adicional?',o:['Son lo mismo, no hay diferencia','El ticket de soporte es para preguntas o problemas con el servicio contratado; la solicitud de servicio adicional es para pedir algo fuera del alcance del programa actual (cotización, nueva campaña, etc.)','El ticket de soporte cuesta dinero, la solicitud no','Solo el admin puede abrir tickets'],a:1,exp:'Los tickets de soporte están dentro del servicio contratado — son gratuitos y el equipo responde sin cargo. Las solicitudes de servicios adicionales implican un nuevo alcance que requiere cotización y acuerdo. Esta distinción ayuda al equipo de la consultora a priorizarlos correctamente: soporte operativo vs. desarrollo comercial.'},
         ]}
       ]},
      /* ── Cliente: ROI y decisiones estratégicas ── */
      {id:'cl_roi',cat:'Portal',ic:'💡',color:'#0e9c6e',n:'Del score al ROI: decisiones estratégicas',
       desc:'Cómo convertir los resultados de tu programa en incentivos, capacitación y retorno medible.',cert:false,mins:35,
       lessons:[
         {id:'cr1',ic:'🎁',n:'Incentivos y reconocimiento basados en datos',content:`
<h2>Premiar lo que se mide</h2>
<p>El ranking de sucursales no es solo información — es la base de un sistema de incentivos justo y objetivo. Cuando el reconocimiento se basa en el score de mystery shopping, el equipo entiende exactamente qué se espera de ellos.</p>
<h3>Modelos de incentivo que funcionan</h3>
<ul>
<li><b>Bono por umbral</b>: toda sucursal que supere 85% recibe un bono. Simple y claro.</li>
<li><b>Ranking competitivo</b>: el top 3 de la red recibe reconocimiento mensual (público, no solo económico).</li>
<li><b>Mejora sostenida</b>: premia a quien más suba su score respecto al mes anterior — motiva a las sucursales rezagadas, no solo a las que ya están arriba.</li>
<li><b>Criterio específico</b>: bono ligado al criterio más crítico del negocio (ej. tiempo de espera).</li>
</ul>
<div class="acad-section">⚠️ <b>Cuidado:</b> un incentivo mal diseñado genera trampa. Si premias solo el número, el personal puede intentar identificar al evaluador. Por eso el anonimato y la rotación de evaluadores son clave.</div>`},
         {id:'cr2',ic:'🎓',n:'Planes de capacitación dirigidos',content:`
<h2>Capacitar donde duele, no en general</h2>
<p>El error más común es capacitar en "servicio al cliente" de forma genérica. El portal te dice exactamente en qué criterio falla tu red — capacita ahí.</p>
<div class="acad-flow">
  <div class="acad-step"><span>1</span><b>Identifica el hallazgo #1</b><p>El criterio con más puntuación negativa en toda la red. Ej: "no ofrece productos complementarios".</p></div>
  <div class="acad-step"><span>2</span><b>Diseña capacitación específica</b><p>Una sesión de 30 min sobre venta cruzada es más efectiva que un curso genérico de 8 horas.</p></div>
  <div class="acad-step"><span>3</span><b>Mide el impacto</b><p>Compara el score de ese criterio antes y después. Si subió, la capacitación funcionó.</p></div>
  <div class="acad-step"><span>4</span><b>Itera</b><p>Ataca el siguiente hallazgo. Mejora continua criterio por criterio.</p></div>
</div>
<p>Tu consultora puede ofrecerte capacitación del personal como add-on, dirigida precisamente a tus áreas débiles detectadas por el programa.</p>`},
         {id:'cr3',ic:'💰',n:'Calcular el ROI del programa',content:`
<h2>¿Vale la pena el mystery shopping?</h2>
<p>Un programa de evaluación cuesta, pero el retorno es medible. Así se calcula:</p>
<h3>Fórmula simple de ROI</h3>
<div class="acad-section" style="font-family:monospace">ROI = (Beneficio generado − Costo del programa) / Costo del programa × 100</div>
<h3>De dónde sale el beneficio</h3>
<ul>
<li><b>Mayor conversión</b>: si el score de "cierre de venta" sube 10pp y eso mueve la tasa de conversión, calcula el ingreso adicional.</li>
<li><b>Retención de clientes</b>: mejor servicio = menos fuga. Un cliente retenido vale su ticket promedio × frecuencia × años.</li>
<li><b>Reducción de quejas</b>: menos reclamos = menos costo de gestión y compensaciones.</li>
<li><b>Consistencia de marca</b>: una red uniforme protege el valor de la marca — difícil de cuantificar pero real.</li>
</ul>
<div class="acad-section">💡 <b>Tip:</b> pide a tu consultora un dashboard de correlación entre score y tus KPIs de negocio (ventas, NPS, quejas). Ahí ves el ROI en vivo.</div>`},
         {id:'cr4',ic:'❓',n:'Evaluación estratégica',tipo:'quiz',quiz:[
           {q:'Tu red tiene un score general de 82%, pero el criterio "tiempo de espera" está en 58% en 8 de 20 sucursales. ¿Cuál es la mejor decisión?',o:['Capacitar a toda la red en servicio al cliente general','Diseñar una intervención específica sobre gestión de filas y tiempos en esas 8 sucursales, y medir el impacto el mes siguiente','Cambiar de consultora porque el score es bajo','Ignorarlo porque el score general es bueno'],a:1,exp:'La decisión correcta es dirigida y medible: el problema está localizado (tiempo de espera en 8 sucursales específicas), así que la intervención debe serlo también. Capacitar a toda la red en algo genérico desperdicia recursos y no ataca la causa. Una intervención específica sobre gestión de filas en esas 8 sucursales, con medición antes/después, genera mejora demostrable y ROI claro.'},
           {q:'¿Por qué premiar "la mejora sostenida" además del "top del ranking" es una buena estrategia de incentivos?',o:['Porque es más barato','Porque motiva también a las sucursales rezagadas a mejorar, no solo a las que ya están arriba','Porque el ranking no importa','Porque evita que el personal identifique al evaluador'],a:1,exp:'Premiar solo el top del ranking motiva a las mejores sucursales pero desmotiva a las de abajo (sienten que nunca ganarán). Premiar la mejora sostenida (quién más subió respecto al mes anterior) da a TODAS las sucursales una meta alcanzable y motiva especialmente a las rezagadas, que son justamente donde hay más margen de mejora y mayor impacto en el score general de la red.'},
         ]}
       ]},
    ]
  }
};

/* ─ Engine del módulo ─ */
CX.module('aprendizaje', ({data,role,ui})=>{
  const host=ui.el('div');
  const PK='cx_acad2_'+role;
  const prog=()=>{try{return JSON.parse(localStorage.getItem(PK)||'{}');}catch(e){return{};}};
  const setProg=(id,v)=>{const s=prog();s[id]=v;try{localStorage.setItem(PK,JSON.stringify(s));}catch(e){}};

  let activeCat='Todos';
  let openCourse=null;
  let openLesson=null;

  const getCourses=()=>{
    const r=role==='admin'?(CX._acadAud||'admin'):(role==='shopper'?'shopper':role==='cliente'?'cliente':'admin');
    const base=CX.acadData.COURSES[r]||CX.acadData.COURSES.admin;
    const custom=CX.acadData.getCustom(r);
    return [...custom,...base];
  };

  /* ── player de lección ── */
  const lessonPlayer=(course)=>{
    const lessons=course.lessons;
    const li=Math.max(0,lessons.findIndex(l=>l.id===openLesson));
    const lesson=lessons[li];
    if(!lesson)return;
    const pct=Math.round((lessons.filter(l=>prog()[l.id]>=100)).length/lessons.length*100);

    host.innerHTML=`
      <div class="between" style="margin-bottom:12px">
        <button class="btn btn-ghost btn-sm" id="backBtn">← Volver</button>
        <div style="font-size:12px;color:var(--t3)"><b>${course.ic} ${course.n}</b></div>
        <div style="font-size:12px;color:var(--t3)">${li+1}/${lessons.length}</div>
      </div>
      <div style="background:var(--border-2);border-radius:4px;height:4px;margin-bottom:20px"><div style="height:4px;border-radius:4px;background:${course.color};width:${Math.max(4,(li+1)/lessons.length*100)}%"></div></div>
      <div style="display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:flex-start">
        <!-- Sidebar lecciones -->
        <div class="card card-p" style="position:sticky;top:10px">
          <div style="font-size:10px;font-weight:800;color:var(--t3);letter-spacing:.6px;text-transform:uppercase;margin-bottom:10px">LECCIONES</div>
          ${lessons.map((l,i)=>{const done=prog()[l.id]>=100;return `<div data-li="${l.id}" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;cursor:pointer;margin-bottom:4px;background:${l.id===lesson.id?course.color+'20':done?'#f0faf4':'transparent'};border-left:3px solid ${l.id===lesson.id?course.color:done?'var(--green)':'transparent'}">
            <span style="width:20px;height:20px;border-radius:50%;background:${l.id===lesson.id?course.color:done?'var(--green)':'var(--border-2)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${l.id===lesson.id||done?'#fff':'var(--t3)'};">${done?'✓':(i+1)}</span>
            <span style="font-size:12px;font-weight:${l.id===lesson.id?'700':'400'};color:var(--t1)">${l.ic} ${l.n}</span>
          </div>`;}).join('')}
        </div>
        <!-- Contenido -->
        <div>
          ${lesson.tipo==='quiz'?quizView(course,lesson,li,lessons):contentView(lesson,course,li,lessons)}
        </div>
      </div>`;

    host.querySelector('#backBtn').addEventListener('click',()=>{openLesson=null;openCourse=null;draw();});
    host.querySelectorAll('[data-li]').forEach(b=>b.addEventListener('click',()=>{openLesson=b.dataset.li;lessonPlayer(course);}));
    if(lesson.tipo==='quiz')wireQuiz(course,lesson,li,lessons);
    else wireContent(course,lesson,li,lessons);
  };

  const contentView=(lesson,course,li,lessons)=>`
    <div class="card card-p">
      ${role==='admin'?`<div class="between" style="margin-bottom:10px"><span style="font-size:11px;color:var(--t3)">${lesson.ic} ${lesson.n}</span><div class="flex" style="gap:6px"><button class="btn btn-ghost btn-sm" id="editLsn">✎ Editar lección</button><button class="btn btn-ghost btn-sm" id="addLsn">＋ Añadir lección</button></div></div>`:''}
      <div class="acad-content">${lesson.content}</div>
      <div class="between" style="margin-top:20px;padding-top:14px;border-top:1px solid var(--border-2)">
        ${li>0?`<button class="btn btn-ghost btn-sm" id="prevL">← Anterior</button>`:'<div></div>'}
        <button class="btn btn-pr btn-sm" id="nextL">${li<lessons.length-1?'Siguiente lección →':'Ver evaluación →'}</button>
      </div>
    </div>`;

  const wireContent=(course,lesson,li,lessons)=>{
    setProg(lesson.id,100);
    host.querySelector('#nextL')?.addEventListener('click',()=>{if(li<lessons.length-1){openLesson=lessons[li+1].id;lessonPlayer(course);}});
    host.querySelector('#prevL')?.addEventListener('click',()=>{if(li>0){openLesson=lessons[li-1].id;lessonPlayer(course);}});
    const rr=role==='shopper'?'shopper':role==='cliente'?'cliente':'admin';
    host.querySelector('#editLsn')?.addEventListener('click',()=>ui.modal('✎ Editar lección',`
      <label class="lbl">Título</label><input class="inp" id="elT" value="${lesson.n.replace(/"/g,'&quot;')}" style="margin-bottom:8px">
      <label class="lbl">Icono</label><input class="inp" id="elI" value="${lesson.ic||''}" style="max-width:80px;margin-bottom:8px">
      <label class="lbl">Contenido</label>
      <div style="border:1px solid var(--border);border-radius:9px;overflow:hidden;margin-bottom:10px">
        <div class="flex" style="background:var(--panel-2);border-bottom:1px solid var(--border);padding:6px 8px;gap:4px;flex-wrap:wrap" id="wys-tb">
          <button class="btn btn-ghost btn-sm" data-cmd="bold" style="font-weight:700;min-width:28px" title="Negrita">B</button>
          <button class="btn btn-ghost btn-sm" data-cmd="italic" style="font-style:italic;min-width:28px" title="Cursiva">I</button>
          <button class="btn btn-ghost btn-sm" data-cmd="h2" title="Título">H2</button>
          <button class="btn btn-ghost btn-sm" data-cmd="h3" title="Subtítulo">H3</button>
          <button class="btn btn-ghost btn-sm" data-cmd="ul">• Lista</button>
          <button class="btn btn-ghost btn-sm" data-cmd="ol">1. Num</button>
          <button class="btn btn-ghost btn-sm" data-cmd="hr" title="Separador">─</button>
          <button class="btn btn-ghost btn-sm" data-cmd="clr" style="font-size:10px;color:var(--t3)" title="Limpiar formato">Tx</button>
        </div>
        <div id="elEditor" contenteditable="true" class="acad-content" style="min-height:200px;max-height:340px;overflow-y:auto;padding:14px 16px;outline:none;line-height:1.7">${lesson.content||'<p>Contenido de la lección…</p>'}</div>
      </div>
      <div style="background:var(--panel-2);border-radius:9px;padding:10px 12px;margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;color:var(--t2);margin-bottom:6px">📎 Cambiar / añadir recurso embebido</div>
        <input class="inp" id="elVU" placeholder="URL de video (YouTube/Vimeo/HeyGen)" style="margin-bottom:6px">
        <div class="flex" style="gap:6px;flex-wrap:wrap">
          <label class="btn btn-soft btn-sm" style="cursor:pointer">🎥 Subir video<input type="file" id="elVF" accept="video/*" style="display:none"></label>
          <label class="btn btn-soft btn-sm" style="cursor:pointer">🖼 Subir imagen<input type="file" id="elIF" accept="image/*" style="display:none"></label>
          <label class="btn btn-soft btn-sm" style="cursor:pointer">📄 Adjuntar documento<input type="file" id="elDF" accept=".pdf,.doc,.docx" style="display:none"></label>
        </div>
        <div id="elResPrev" style="margin-top:8px"></div>
      </div>
      <div style="text-align:right"><button class="btn btn-pr btn-sm" id="elSave">Guardar</button></div>
    `,{onMount:(ov,close)=>{
      let newRes='';
      ov.querySelector('#elVU')?.addEventListener('blur',e=>{const u=e.target.value;if(u){const src=u.includes('embed')?u:u.replace('watch?v=','embed/').replace('youtu.be/','www.youtube-nocookie.com/embed/');newRes='<div class="acad-video"><iframe src="'+src+'" style="width:100%;aspect-ratio:16/9;border:none;border-radius:10px" allowfullscreen></iframe></div>';ov.querySelector('#elResPrev').innerHTML='<iframe src="'+src+'" style="width:100%;height:140px;border:0;border-radius:8px"></iframe>';}});
      ov.querySelector('#elVF')?.addEventListener('change',e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>{newRes='<div class="acad-video"><video src="'+ev.target.result+'" controls style="width:100%;aspect-ratio:16/9;border-radius:10px"></video></div>';ov.querySelector('#elResPrev').innerHTML='<video src="'+ev.target.result+'" controls style="width:100%;max-height:160px;border-radius:8px"></video>';};r.readAsDataURL(f);}});
      ov.querySelector('#elIF')?.addEventListener('change',e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>{newRes='<img src="'+ev.target.result+'" style="max-width:100%;border-radius:10px">';ov.querySelector('#elResPrev').innerHTML='<img src="'+ev.target.result+'" style="max-height:140px;border-radius:8px">';};r.readAsDataURL(f);}});
      ov.querySelector('#elDF')?.addEventListener('change',e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>{newRes='<div style="padding:12px;border:1px solid var(--border);border-radius:8px"><a href="'+ev.target.result+'" target="_blank">📄 '+f.name+'</a><iframe src="'+ev.target.result+'" style="width:100%;height:50vh;border:0;border-radius:8px;margin-top:6px"></iframe></div>';ov.querySelector('#elResPrev').innerHTML='📄 '+f.name+' adjuntado';};r.readAsDataURL(f);}});
      ov.querySelector('#wys-tb').addEventListener('click',e=>{
        const btn=e.target.closest('[data-cmd]');if(!btn)return;
        const ed=ov.querySelector('#elEditor');ed.focus();
        const cmd=btn.dataset.cmd;
        if(cmd==='bold')document.execCommand('bold');
        else if(cmd==='italic')document.execCommand('italic');
        else if(cmd==='h2')document.execCommand('formatBlock',false,'h2');
        else if(cmd==='h3')document.execCommand('formatBlock',false,'h3');
        else if(cmd==='ul')document.execCommand('insertUnorderedList');
        else if(cmd==='ol')document.execCommand('insertOrderedList');
        else if(cmd==='hr')document.execCommand('insertHTML',false,'<hr style="border:none;border-top:1px solid var(--border-2);margin:12px 0">');
        else if(cmd==='clr')document.execCommand('removeFormat');
      });
      ov.querySelector('#elSave').addEventListener('click',()=>{
        let content=ov.querySelector('#elEditor').innerHTML;
        if(newRes)content=newRes+content;
        CX.acadData.editLesson(rr,course.id,lesson.id,{n:ov.querySelector('#elT').value.trim()||lesson.n,ic:ov.querySelector('#elI').value||lesson.ic,content});
        close();lessonPlayer(course);ui.toast('Lección actualizada','ok');
      });
    }}));
    host.querySelector('#addLsn')?.addEventListener('click',()=>{
      let lsnType='texto';
      ui.modal('+ Nueva lección',`
        <div class="flex" style="gap:5px;margin-bottom:12px;flex-wrap:wrap">
          <button class="btn btn-sm btn-pr" data-lt="texto">Texto</button>
          <button class="btn btn-sm btn-ghost" data-lt="video">🎥 Video</button>
          <button class="btn btn-sm btn-ghost" data-lt="imagen">🖼 Imagen</button>
          <button class="btn btn-sm btn-ghost" data-lt="doc">📄 Documento</button>
          <button class="btn btn-sm btn-ghost" data-lt="quiz">❓ Quiz</button>
        </div>
        <label class="lbl">Título</label><input class="inp" id="nlT" placeholder="Título" style="margin-bottom:8px">
        <label class="lbl">Icono</label><input class="inp" id="nlI" value="📘" style="max-width:80px;margin-bottom:10px">
        <div id="lt-doc" style="display:none">
          <label class="lbl">Documento (PDF/imagen) — se embebe inline para lectura</label>
          <input type="file" class="inp" id="nlDF" accept="application/pdf,image/*" style="padding:7px;margin-bottom:6px">
          <div id="nlDP" style="font-size:11px;color:var(--t3)"></div>
        </div>
        <div id="lt-texto">
          <div class="flex" style="justify-content:space-between;margin-bottom:5px">
            <label class="lbl" style="margin:0">Contenido</label>
            <button class="btn btn-ghost btn-sm" id="nlAI">✨ Generar con IA</button>
          </div>
          <textarea class="inp" id="nlC" rows="6" placeholder="HTML o texto…"></textarea>
          <div class="flex" style="gap:6px;margin-top:6px">
            <button class="btn btn-ghost btn-sm" id="nlRef" style="display:none">🔄 Refinar</button>
            <button class="btn btn-ghost btn-sm" id="nlExp" style="display:none">+ Ampliar</button>
          </div>
        </div>
        <div id="lt-video" style="display:none">
          <label class="lbl">URL del video (YouTube, Vimeo, HeyGen)</label>
          <input class="inp" id="nlVU" placeholder="https://youtube.com/embed/..." style="margin-bottom:8px">
          <label class="btn btn-soft btn-sm" style="cursor:pointer;display:block;text-align:center">📤 Subir video<input type="file" id="nlVF" accept="video/*" style="display:none"></label>
          <div id="nlVP" style="margin-top:8px"></div>
        </div>
        <div id="lt-imagen" style="display:none">
          <label class="lbl">URL de imagen</label>
          <input class="inp" id="nlIU" placeholder="https://..." style="margin-bottom:8px">
          <label class="btn btn-soft btn-sm" style="cursor:pointer;display:block;text-align:center">🖼 Subir imagen<input type="file" id="nlIF" accept="image/*" style="display:none"></label>
          <div id="nlIP" style="margin-top:8px"></div>
        </div>
        <div id="lt-quiz" style="display:none">
          <div style="background:var(--brand-light);border-radius:9px;padding:9px 12px;font-size:12.5px;color:var(--brand-dark);margin-bottom:8px">✨ La evaluación se genera con IA a partir del contenido del curso. Puedes editarla después.</div>
          <textarea class="inp" id="nlQD" rows="3" placeholder="Qué debe evaluar o deja vacío para auto-generar…"></textarea>
        </div>
        <div style="text-align:right;margin-top:12px"><button class="btn btn-pr btn-sm" id="nlSave">Agregar</button></div>`,
      {onMount:(ov,close)=>{
        ov.querySelectorAll('[data-lt]').forEach(b=>b.addEventListener('click',()=>{
          lsnType=b.dataset.lt;
          ov.querySelectorAll('[data-lt]').forEach(x=>x.className='btn btn-sm '+(x===b?'btn-pr':'btn-ghost'));
          ['texto','video','imagen','doc','quiz'].forEach(t=>{const el=ov.querySelector('#lt-'+t);if(el)el.style.display=t===lsnType?'block':'none';});
        }));
        ov.querySelector('#nlDF')?.addEventListener('change',e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>{ov.querySelector('#nlDP').dataset.src=ev.target.result;ov.querySelector('#nlDP').dataset.pdf=(f.type==='application/pdf')?'1':'';ov.querySelector('#nlDP').textContent='📎 '+f.name+' · se embeberá inline';};r.readAsDataURL(f);}});
        ov.querySelector('#nlAI')?.addEventListener('click',()=>{
          const box=ov.querySelector('#nlC'),title=ov.querySelector('#nlT').value||'lección';
          box.placeholder='Generando…';
          const gen=()=>{box.value='<h2>'+title+'</h2>\n<p>Contenido generado (conecta Gemini para IA real).</p>\n<ul><li>Punto clave 1</li><li>Punto clave 2</li><li>Punto clave 3</li></ul>';['#nlRef','#nlExp'].forEach(s=>ov.querySelector(s)&&(ov.querySelector(s).style.display=''));ui.toast('Contenido generado','ok');};
          if(CX.ai&&CX.ai.ready())CX.ai.ask('Genera contenido HTML educativo rico (h2,p,ul) para una lección de mystery shopping llamada "'+title+'". Max 400 palabras. Solo HTML.').then(r=>{box.value=r;['#nlRef','#nlExp'].forEach(s=>ov.querySelector(s)&&(ov.querySelector(s).style.display=''));ui.toast('Generado con Gemini','ok');}).catch(gen);
          else setTimeout(gen,600);
        });
        ov.querySelector('#nlRef')?.addEventListener('click',()=>{const b=ov.querySelector('#nlC');b.value+='\n<p><em>Refinado: detalle añadido.</em></p>';ui.toast('Refinado','ok');});
        ov.querySelector('#nlExp')?.addEventListener('click',()=>{const b=ov.querySelector('#nlC');b.value+='\n<h3>Profundizando</h3>\n<p>Contenido ampliado.</p>';ui.toast('Ampliado','ok');});
        ov.querySelector('#nlVU')?.addEventListener('blur',e=>{const u=e.target.value;if(u){const src=u.includes('embed')?u:u.replace('watch?v=','embed/').replace('youtu.be/','www.youtube-nocookie.com/embed/');ov.querySelector('#nlVP').innerHTML='<iframe src="'+src+'" style="width:100%;height:180px;border:none;border-radius:8px" allowfullscreen></iframe>';}});
        ov.querySelector('#nlIF')?.addEventListener('change',e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>{ov.querySelector('#nlIP').innerHTML='<img src="'+ev.target.result+'" style="max-width:100%;max-height:160px;border-radius:8px;object-fit:contain">';ov.querySelector('#nlIP').dataset.src=ev.target.result;};r.readAsDataURL(f);}});
        ov.querySelector('#nlVF')?.addEventListener('change',e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>{ov.querySelector('#nlVP').innerHTML='<video src="'+ev.target.result+'" controls style="width:100%;max-height:180px;border-radius:8px"></video>';ov.querySelector('#nlVP').dataset.src=ev.target.result;};r.readAsDataURL(f);}});
        ov.querySelector('#nlSave')?.addEventListener('click',()=>{
          const t=(ov.querySelector('#nlT').value||'').trim();if(!t){ui.toast('Pon un título','warn');return;}
          let content='',tipo=lsnType;
          if(lsnType==='texto')content=ov.querySelector('#nlC').value||'<p>Contenido por completar.</p>';
          else if(lsnType==='video'){const upl=ov.querySelector('#nlVP')?.dataset.src;const u=ov.querySelector('#nlVU').value;
            if(upl)content='<div class="acad-video"><video src="'+upl+'" controls style="width:100%;aspect-ratio:16/9;border-radius:10px"></video></div>';
            else{const src=u?u.includes('embed')?u:u.replace('watch?v=','embed/').replace('youtu.be/','www.youtube-nocookie.com/embed/'):u;content=src?'<div class="acad-video"><iframe src="'+src+'" style="width:100%;aspect-ratio:16/9;border:none;border-radius:10px" allowfullscreen></iframe></div>':'';}}
          else if(lsnType==='imagen'){const upl=ov.querySelector('#nlIP')?.dataset.src;const u=ov.querySelector('#nlIU').value;content=(upl||u)?'<img src="'+(upl||u)+'" style="max-width:100%;border-radius:10px">':'';}
          else if(lsnType==='doc'){const src=ov.querySelector('#nlDP')?.dataset.src;const isPdf=ov.querySelector('#nlDP')?.dataset.pdf;tipo='texto';
            if(src&&isPdf)content='<iframe src="'+src+'" style="width:100%;height:70vh;border:0;border-radius:10px"></iframe>';
            else if(src)content='<img src="'+src+'" style="max-width:100%;border-radius:10px">';
            else content='<p>Documento por adjuntar.</p>';}
          else if(lsnType==='quiz'){tipo='quiz';content=ov.querySelector('#nlQD').value;}
          CX.acadData.addLesson(rr,course.id,{n:t,ic:ov.querySelector('#nlI').value||'📘',tipo,content});
          close();lessonPlayer(course);ui.toast('Lección añadida','ok');
        });
      }});
    });
  };

  /* ── quiz per-question (Orbit style) ── */
  const quizView=(course,lesson,li,lessons)=>`
    <div class="card card-p">
      <div class="between" style="margin-bottom:16px">
        <div style="font-size:14px;font-weight:800;color:var(--t1)">📝 ${lesson.n}</div>
        <span style="font-size:12px;color:var(--t3)">${lesson.quiz.length} preguntas</span>
      </div>
      ${lesson.quiz.map((q,qi)=>`
        <div class="acad-question" id="qb${qi}" style="border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:16px">
          <div style="display:flex;gap:8px;margin-bottom:12px"><span style="color:var(--brand);font-size:16px">?</span><b style="font-size:13.5px;color:var(--t1);line-height:1.4">${qi+1}. ${q.q}</b></div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${q.o.map((o,oi)=>`<label data-qi="${qi}" data-oi="${oi}" class="acad-opt" style="display:flex;align-items:flex-start;gap:10px;padding:11px 14px;border:1px solid var(--border);border-radius:9px;cursor:pointer">
              <input type="radio" name="q${qi}" value="${oi}" style="margin-top:3px;flex-shrink:0"> <span style="font-size:13px;color:var(--t1);line-height:1.4">${o}</span></label>`).join('')}
          </div>
          <button class="acad-verify btn btn-pr btn-sm" data-qi="${qi}" style="margin-top:12px">Verificar</button>
          <div class="acad-fb" id="fb${qi}" style="display:none;margin-top:12px;padding:12px 14px;border-radius:10px;font-size:13px;line-height:1.5"></div>
        </div>`).join('')}
      <div style="text-align:center;margin-top:20px"><button class="btn btn-green btn-sm" id="finQuiz" style="padding:10px 28px">Marcar completada ✓</button></div>
    </div>`;

  const wireQuiz=(course,lesson,li,lessons)=>{
    host.querySelectorAll('.acad-verify').forEach(b=>b.addEventListener('click',()=>{
      const qi=+b.dataset.qi;const q=lesson.quiz[qi];
      const sel=host.querySelector(`input[name="q${qi}"]:checked`);
      if(!sel){ui.toast('Elige una respuesta primero','warn');return;}
      const oi=+sel.value;const correct=(oi===q.a);
      const fb=host.getElementById(`fb${qi}`);
      const opts=host.querySelectorAll(`[data-qi="${qi}"]`);
      opts.forEach(opt=>{const isCorrect=+opt.dataset.oi===q.a;opt.style.background=isCorrect?'#f0faf4':+opt.dataset.oi===oi&&!correct?'#fef2f2':'';opt.style.borderColor=isCorrect?'var(--green)':+opt.dataset.oi===oi&&!correct?'var(--red)':'var(--border)';});
      fb.style.display='block';fb.style.background=correct?'#f0faf4':'#fef9ec';fb.style.borderLeft=`3px solid var(--${correct?'green':'amber'})`;
      fb.innerHTML=`<b style="color:var(--${correct?'green':'amber'})">${correct?'✅ Correcto':'💡 Respuesta a revisar'}</b><br><span style="color:var(--t2)">${q.exp}</span>`;
      b.disabled=true;b.textContent=correct?'✓ Correcto':'→ Revisado';
    }));
    host.querySelector('#finQuiz')?.addEventListener('click',()=>{setProg(lesson.id,100);setProg(course.id,100);ui.toast('🏆 Curso completado','ok');openLesson=null;openCourse=null;draw();});
  };

  /* ── Manuales: biblioteca por rol, lector in-app ── */
  const openManuales=()=>{
    const list=(CX.manualesData?CX.manualesData.all():[]);
    const roleVisible=role==='admin'?list:list.filter(m=>m.rol===role||m.rol==='superadmin'&&role==='admin');
    const visibles=role==='admin'?list:list.filter(m=>m.rol===role);
    const shown=visibles.length?visibles:list.filter(m=>m.rol==='m_'+role)||list;
    const finalList=role==='admin'?list:(visibles.length?visibles:list);
    ui.modal('📖 Manuales CXOrbia', `
      <p style="font-size:12.5px;color:var(--t2);margin-bottom:14px">Manuales completos y legibles aquí mismo. ${role==='admin'?'Como administrador ves todos los manuales por rol.':'Ves el manual de tu rol.'}</p>
      <div style="display:grid;gap:10px">
        ${finalList.map(m=>`<button class="card hov manualPick" data-mid="${m.id}" style="padding:14px 16px;cursor:pointer;text-align:left;border:1px solid var(--border);background:#fff;display:flex;gap:12px;align-items:flex-start">
          <div style="font-size:24px">${m.ic}</div>
          <div><div style="font-size:13.5px;font-weight:700;color:var(--t1)">${m.titulo}</div>
          <div style="font-size:11.5px;color:var(--t3);margin-top:2px">${m.desc}</div>
          <div style="font-size:10.5px;color:var(--brand);font-weight:600;margin-top:4px">${(m.secciones||[]).length} secciones · Leer →</div></div>
        </button>`).join('')}
      </div>
      ${role==='admin'?`<div style="text-align:right;margin-top:12px"><button class="btn btn-pr btn-sm" id="manualNew">＋ Crear manual</button></div>`:''}
    `,{onMount:(ov,close)=>{
      ov.querySelectorAll('.manualPick').forEach(b=>b.addEventListener('click',()=>{close();readManual(b.dataset.mid);}));
      ov.querySelector('#manualNew')?.addEventListener('click',()=>{close();crearManual();});
    }});
  };
  /* ── Crear manual: desde idea/texto/recurso, visibilidad por rol, con IA ── */
  const crearManual=()=>{
    let lsnType='texto';
    ui.modal('📘 Crear manual', `
      <label class="lbl">Título del manual</label><input class="inp" id="cmT" placeholder="Ej. Manual operativo del programa" style="margin-bottom:8px">
      <div class="grid g2" style="gap:8px;margin-bottom:8px">
        <div><label class="lbl">Icono</label><input class="inp" id="cmI" value="📘" style="max-width:80px"></div>
        <div><label class="lbl">¿Quién lo ve?</label><select class="sel" id="cmRol"><option value="superadmin">Super Admin</option><option value="admin">Equipo administrativo</option><option value="ops">Operativo</option><option value="coordinador">Coordinador/Aliado</option><option value="shopper">Shopper</option><option value="cliente">Cliente (portal)</option></select></div>
      </div>
      <label class="lbl">Descripción</label><input class="inp" id="cmD" placeholder="De qué trata" style="margin-bottom:10px">
      <div style="border-top:1px solid var(--border-2);padding-top:10px;margin-bottom:8px">
        <div style="font-size:11px;font-weight:700;color:var(--t2);margin-bottom:6px">Contenido inicial</div>
        <div class="flex" style="gap:5px;margin-bottom:8px;flex-wrap:wrap">
          <button class="btn btn-sm btn-pr cmSrc" data-s="texto">✍️ Desde idea/texto</button>
          <button class="btn btn-sm btn-ghost cmSrc" data-s="recurso">📎 Desde recurso</button>
          <button class="btn btn-sm btn-ghost cmSrc" data-s="vacio">Vacío</button>
        </div>
        <div id="cmTextoWrap"><textarea class="inp" id="cmTexto" rows="4" placeholder="Pega el texto, describe la idea o el temario… la IA lo estructura en secciones" style="margin-bottom:6px"></textarea></div>
        <div id="cmRecWrap" style="display:none"><label class="btn btn-soft btn-sm" style="cursor:pointer">📎 Subir documento/recurso<input type="file" id="cmRecF" accept=".pdf,.doc,.docx,.txt,image/*" style="display:none"></label><div id="cmRecName" style="font-size:11px;color:var(--t3);margin-top:5px"></div></div>
        <label class="flex" style="gap:8px;font-size:12px;margin-top:8px"><input type="checkbox" id="cmIA" ${CX.ai&&CX.ai.ready()?'checked':''}> Estructurar con IA (${CX.ai&&CX.ai.ready()?CX.ai.cfg().model:'configura IA en Integraciones'})</label>
      </div>
      <div style="text-align:right;margin-top:10px"><button class="btn btn-pr btn-sm" id="cmOk">Crear manual</button></div>
    `,{onMount:(ov,close)=>{
      ov.querySelectorAll('.cmSrc').forEach(b=>b.addEventListener('click',()=>{lsnType=b.dataset.s;ov.querySelectorAll('.cmSrc').forEach(x=>x.className='btn btn-sm '+(x===b?'btn-pr':'btn-ghost'));ov.querySelector('#cmTextoWrap').style.display=lsnType==='texto'?'block':'none';ov.querySelector('#cmRecWrap').style.display=lsnType==='recurso'?'block':'none';}));
      let recTxt='';
      ov.querySelector('#cmRecF')?.addEventListener('change',e=>{const f=e.target.files[0];if(f){ov.querySelector('#cmRecName').textContent='📎 '+f.name;if(/\.(txt|csv)$/i.test(f.name)){const r=new FileReader();r.onload=ev=>recTxt=ev.target.result;r.readAsText(f);}else recTxt='[Documento: '+f.name+']';}});
      ov.querySelector('#cmOk').addEventListener('click',()=>{
        const t=(ov.querySelector('#cmT').value||'').trim();if(!t){ui.toast('Pon un título','warn');return;}
        const rol=ov.querySelector('#cmRol').value, ic=ov.querySelector('#cmI').value||'📘', desc=ov.querySelector('#cmD').value||'Manual';
        const fuente=(lsnType==='recurso'?recTxt:(ov.querySelector('#cmTexto').value||'')).trim();
        const usarIA=ov.querySelector('#cmIA').checked && CX.ai && CX.ai.ready() && fuente;
        const finalizar=(secciones)=>{const m=CX.manualesData.add({rol,ic,titulo:t,desc,secciones});close();ui.toast('Manual creado','ok');openManuales();};
        if(usarIA){
          ui.toast('Estructurando manual con IA…','',2500);
          CX.ai.ask('Estructura este contenido como un manual profesional en secciones. Devuelve cada sección como "## Título" seguido del contenido en HTML simple (<p>, <ul>, <li>, <h3>). Contenido:\n\n'+fuente)
            .then(res=>{const parts=res.split(/##\s+/).filter(Boolean);const secs=parts.map(p=>{const nl=p.indexOf('\n');return {t:p.slice(0,nl).trim()||'Sección',html:p.slice(nl+1).trim()};});finalizar(secs.length?secs:[{t:'Contenido',html:'<p>'+res+'</p>'}]);})
            .catch(e=>{ui.toast('Error IA: '+e.message+' · creado manual editable','warn');finalizar([{t:'Sección 1',html:'<p>'+(fuente||'Contenido por completar.')+'</p>'}]);});
        } else {
          finalizar([{t:'Sección 1',html:fuente?'<p>'+fuente.replace(/\n/g,'</p><p>')+'</p>':'<p>Contenido por completar. Usa ✎ Editar sección.</p>'}]);
        }
      });
    }});
  };

  const readManual=(mid)=>{
    const m=(CX.manualesData.all()).find(x=>x.id===mid); if(!m)return;
    let secIdx=0;
    const render=()=>{
      const sec=m.secciones[secIdx]||{t:'',html:''};
      const pct=Math.round((secIdx+1)/m.secciones.length*100);
      host.innerHTML=`
        <div style="background:linear-gradient(135deg,#1a2740,#0d1b2e);border-radius:14px;padding:16px 20px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
          <div class="flex" style="gap:12px;align-items:center">
            <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.3)" id="manBack">← Volver</button>
            <div><div style="font-size:15px;font-weight:800;color:#fff">${m.ic} ${m.titulo}</div><div style="font-size:11px;color:#94a3b8">${m.desc||''}</div></div>
          </div>
          <div style="text-align:right"><div style="font-size:12px;color:#fff">${secIdx+1}/${m.secciones.length}</div>
            <div style="width:120px;height:4px;background:rgba(255,255,255,.2);border-radius:4px;margin-top:5px"><div style="height:4px;border-radius:4px;background:var(--brand);width:${pct}%"></div></div></div>
        </div>
        <div style="display:grid;grid-template-columns:230px 1fr;gap:18px;align-items:flex-start">
          <div class="card card-p" style="position:sticky;top:10px">
            <div style="font-size:10px;font-weight:800;color:var(--t3);letter-spacing:.6px;text-transform:uppercase;margin-bottom:10px">CONTENIDO</div>
            ${m.secciones.map((s,i)=>`<div class="manSec" data-si="${i}" style="padding:9px 11px;border-radius:9px;cursor:pointer;margin-bottom:4px;font-size:12px;background:${i===secIdx?'var(--brand)':'transparent'};color:${i===secIdx?'#fff':'var(--t1)'};font-weight:${i===secIdx?'700':'400'}">${i+1}. ${s.t.replace(/^\d+\s*·\s*/,'')}</div>`).join('')}
            ${role==='admin'?`<button class="btn btn-ghost btn-sm" id="manAddSec" style="width:100%;margin-top:8px;border-style:dashed">＋ Sección</button>`:''}
          </div>
          <div class="card card-p">
            <div class="between" style="margin-bottom:12px"><h2 style="font-size:19px;font-weight:800;margin:0">${sec.t}</h2>${role==='admin'?`<button class="btn btn-ghost btn-sm" id="manEditSec">✎ Editar sección</button>`:''}</div>
            <div class="acad-content" style="font-size:14px;line-height:1.75;color:var(--t1)">${sec.html}</div>
            <div class="between" style="margin-top:22px;border-top:1px solid var(--border-2);padding-top:14px">
              <button class="btn btn-ghost btn-sm" id="mPrev" ${secIdx===0?'disabled':''}>← Anterior</button>
              <button class="btn btn-soft btn-sm" id="manPrint">🖨 Imprimir / PDF</button>
              <button class="btn btn-pr btn-sm" id="mNext" ${secIdx===m.secciones.length-1?'disabled':''}>Siguiente →</button>
            </div>
          </div>
        </div>`;
      host.querySelector('#manBack').addEventListener('click',()=>{openManuales();});
      host.querySelectorAll('.manSec').forEach(b=>b.addEventListener('click',()=>{secIdx=+b.dataset.si;render();}));
      host.querySelector('#mPrev')?.addEventListener('click',()=>{if(secIdx>0){secIdx--;render();}});
      host.querySelector('#mNext')?.addEventListener('click',()=>{if(secIdx<m.secciones.length-1){secIdx++;render();}});
      host.querySelector('#manPrint')?.addEventListener('click',()=>window.print());
      host.querySelector('#manAddSec')?.addEventListener('click',()=>{m.secciones.push({t:'Nueva sección',html:'<p>Contenido…</p>'});CX.manualesData.saveCustom(CX.manualesData.getCustom());secIdx=m.secciones.length-1;render();});
      host.querySelector('#manEditSec')?.addEventListener('click',()=>ui.modal('✎ Editar sección',`
        <label class="lbl">Título</label><input class="inp" id="msT" value="${(sec.t||'').replace(/"/g,'&quot;')}" style="margin-bottom:10px">
        <label class="lbl">Contenido</label>
        <div id="msEd" contenteditable="true" class="acad-content" style="min-height:220px;max-height:50vh;overflow:auto;border:1px solid var(--border);border-radius:9px;padding:12px;outline:none;line-height:1.7">${sec.html}</div>
        <div class="between" style="margin-top:10px"><button class="btn btn-ghost btn-sm" id="msDel" style="color:var(--red)">🗑 Eliminar sección</button><button class="btn btn-pr btn-sm" id="msSave">Guardar</button></div>
      `,{onMount:(ov,close)=>{
        ov.querySelector('#msSave').addEventListener('click',()=>{sec.t=ov.querySelector('#msT').value||sec.t;sec.html=ov.querySelector('#msEd').innerHTML;if(m.custom)CX.manualesData.saveCustom(CX.manualesData.getCustom());close();render();ui.toast('Sección actualizada','ok');});
        ov.querySelector('#msDel').addEventListener('click',()=>{if(m.secciones.length>1){m.secciones.splice(secIdx,1);secIdx=Math.max(0,secIdx-1);if(m.custom)CX.manualesData.saveCustom(CX.manualesData.getCustom());close();render();ui.toast('Sección eliminada','');}});
      }}));
    };
    render();
  };

  /* ── lista de cursos ── */
  const draw=()=>{
    if(openLesson){const c=getCourses().find(x=>x.id===openCourse);if(c)return lessonPlayer(c);}
    if(openCourse){const c=getCourses().find(x=>x.id===openCourse);if(c)return lessonPlayer(c);}
    const courses=getCourses();
    const filtered=activeCat==='Todos'?courses:courses.filter(c=>c.cat===activeCat);
    const totalLessons=courses.reduce((a,c)=>a+(c.lessons||[]).length,0);
    const completedCourses=courses.filter(c=>prog()[c.id]>=100).length;
    const completedLessons=courses.reduce((a,c)=>a+(c.lessons||[]).filter(l=>prog()[l.id]>=100).length,0);
    const avgProg=courses.length?Math.round(courses.reduce((a,c)=>{const ls=c.lessons||[];const done=ls.filter(l=>prog()[l.id]>=100).length;return a+(ls.length?done/ls.length*100:0);},0)/courses.length):0;
    const certs=courses.filter(c=>c.cert&&prog()[c.id]>=100).length;

    host.innerHTML=`
      <div style="background:linear-gradient(135deg,#1a2740,#0d1b2e);border-radius:14px;padding:20px 24px;margin-bottom:16px">
        <div class="between" style="margin-bottom:14px">
          <div><div style="font-size:18px;font-weight:900;color:#fff">🎓 Academia CXOrbia <span style="font-size:13px;font-weight:400;color:#94a3b8">Capacitación, certificaciones y recursos</span></div></div>
          <div class="flex" style="gap:8px">
            <button class="btn btn-sm" style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.3)" id="acadManuales">📖 Manuales</button>
            ${role==='admin'?`<select class="sel" id="acadAud" style="width:auto" title="A quién se dirigen los cursos"><option value="admin" ${(CX._acadAud||'admin')==='admin'?'selected':''}>🏢 Consultora</option><option value="shopper" ${CX._acadAud==='shopper'?'selected':''}>🕵️ Shopper</option><option value="cliente" ${CX._acadAud==='cliente'?'selected':''}>🏬 Cliente</option></select><button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.3)" id="acadNew">✨ Crear con IA</button><button class="btn btn-sm" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2)" id="acadLoad">⤒ Cargar recurso</button>`:''}
          </div>
        </div>
        <div class="grid g4">
          <div style="background:rgba(255,255,255,.08);border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:#fff">${courses.length}</div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px">Cursos</div><div style="font-size:11px;color:#64748b">${completedCourses} completados</div></div>
          <div style="background:rgba(255,255,255,.08);border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:${avgProg>=80?'#34d399':'#fbbf24'}">${avgProg}%</div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px">Avance promedio</div><div style="font-size:11px;color:#64748b">del equipo</div></div>
          <div style="background:rgba(255,255,255,.08);border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:#a78bfa">${certs}</div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px">Certificaciones</div><div style="font-size:11px;color:#64748b">obtenidas</div></div>
          <div style="background:rgba(255,255,255,.08);border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:#fff">${totalLessons}</div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px">Lecciones</div><div style="font-size:11px;color:#64748b">${completedLessons} completadas</div></div>
        </div>
      </div>
      <div class="flex wrap" style="gap:6px;margin-bottom:16px">
        ${CX.acadData.CATS.filter(c=>c==='Todos'||courses.some(x=>x.cat===c)).map(c=>`<button class="btn btn-sm acad-cat ${activeCat===c?'btn-pr':'btn-ghost'}" data-cat="${c}">${c}</button>`).join('')}
        ${role==='admin'?`<button class="btn btn-sm btn-ghost" id="acadNewCat" style="border-style:dashed">＋ Categoría</button>`:''}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        ${filtered.map(c=>{
          const ls=c.lessons||[];const done=ls.filter(l=>prog()[l.id]>=100).length;const pct=ls.length?Math.round(done/ls.length*100):0;
          return `<div class="card hov" data-course="${c.id}" style="cursor:pointer;overflow:hidden">
            <div style="background:linear-gradient(135deg,${c.color},${c.color}99);padding:18px 18px 14px;position:relative">
              <div class="between" style="margin-bottom:8px"><span style="background:rgba(255,255,255,.22);color:#fff;border-radius:20px;padding:3px 11px;font-size:11px;font-weight:700">${c.ic} ${c.cat}</span>${c.cert&&pct>=100?'<span style="font-size:18px">🏅</span>':''}</div>
              <div style="font-size:16px;font-weight:800;color:#fff">${c.n}</div>
              <div style="font-size:12px;color:rgba(255,255,255,.8);margin-top:4px">${c.desc}</div>
            </div>
            <div class="card-p" style="padding:14px 16px">
              <div style="font-size:11.5px;color:var(--t3);margin-bottom:10px">${ls.length} lecciones · ${c.mins} min ${c.cert?'· 🏅 certifica':''}</div>
              <div style="background:var(--border-2);border-radius:4px;height:6px;margin-bottom:6px"><div style="height:6px;border-radius:4px;background:${pct>=100?'var(--green)':c.color};width:${pct}%;transition:width .4s"></div></div>
              <div style="font-size:11.5px;color:var(--t3)">${pct>=100?'✅ Completado':pct>0?pct+'% completado':'Comenzar'}</div>
            </div>
          </div>`;}).join('')}
      </div>`;

    host.querySelector('#acadManuales')?.addEventListener('click',()=>openManuales());
    host.querySelector('#acadAud')?.addEventListener('change',e=>{CX._acadAud=e.target.value;activeCat='Todos';openCourse=null;openLesson=null;draw();});
    host.querySelectorAll('[data-course]').forEach(c=>c.addEventListener('click',()=>{openCourse=c.dataset.course;const course=getCourses().find(x=>x.id===openCourse);if(course){openLesson=course.lessons[0].id;lessonPlayer(course);}}));
    host.querySelectorAll('.acad-cat').forEach(b=>b.addEventListener('click',()=>{activeCat=b.dataset.cat;draw();}));
    host.querySelector('#acadNewCat')?.addEventListener('click',()=>ui.modal('＋ Nueva categoría',`
      <label class="lbl">Nombre de la categoría</label><input class="inp" id="ncatN" placeholder="Ej. Investigación de mercados" style="margin-bottom:12px">
      <div style="text-align:right"><button class="btn btn-pr btn-sm" id="ncatSave">Crear</button></div>
    `,{onMount:(ov,close)=>ov.querySelector('#ncatSave').addEventListener('click',()=>{const n=(ov.querySelector('#ncatN').value||'').trim();if(!n){ui.toast('Pon un nombre','warn');return;}if(!CX.acadData.CATS.includes(n))CX.acadData.CATS.push(n);try{localStorage.setItem('cx_acad_cats',JSON.stringify(CX.acadData.CATS));}catch(e){}close();draw();ui.toast('Categoría "'+n+'" creada','ok');})}));
    host.querySelectorAll('.acad-edit').forEach(b=>b.addEventListener('click',(e)=>{e.stopPropagation();const rr=role==='shopper'?'shopper':role==='cliente'?'cliente':'admin';const cc=getCourses().find(x=>x.id===b.dataset.cid);if(!cc)return;
      ui.modal('✎ Editar curso',`<div class="grid g2" style="gap:8px 12px"><div><label class="lbl">Nombre</label><input class="inp" id="ecN" value="${(cc.n||'').replace(/"/g,'&quot;')}"></div><div><label class="lbl">Categoría</label><select class="sel" id="ecC">${CX.acadData.CATS.filter(c=>c!=='Todos').map(c=>`<option ${c===cc.cat?'selected':''}>${c}</option>`).join('')}</select></div><div style="grid-column:1/3"><label class="lbl">Descripción</label><textarea class="inp" id="ecD" rows="2">${cc.desc||''}</textarea></div></div><div style="text-align:right;margin-top:10px;display:flex;justify-content:space-between"><button class="btn btn-ghost btn-sm" id="ecDel" style="color:var(--red)">🗑 Eliminar</button><button class="btn btn-pr btn-sm" id="ecSave">Guardar</button></div>`,{onMount:(ov,close)=>{ov.querySelector('#ecSave').addEventListener('click',()=>{CX.acadData.editCourse(rr,cc.id,{n:ov.querySelector('#ecN').value.trim(),cat:ov.querySelector('#ecC').value,desc:ov.querySelector('#ecD').value.trim()});close();draw();ui.toast('Curso actualizado','ok');});ov.querySelector('#ecDel').addEventListener('click',()=>{CX.acadData.delCourse(rr,cc.id);close();draw();ui.toast('Curso eliminado','');});}});
    }));()=>ui.modal('✨ Crear módulo con IA',`
      <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Carga material (PDF, video, texto) y la IA genera un curso completo con lecciones profundas y evaluación.</p>
      <input type="file" class="inp" accept=".pdf,.doc,.docx,.txt,image/*" style="padding:7px;margin-bottom:8px">
      <textarea class="inp" id="aiT" rows="3" placeholder="o describe el tema que quieres desarrollar…" style="margin-bottom:10px"></textarea>
      <div style="text-align:right"><button class="btn btn-green btn-sm" id="aiGo">Generar curso</button></div>
    `,{onMount:(ov,close)=>ov.querySelector('#aiGo').addEventListener('click',()=>{
      const tema=(ov.querySelector('#aiT').value||'').trim();
      if(!tema){ui.toast('Describe el tema o pega el material','warn');return;}
      if(CX.ai&&CX.ai.ready()){
        ui.toast('Generando curso con '+CX.ai.cfg().model+'…','',2500);
        CX.ai.ask('Crea un curso de capacitación sobre: "'+tema+'". Devuelve 4-6 lecciones. Cada lección como "## Título" seguido de contenido en HTML (<p>,<h3>,<ul>,<li>). La última lección debe ser un quiz con 3 preguntas.')
          .then(res=>{
            const parts=res.split(/##\s+/).filter(Boolean);
            const lessons=parts.map((p,i)=>{const nl=p.indexOf('\n');const n=p.slice(0,nl).trim()||'Lección '+(i+1);const html=p.slice(nl+1).trim();return {id:'l'+Date.now().toString(36)+i,n,ic:/quiz|evalua/i.test(n)?'❓':'📘',tipo:/quiz|evalua/i.test(n)?'quiz':'texto',content:'<div class="acad-content">'+html+'</div>'};});
            const rr=role==='shopper'?'shopper':role==='cliente'?'cliente':'admin';
            CX.acadData.addCourse(rr,{cat:activeCat==='Todos'?'IA':activeCat,ic:'✨',color:'#7c3aed',n:tema.slice(0,60),desc:'Generado con IA',lessons});
            close();draw();ui.toast('Curso generado · revisa, itera y publica','ok',4000);
          })
          .catch(e=>{close();ui.toast('Error IA: '+e.message,'warn');});
      } else {
        close();ui.toast('Configura un proveedor de IA en Integraciones para generar el curso','warn',4000);
      }
    })});
    host.querySelector('#acadLoad')?.addEventListener('click',()=>CX.router.nav('importador'));
  };

  draw();
  return host;
});

/* ── CSS de la Academia ── */
(()=>{const s=document.createElement('style');s.textContent=`
.acad-content{font-size:13.5px;color:var(--t2);line-height:1.7}
.acad-content h2{font-size:17px;font-weight:800;color:var(--t1);margin:0 0 12px}
.acad-content h3{font-size:14px;font-weight:700;color:var(--t1);margin:16px 0 8px}
.acad-content ul,.acad-content ol{margin:0 0 12px 20px;line-height:1.9}
.acad-content p{margin:0 0 10px}
.acad-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin:14px 0}
.acad-card{background:var(--brand-light);border-radius:10px;padding:13px;text-align:center}
.acad-card div{font-size:24px;margin-bottom:6px}
.acad-card b{font-size:12.5px;color:var(--t1);display:block;margin-bottom:4px}
.acad-card p{font-size:11.5px;color:var(--t3);margin:0}
.acad-section{background:var(--panel-2,#f8f9fa);border-left:3px solid var(--brand);border-radius:0 9px 9px 0;padding:10px 14px;margin-bottom:10px;font-size:13px;color:var(--t2)}
.acad-section b{color:var(--t1);display:block;margin-bottom:4px;font-size:13.5px}
.acad-flow{display:flex;flex-direction:column;gap:8px;margin:14px 0}
.acad-step{display:flex;gap:12px;align-items:flex-start;padding:10px 14px;border:1px solid var(--border);border-radius:10px}
.acad-step span{width:24px;height:24px;border-radius:50%;background:var(--brand);color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.acad-step b{font-size:13px;color:var(--t1);display:block;margin-bottom:3px}
.acad-step p{font-size:12px;color:var(--t3);margin:0}
.acad-opt:hover{background:var(--brand-light);border-color:var(--brand)}
@media(max-width:680px){[style*="grid-template-columns:220px"]{grid-template-columns:1fr!important}}
`;document.head.appendChild(s);})();
