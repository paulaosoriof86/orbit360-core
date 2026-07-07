/* ============================================================
   Orbit 360 · Academia PLUS — catálogo de autocapacitación en profundidad.
   Cursos por MÓDULO de la plataforma + técnico del sector, comercial,
   liderazgo, servicio, cumplimiento y habilidades digitales.
   Inyección idempotente: no duplica (clave = id) y sobrevive a reseed.
   NO toca backend protegido; solo agrega contenido de cursos al store.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ACADEMIA_PLUS = (function () {
  var C = {
    red: '#C5162E', graf: '#1E2227', azul: '#2A6FDB', verde: '#1F8A5B',
    terra: '#D97757', violeta: '#7A5BD9', teal: '#0E7C86', ocre: '#C9821B'
  };
  function L(t, min, secs) { return { t: t, min: min, tipo: 'lectura', secciones: secs }; }
  function Q(t, preguntas) { return { t: t, min: Math.max(6, preguntas.length * 3), tipo: 'quiz', preguntas: preguntas }; }
  function S(icon, t, color, d) { return { icon: icon, t: t, color: color, d: d }; }

  var cursos = [
    /* ============ AUTOCAPACITACIÓN POR MÓDULO ============ */
    {
      id: 'cur_p_clientes', titulo: 'Dominar Orbit Clientes (Expediente 360)', cat: 'Producto', emoji: '🧑‍💼', color: C.azul,
      desc: 'Autocapacitación a fondo del CRM: expediente, calidad de datos, importación y gestiones.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Checklist de expediente completo.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Anatomía del expediente 360', 12, [
          S('🗂', 'Las pestañas del cliente', C.azul, 'Cada cliente tiene un expediente único con **Resumen**, **Pólizas**, **Cobros**, **Siniestros**, **Actividades**, **Correos** y **Documentos**. Recórrelas de izquierda a derecha antes de llamar: en 30 segundos sabes qué tiene, qué debe y qué pendientes hay.'),
          S('📇', 'Datos que definen todo', C.verde, 'Nombre/razón social, tipo (Persona/Empresa), **identificación fiscal** (NIT/DPI/RFC/RUC según país), teléfono con WhatsApp, correo, país y ciudad. El país determina moneda e impuestos; nunca lo dejes vacío. Un dato de contacto errado rompe cadencias y cobros.'),
          S('🔗', 'Todo está enlazado', C.terra, 'Desde el expediente abres la póliza, el recibo, el siniestro o el correo sin salir del cliente. Cada acción (pago confirmado, gestión creada, correo enviado) queda registrada en **Actividades** con fecha viva y autor.')
        ]),
        L('Calidad de datos: por qué es tu prioridad #1', 10, [
          S('🩺', 'El módulo Calidad', C.red, 'Orbit detecta expedientes incompletos y los prioriza por impacto: primero clientes con **póliza vigente** sin teléfono o sin correo. Un cliente sin WhatsApp no recibe recordatorios de cobro ni renovación: cada dato faltante es plata que se fuga.'),
          S('⚡', 'Edición inline', C.azul, 'Completa el dato directo desde la lista de Calidad; al guardar, el registro desaparece de pendientes. Trabaja la lista de arriba hacia abajo unos minutos al día: es la rutina de mayor retorno del equipo operativo.'),
          S('📲', 'Notificar para completar', C.verde, 'Si el dato lo tiene el cliente (correo, beneficiario), dispara una plantilla por WhatsApp/correo pidiéndolo. No inventes datos: un teléfono equivocado es peor que un campo vacío.')
        ]),
        L('Importar y enriquecer sin ensuciar', 11, [
          S('⬇', 'Importación inteligente', C.ocre, 'Carga clientes desde Excel/CSV/PDF: el motor mapea columnas por sinónimos y muestra un **dry-run** (crear/actualizar/omitir) antes de escribir. Revisa el resumen: si algo va a **requiere_validación**, es porque falta país o moneda confiables — corrige la fuente, no fuerces.'),
          S('📎', 'Documentos que proponen, no imponen', C.violeta, 'Al cargar documentos de un cliente (DPI, RTU, póliza PDF), el sistema **propone cambios para aprobación**; no reescribe el expediente a ciegas. Tú validas el diff antes de aplicarlo.'),
          S('🚫', 'Reglas de oro', C.graf, 'No mezcles países/monedas en una misma carga. No infieras clientes desde movimientos financieros. Un expediente limpio hoy evita diez correcciones mañana.')
        ]),
        L('Paso a paso: crear y trabajar un cliente', 13, [
          S('➕', 'Crear un cliente', '#2A6FDB', 'Módulo **Clientes → botón "+ Cliente"**. Llena nombre/razón social, tipo (Persona/Empresa), **país** (define moneda e impuestos), identificación fiscal, teléfono con WhatsApp y correo. Guarda: el expediente queda creado y disponible para asociarle pólizas y cobros. Campos en gris = opcionales; los marcados son mínimos para operar.'),
          S('🔎', 'Buscar y abrir el 360', '#1F8A5B', 'Usa el **buscador superior** (por nombre, identificación o número de póliza) o la lista. Clic en la fila → se abre el **Expediente 360**. Arriba verás sus KPIs (pólizas, cartera, cumplimiento de datos); las pestañas de contenido debajo. Botón **"Abrir Cliente 360"** desde Inicio hace lo mismo para el cliente en foco.'),
          S('✏️', 'Editar y completar desde Calidad', '#C9821B', 'En el expediente, cada dato tiene lápiz de **edición inline**: clic, escribe, Enter. Desde **Calidad de datos**, la lista prioriza lo incompleto; al completar el campo y guardar, la fila desaparece. Para pedirle un dato al cliente: botón **"Notificar"** dispara la plantilla de WhatsApp/correo de actualización.'),
          S('📎', 'Adjuntar documento (propuesta)', '#7A5BD9', 'Pestaña **Documentos → "Subir"**. Al cargar un DPI/RTU/póliza, el sistema extrae datos y crea una **propuesta de actualización** (no reescribe): verás el cambio propuesto (actual → nuevo) para **Aprobar** o **Descartar**. Nada toca el expediente sin tu confirmación.')
        ]),
        Q('Evaluación · Orbit Clientes', [
          { p: '¿Qué prioriza el módulo Calidad de datos?', ops: ['Los clientes más nuevos', 'Clientes con póliza vigente y datos de contacto faltantes', 'Los de mayor prima únicamente'], ok: 1 },
          { p: 'Al importar, ¿qué haces si una fila queda en "requiere_validación"?', ops: ['La fuerzo a GTQ para avanzar', 'Reviso país/moneda en la fuente y corrijo antes de escribir', 'La elimino'], ok: 1 },
          { p: 'Los documentos cargados a un cliente…', ops: ['Reescriben el expediente automáticamente', 'Proponen cambios para revisión/aprobación', 'No sirven para nada'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_p_polcob', titulo: 'Pólizas, Cobros y Cartera a fondo', cat: 'Producto', emoji: '📑', color: C.red,
      desc: 'Autocapacitación: ciclo de la póliza, recibos por forma de pago, aplicación de pagos y aging.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Guía de estados de póliza y cartera.pdf', tipo: 'pdf' }],
      lecciones: [
        L('El ciclo de vida de una póliza', 12, [
          S('📑', 'Estados y qué significan', C.red, '**Vigente** y **Por renovar** generan cartera (recibos por cobrar). **Cancelada / Vencida / Anulada** son histórico: cuentan en analítica pero **no** producen recibos. Si una póliza importada no trae estado, queda en validación y no genera cartera hasta confirmarse.'),
          S('💵', 'Prima: neta, gastos, IVA, total', C.verde, 'La **prima neta recaudada** es la base de producción, metas y comisiones — no la prima total. Gastos de emisión e IVA se separan. Confundirlas infla la producción y te hace liquidar comisiones de más.'),
          S('🗓', 'Formas de pago y recibos', C.azul, 'Contado, mensual, trimestral, semestral, anual: cada frecuencia genera su calendario de recibos con vencimientos y posible recargo por fraccionamiento. El conducto (transferencia, tarjeta, efectivo) define cómo se concilia.')
        ]),
        L('Cobros: confirmar pagos y leer el aging', 11, [
          S('💳', 'Confirmar un pago', C.verde, 'Un pago **reportado** por el cliente queda pendiente de revisión/conciliación (no es cobro). Solo cuando el equipo lo valida y concilia, marca el recibo como **confirmado** con fecha y método: ahí baja la cartera y Finanzas recibe el recaudo. Reportado ≠ confirmado: sola acción con efecto en todo el sistema (sincronía en vivo).'),
          S('📊', 'Aging = antigüedad del vencido', C.ocre, 'El aging agrupa lo vencido por tramos (1-30, 31-60, 61-90, +90 días). Ataca primero el tramo de mayor riesgo: mientras más viejo el vencido, menos probable el recaudo. Cartera sana = pólizas vigentes con recibos al día.'),
          S('🔁', 'Cobros ≠ movimientos de caja', C.graf, 'El pago de un cliente es un **cobro/recaudo**, no un movimiento financiero de la empresa. Se concilian aparte: no mandes recaudos de clientes directo a caja/Finanzas.')
        ]),
        L('Conciliación: cruzar lo que dice el banco', 10, [
          S('🏦', 'Estado de cuenta bancario', C.teal, 'El estado bancario se importa a una **bandeja de conciliación**: cada línea queda pendiente de validar y cruzar con un recibo o un egreso. No crea cobros ni movimientos automáticamente — primero se valida.'),
          S('🧾', 'Estado de cuenta de aseguradora', C.violeta, 'La aseguradora envía su cartera; Orbit detecta recibos que faltan crear y pagos que no se han confirmado. Concilia para que tu cartera y la de la aseguradora coincidan mes a mes.')
        ]),
        L('Paso a paso: de la póliza al recibo cobrado', 13, [
          S('📑', 'Abrir una póliza', '#C5162E', 'Módulo **Pólizas** → filtra por estado/ramo/aseguradora con los selectores superiores, o busca. Clic en la fila → ficha con **desglose**: prima neta, gastos, IVA, prima total, frecuencia, forma de pago, estado de validación y **recibos generados**. Los KPIs de arriba (Prima vigente, Por renovar, Canceladas) son clicables y filtran la lista.'),
          S('💳', 'Confirmar un pago', '#1F8A5B', 'Un pago **reportado** por el cliente queda pendiente de revisión/conciliación. Solo el equipo, tras validar/conciliar, usa **"Registrar pago"** (fecha, método, conducto) y el recibo pasa a **confirmado**. Reportar no confirma: **Pagado/Conciliado**, la cartera baja y el recaudo llega a Finanzas — una sola acción, efecto en todo el sistema. Un pago solo **reportado por el cliente** queda "recibido para validación" hasta que el equipo lo valide.'),
          S('📊', 'Leer y atacar el aging', '#C9821B', 'En Cobros, el **aging** agrupa el vencido por tramos (1-30…+90 días). Ordena por antigüedad y trabaja primero el tramo más viejo (mayor riesgo). Botón de recordatorio envía la plantilla de cobro por WhatsApp — hazlo **antes** del vencimiento.'),
          S('🏦', 'Conciliar', '#0E7C86', 'El estado de cuenta (banco/aseguradora) se importa a una **bandeja de conciliación**: cada línea es una **propuesta** (encontrado exacto / probable / requiere validación) que cruza póliza, recibo, cliente, aseguradora, país, moneda, periodo y monto. Validas antes de aplicar; nunca se aplica productivo automático.')
        ]),
        L('Estados honestos: reportado ≠ conciliado ≠ confirmado', 13, [
          S('📤', 'Pago REPORTADO por el cliente', '#2A6FDB', 'Cuando el cliente reporta un pago desde el Portal, adjunta un **soporte/evidencia** y el recibo queda **Pendiente de revisión/conciliación** — NO es un cobro confirmado ni un pago aplicado. El adjunto es evidencia, no comprobante de aplicación. El equipo debe revisar y conciliar antes de confirmar.'),
          S('🔗', 'Conciliación = PROPUESTA', '#7A5BD9', 'La bandeja de conciliaciones cruza banco/aseguradora contra recibos y genera **propuestas** con score (MATCH_EXACTO / MATCH_PROBABLE / REQUIERE_VALIDACION / BLOQUEADO). **VALIDADA no significa pagada ni aplicada**: la bandeja no aplica pagos, no modifica cobros, no toca cartera, producción ni comisiones, y no escribe finmovs. Es una lista para revisión técnica; la aplicación real es una fase posterior autorizada.'),
          S('✅', 'Cobro CONFIRMADO', '#1F8A5B', 'Solo cuando un pago se valida y concilia pasa a **cobro confirmado**, baja la cartera y el recaudo cuenta. El flujo honesto: Reportado → Pendiente de revisión → Propuesta de conciliación → Validado para revisión → Conciliado → Cobro confirmado.'),
          S('💰', 'Cobros/recaudos NO son finmovs', '#C9821B', 'El pago de un cliente es un **cobro/recaudo**, no un movimiento financiero de caja de la empresa (finmov). Se concilian aparte. Producción, metas y comisiones se calculan sobre **prima neta recaudada**, nunca sobre prima total ni sobre pagos solo reportados. No se suman GTQ y COP en crudo: cada país su moneda.')
        ]),
        Q('Evaluación · Pólizas y Cobros', [
          { p: '¿Sobre qué base se calculan producción y comisiones?', ops: ['Prima total', 'Prima neta recaudada', 'Suma asegurada'], ok: 1 },
          { p: 'Una póliza Cancelada…', ops: ['Genera recibos de cartera igual', 'Es histórico y no genera cartera', 'Se borra del sistema'], ok: 1 },
          { p: 'El estado de cuenta bancario importado…', ops: ['Crea cobros y finmovs al instante', 'Va a una bandeja de conciliación pendiente de validar', 'Actualiza clientes'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_p_renov', titulo: 'Renovaciones, Cancelaciones y Retención', cat: 'Comercial', emoji: '🔄', color: C.verde,
      desc: 'Autocapacitación: pipeline por vencer, comparativo multi-aseguradora y recuperación de cartera.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Playbook de retención.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Renovar es vender de nuevo (más barato)', 11, [
          S('🔄', 'El pipeline por vencer', C.verde, 'Renovaciones muestra las pólizas que vencen en los próximos 90 días, ordenadas por urgencia. Retener cuesta 5-7 veces menos que captar: trabaja la renovación **60 días antes**, no el día del vencimiento.'),
          S('📋', 'Solicitar propuestas', C.azul, 'Puedes pedir renovación a la **misma** aseguradora, a **otras**, o a una selección. Orbit arma un **comparativo multi-aseguradora** (no solo replica la prima actual): así llegas al cliente con opciones, no con un simple aviso de cobro.'),
          S('💡', 'Argumento de renovación', C.ocre, 'No renueves por inercia. Recuerda coberturas usadas, siniestros bien atendidos y cambios de necesidad (auto nuevo, familia, negocio). El valor que diste durante el año es tu mejor argumento.')
        ]),
        L('Cancelaciones: entender la fuga', 10, [
          S('✕', 'Motivos y valor perdido', C.red, 'Cada cancelación registra motivo (precio, servicio, siniestro mal atendido, venta de bien) y el **valor de prima perdido**. La tasa de fuga es un KPI de salud: si sube, hay un problema de servicio o de precio que atacar.'),
          S('♻', 'Recuperación', C.verde, 'Una cancelación no siempre es definitiva. Marca intentos de recuperación y resultado. A veces basta una llamada a tiempo con una alternativa más económica para salvar la cuenta.')
        ]),
        Q('Evaluación · Renovaciones', [
          { p: '¿Con cuánta anticipación conviene trabajar una renovación?', ops: ['El día del vencimiento', '~60 días antes', 'Después de que venza'], ok: 1 },
          { p: 'El comparativo de renovación…', ops: ['Solo replica la prima de la misma aseguradora', 'Compara varias aseguradoras para ofrecer opciones', 'No existe'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_p_opsleads', titulo: 'Ops + Leads: el ciclo comercial en Orbit', cat: 'Comercial', emoji: '🎯', color: C.azul,
      desc: 'Autocapacitación del equipo: cómo fluye un negocio de cotización a emisión y cómo se sincronizan Ops y Leads.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Mapa Ops↔Leads.png', tipo: 'img' }],
      lecciones: [
        L('Ops y Leads: dos vistas, un mismo negocio', 12, [
          S('🗂', 'Ops = tablero del equipo', C.azul, 'Orbit Ops es el kanban interno (cotizaciones, inspecciones, emisiones, renovaciones, modificaciones y gestiones admin) con listas personalizables por el cliente. El **asesor no ve Ops**: ve su trabajo por Leads.'),
          S('🎯', 'Leads = pipeline del asesor', C.verde, 'Leads es el embudo comercial con etapas y probabilidad de cierre. Un mismo negocio se proyecta a ambos tableros y se **sincroniza en vivo**: mover en uno actualiza el otro.'),
          S('➡', 'El flujo completo', C.terra, 'Ingreso → cotiza (Ops) → negocia (Leads) → cierre → inspección/emisión (reaparece en Ops sin salir de Leads) → **emisión crea el cliente** y activa la cadencia de encuestas de satisfacción.')
        ]),
        L('Cadencias y multi-rol', 10, [
          S('🔁', 'Cadencias automáticas', C.ocre, 'Al pasar a Propuesta, Orbit activa una cadencia de seguimiento (WhatsApp primero; correo si no hay número). El seguimiento constante, no el descuento, es lo que cierra.'),
          S('👁', 'Ver como (multi-rol)', C.violeta, 'Un usuario puede tener varios roles y elegir qué tablero ver. Dirección/Admin ven todo; el Asesor ve solo su cartera y su comisión. Convertir un lead a cliente hereda los datos y arranca la cadencia de satisfacción.')
        ]),
        L('Paso a paso: mover un negocio de lead a emisión', 12, [
          S('🎯', 'Crear y mover en Leads', '#2A6FDB', 'Módulo **Leads → "+ Lead"** (o llega desde Marketing). Arrástralo entre columnas del pipeline o abre la ficha y cambia la **etapa**; ajusta la probabilidad. Al pasar a **Propuesta**, se activa la cadencia automática de seguimiento (WhatsApp/correo).'),
          S('🔁', 'Cotizar e inspeccionar (Ops)', '#0E7C86', 'Al negociar, el negocio aparece en **Ops** para el equipo interno (cotización, inspección, emisión) sin que el asesor salga de Leads. La sincronía es en vivo: lo que el equipo avanza en Ops, el asesor lo ve reflejado en su Leads.'),
          S('✅', 'Cerrar y emitir', '#1F8A5B', 'Marca **Cerrado** y luego **Emitir**: Orbit **crea el cliente** heredando los datos, genera la póliza y arranca la cadencia de encuestas de satisfacción. El negocio sale del pipeline como ganado. Para ver otro tablero según tu rol, usa **"Ver como"**.')
        ]),
        Q('Evaluación · Ops y Leads', [
          { p: '¿Quién NO ve el módulo Ops?', ops: ['Dirección', 'El Asesor (lo ve por Leads)', 'Admin'], ok: 1 },
          { p: 'Al marcar un negocio como Emitido…', ops: ['Se borra del pipeline', 'Se crea el cliente y arranca la cadencia de satisfacción', 'No pasa nada'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_p_finanzas2', titulo: 'Finanzas, Comisiones y Conciliación (operativo)', cat: 'Finanzas', emoji: '💰', color: C.ocre,
      desc: 'Autocapacitación: movimientos por país, catálogo editable, cierres por periodo, comisiones y liquidación.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Guía de cierre mensual.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Movimientos, país y moneda', 12, [
          S('🧾', 'Ingresos y egresos por mes/país', C.ocre, 'Registra ingresos (comisiones de aseguradoras, incentivos) y egresos (comisiones a asesores, gastos fijos, marketing, operación). **La moneda no se mezcla**: cada país maneja la suya y los totales se muestran por país o se normalizan explícitamente.'),
          S('🏷', 'Catálogo editable por tenant', C.azul, 'Las categorías de ingresos/egresos son configurables en Configuración → Categorías. No están quemadas: cada correduría adapta su plan de cuentas sin tocar código.'),
          S('🔒', 'Estados de cierre por periodo', C.graf, 'Cada mes muestra su estado: **Cerrado** (consolidado con respaldo), **Referencia** (primer mes tras el cierre, requiere conciliación), **Captura** (pendiente) o **Abierto**. No se cierra un periodo sin planillas y estados de cuenta que lo respalden.')
        ]),
        L('Comisiones: devengado vs liquidado', 11, [
          S('💼', 'Cómo se devenga', C.verde, 'La comisión se calcula sobre **prima neta recaudada**: mientras el recibo no se cobra, la comisión no se devenga del todo. Por eso cobrar a tiempo es tan importante como vender.'),
          S('⚖', 'Liquidación del asesor', C.terra, 'Los pagos a asesores se cruzan contra su comisión devengada; el resultado es modificable y auditable. Importar la planilla de comisiones de la aseguradora concilia esperada vs pagada y detecta diferencias.'),
          S('🧮', 'Sin simular tarifas', C.red, 'Las tarifas de comisión se leen de la planilla real; no se inventan. Actualizar el tarifario requiere confirmar el **diff** (porcentaje actual vs nuevo): nunca se pisa automáticamente.')
        ]),
        L('Paso a paso: cerrar el mes en Finanzas', 12, [
          S('🧾', 'Registrar y clasificar movimientos', '#C9821B', 'Módulo **Finanzas → "+ Movimiento"**: tipo (ingreso/egreso), categoría (del **catálogo editable** en Configuración → Categorías), monto, país y fecha. La **moneda no se mezcla**: cada país suma la suya; la vista global normaliza con tasa declarada. Recuerda: el pago de un cliente es **cobro**, no movimiento de caja.'),
          S('🔒', 'Estados de cierre', '#1E2227', 'Cada mes muestra su badge: **Cerrado / Referencia / Captura / Abierto**. Botón **"⚙ Categorías"** edita el catálogo; el selector de mes cambia el periodo. No cierres un mes sin respaldo (planillas y estados de cuenta).'),
          S('💼', 'Liquidar comisiones', '#1F8A5B', 'En Comisiones/Finanzas, la comisión se devenga sobre **prima neta recaudada**. Importa la planilla de la aseguradora: concilia **esperada vs pagada** y marca diferencias. La liquidación al asesor cruza su devengado contra lo pagado; ajústala y audita antes de pagar.')
        ]),
        Q('Evaluación · Finanzas', [
          { p: '¿Qué NO se debe hacer con las monedas?', ops: ['Mostrarlas por país', 'Mezclarlas en crudo en un total', 'Normalizarlas explícitamente'], ok: 1 },
          { p: 'Un periodo se marca "Cerrado" cuando…', ops: ['Pasa el mes', 'Está consolidado con respaldo (planillas/estados de cuenta)', 'El asesor lo decide'], ok: 1 },
          { p: 'La comisión se devenga sobre…', ops: ['Prima total facturada', 'Prima neta recaudada', 'Suma asegurada'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_p_import', titulo: 'Importador inteligente y migración de datos', cat: 'Técnico', emoji: '⬇', color: C.teal,
      desc: 'Autocapacitación: fuentes separadas, trazabilidad, país/moneda, estados de validación y reglas de migración.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Contrato de fuentes de migración.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Una fuente, un propósito', 12, [
          S('🧭', 'Fuentes separadas', C.teal, 'La migración opera por fuentes independientes: clientes, aseguradoras, pólizas, vehículos, cobros, planilla de comisiones, estado de cuenta bancario, financiero histórico, siniestros, documentos. **No se mezclan** y cada tipo declara qué crea y qué NO crea (alcance visible antes de subir).'),
          S('🚫', 'Reglas anti-inferencia', C.red, 'No se crean clientes/pólizas desde movimientos financieros. No se escribe cartera desde el histórico financiero. Los documentos solo **proponen** cambios al expediente. Cada regla evita ensuciar la base con datos inventados.'),
          S('🔎', 'Trazabilidad total', C.azul, 'Cada fila importada conserva archivo, **hoja, número de fila, bloque, país, moneda y periodo**. Si algo sale mal, se rastrea a la celda exacta. En Excel multihoja, se excluyen hojas soporte (dashboards, presupuestos, producción) antes de mapear.')
        ]),
        L('País, moneda y validación honesta', 11, [
          S('🌎', 'Nunca asumir', C.verde, 'Guatemala → GTQ, Colombia → COP, pero **solo si el país viene explícito**. Sin país o sin moneda confiable, la fila queda en **REQUIERE_VALIDACIÓN** — se puede sugerir una moneda, pero no se escribe como autorizada.'),
          S('🧾', 'Estados honestos', C.ocre, 'Cada registro muestra su estado real: LISTO, REQUIERE_VALIDACIÓN, BLOQUEADO, OMITIDO o DUPLICADO_PROBABLE. El **dry-run** te enseña qué pasará antes de escribir; el reporte lista filas excluidas con su motivo.'),
          S('📄', 'Descarga el reporte', C.violeta, 'Cada importación genera un reporte CSV con alcance, estado del archivo, resumen (crear/actualizar/omitir) y las filas excluidas. Guárdalo: es tu evidencia de qué entró y qué no.')
        ]),
        L('Paso a paso: importar una fuente sin ensuciar', 12, [
          S('🧭', 'Elegir la fuente correcta', '#0E7C86', 'Módulo **Importar** → elige la **tarjeta** del tipo (clientes, pólizas, cobros, planilla de comisiones, estado de cuenta, financiero histórico, documentos…). Antes de subir, lee el **banner de alcance "🔒"**: te dice qué crea y qué NO crea esa fuente.'),
          S('📄', 'Subir y revisar el dry-run', '#2A6FDB', 'Arrastra el archivo (Excel/CSV/PDF). El motor mapea columnas y muestra el **paso 2** con los registros reconocidos, hojas procesadas/excluidas y el **dry-run** (crear/actualizar/omitir). Botón **"⬇ Reporte"** descarga el CSV con trazabilidad y filas excluidas con motivo.'),
          S('✅', 'Confirmar con validaciones honestas', '#C9821B', 'Cada fila muestra su estado: LISTO / **REQUIERE_VALIDACIÓN** / BLOQUEADO / OMITIDO / DUPLICADO. Si falta país o moneda confiable, no se asume GT/GTQ: queda en validación. Corrige la fuente y reintenta; no fuerces. Documentos generan **propuestas**, no escritura directa.')
        ]),
        L('Conciliación: score, propuesta y validación', 12, [
          S('🔎', 'La conciliación es una propuesta, no una aplicación', '#7A5BD9', 'Cuando importas un estado de cuenta o una planilla de comisión, Orbit **cruza** cada fila (póliza, recibo, cliente, aseguradora, país, moneda, periodo, monto) y propone un resultado. Nada se aplica a cobros/comisiones hasta que un usuario lo **valida**.'),
          S('🎯', 'El score de coincidencia', '#1F8A5B', '**✓ MATCH_EXACTO**: coincide, listo para confirmar. **≈ MATCH_PROBABLE**: coincide con diferencia mínima (≤5%). **🔎 REQUIERE_VALIDACIÓN**: falta dato confiable (país/moneda/periodo) o hay diferencia media. **⛔ BLOQUEADO**: diferencia grande (>25%) o inconsistencia — no se aplica.'),
          S('✅', 'El flujo correcto', '#C9821B', 'Importar fuente → dry-run → **score** → propuesta de conciliación → **validación** del usuario → aplicación controlada. En planillas de comisión ves esperada vs pagada, diferencia, retención y ajuste; validas y solo entonces impacta liquidaciones. Nunca confirmes en lote sin revisar los BLOQUEADO y REQUIERE_VALIDACIÓN.')
        ]),
        L('Migración honesta: fuentes, banco y caso jun/jul 2026', 13, [
          S('🗂️', 'Fuente separada antes de leer', '#0E7C86', 'Cada fuente se declara en un **manifest/catálogo de fuentes reales** y se importa **por separado** (clientes, pólizas, cobros, planilla de comisión, estado de cuenta, financiero histórico, documentos). No se mezclan; cada tipo declara qué crea y qué NO. Nunca se infieren clientes desde finanzas.'),
          S('🏦', 'Banco y estado de cuenta NO son cobro', '#C5162E', '**Banco no crea cobro confirmado.** El **estado de cuenta del cliente no marca pago realizado** — solo propone conciliación. La **planilla de comisión no crea cartera ni cobro**. El **financiero histórico no crea cartera, cobros ni producción**: es referencia. Los **documentos soporte solo proponen** datos (diferencia revisable + confirmación).'),
          S('🌎', 'País/moneda y caso jun/jul 2026', '#C9821B', 'Si falta **país o moneda**, la fila queda **REQUIERE_VALIDACION** (no se asume). **GT=GTQ, CO=COP**, no se suman en crudo. **Caso especial junio/julio 2026**: es data de migración/transición — se trata como referencia a conciliar, no como lógica productiva fija; requiere validación antes de contar en cartera o producción.')
        ]),
        Q('Evaluación · Importador', [
          { p: 'Si una fuente no trae país ni moneda confiables…', ops: ['Se asume Guatemala/GTQ', 'Queda en REQUIERE_VALIDACIÓN', 'Se descarta en silencio'], ok: 1 },
          { p: 'Los documentos importados…', ops: ['Crean clientes directos', 'Proponen cambios pendientes de aprobación', 'Escriben cartera'], ok: 1 },
          { p: '¿Qué se conserva por cada fila?', ops: ['Solo el monto', 'Hoja, fila, bloque, país, moneda y periodo', 'Nada'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_p_insights', titulo: 'Insights, Reportes e IA para decidir', cat: 'Técnico', emoji: '📊', color: C.violeta,
      desc: 'Autocapacitación: leer la analítica del CRM, metas, aging y análisis con IA.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Diccionario de KPIs.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Leer Insights sin ahogarte en números', 12, [
          S('📊', 'Producción nueva vs renovada', C.violeta, 'Insights separa lo que vendes nuevo de lo que renuevas, contra tus metas. Una correduría sana crece en nuevo **y** retiene lo renovado. Si solo renuevas, no creces; si solo captas y no retienes, tienes un balde con agujeros.'),
          S('🎯', 'Metas sobre neta recaudada', C.verde, 'Las metas de recaudo, ventas y producción se miden sobre **prima neta recaudada**. Un negocio "cerrado" que no se cobra no cuenta hasta que entra la plata.'),
          S('⏳', 'Cartera y aging', C.ocre, 'Vigila el aging del vencido y la tasa de recaudo. El pipeline muestra dónde se estancan los negocios: si muchos mueren en "Propuesta enviada", el problema es el seguimiento, no la cotización.')
        ]),
        L('Reportes con análisis de IA', 10, [
          S('🤖', 'Analizar con IA', C.azul, 'Cada reporte tiene "Analizar con IA": genera una **lectura ejecutiva** (qué pasa y por qué importa) y **acciones sugeridas** priorizadas, calculadas sobre tus datos en vivo. Si la IA no está conectada, el análisis se hace igual con reglas sobre los datos.'),
          S('⬇', 'Exportar y programar', C.teal, 'Exporta a CSV/Excel/PDF y programa el envío. Un reporte que nadie lee no sirve: agenda los dos o tres que de verdad mueven decisiones y descarta el resto.')
        ]),
        L('Paso a paso: leer Insights y actuar', 11, [
          S('📊', 'Abrir y filtrar', '#7A5BD9', 'Módulo **Insights** → pestañas Resumen / Producción / Cartera / Pipeline. Usa el selector de **país** (arriba) para ver GT, CO o global. En global los importes se normalizan con tasa declarada; por país ves la moneda nativa (Q o $).'),
          S('🎯', 'Comparar contra meta', '#1F8A5B', 'Cada KPI (producción nueva, renovada, recaudo) se muestra contra su meta sobre **prima neta recaudada**. Clic en un KPI abre su detalle (pólizas/recibos que lo componen). Si el recaudo va bajo, el problema suele estar en Cobros, no en ventas.'),
          S('🔎', 'Del dato a la acción', '#C9821B', 'Si el pipeline muestra estancamiento en "Propuesta", refuerza cadencias en Leads. Si sube el aging, prioriza Cobros. Insights señala el síntoma; tú abres el módulo correcto y actúas.')
        ]),
        Q('Evaluación · Insights', [
          { p: 'Las metas se miden sobre…', ops: ['Negocios cerrados aunque no se cobren', 'Prima neta recaudada', 'Número de cotizaciones'], ok: 1 },
          { p: 'Si muchos negocios mueren en "Propuesta enviada", el problema suele ser…', ops: ['El precio siempre', 'El seguimiento/cadencia', 'La marca de la aseguradora'], ok: 1 }
        ])
      ]
    },
    /* ============ TÉCNICO DEL SECTOR (PROFUNDO) ============ */
    {
      id: 'cur_t_avanzado', titulo: 'Técnico de Seguros Avanzado: suscripción, tarificación y reaseguro', cat: 'Técnico', emoji: '📐', color: C.graf,
      desc: 'Cómo la aseguradora evalúa el riesgo, arma la prima y se protege — para argumentar con criterio técnico.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Fundamentos actuariales.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Suscripción: aceptar, modificar o rechazar el riesgo', 13, [
          S('📋', 'Qué es suscribir (underwriting)', C.graf, 'La aseguradora evalúa cada riesgo antes de aceptarlo: historial de siniestros, características del bien/persona, actividad, ubicación. Puede aceptar, **aceptar con recargo/exclusiones** o rechazar. Entender esto te evita prometer coberturas que no se van a emitir.'),
          S('⚠', 'Selección adversa y riesgo moral', C.red, 'Selección adversa: quien más riesgo tiene es quien más busca asegurarse. Riesgo moral: el asegurado se cuida menos por estar cubierto. Deducibles, coaseguro y exclusiones existen para alinear incentivos — explícalos como protección mutua, no como "letra chica".'),
          S('🔍', 'Infraseguro y sobreseguro', C.ocre, 'Si la suma asegurada es menor al valor real (**infraseguro**), aplica la regla proporcional y el cliente cobra menos en el siniestro. Sobreasegurar no paga de más: nadie se enriquece con un siniestro (principio indemnizatorio). Asegurar al valor correcto es parte de tu asesoría.')
        ]),
        L('Tarificación: de dónde sale la prima', 12, [
          S('🧮', 'Prima pura, de riesgo y comercial', C.azul, 'Prima pura = frecuencia × severidad esperada. Se le suman gastos, margen y comisiones para la prima comercial. Por eso dos aseguradoras cotizan distinto el mismo auto: pesan la estadística y sus gastos de forma diferente.'),
          S('📊', 'Frecuencia y severidad', C.verde, 'Frecuencia = cuántos siniestros ocurren; severidad = cuánto cuesta cada uno. Un ramo puede tener muchos siniestros baratos (frecuencia alta) o pocos carísimos (severidad alta). Cada uno se tarifica y reasegura distinto.'),
          S('💵', 'Ley de los grandes números', C.terra, 'El seguro funciona porque muchos aportan una prima pequeña para cubrir a los pocos que sufren el siniestro. Cuanta más masa asegurada, más predecible el resultado. Ese es el negocio que tú distribuyes.')
        ]),
        L('Reaseguro: quién asegura a la aseguradora', 11, [
          S('🛡️', 'Para qué sirve', C.graf, 'La aseguradora transfiere parte de su riesgo a reaseguradoras para poder aceptar riesgos grandes y absorber catástrofes. Sin reaseguro no existirían pólizas industriales ni de grandes patrimonios.'),
          S('🔀', 'Proporcional vs no proporcional', C.violeta, 'Proporcional (cuota-parte/excedente): comparten prima y siniestro en un porcentaje. No proporcional (exceso de pérdida): el reasegurador paga solo lo que supera cierto monto. Es el "seguro del seguro" que sostiene tu cartera grande.')
        ]),
        L('Paso a paso: aplicar el criterio técnico en la venta', 12, [
          S('📋', 'Leer una carátula de póliza', '#1E2227', 'Ubica: suma asegurada, coberturas incluidas, **exclusiones**, deducible y vigencia. Antes de vender, verifica que la suma asegurada corresponda al valor real del bien (evita infraseguro y la regla proporcional en el siniestro).'),
          S('🧮', 'Explicar por qué una prima es más alta', '#2A6FDB', 'Si el cliente compara dos cotizaciones, traduce: mayor cobertura, menor deducible, mejor red o suma correcta justifican la diferencia. La prima refleja frecuencia × severidad del riesgo, no capricho de la aseguradora.'),
          S('🛡️', 'Detectar cuándo interviene el reaseguro', '#7A5BD9', 'En riesgos grandes (industriales, patrimonios altos) la aseguradora reasegura; por eso pide inspección y más datos. Explícalo como respaldo, no como traba: es lo que permite emitir coberturas grandes.')
        ]),
        Q('Evaluación · Técnico avanzado', [
          { p: 'Si la suma asegurada es menor al valor real del bien…', ops: ['El cliente cobra de más', 'Aplica regla proporcional y cobra menos (infraseguro)', 'No pasa nada'], ok: 1 },
          { p: 'La prima pura se estima principalmente con…', ops: ['El logo de la aseguradora', 'Frecuencia × severidad esperada', 'La antigüedad del asesor'], ok: 1 },
          { p: 'El reaseguro sirve para…', ops: ['Cobrarle más al cliente', 'Que la aseguradora transfiera parte de su riesgo', 'Eliminar deducibles'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_t_siniestros', titulo: 'Gestión Profesional de Siniestros', cat: 'Servicio', emoji: '🚨', color: C.red,
      desc: 'El momento de la verdad: acompañar el reclamo de principio a fin y proteger la relación.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Checklist de siniestro por ramo.pdf', tipo: 'pdf' }],
      lecciones: [
        L('El siniestro es tu mejor (o peor) marketing', 12, [
          S('🚨', 'Aviso a tiempo', C.red, 'El primer paso es el **aviso/reporte** dentro del plazo de la póliza. Un aviso tardío puede costar la indemnización. Ten a mano el canal de cada aseguradora y repórtalo por el cliente si hace falta.'),
          S('📂', 'Documentación completa', C.ocre, 'Cada ramo pide su expediente (denuncia, facturas, informes, fotos, exámenes). Un reclamo bien armado se paga rápido; uno incompleto se estanca. Usa el checklist por ramo y súbelo al expediente del cliente en Orbit.'),
          S('⏱', 'Seguimiento y bitácora', C.azul, 'En Orbit, el reclamo se vincula a la póliza y avanza por estados (reportado → en análisis → aprobado/rechazado → pagado) con bitácora. Mide días abiertos y días hasta pago: son tu KPI de servicio real.')
        ]),
        L('Cuando la respuesta no es la esperada', 10, [
          S('⚖', 'Rechazos y objeciones', C.graf, 'Si la aseguradora objeta o rechaza, entiende el fundamento (exclusión, falta de cobertura, documentación). Tu rol es traducirlo al cliente y, cuando corresponda, apelar con argumentos técnicos. La transparencia sostiene la confianza incluso en un no.'),
          S('❤️', 'Retención en el peor momento', C.verde, 'Un siniestro bien acompañado renueva y refiere; uno mal atendido cancela y habla mal de ti por años. El siniestro no es un trámite: es la promesa de tu producto cumpliéndose.')
        ]),
        L('Paso a paso: acompañar un siniestro en Orbit', 12, [
          S('🚨', 'Registrar el reclamo', '#C5162E', 'Módulo **Siniestros** (o desde la ficha del cliente) → nuevo reclamo: póliza, tipo, fecha, monto reclamado. Repórtalo a la aseguradora dentro del plazo; adjunta la documentación del checklist por ramo en Documentos del cliente.'),
          S('⏱', 'Seguir el estado', '#C9821B', 'El reclamo avanza por estados (reportado → en análisis → aprobado/rechazado → pagado) con bitácora y días abiertos. Mantén al cliente informado en cada cambio: el silencio en un siniestro es lo que más molesta.'),
          S('❤️', 'Cerrar bien', '#1F8A5B', 'Al pagar, confirma con el cliente y registra el cierre. Un siniestro bien acompañado es tu mejor argumento de renovación; uno mal atendido es la causa #1 de cancelación.')
        ]),
        Q('Evaluación · Siniestros', [
          { p: '¿Cuál es el primer paso del proceso de siniestro?', ops: ['El pago de la indemnización', 'El aviso/reporte dentro del plazo', 'La renovación'], ok: 1 },
          { p: 'Un siniestro mal atendido…', ops: ['No afecta la relación', 'Provoca cancelación y mala reputación', 'Sube la comisión'], ok: 1 }
        ])
      ]
    },
    /* ============ COMERCIAL AVANZADO ============ */
    {
      id: 'cur_c_avanzado', titulo: 'Venta Consultiva Avanzada y Manejo de Objeciones', cat: 'Comercial', emoji: '🧠', color: C.verde,
      desc: 'Más allá de lo básico: diagnóstico profundo, propuesta de valor, cierre y multiventa.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Biblioteca de objeciones y respuestas.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Diagnóstico antes que producto', 12, [
          S('❓', 'Preguntas de alto valor', C.verde, 'El asesor experto dedica el 70% al diagnóstico. Preguntas como "¿qué pasaría con tu familia/negocio si…?", "¿sabes qué cubre lo que tienes hoy?", "¿qué es lo que más te preocuparía perder?" abren la necesidad real. Vender es preguntar, no recitar coberturas.'),
          S('🎯', 'De la necesidad al valor', C.azul, 'Conecta cada cobertura con un dolor concreto: no vendas "todo riesgo", vende "sigues moviéndote si chocas y no tienes que pagar la reparación de golpe". El cliente compra tranquilidad, no cláusulas.'),
          S('🔗', 'Multiventa y ciclo de vida', C.terra, 'Un cliente con una sola póliza es un cliente en riesgo de fuga. Detecta oportunidades naturales (auto → vida → hogar → GM) según su momento de vida. Cada póliza extra sube la retención y el valor de la cuenta.')
        ]),
        L('Objeciones: señales de compra', 11, [
          S('💬', '"Está caro"', C.red, 'Precio casi nunca es el problema real: es percepción de valor. Desglosa qué incluye, compáralo con el costo de no tenerlo, ofrece formas de pago o una cobertura ajustada. Nunca compitas solo por precio: el precio lo iguala cualquiera, tu servicio no.'),
          S('🕐', '"Lo voy a pensar"', C.ocre, 'Suele esconder una duda no resuelta o falta de urgencia. Pregunta "¿qué te falta para decidir?" y agenda un próximo paso concreto. Sin próximo paso, no hay seguimiento; sin seguimiento, no hay cierre.'),
          S('🤝', 'Cerrar y después', C.verde, 'Cierra pidiendo la decisión con naturalidad y confirma los siguientes pasos. Al emitir, Orbit crea el cliente y arranca la cadencia de satisfacción: el cierre es el **inicio** de la relación, no el final.')
        ]),
        L('Paso a paso: una entrevista de venta consultiva', 12, [
          S('❓', 'Abrir con diagnóstico', '#1F8A5B', 'Empieza preguntando por su situación y preocupaciones, no por el producto. Toma nota en la ficha del lead. El 70% del tiempo es escuchar; cuanto mejor el diagnóstico, más fácil el cierre.'),
          S('🎯', 'Proponer con valor', '#2A6FDB', 'Presenta 2-3 opciones (usa el Cotizador/Comparativo) y **recomienda una** conectando cada cobertura con un dolor concreto del cliente. No entregues precios sueltos: entrega una decisión asesorada.'),
          S('🤝', 'Cerrar y agendar el siguiente paso', '#C9821B', 'Pide la decisión con naturalidad; ante una objeción, refuerza valor y ofrece alternativas (forma de pago, ajustar cobertura). Si dice "lo pienso", agenda fecha concreta: sin próximo paso no hay seguimiento.')
        ]),
        Q('Evaluación · Venta consultiva', [
          { p: 'En una venta consultiva, la mayor parte del tiempo se dedica a…', ops: ['Hablar de coberturas', 'Diagnosticar con preguntas', 'Negociar precio'], ok: 1 },
          { p: 'Ante "está caro", lo mejor es…', ops: ['Bajar el precio de inmediato', 'Reforzar valor y ofrecer alternativas', 'Terminar la conversación'], ok: 1 }
        ])
      ]
    },
    /* ============ LIDERAZGO ============ */
    {
      id: 'cur_lid_equipos', titulo: 'Liderazgo de Equipos Comerciales', cat: 'Liderazgo', emoji: '🧭', color: C.graf,
      desc: 'Dirigir con datos y con personas: metas, coaching, cadencia de gestión y cultura.', destinatarios: 'Dirección',
      recursos: [{ nombre: 'Tablero de gestión semanal.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Dirigir con datos, liderar con personas', 13, [
          S('🎯', 'Metas que motivan', C.graf, 'Buenas metas son claras, medibles y alcanzables con esfuerzo, sobre **prima neta recaudada**. Baja la meta anual a mensual y por asesor. Lo que no se mide no se gestiona; lo que no se comunica no se cumple.'),
          S('📅', 'Cadencia de gestión', C.azul, 'Instala un ritmo: revisión semanal de pipeline y cartera, 1:1 quincenal por asesor, cierre mensual con números. La constancia del ritmo pesa más que la brillantez de una reunión aislada.'),
          S('🧑‍🏫', 'Coaching, no solo control', C.verde, 'Usa Insights para ver dónde se atora cada asesor (prospección, cierre, cobro) y entrena esa habilidad puntual. Reconoce en público, corrige en privado. El líder multiplica cuando desarrolla, no cuando fiscaliza.')
        ]),
        L('Cultura, retención y decisiones difíciles', 11, [
          S('🌱', 'Cultura de servicio', C.terra, 'La cultura es lo que el equipo hace cuando nadie mira: cómo atienden un siniestro, cómo cargan los datos, cómo tratan al cliente difícil. Modela lo que pides; la cultura se contagia de arriba hacia abajo.'),
          S('🔁', 'Retener talento', C.violeta, 'Un asesor formado que se va se lleva cartera y conocimiento. Plan de carrera, comisiones justas y buena herramienta (Orbit) retienen. La rotación alta casi siempre es un síntoma de liderazgo, no de mercado.'),
          S('⚖', 'Decidir con criterio', C.red, 'Datos + juicio. Los números dicen qué pasa; el criterio dice qué hacer. Decide a tiempo aunque falte información perfecta: la indecisión cuesta más que un error corregible.')
        ]),
        L('Paso a paso: la semana del líder comercial', 11, [
          S('📅', 'Lunes: revisar tablero', '#1E2227', 'Abre Insights y el pipeline del equipo. Identifica quién está lejos de su meta (prima neta recaudada) y en qué etapa se atoran sus negocios. Prepara los temas de los 1:1.'),
          S('🧑‍🏫', 'Semana: coaching por asesor', '#1F8A5B', 'En cada 1:1 usa datos concretos (sus KPIs) y entrena la habilidad específica que falla (prospección, cierre o cobro). Reconoce logros en público; corrige en privado.'),
          S('📊', 'Cierre de mes: números y ajustes', '#C9821B', 'Revisa metas vs real, cartera y fuga. Ajusta prioridades del mes siguiente. La cadencia constante (semanal/mensual) pesa más que reuniones aisladas brillantes.')
        ]),
        Q('Evaluación · Liderazgo', [
          { p: 'Una buena cadencia de gestión incluye…', ops: ['Solo el cierre anual', 'Ritmo semanal/quincenal/mensual constante', 'Reuniones improvisadas'], ok: 1 },
          { p: 'La regla de oro del reconocimiento es…', ops: ['Corregir en público', 'Reconocer en público, corregir en privado', 'No dar feedback'], ok: 1 }
        ])
      ]
    },
    /* ============ CUMPLIMIENTO / NORMATIVA (PROFUNDO) ============ */
    {
      id: 'cur_cum_pldp', titulo: 'Cumplimiento, PLD/LAFT y Protección de Datos', cat: 'Cumplimiento', emoji: '⚖️', color: C.violeta,
      desc: 'Obligaciones del intermediario: prevención de lavado, conozca a su cliente y tratamiento de datos.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Guía KYC y señales de alerta.pdf', tipo: 'pdf' }],
      lecciones: [
        L('PLD/LAFT y Conozca a su Cliente (KYC)', 12, [
          S('🕵️', 'Por qué te aplica', C.violeta, 'El intermediario es sujeto obligado en prevención de lavado de activos y financiamiento del terrorismo. Debes identificar al cliente y al **beneficiario final**, entender el origen de fondos y conservar el soporte. No es burocracia: es protección legal para ti y la correduría.'),
          S('🚩', 'Señales de alerta', C.red, 'Pagos en efectivo desproporcionados, terceros que pagan por el asegurado, prisa injustificada, negativa a dar información, coberturas sin sentido económico. Ante una alerta, documenta y **escala** por el canal de cumplimiento; no la ignores ni la resuelvas solo.'),
          S('📁', 'Debida diligencia', C.azul, 'Identificación válida, verificación de datos y monitoreo continuo, proporcional al riesgo del cliente. En Orbit, expediente completo y documentos soportan tu debida diligencia; el importador con validación evita cargar identidades dudosas.')
        ]),
        L('Protección de datos personales', 11, [
          S('🛡️', 'Qué protege la ley', C.verde, 'Los datos de clientes (identidad, contacto, pólizas, salud en GM, financieros) están protegidos (Habeas Data en CO, normativa de datos en GT y equivalentes). Se recolectan con finalidad y consentimiento, se usan solo para eso y se resguardan.'),
          S('🔐', 'Tus obligaciones diarias', C.graf, 'Credenciales personales e intransferibles, no exportar ni fotografiar datos fuera de la plataforma, no compartir carteras. El deber de confidencialidad **sigue después** de terminar la relación laboral. Una filtración es sanción legal y pérdida de confianza.')
        ]),
        L('Paso a paso: KYC y datos en la práctica', 11, [
          S('🕵️', 'Identificar bien al cliente', '#7A5BD9', 'Al alta, verifica identidad y, en empresas, el **beneficiario final**. Registra origen de fondos cuando aplique y guarda el soporte en Documentos. Un expediente completo es tu debida diligencia documentada.'),
          S('🚩', 'Ante una señal de alerta', '#C5162E', 'Pagos en efectivo desproporcionados, terceros que pagan, prisa injustificada: documenta y **escala por el canal de cumplimiento**. No la resuelvas solo ni la ignores.'),
          S('🔐', 'Cuidar los datos', '#1F8A5B', 'Credenciales personales, no exportar carteras ni fotografiar datos. El deber de confidencialidad sigue después de terminar la relación laboral.')
        ]),
        Q('Evaluación · Cumplimiento', [
          { p: 'Ante una señal de alerta de lavado, debes…', ops: ['Ignorarla si el cliente es conocido', 'Documentar y escalar por el canal de cumplimiento', 'Resolverla tú solo'], ok: 1 },
          { p: 'El deber de confidencialidad…', ops: ['Termina al salir de la empresa', 'Se mantiene incluso después de terminar la relación', 'No aplica a asesores'], ok: 1 }
        ])
      ]
    },
    /* ============ SERVICIO / CX ============ */
    {
      id: 'cur_cx', titulo: 'Servicio y Experiencia del Cliente (CX)', cat: 'Servicio', emoji: '❤️', color: C.terra,
      desc: 'Convertir la póliza en relación: momentos clave, comunicación y recuperación de clientes molestos.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Mapa de momentos del cliente.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Los momentos que deciden la relación', 12, [
          S('🗺', 'El viaje del cliente', C.terra, 'Cotización, emisión, primer cobro, un siniestro, la renovación: cada momento suma o resta confianza. Identifica los **momentos de la verdad** (sobre todo el siniestro y el primer cobro) y sé impecable ahí; el resto se perdona, esos no.'),
          S('📲', 'Comunicación proactiva', C.azul, 'El cliente valora que le avises **antes** del vencimiento, que le confirmes el pago cuando quede confirmado/conciliado y que le expliques su cobertura sin que lo pida. Orbit automatiza recordatorios y encuestas de satisfacción tras la emisión: úsalos, no dependas de la memoria.'),
          S('⭐', 'Encuestas y NPS', C.verde, 'La cadencia de satisfacción mide si recomendarían tu servicio. Un promotor refiere; un detractor cancela y advierte a otros. Cierra el ciclo: agradece al promotor y llama al detractor antes de perderlo.')
        ]),
        L('Recuperar a un cliente molesto', 10, [
          S('🔥', 'Del reclamo a la lealtad', C.red, 'Un cliente que se queja te da una segunda oportunidad; el que se va sin decir nada, no. Escucha sin defenderte, reconoce, resuelve rápido y da un paso extra. Un problema bien resuelto genera más lealtad que si nunca hubiera ocurrido.'),
          S('🤝', 'Lenguaje que suma', C.ocre, 'Evita jerga técnica y "no se puede". Traduce a beneficios, ofrece opciones y compromete plazos que cumplas. La forma de decir las cosas es parte del producto que vendes.')
        ]),
        L('Paso a paso: cuidar los momentos clave', 11, [
          S('📲', 'Comunicación proactiva', '#D97757', 'Confirma cada pago cuando quede conciliado (no cuando solo lo reportan), avisa antes del vencimiento y explica coberturas sin que las pidan. Usa plantillas de WhatsApp/correo desde Orbit; personaliza nombre y dato clave.'),
          S('⭐', 'Actuar sobre la encuesta', '#1F8A5B', 'Tras la emisión arranca la cadencia de satisfacción. Agradece al promotor y pídele un referido; llama al detractor de inmediato para recuperar antes de que cancele.'),
          S('🔥', 'Recuperar al molesto', '#C5162E', 'Escucha sin defenderte, reconoce, resuelve rápido y da un paso extra. Un problema bien resuelto genera más lealtad que si nunca hubiera pasado.')
        ]),
        Q('Evaluación · Servicio', [
          { p: 'Los "momentos de la verdad" más críticos suelen ser…', ops: ['La publicidad', 'El siniestro y el primer cobro', 'El color del logo'], ok: 1 },
          { p: 'Un detractor en la encuesta de satisfacción…', ops: ['Se ignora', 'Se contacta antes de perderlo', 'Se elimina del sistema'], ok: 1 }
        ])
      ]
    },
    /* ============ HABILIDADES DIGITALES / IA ============ */
    {
      id: 'cur_dig_ia', titulo: 'Habilidades Digitales e IA para Intermediarios', cat: 'Técnico', emoji: '🤖', color: C.azul,
      desc: 'Usar bien la tecnología: automatización, integraciones, IA responsable y productividad.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Guía de integraciones.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Automatización e integraciones', 12, [
          S('⚡', 'Automatizar lo repetitivo', C.azul, 'Recordatorios de cobro y renovación, cadencias de seguimiento, encuestas: lo repetitivo lo hace el sistema para que tú te dediques a lo humano (asesorar, cerrar, acompañar siniestros). Configura las automatizaciones una vez y déjalas trabajar.'),
          S('🔌', 'Integraciones con criterio', C.teal, 'Correo (Outlook/Gmail), WhatsApp, Sheets, Canva, redes: se conectan por tenant. Mientras una integración no esté activa, el sistema es honesto y la muestra como **pendiente de conexión**, no simula que funciona. Conecta solo lo que vas a usar.'),
          S('📈', 'Marketing e historial', C.violeta, 'El calendario de marketing y su historial de eventos por contenido te dan trazabilidad de cada pieza. Mide qué contenido genera leads y repite lo que funciona; descarta lo que no.')
        ]),
        L('IA responsable en tu día a día', 11, [
          S('🤖', 'Qué hace bien la IA', C.azul, 'Extraer datos de un PDF, redactar un correo, resumir un reporte, sugerir argumentos. Orbit IA usa el proveedor configurado y, si no está, degrada con reglas sobre tus datos. La IA acelera; no reemplaza tu criterio.'),
          S('✅', 'Revisar siempre', C.red, 'La IA puede equivocarse: verifica cifras, nombres y coberturas antes de enviar al cliente. No pegues datos sensibles en herramientas no autorizadas. Tú firmas la asesoría, no la máquina.'),
          S('⏱', 'Productividad real', C.verde, 'Plantillas, atajos y IA te devuelven horas. Reinviértelas en lo que la tecnología no hace: entender al cliente, negociar y estar presente cuando ocurre el siniestro.')
        ]),
        L('Paso a paso: apalancarte en la tecnología', 11, [
          S('⚡', 'Configurar automatizaciones', '#2A6FDB', 'En Automatizaciones conecta eventos (cobro, renovación, marketing) con canales. Configúralas una vez y déjalas trabajar; revisa el panel de eventos para ver qué se disparó.'),
          S('🤖', 'Usar IA con revisión', '#7A5BD9', 'Orbit IA extrae datos de PDF, redacta correos y resume reportes. Siempre **verifica cifras, nombres y coberturas** antes de enviar al cliente; no pegues datos sensibles en herramientas no autorizadas.'),
          S('🔌', 'Integraciones honestas', '#0E7C86', 'Conecta solo lo que usarás. Mientras una integración no esté activa se muestra como pendiente de conexión; nunca simula que publica o envía.')
        ]),
        Q('Evaluación · Digital e IA', [
          { p: 'Una integración no conectada se muestra como…', ops: ['Activa', 'Pendiente de conexión (honesto)', 'Error técnico al cliente'], ok: 1 },
          { p: 'Con contenido generado por IA, lo correcto es…', ops: ['Enviarlo tal cual', 'Revisar cifras, nombres y coberturas antes de enviar', 'No usar nunca IA'], ok: 1 }
        ])
      ]
    },
    /* ============ POR PRODUCTO / RAMO (PROFUNDO) ============ */
    {
      id: 'cur_r_vida', titulo: 'Producto: Vida e Invalidez', cat: 'Producto', emoji: '❤️', color: '#C5162E',
      desc: 'Coberturas de vida, cálculo de suma asegurada y argumentos de venta con sensibilidad.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Calculadora de necesidad de vida.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Qué cubre Vida y para quién', 12, [
          S('❤️', 'Coberturas base y adicionales', '#C5162E', 'Vida cubre fallecimiento (deja capital a los beneficiarios) y suele sumar adicionales: **invalidez total y permanente**, enfermedades graves, gastos funerarios, exención de pago de prima. Vida entera vs temporal: temporal es más barata y protege una etapa; entera acumula valor. Explica ambas según el momento del cliente.'),
          S('🧮', 'Cuánta suma asegurada', '#1F8A5B', 'Regla práctica: cubrir deudas + años de ingreso que la familia necesita para sostenerse + metas (educación de los hijos). No vendas una cifra al azar: calcula la **necesidad real** y ajústala al presupuesto. Infraasegurar en Vida es dejar a la familia a medias.'),
          S('👨‍👩‍👧', 'A quién le sirve', '#2A6FDB', 'A quien tiene personas que dependen de su ingreso o deudas que no quiere heredar. Emprendedores, padres jóvenes, personas con crédito hipotecario. La necesidad no es la edad: es la responsabilidad económica.')
        ]),
        L('Vender Vida sin miedo', 10, [
          S('🗣', 'Hablar de lo difícil', '#C9821B', 'Nadie quiere pensar en su muerte, por eso muchos no se aseguran. Enmarca la conversación en **amor y responsabilidad**: "¿quién sostiene a tu familia si tú faltas?". No es vender miedo; es ofrecer tranquilidad.'),
          S('📄', 'Declaración de salud', '#7A5BD9', 'Vida y GM exigen declaración honesta de salud: ocultar condiciones puede anular el pago del siniestro. Acompaña al cliente a declarar bien; una póliza que no paga es peor que ninguna.')
        ]),
        Q('Evaluación · Vida', [
          { p: 'La suma asegurada de Vida se calcula sobre…', ops: ['La edad del cliente', 'Deudas + años de ingreso + metas familiares', 'El logo de la aseguradora'], ok: 1 },
          { p: 'Ocultar una condición de salud en la declaración…', ops: ['No afecta', 'Puede anular el pago del siniestro', 'Baja la prima legalmente'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_r_gm', titulo: 'Producto: Gastos Médicos y Salud', cat: 'Producto', emoji: '🏥', color: '#0E7C86',
      desc: 'Cobertura de salud, deducible y coaseguro, red y argumentos frente al sistema público.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Comparativo de planes GM.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Cómo funciona un plan de salud', 12, [
          S('🏥', 'Qué cubre', '#0E7C86', 'Hospitalización, cirugías, consultas, medicamentos, emergencias, estudios. Individual (una persona) o familiar (grupo). La **suma asegurada** y la **red** (hospitales y médicos incluidos) definen el plan tanto como el precio.'),
          S('💸', 'Deducible y coaseguro', '#C9821B', 'Deducible: lo que paga el cliente antes de que entre el seguro. Coaseguro: el % que comparte en cada evento. Más deducible = menos prima, pero más gasto de bolsillo en el siniestro. Ayuda al cliente a elegir el balance según su capacidad, no solo el precio.'),
          S('🌐', 'Red y tope', '#2A6FDB', 'Dentro de red se paga menos; fuera de red, más. El tope máximo por evento o anual importa: una cirugía cara puede superar sumas bajas. Vender GM barato con tope insuficiente es un mal favor.')
        ]),
        L('Argumentar salud con criterio', 10, [
          S('⏱', 'Preexistencias y carencias', '#7A5BD9', 'Las condiciones previas suelen tener periodo de carencia o exclusión temporal. Declara con honestidad y explica los tiempos: sorprender al cliente en el siniestro destruye la relación.'),
          S('🛡️', 'Complemento, no lujo', '#1F8A5B', 'Frente al sistema público, GM es acceso rápido y elección de médico en el peor momento. Enmárcalo como protección del patrimonio: una hospitalización sin seguro puede costar años de ahorro.')
        ]),
        Q('Evaluación · GM', [
          { p: 'Un deducible más alto normalmente…', ops: ['Sube la prima', 'Baja la prima pero aumenta el gasto de bolsillo', 'No cambia nada'], ok: 1 },
          { p: 'Atender dentro de la red…', ops: ['Cuesta más', 'Cuesta menos al asegurado', 'No está permitido'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_r_hogar', titulo: 'Producto: Hogar y Patrimonio', cat: 'Producto', emoji: '🏠', color: '#1F8A5B',
      desc: 'Cobertura de vivienda y contenidos, valor de reposición y venta cruzada con Auto/Vida.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Inventario de contenidos.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Qué protege Hogar', 11, [
          S('🏠', 'Estructura y contenidos', '#1F8A5B', 'Cubre el inmueble (incendio, daños por agua, fenómenos naturales) y los contenidos (muebles, electrónicos). Añade responsabilidad civil familiar y asistencias (plomero, cerrajero, electricista). Es de las coberturas de mejor relación valor/precio y baja siniestralidad.'),
          S('📐', 'Valor de reposición vs real', '#2A6FDB', 'Reposición: repara/repone a nuevo. Valor real: descuenta depreciación. Asegura a valor de reposición para que el cliente no pague la diferencia tras el siniestro. Revisa el valor cada renovación: la construcción sube.'),
          S('🔗', 'La puerta a la multiventa', '#C9821B', 'Hogar es excelente para venta cruzada: quien asegura su casa suele tener auto y familia que proteger. Un cliente con Auto+Hogar+Vida casi no se va: sube retención y valor de la cuenta.')
        ]),
        Q('Evaluación · Hogar', [
          { p: 'Asegurar a valor de reposición significa…', ops: ['Descontar depreciación', 'Reponer/reparar a nuevo', 'Pagar menos siempre'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_r_fianzas', titulo: 'Producto: Fianzas y Cumplimiento', cat: 'Producto', emoji: '📜', color: '#7A5BD9',
      desc: 'Un ramo distinto: garantía a un tercero, tipos de fianza y análisis de afianzamiento.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Tipos de fianza y requisitos.pdf', tipo: 'pdf' }],
      lecciones: [
        L('La fianza no es un seguro cualquiera', 12, [
          S('📜', 'Tres partes, no dos', '#7A5BD9', 'En la fianza intervienen fiado (quien debe cumplir), beneficiario (a quien se garantiza) y afianzadora. Garantiza el **cumplimiento de una obligación**: si el fiado falla, la afianzadora paga al beneficiario y **le cobra al fiado** (hay recuperación). No es indemnización sin retorno como en seguros.'),
          S('🏗', 'Tipos frecuentes', '#2A6FDB', 'Seriedad de oferta, cumplimiento de contrato, buen manejo de anticipo, estabilidad de obra, calidad del servicio (contratación estatal y privada). Cada una respalda una etapa del contrato del cliente.'),
          S('🔎', 'Análisis de afianzamiento', '#C9821B', 'La afianzadora estudia capacidad técnica, financiera y experiencia del fiado antes de emitir. Tu rol es preparar el expediente y explicar por qué piden contragarantías: es gestión de riesgo, no desconfianza.')
        ]),
        Q('Evaluación · Fianzas', [
          { p: 'A diferencia de un seguro, en la fianza…', ops: ['No hay beneficiario', 'La afianzadora recupera del fiado lo que paga', 'No se analiza al cliente'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_r_rc', titulo: 'Producto: Responsabilidad Civil', cat: 'Producto', emoji: '⚖️', color: '#1E2227',
      desc: 'Proteger el patrimonio frente a daños a terceros: RC general, profesional y D&O.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Escenarios de RC por actividad.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Cuando el daño es a otro', 12, [
          S('⚖️', 'Qué cubre RC', '#1E2227', 'Responde por daños a terceros (personas o bienes) que el asegurado cause: lesiones a un cliente en el local, daño profesional, error de un directivo. Cubre indemnización y **defensa legal**. Un solo juicio puede costar más que años de prima.'),
          S('🩺', 'RC profesional y D&O', '#2A6FDB', 'RC Profesional protege a médicos, arquitectos, abogados por errores en su ejercicio. D&O protege a directores y administradores por decisiones de gestión. Son coberturas de alto valor para empresas y profesionales — mercado con poca competencia y buena comisión.'),
          S('🏭', 'A quién le urge', '#C9821B', 'Cualquier negocio que reciba público, preste servicios profesionales o tenga directivos. El patrimonio personal y empresarial está expuesto; RC lo blinda. Es asesoría de alto impacto que pocos ofrecen bien.')
        ]),
        Q('Evaluación · RC', [
          { p: 'La cobertura de RC responde por…', ops: ['Daños al propio asegurado', 'Daños a terceros que el asegurado cause', 'Solo robo'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_r_transporte', titulo: 'Producto: Transporte y Carga', cat: 'Producto', emoji: '🚚', color: '#C9821B',
      desc: 'Mercancías en tránsito, modalidades y coordinación con el ramo de comercio exterior.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Incoterms y seguro de carga.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Asegurar mercancía en movimiento', 12, [
          S('🚚', 'Qué cubre', '#C9821B', 'Protege las mercancías durante su transporte (terrestre, marítimo, aéreo) contra pérdida o daño: accidente, robo, mojadura, manipulación. Puede ser por **viaje** (un envío) o **póliza flotante/anual** (todos los envíos del año), ideal para importadores/exportadores frecuentes.'),
          S('🌎', 'Comercio exterior', '#2A6FDB', 'Los Incoterms definen quién asegura y hasta dónde. Un cliente que importa o exporta necesita que la responsabilidad y el seguro coincidan con el término pactado. Coordinar esto bien te vuelve indispensable para su operación.'),
          S('📦', 'Suma y valor', '#1F8A5B', 'Se asegura sobre el valor de la factura (a veces + flete + un margen). Documentar bien el embarque agiliza el reclamo si algo se pierde en el camino.')
        ]),
        Q('Evaluación · Transporte', [
          { p: 'Una póliza flotante/anual conviene a…', ops: ['Quien hace un solo envío', 'Importadores/exportadores con envíos frecuentes', 'Nadie'], ok: 1 }
        ])
      ]
    },
    /* ============ CÓMO USAR Y EDITAR LA ACADEMIA ============ */
    {
      id: 'cur_meta_academia', titulo: 'Cómo crear y editar cursos en la Academia', cat: 'Inducción', emoji: '🛠️', color: '#2A6FDB',
      desc: 'Guía para administradores: crear, regenerar con IA, complementar, eliminar y cargar desde documentos.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Guía del editor de Academia.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Todo curso es editable', 11, [
          S('🛠️', 'Crear y estructurar', '#2A6FDB', 'Usa **+ Curso** para crear uno nuevo (título, categoría, emoji, color, destinatarios por rol). Agrega **lecciones** de 4 tipos: 🎬 video (YouTube/Vimeo/HeyGen embed), 📖 lectura (por secciones o texto), ✏️ quiz (preguntas con respuesta correcta) y 📎 recurso (PDF/imagen/Drive embebido). Reordénalas arrastrando.'),
          S('✨', 'Regenerar con IA', '#7A5BD9', 'En cada lección de lectura o quiz, **✨/🧠** genera o mejora el contenido con IA: redacta la lección, expande un borrador o crea preguntas. Puedes **replantear** todas las preguntas o solo complementar. La IA propone; tú editas y apruebas antes de guardar.'),
          S('📎', 'Desde un documento', '#1F8A5B', 'Sube un PDF/Word/imagen o un texto y el sistema **extrae** contenido para armar la lección o generar el quiz a partir de él. También cargas recursos (manuales, piezas) que quedan embebidos para consulta. Ideal para convertir tu material actual en cursos sin reescribir.')
        ]),
        L('Mantener la Academia viva', 9, [
          S('🗑', 'Complementar y eliminar', '#C5162E', 'Edita el texto, agrega secciones, cambia el orden, elimina lo que ya no aplica. Marca certificado cuando el curso lo amerite. La Academia es un producto vivo: revísala cada trimestre para que refleje productos, normativa y procesos actuales.'),
          S('🧭', 'Rutas por rol y certificados', '#0E7C86', 'Asigna cada curso a un rol (destinatarios): así aparece en la **Ruta por rol** ordenada por categoría, y al completarlo el usuario obtiene un **certificado imprimible**. Diseña la ruta de inducción de un nuevo colaborador con estos cursos en orden.')
        ]),
        Q('Evaluación · Editor de Academia', [
          { p: 'Los cuatro tipos de lección son…', ops: ['Solo lectura', 'Video, lectura, quiz y recurso', 'Video y quiz únicamente'], ok: 1 },
          { p: 'La IA en la Academia…', ops: ['Publica sin revisión', 'Propone contenido que tú editas y apruebas', 'No existe'], ok: 1 },
          { p: 'Un curso asignado a un rol…', ops: ['No se ve', 'Aparece en la Ruta por rol y da certificado al completarse', 'Se elimina solo'], ok: 1 }
        ])
      ]
    },
    /* ============ RUTAS DE INDUCCIÓN GUIADAS (ONBOARDING) ============ */
    {
      id: 'cur_ind_asesor', titulo: '🚀 Inducción del Asesor Nuevo — ruta completa', cat: 'Inducción', emoji: '🚀', color: '#C5162E',
      desc: 'Ruta guiada para un asesor que ingresa: la empresa, lo comercial y el dominio de la plataforma, en orden.', destinatarios: 'Asesor',
      recursos: [{ nombre: 'Plan de mis primeros 30 días.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Bienvenida y tu ruta de aprendizaje', 10, [
          S('👋', 'Bienvenido al equipo', '#C5162E', 'Ahora eres asesor de una correduría que trabaja con método y tecnología. Tu éxito no depende de la suerte, sino de un proceso: prospectar, asesorar bien, cerrar y **acompañar**. Esta ruta te lleva de cero a productivo con un orden claro; síguela sin saltarte pasos.'),
          S('🧭', 'Tu ruta en 3 tramos', '#2A6FDB', '**1) La empresa y las reglas** (esta lección y la siguiente). **2) Lo comercial**: haz los cursos *Ventas Consultivas*, *Venta Consultiva Avanzada* y los de *Producto por ramo* (Auto, Vida, GM, Hogar…). **3) La plataforma**: *Ops + Leads*, *Orbit Clientes*, *Pólizas y Cobros*, *Renovaciones*. Cierra con *Cumplimiento y Protección de Datos*.'),
          S('⏱', 'Ritmo sugerido (30 días)', '#1F8A5B', 'Semana 1: empresa + Fundamentos de Seguros + Ops/Leads. Semana 2: producto por ramo + Clientes/Pólizas. Semana 3: venta consultiva + práctica real acompañado. Semana 4: renovaciones, cumplimiento y tu primer cierre solo. Marca cada curso como completado para obtener tu certificado.')
        ]),
        L('La empresa: quiénes somos y cómo trabajamos', 11, [
          S('🏢', 'Nuestra propuesta de valor', '#1E2227', 'No vendemos pólizas: asesoramos y acompañamos. El diferencial no es el precio (lo iguala cualquiera), es el **servicio**: gestión de cobros, recordatorios de renovación, y estar presente cuando ocurre el siniestro. Ese es el valor agregado que te hace irremplazable.'),
          S('🤝', 'Ética y marca', '#7A5BD9', 'Representas la marca en cada contacto. Honestidad en la declaración de salud, claridad en coberturas, cero promesas que no se cumplen. Una venta mal hecha se cae en el primer siniestro y te cuesta la reputación.'),
          S('📲', 'Herramienta única: Orbit 360', '#0E7C86', 'Toda tu operación vive en Orbit: tus prospectos, tu cartera, tus comisiones, tus recordatorios. Cargar bien los datos no es burocracia: es lo que hace que el sistema trabaje para ti (cadencias, alertas, cobros). Un dato mal cargado es una venta que se enfría.')
        ]),
        L('Lo comercial y la plataforma, de la mano', 10, [
          S('🎯', 'Tu día en Leads', '#2A6FDB', 'Verás tu trabajo por **Orbit Leads** (no ves Ops, eso es del equipo interno). Cada prospecto avanza por etapas con cadencias automáticas de seguimiento. Tu disciplina de seguimiento, no el descuento, es lo que cierra.'),
          S('🔁', 'Del cierre a la relación', '#1F8A5B', 'Al emitir, Orbit crea el cliente y arranca la cadencia de satisfacción. Tu cartera es tu patrimonio: cuídala con servicio y multiventa (Auto → Vida → Hogar → GM). Un cliente con varias pólizas casi no se va.'),
          S('✅', 'Antes de cerrar tu inducción', '#C9821B', 'Completa: Fundamentos de Seguros, un producto por ramo, Ops+Leads, Orbit Clientes, Pólizas y Cobros, Renovaciones, y Cumplimiento. Cuando termines la ruta, tendrás tu certificado y estarás listo para vender con método.')
        ]),
        Q('Evaluación · Inducción del asesor', [
          { p: 'El diferencial de la correduría frente al precio es…', ops: ['El logo', 'El servicio y acompañamiento', 'Vender más barato'], ok: 1 },
          { p: 'Como asesor, tu trabajo diario lo ves en…', ops: ['Orbit Ops', 'Orbit Leads', 'Finanzas'], ok: 1 },
          { p: 'Cargar bien los datos en Orbit sirve para…', ops: ['Cumplir por cumplir', 'Que las cadencias, alertas y cobros trabajen por ti', 'Nada'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_ind_admin', titulo: '🗂️ Inducción Administrativa y Operativa — ruta completa', cat: 'Inducción', emoji: '🗂️', color: '#0E7C86',
      desc: 'Ruta guiada para personal administrativo/operativo: cómo funciona cada módulo, qué hacer y cómo ayuda.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Manual operativo por módulo.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Bienvenida y tu ruta operativa', 10, [
          S('👋', 'Tu rol sostiene la operación', '#0E7C86', 'El área administrativa/operativa es la columna vertebral: sin datos limpios, cobros al día y gestiones resueltas, la correduría no funciona. Orbit te da las herramientas; esta ruta te enseña a usarlas todas con criterio.'),
          S('🧭', 'Tu ruta por módulos', '#2A6FDB', 'En orden: **Orbit Clientes** (expediente y calidad de datos) → **Pólizas y Cobros** (cartera y conciliación) → **Ops + Leads** (gestiones) → **Importador** (migración y cargas) → **Renovaciones/Cancelaciones** → **Finanzas** (operativo) → **Cumplimiento**. Cada uno es un curso de esta Academia.'),
          S('💡', 'Cómo te ayuda Orbit', '#1F8A5B', 'La sincronía en vivo hace que una acción tuya (confirmar un pago conciliado, completar un dato, crear una gestión) se refleje en todo el sistema al instante. Menos doble digitación, menos errores, más control. Tu trabajo se vuelve trazable y auditable.')
        ]),
        L('Qué hacer en cada módulo', 12, [
          S('🩺', 'Calidad de datos primero', '#C5162E', 'Empieza el día por el módulo **Calidad**: completa los expedientes con póliza vigente que no tienen teléfono o correo. Es la rutina de mayor retorno: un cliente sin WhatsApp no recibe recordatorios de cobro ni renovación.'),
          S('💳', 'Cobros y conciliación', '#C9821B', 'Confirma cobros validados, vigila el aging del vencido y concilia los estados de cuenta (banco y aseguradora) en su bandeja. Recuerda: el pago de un cliente es un **cobro**, no un movimiento de caja; se concilian aparte.'),
          S('⬇', 'Cargas sin ensuciar', '#2A6FDB', 'En el Importador, cada fuente tiene un propósito y un alcance visible. Revisa siempre el **dry-run** antes de escribir; si algo queda en *requiere_validación*, corrige la fuente. No mezcles países ni monedas.')
        ]),
        L('Gestiones, valor agregado y cierre', 10, [
          S('🗂', 'Ops: el tablero del equipo', '#0E7C86', 'Las gestiones (endosos, certificados, cancelaciones, actualizaciones) viven en Ops como tarjetas con checklist, responsable y fecha. Solicitar una gestión desde la ficha del cliente la crea asociada a su póliza. Nada se pierde: todo queda registrado.'),
          S('🌟', 'Los valores agregados', '#7A5BD9', 'Plantillas de WhatsApp/correo, recordatorios automáticos, portal del cliente, reportes con IA, academia. Conócelos: cada uno te ahorra tiempo y mejora el servicio. La tecnología hace lo repetitivo para que tú resuelvas lo humano.'),
          S('✅', 'Cierra tu inducción', '#1F8A5B', 'Completa los cursos de la ruta por módulos y el de Cumplimiento. Al terminar tendrás el mapa completo de la plataforma y tu certificado de inducción operativa.')
        ]),
        Q('Evaluación · Inducción operativa', [
          { p: '¿Por dónde conviene empezar el día operativo?', ops: ['Por Finanzas', 'Por Calidad de datos (expedientes incompletos)', 'Por Marketing'], ok: 1 },
          { p: 'El estado de cuenta bancario importado…', ops: ['Crea cobros y finmovs al instante', 'Va a una bandeja de conciliación pendiente de validar', 'Modifica clientes'], ok: 1 },
          { p: 'La sincronía en vivo significa que…', ops: ['Hay que digitar todo dos veces', 'Una acción se refleja en todo el sistema al instante', 'Nada se guarda'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_ind_cliente', titulo: '🎉 Bienvenido a tu Portal — guía y seguros básicos', cat: 'Producto', emoji: '🎉', color: '#1F8A5B',
      desc: 'Ruta de bienvenida para el cliente nuevo: cómo usar el portal y conceptos básicos de seguros por ramo.', destinatarios: 'clientes',
      recursos: [{ nombre: 'Guía rápida de tu portal.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Bienvenido: para qué es tu portal', 8, [
          S('🎉', 'Gracias por confiar en nosotros', '#1F8A5B', 'Te damos la bienvenida. Somos tu correduría: no solo te vendimos un seguro, te acompañamos durante toda su vigencia. Este portal es tu ventana para ver tus pólizas, pagar, reportar y aprender, cuando quieras y desde donde estés.'),
          S('🧭', 'Tu recorrido en 4 pasos', '#2A6FDB', '**1)** Revisa tus **Pólizas** (coberturas, prima, vigencia). **2)** Consulta **Pagos** y reporta un pago con su comprobante. **3)** Reporta y sigue un **Siniestro**. **4)** Solicita gestiones a tu asesor y aprende con esta sección. Todo en minutos, sin llamadas.'),
          S('📲', 'Siempre a la mano', '#C9821B', 'Puedes instalar el portal como app en tu teléfono. Recibirás avisos de vencimientos y confirmaciones de pago. Ante cualquier duda, el botón de asistente te ayuda o te conecta con tu asesor.')
        ]),
        L('Conceptos de seguros que te conviene saber', 12, [
          S('🛡️', 'Prima, cobertura y deducible', '#1E2227', '**Prima**: lo que pagas por tu seguro. **Cobertura**: lo que te protege (está en la carátula de tu póliza). **Deducible**: la parte que asumes en un siniestro antes de que entre el seguro. Conocer estos tres te evita sorpresas.'),
          S('🚗', 'Auto', '#C5162E', 'La cobertura amplia protege tu vehículo (choque, robo, incendio) y a terceros; la de responsabilidad civil cubre solo el daño a otros. Ante un choque: ponte a salvo, toma fotos, no admitas culpa y reporta el siniestro por el portal o a tu asesor.'),
          S('❤️', 'Vida y Gastos Médicos', '#7A5BD9', 'Vida deja un respaldo económico a tu familia si tú faltas. Gastos Médicos cubre hospitalización, cirugías y consultas según tu plan (ojo al deducible y la red de hospitales). Declara siempre tu salud con honestidad: es lo que garantiza que te paguen.'),
          S('🏠', 'Hogar y otros', '#1F8A5B', 'Hogar protege tu vivienda y lo que hay dentro (incendio, daños por agua, robo) y suma asistencias (plomero, cerrajero). Si tienes negocio, pregunta por Responsabilidad Civil. Tu asesor te ayuda a tener la protección correcta para tu momento de vida.')
        ]),
        Q('Evaluación · Bienvenida', [
          { p: 'El deducible es…', ops: ['Lo que paga la aseguradora siempre', 'La parte que asumes antes de que entre el seguro', 'Un descuento'], ok: 1 },
          { p: 'Ante un choque, lo correcto es…', ops: ['Admitir culpa y arreglar aparte', 'Ponerte a salvo, tomar fotos y reportar el siniestro', 'No avisar a nadie'], ok: 1 },
          { p: 'Para que Gastos Médicos/Vida te paguen, debes…', ops: ['Ocultar condiciones de salud', 'Declarar tu salud con honestidad', 'No leer la póliza'], ok: 1 }
        ])
      ]
    },
    /* ============ CIERRE DE COBERTURA: MÓDULOS + HABILIDADES BLANDAS ============ */
    {
      id: 'cur_p_aseg_cotiz', titulo: 'Aseguradoras, Cotizador y Comparativo', cat: 'Producto', emoji: '🏢', color: '#2A6FDB',
      desc: 'Autocapacitación: directorio de aseguradoras, cotización multicompañía y comparativo consultivo.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Ficha de aseguradora y accesos.pdf', tipo: 'pdf' }],
      lecciones: [
        L('El directorio de aseguradoras', 11, [
          S('🏢', 'Todo en una ficha', '#2A6FDB', 'Cada aseguradora tiene su ficha editable: contactos y ejecutivos de cuenta, ramos que maneja, accesos (portales/links), clausulados, pólizas de ejemplo, Drive y **comisiones por ramo**. Mantenla al día: un contacto correcto acelera cotizaciones, emisiones y siniestros.'),
          S('🔗', 'Alimenta a todo el sistema', '#1F8A5B', 'La info de aseguradoras nutre el Cotizador, el Comparativo y la IA. Las comisiones por ramo se usan para calcular tu devengado. Un directorio bien cargado es la base de una operación multicompañía ordenada.')
        ]),
        L('Cotizar y comparar con criterio', 12, [
          S('🧮', 'Cotizador multicompañía', '#C9821B', 'El wizard Tipo → Cliente → Cotizaciones consulta varias aseguradoras a la vez. Cotiza siempre 2-3 opciones: le das a elegir al cliente y proteges la venta si una compañía sube la prima. Imprime por aseguradora y deriva al comparativo.'),
          S('📋', 'Comparativo consultivo, no tabla', '#7A5BD9', 'El comparativo no solo alinea precios: extrae coberturas y genera una **recomendación** con análisis crítico. La opción más barata rara vez es la mejor: compara deducibles, sumas, exclusiones y red. Tu valor es traducir la tabla en una decisión.'),
          S('🎯', 'Presentar la propuesta', '#C5162E', 'No entregues tres cotizaciones y te calles. Recomienda una con argumentos (cobertura/precio/servicio) y explica por qué. El cliente contrató un asesor, no un buscador de precios.')
        ]),
        Q('Evaluación · Aseguradoras y cotización', [
          { p: 'Lo ideal al cotizar es…', ops: ['Una sola opción', 'Comparar 2-3 aseguradoras y recomendar con criterio', 'Siempre la más barata'], ok: 1 },
          { p: 'El comparativo consultivo…', ops: ['Solo ordena precios', 'Analiza coberturas y sugiere una recomendación', 'No sirve'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_p_comunicacion', titulo: 'Comunicación con el Cliente: Correo, WhatsApp y Plantillas', cat: 'Servicio', emoji: '✉️', color: '#0E7C86',
      desc: 'Autocapacitación: bandeja de correo, mensajería, plantillas y notificaciones del portal.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Biblioteca de plantillas.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Los canales dentro de Orbit', 11, [
          S('✉️', 'Correo vinculado al expediente', '#0E7C86', 'La bandeja permite redactar y vincular cada correo a un cliente/póliza/cobro/gestión: queda en el expediente. Al conectar Outlook/Gmail se sincroniza tu cuenta real; mientras no, el sistema es honesto y no simula una conexión activa.'),
          S('💬', 'WhatsApp y plantillas', '#1F8A5B', 'Las plantillas de WhatsApp/correo (propuestas, primas pendientes, actualización de datos, bienvenida) estandarizan el mensaje y ahorran tiempo. Personaliza el nombre y el dato clave: una plantilla fría no cierra, una plantilla con contexto sí.'),
          S('🔔', 'Notificaciones al portal', '#2A6FDB', 'Puedes enviar avisos al portal del cliente (uno o todos). Úsalo para vencimientos, novedades y confirmaciones. Comunicación proactiva = menos llamadas de reclamo y más confianza.')
        ]),
        L('Escribir para que respondan', 9, [
          S('🎯', 'Claro, corto, con acción', '#C9821B', 'Un buen mensaje tiene un solo objetivo y una acción clara (paga aquí, confirma, agenda). Evita jerga técnica y párrafos largos. Si el cliente tiene que pensar qué hacer, no hace nada.'),
          S('⏱', 'Momento y canal', '#7A5BD9', 'WhatsApp para lo urgente y cercano; correo para lo formal y con adjuntos. Recordatorios de cobro **antes** del vencimiento, no después. El canal y el momento correctos multiplican la respuesta.')
        ]),
        Q('Evaluación · Comunicación', [
          { p: 'Una integración de correo no conectada…', ops: ['Se muestra como activa', 'Se muestra como pendiente de conexión (honesto)', 'Da error al cliente'], ok: 1 },
          { p: 'Un buen mensaje al cliente tiene…', ops: ['Varios objetivos', 'Un objetivo y una acción clara', 'Mucha jerga técnica'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_soft_prod', titulo: 'Productividad, Agenda y Gestión del Tiempo', cat: 'Liderazgo', emoji: '⏳', color: '#C9821B',
      desc: 'Habilidad blanda + módulo Cronograma: priorizar, planificar el día y no perder seguimientos.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Plantilla de bloque semanal.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Dueño de tu tiempo, dueño de tus resultados', 12, [
          S('🗓', 'El Cronograma en Orbit', '#C9821B', 'Inicio y Cronograma muestran tus tareas del día y la agenda (día/semana/mes). Empieza cada mañana revisándolos: vencimientos de cobro, renovaciones próximas, gestiones abiertas y toques de seguimiento pendientes. Lo que no está agendado, no ocurre.'),
          S('📊', 'Prioriza por impacto', '#C5162E', 'No todo urge igual. Primero: cobros vencidos y renovaciones a 60 días (plata en riesgo). Luego: prospectos calientes en seguimiento. Al final: administrativo que puede esperar. Trabajar lo importante antes que lo ruidoso.'),
          S('🔁', 'Bloques y cadencia', '#1F8A5B', 'Agrupa tareas similares en bloques (llamadas juntas, cargas juntas) y respeta la cadencia de seguimiento del sistema. El foco vale más que las horas: 2 horas concentradas rinden más que un día disperso.')
        ]),
        L('No perder ningún seguimiento', 9, [
          S('📌', 'El sistema recuerda por ti', '#2A6FDB', 'Las cadencias, alertas de vencimiento y el módulo Calidad evitan que algo se caiga. Confía en el sistema, pero revísalo a diario: una alerta ignorada es una venta o un cobro que se pierde.'),
          S('🧘', 'Sostenible, no heroico', '#7A5BD9', 'La productividad real es constancia, no maratones. Un ritmo diario ordenado supera al esfuerzo intermitente. Protege tu energía para los momentos que importan: cerrar y acompañar siniestros.')
        ]),
        Q('Evaluación · Productividad', [
          { p: '¿Qué priorizas primero en el día?', ops: ['Lo administrativo', 'Cobros vencidos y renovaciones próximas (plata en riesgo)', 'Redes sociales'], ok: 1 },
          { p: 'La productividad real se basa en…', ops: ['Maratones intermitentes', 'Constancia y foco diario', 'Trabajar más horas'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_soft_negociacion', titulo: 'Negociación Efectiva para Intermediarios', cat: 'Comercial', emoji: '🤝', color: '#1F8A5B',
      desc: 'Habilidad blanda: preparar, crear valor, manejar precio y cerrar acuerdos que duran.', destinatarios: 'equipo',
      recursos: [{ nombre: 'Guía de preparación de negociación.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Negociar es crear valor, no repartir', 12, [
          S('🎯', 'Prepara antes de hablar', '#1F8A5B', 'Antes de negociar, ten claro: qué necesita realmente el cliente, tu margen, tus alternativas y las suyas. Quien llega preparado conduce la conversación; quien improvisa, cede. La negociación se gana antes de empezar.'),
          S('💡', 'Amplía la torta', '#2A6FDB', 'No pelees solo el precio: agrega valor que a ti te cuesta poco y al cliente le importa mucho (acompañamiento, formas de pago, ajustar coberturas, servicio prioritario). Negociar bien es encontrar el acuerdo donde ambos ganan.'),
          S('💬', 'Precio con confianza', '#C9821B', 'Si concedes precio, pide algo a cambio (más pólizas, referidos, pago anual). Ceder gratis enseña al cliente a pedir más. Defiende tu valor con calma: el que se apura con el descuento comunica que su precio estaba inflado.')
        ]),
        L('Cerrar acuerdos que duran', 9, [
          S('🤝', 'Acuerdos sostenibles', '#7A5BD9', 'Un cierre a presión que el cliente lamenta se cancela en la primera renovación. Busca acuerdos que ambos quieran mantener: eso es lo que construye cartera estable y referidos, no la venta forzada de una vez.'),
          S('🔁', 'La relación es la meta', '#C5162E', 'Cada negociación es un ladrillo de la relación de largo plazo. Gana el acuerdo sin perder al cliente: la próxima venta, la renovación y el referido dependen de cómo se sintió en esta.')
        ]),
        Q('Evaluación · Negociación', [
          { p: 'La negociación se gana principalmente…', ops: ['Improvisando', 'Con preparación previa', 'Bajando el precio'], ok: 1 },
          { p: 'Si concedes en precio, lo correcto es…', ops: ['Cederlo gratis', 'Pedir algo a cambio (más pólizas, referidos, pago anual)', 'Cancelar la venta'], ok: 1 }
        ])
      ]
    },
    /* ============ INDUCCIÓN ROL MARKETING ============ */
    {
      id: 'cur_ind_marketing', titulo: '📣 Inducción del Rol Marketing — ruta completa', cat: 'Inducción', emoji: '📣', color: '#7A5BD9',
      desc: 'Ruta guiada para el rol Marketing: la empresa, el calendario de contenidos, integraciones y medición.', destinatarios: 'Marketing',
      recursos: [{ nombre: 'Plan de contenidos trimestral.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Bienvenida y tu ruta de Marketing', 10, [
          S('👋', 'Marketing que genera negocio', '#7A5BD9', 'En una correduría, Marketing no es solo publicar bonito: es **generar y nutrir leads** y sostener la relación con la cartera. Tu éxito se mide en leads y retención, no en likes. Esta ruta te lleva de la marca al calendario, las integraciones y la medición.'),
          S('🧭', 'Tu ruta en orden', '#2A6FDB', '**1)** Empresa y marca (esta lección). **2)** *Marketing Digital para Seguros* (calendario, automatización, medición). **3)** *Habilidades Digitales e IA* (integraciones, IA responsable). **4)** *Comunicación con el Cliente* (correo/WhatsApp/plantillas). **5)** *Cumplimiento y Protección de Datos* (uso correcto de datos en campañas).'),
          S('🎨', 'Marca white-label', '#C5162E', 'Respeta la identidad: la marca base es Orbit 360 en el chrome y el logo del cliente en su slot. La paleta y el tono se configuran por tenant. Cada pieza debe verse consistente con la marca de la correduría, no improvisada.')
        ]),
        L('Calendario, integraciones y medición', 12, [
          S('📅', 'El calendario de contenidos', '#7A5BD9', 'Planifica en Orbit Marketing: cada día tiene contenidos con canal, tipo, enfoque, responsable y aprobación. Trabaja con parrilla mensual; segmenta por producto y por momento del cliente (captación vs renovación). Un calendario lleno de intención supera al posteo improvisado.'),
          S('🔌', 'Integraciones honestas', '#0E7C86', 'Canva (piezas), Metricool (programación y métricas), Sheets, Make: se conectan por tenant. Mientras una no esté activa, el sistema la muestra como **pendiente de conexión** — no simula que publica. El historial de eventos por contenido te da trazabilidad de cada pieza.'),
          S('📈', 'Medir lo que importa', '#1F8A5B', 'Mide alcance, interacciones y sobre todo **leads generados** por contenido. Repite lo que trae prospectos, descarta lo que solo entretiene. Marketing en seguros se justifica con negocio: conecta cada campaña con leads y renovaciones.')
        ]),
        L('Datos y colaboración con lo comercial', 9, [
          S('🛡️', 'Datos con consentimiento', '#C9821B', 'Las campañas usan datos personales: respeta finalidad y consentimiento (Habeas Data / protección de datos). No exportes carteras a herramientas no autorizadas. Una campaña que incumple datos es una multa y una crisis de confianza.'),
          S('🤝', 'Marketing + Comercial', '#2A6FDB', 'Un lead generado debe llegar al asesor correcto y entrar a Leads con seguimiento. Marketing enciende el interés; Comercial cierra. Coordinen el traspaso: un lead sin seguimiento es dinero de campaña tirado.')
        ]),
        Q('Evaluación · Inducción Marketing', [
          { p: 'El éxito de Marketing en una correduría se mide sobre todo en…', ops: ['Likes', 'Leads generados y retención', 'Cantidad de posts'], ok: 1 },
          { p: 'Una integración de marketing no conectada…', ops: ['Se muestra como activa', 'Se muestra como pendiente de conexión', 'Publica igual'], ok: 1 },
          { p: 'Un lead generado por campaña…', ops: ['Se queda en Marketing', 'Se traspasa al asesor y entra a Leads con seguimiento', 'Se descarta'], ok: 1 }
        ])
      ]
    },
    /* ============ INDUCCIÓN IT / SUPERADMIN ============ */
    {
      id: 'cur_ind_it', titulo: '⚙️ Inducción IT / Superadmin — configurar la plataforma', cat: 'Inducción', emoji: '⚙️', color: '#1E2227',
      desc: 'Ruta guiada para IT/Superadmin: puesta en marcha, configuración, usuarios, datos, integraciones y addons.', destinatarios: 'Dirección',
      recursos: [{ nombre: 'Checklist de puesta en marcha del tenant.pdf', tipo: 'pdf' }],
      lecciones: [
        L('Bienvenida y ruta de administración', 10, [
          S('👋', 'Tú dejas la plataforma lista', '#1E2227', 'Como IT/Superadmin configuras Orbit 360 para que el equipo solo tenga que operar. Nada se hardcodea: **todo es autoadministrable** (marca, países, catálogos, roles, integraciones). Esta ruta te lleva de un tenant vacío a una plataforma lista para producir.'),
          S('🧭', 'Tu ruta de puesta en marcha', '#2A6FDB', '**1)** Configuración (marca, paleta, países/monedas, glosario, planes). **2)** Usuarios y roles. **3)** Carga de base de datos inicial + Importador. **4)** Correos e integraciones. **5)** Automatizaciones y addons. **6)** Academia (crear cursos y rutas). Hazlo en este orden: cada paso se apoya en el anterior.'),
          S('🔒', 'Principios que no se rompen', '#C5162E', 'Marca Orbit 360 en el chrome, logo del cliente solo en su slot. País/moneda sin mezclar. Datos ficticios en pruebas; nada de datos reales hasta producción. Textos honestos: una integración no conectada se muestra como *pendiente de conexión*, nunca como activa.')
        ]),
        L('Configuración, marca, países y planes', 12, [
          S('🎨', 'Marca y white-label', '#7A5BD9', 'En Configuración cargas el logo del cliente, eliges la paleta (se aplica a login y toda la plataforma) y el menú lateral. La marca base sigue siendo Orbit 360; solo el slot de logo y la paleta son del cliente. Todo por configuración, sin tocar código.'),
          S('🌎', 'Países, monedas y glosario', '#0E7C86', 'Activa los países del cliente (GT/CO/…) con su moneda e impuestos; **nunca se mezclan**. El glosario por país renombra términos (póliza, recibo, id fiscal) para cada país. El catálogo financiero (categorías de ingresos/egresos) también es editable por tenant.'),
          S('📦', 'Planes y módulos', '#C9821B', 'El plan define qué módulos y addons ve el cliente. Activa/desactiva módulos por tenant y por usuario. Un tenant bien planificado muestra solo lo que el cliente contrató: menos ruido, mejor experiencia.')
        ]),
        L('Usuarios, roles y carga de datos', 12, [
          S('👥', 'Usuarios y permisos', '#2A6FDB', 'En Equipo creas usuarios con nombre, correo, teléfono/WhatsApp y **rol** (Dirección, Admin, Comercial, Marketing, Operativo, Asesor, Asistente). Un usuario puede tener varios roles (ver como). Puedes restringir módulos por usuario más allá del rol. El asesor no ve Ops; ve su trabajo por Leads.'),
          S('🗄', 'Base de datos inicial', '#1F8A5B', 'Arranca con la carga inicial (clientes, pólizas, cobros, comisiones) o por fuentes separadas. Cada fuente declara su alcance (qué crea y qué NO). Revisa el **dry-run** antes de escribir; lo que quede en *requiere_validación* se corrige en la fuente, no se fuerza.'),
          S('⬇', 'Importador inteligente', '#C5162E', 'Fuentes separadas, trazabilidad por hoja/fila/país/moneda/periodo, exclusión de hojas soporte y estados honestos (LISTO / REQUIERE_VALIDACIÓN / BLOQUEADO / OMITIDO). No se mezclan países/monedas ni se infieren clientes desde finanzas. Cada importación deja reporte descargable.')
        ]),
        L('Correos, integraciones, automatizaciones y addons', 12, [
          S('✉️', 'Correos', '#0E7C86', 'Configura las cuentas de correo (Outlook/Gmail) por usuario, con permisos mínimos y visibilidad por rol. Mientras no se conecte, el estado queda *pendiente de conexión*; nunca se simula activa. Las credenciales no se exponen en el front.'),
          S('🔌', 'Integraciones', '#7A5BD9', 'Activa y configura las integraciones del tenant (Make, Metricool, Canva, Sheets, WhatsApp, redes…). El panel de integraciones muestra el estado y los eventos por tenant. Conecta solo lo que el cliente vaya a usar; el resto queda declarado como pendiente.'),
          S('⚡', 'Automatizaciones y addons', '#C9821B', 'Las automatizaciones conectan eventos de la operación (cobros, renovaciones, marketing) con los canales. Los addons se **contratan por plan** y se configuran cuando están contratados. Deja documentado qué está activo para que el equipo no dependa de ti para cada ajuste.')
        ]),
        L('Academia y mantenimiento', 9, [
          S('🎓', 'Crear cursos y rutas', '#2A6FDB', 'En Academia creas cursos (video/lectura/quiz/recurso), los generas o complementas con **IA**, cargas contenido **desde documentos**, y los asignas a un rol para que aparezcan en la **Ruta por rol** con certificado. Arma la inducción de cada rol nuevo con esta herramienta.'),
          S('🔁', 'Mantener la plataforma viva', '#1E2227', 'Revisa trimestralmente: catálogos, aseguradoras, plantillas, cursos, roles e integraciones. Documenta los cambios. Una plataforma bien mantenida se adapta al negocio sin depender de código: ese es el valor de que todo sea configurable.')
        ]),
        Q('Evaluación · Inducción IT/Superadmin', [
          { p: 'El orden correcto de puesta en marcha empieza por…', ops: ['Automatizaciones', 'Configuración (marca, países, planes)', 'Crear cursos'], ok: 1 },
          { p: 'Una integración/addon no conectado se muestra como…', ops: ['Activa', 'Pendiente de conexión (honesto)', 'Error al usuario'], ok: 1 },
          { p: 'Al cargar la base inicial, si una fila queda en requiere_validación…', ops: ['Se fuerza a GTQ', 'Se corrige en la fuente antes de escribir', 'Se ignora'], ok: 1 },
          { p: 'La personalización del cliente se hace…', ops: ['Tocando código', 'Por configuración (marca, países, roles, integraciones)', 'No se puede'], ok: 1 }
        ])
      ]
    }
  ];

  // Versión de contenido: súbela cuando cambies texto/lecciones para que se re-sincronice.
  var CONTENT_V = 8;
  function apply() {
    try {
      if (!window.Orbit || !Orbit.store || !Orbit.store.all) return false;
      var existentes = Orbit.store.all('cursos') || [];
      if (!existentes.length) return false; // seed aún no cargó; reintenta luego
      var byId = {}; existentes.forEach(function (c) { byId[c.id] = c; });
      cursos.forEach(function (c) {
        var prev = byId[c.id];
        if (!prev) {
          try { Orbit.store.insert('cursos', Object.assign({ progreso: 0, certificado: false, recursos: [] }, c)); } catch (e) {}
        } else if ((prev._cv || 0) !== CONTENT_V) {
          // Actualiza CONTENIDO conservando el progreso/estado del usuario.
          try { Orbit.store.update('cursos', c.id, Object.assign({}, c, { _cv: CONTENT_V, progreso: prev.progreso || 0, certificado: !!prev.certificado })); } catch (e) {}
        }
      });
      return true;
    } catch (e) { return false; }
  }

  // También lo dejamos en el SEED para que sobreviva a un reseed manual.
  try { if (Orbit.SEED && Array.isArray(Orbit.SEED.cursos)) { var s = {}; Orbit.SEED.cursos.forEach(function (c) { s[c.id] = true; }); cursos.forEach(function (c) { if (!s[c.id]) Orbit.SEED.cursos.push(Object.assign({ progreso: 0, certificado: false, recursos: [] }, c)); }); } } catch (e) {}

  // Reintento hasta que el store esté listo.
  var tries = 0;
  (function loop() { if (apply() || tries++ > 40) return; setTimeout(loop, 120); })();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  document.addEventListener('orbit:reseeded', apply);

  return { cursos: cursos, apply: apply };
})();
