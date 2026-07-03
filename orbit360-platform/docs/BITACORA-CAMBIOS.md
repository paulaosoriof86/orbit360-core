# Bitácora de cambios · Orbit 360 (prototipo comercializable)

> Registro cronológico de cambios del **prototipo** (Claude). El backend LAB (ChatGPT/Codex) mantiene su propia bitácora. Formato: versión · fecha · qué cambió · archivos.

## v1.88 — 2026-07-03 · Academia: profundización de cursos delgados (Marketing + Portal)
- **Auditoría de profundidad por datos** (secciones/quizzes por curso): los cursos sólidos ya eran cur2 (17 secc.), cur3 (12), cur_master (12), cur6 (9). cur1 Inducción usa `texto` largo (4591 chars/lección) — profundo aunque con 0 `secciones`. Los delgados eran **cur8 Marketing** (2 lecc./3 secc.) y **cur9 Portal** (2 lecc./3 secc.).
- **cur8 Marketing profundizado**: 2→**4 lecciones**, 3→**9 secciones**, quiz 2→**4 preguntas**. Nuevas lecciones: "Estrategia por embudo y segmento" (TOFU/MOFU/BOFU, segmentación por perfil, estacionalidad) y "Medición: qué mirar y cómo mejorar" (métricas que importan, del contenido al pipeline, iterar con datos).
- **cur9 Portal profundizado**: 2→**4 lecciones**, 3→**9 secciones**, quiz 1→**3 preguntas**. Nuevas lecciones: "Reportar pagos y reclamos paso a paso" (reportar pago con comprobante, abrir reclamo, notificaciones) y "Tu expediente y tu asesor" (completar expediente, hablar con el asesor, protección de datos).
- `seed.__v` → 35 (re-siembra los cursos actualizados). Verificado en vivo: cur8 4/9/4, cur9 4/9/3, 0 errores. El visor (`verCurso`→`lessonBody`) los renderiza con secciones de barra de color + quiz interactivo.
- **Videos HeyGen**: son producción de contenido externo — la usuaria genera el video en HeyGen y pega el enlace embed en la lección (editar lección → tipo video → URL); el visor ya lo embebe a pantalla grande. No es tarea de código.
- Archivos: `data/seed.js`, `index.html`.

## v1.87 — 2026-07-03 · Config fiscal multi-tenant: fuente única paisesCfg
- **Config fiscal por país como FUENTE ÚNICA multi-tenant** (`tenant.paisesCfg`): IVA, moneda y gastos de emisión por país, con defaults GT (IVA 12% · gastos 5%) y CO (IVA 19%). La leen la **factura a aseguradoras** (Finanzas), el motor de primas y la creación de pólizas — antes había dos fuentes (`pref('paises')` vs el hardcode de facturaAseg). `agregarPais` en Configuración ahora escribe en `tenant.paisesCfg` (además de `pref('paises')` por compatibilidad). Verificado en vivo: GT 12%/5%, CO 19%, 0 errores.
- **Nota #266**: Configuración ya es profunda para multi-tenant a nivel prototipo (white-label, roles y permisos, módulos activos por cliente, planes editables/importables, países con tasas, catálogo de integraciones con credenciales por tenant, IA multi-proveedor). El resto de "SaaS multi-tenant profundo" (aislamiento de datos por tenant, DB/colecciones por cliente, provisioning automático) es **backend** — documentado para ChatGPT/Codex, no toca el prototipo.
- Archivos: `core/config.js`, `modules/configuracion.js`, `index.html`.

## v1.86 — 2026-07-03 · Facturas a aseguradoras + visor Academia confirmado
- **Facturas a aseguradoras** (Finanzas → Liq. empresa → 🧾 Factura): genera el documento de factura de comisiones por aseguradora usando sus **datos fiscales** (NIT, razón social, dirección fiscal, patrón de concepto con `{mes}`/`{aseguradora}`), calcula base (comisión devengada = prima neta recaudada), **IVA por país configurado** (GT 12% / CO 19% / tenant), y total. Imprime/PDF. "Registrar emitida" crea el ingreso `finmovs` estado `facturado` (CxC real — coherente con la regla recaudo≠finmov: la comisión facturada SÍ es ingreso real de la empresa). Es **control de facturación, NO reemplazo fiscal** (alimenta el sistema fiscal / factura electrónica). Avisa si la aseguradora no tiene datos de facturación. Verificado en vivo: documento + total + emisión→CxC, 0 errores.
- **Visor de Academia CONFIRMADO por flujo de UI real**: abrir curso → `verCurso` (visor a pantalla completa `ac-viewer`) renderiza secciones ricas (`.acv-sec`) + 5 lecciones navegables en el panel lateral, 0 errores. Hallazgo: el visor en vivo (`verCurso`) **ya usaba `lessonBody`** (renderer correcto con secciones + video normalizado); el cambio v1.85 a `verLeccion` unificó **código muerto** (`verLeccion`/`abrirViejo` no se invocan) — inofensivo. El video de YouTube se normaliza correctamente en `lessonBody` (usado por el visor real).
- Archivos: `modules/finanzas.js`, `index.html`.

## v1.85 — 2026-07-03 · Academia: visor unificado (fix video YouTube + secciones ricas)
- **BUG raíz del visor de lecciones** (`verLeccion`): duplicaba la lógica de render con dos fallos — (1) los videos de YouTube en formato `watch?v=`/`youtu.be` NO se normalizaban a `/embed/` (causa del "error 153 / no reproduce"); (2) la rama `lectura` mostraba `l.texto` plano e **ignoraba `l.secciones`**, por lo que los cursos del seed (que usan `secciones`) se veían vacíos ("Contenido pendiente").
- **Fix**: `verLeccion` ahora delega el cuerpo a **`lessonBody(l)`** — el renderizador completo y ya probado que maneja iframeSrc, video (normaliza YouTube/Vimeo + `<video>` para archivos subidos), lectura con secciones de barra de color, y quiz interactivo. Un solo path, sin duplicación. Verificado: 0 errores JS de carga.
- Nota: la profundización de los 14 cursos (contenido lección por lección + videos HeyGen reales) sigue como frente para sesión dedicada; este cambio corrige que el contenido YA existente se vea correctamente en el visor.
- Archivos: `modules/academia.js`, `index.html`.

## v1.84 — 2026-07-03 · Motor de conciliación de planillas/statements de comisión
- **`Orbit.comeng.conciliarStatement(filas?)`**: compara la comisión **esperada** (recomputada con las tarifas vigentes por ramo/producto de cada aseguradora, vía `calcSobre`) contra la **registrada/pagada**. Dos modos: (A) con statement importado `[{aseguradoraId, polizaId|polizaNumero, montoPagado}]` → concilia contra lo realmente pagado; (B) sin archivo → recomputa cada registro `comisiones` y detecta **drift** de tarifa o error de dato. Devuelve filas con desviación (monto y %) + totales.
- **Comisiones → pestaña 🔄 Conciliación**: KPIs (esperada / registrada-pagada / desviación con dirección "pagan de menos/más" / nº con desviación) + tabla de pólizas con desviación (base, esperado, registrado, desviación, %) clicable a la póliza. Botón "📄 Importar planilla" abre el importador de planillas-comisión.
- Verificado en vivo (v1.283): 90 registros conciliados (esperado=registrado en seed limpio, 0 desviaciones = coherente), y **prueba de detección**: al duplicar una comisión, "con desviación" pasó 0→1; al restaurar, vuelve a cuadrar. 0 errores.
- Archivos: `core/comisiones-eng.js`, `modules/comisiones.js`, `index.html`.

## v1.83 — 2026-07-03 · Regla de negocio recaudo≠finmov (paquete v1.81 ChatGPT) + prevención de regresión
- **CORRECCIÓN de regla contable** (del paquete v1.81): el pago aplicado por el cliente a un recibo/póliza **NO es movimiento financiero real** de la empresa — es **recaudo comercial**. Afecta cartera, recibos, metas de recaudo y producción recaudada (todo derivado de `cobros`), **NO** la colección `finmovs`. A `finmovs` solo van ingresos/egresos reales (comisión recibida, factura cobrada, liquidación pagada por aseguradora, pago a asesor, gasto).
- **Revertido `Orbit.q.postRecaudo`** (introducido en v1.78): ya **no escribe en finmovs** (era una regresión respecto a esta regla). Se conserva la firma para no romper llamadas (Cobros, Cliente360, Importador). Regla aplicada al **prototipo base multi-tenant**, no solo A&S. Verificado en vivo: aplicar pago no incrementa finmovs, 0 errores.
- Integrado el paquete v1.81 al plan (pendientes abiertos): motor de planillas/commission statements, facturas a aseguradoras (control factura electrónica), config SaaS multi-tenant profunda + portal mejorado, Academia profunda. Se trabajarán con verificación por código real y sin regresión.
- Archivos: `core/queries.js`, `index.html`.

## v1.82 — 2026-07-03 · Insights: análisis crítico con concentración por aseguradora
- **Insights → Análisis crítico**: añadido hallazgo de **concentración por aseguradora** (alerta + recomendación de diversificar si una aseguradora ≥35% de la prima vigente), a la par del dashboard de Finanzas. Ya tenía var. interanual, tasa de recaudo, tasa de cancelación, vencimientos ≤30d, asesor líder y composición de cartera. El hallazgo de concentración es condicional (solo si supera umbral). Verificado en vivo: alertas + recomendaciones renderizan, 0 errores.
- Archivos: `modules/insights.js`, `index.html`.

## v1.81 — 2026-07-02 · Presupuesto con fecha de pago (en tiempo / atrasado)
- **Presupuesto**: al crear/editar una partida ahora se captura **Fecha de pago** (`fechaPago`). La tabla muestra el estado: ✅ pagado (real ≥ presupuesto), ⏰ atrasado (fecha vencida sin pagar) o 🕓 en tiempo, con la fecha. Base para las notificaciones de pago de gastos.
- Verificado en vivo (v1.280): columna Pago en la tabla + campo Fecha de pago en el editor. 0 errores.
- Archivos: `modules/finanzas.js`, `index.html`.

## v1.80 — 2026-07-02 · Finanzas PROFUNDO: dashboard analítico + metas real vs ideal + sugeridor inteligente
- **Requerimiento documentado** en `docs/REQ-FINANZAS-PROFUNDO.md` (pedido repetido de la usuaria, para no perder el nivel de detalle).
- **Metas ahora es pestaña visible** (`🎯 Metas`): antes la función `metas()` existía pero NO estaba en el tab bar ni en el dispatch — por eso no se veía. Añadida a TABS + dispatch.
- **Metas profundas (real vs ideal)**: cumplimiento con **% + semáforos** 🟢≥100 / 🟡≥70 / 🔴<70 en tres niveles — **empresa** (ventas prima neta + recaudo), **por asesor** (meta/real/recaudo/avance/tendencia vs mes anterior) y **por aseguradora** (meta/real/% del total). Medición mensual real con datos vivos (`primaNetaMes`, `recaudoMes`).
- **Motor de sugerencia inteligente** (`metasSugerir`): calcula meta de ventas = promedio 3 meses × crecimiento (+10%) y meta de recaudo = índice histórico recaudo/venta; coherencia con presupuesto de ingresos (aviso si supera 1.5×); sugiere Y establece por empresa y por asesor (editable). Recalcula mes a mes.
- **Metas establecidas alimentan Inicio e Insights**: verificado que ambos leen la misma colección `metas` (empresa por tipo prima/recaudo).
- **Dashboard analítico de lo general a lo particular**: KPIs + **análisis crítico** (hallazgos reales: líder de producción, menor índice de recaudo, concentración por aseguradora, var. interanual, brecha de cobranza) + gráfico intermensual **con tabla numérica de respaldo** (ingresos/egresos/resultado/Δ MoM) + comparativo **interanual** + **tabla de producción por vendedor** (prima, % del total, recaudo, índice, comisión) + **tabla por aseguradora** (prima, % del total, pólizas).
- **Fix**: Finanzas abre en el **último mes con datos** (no en un mes vacío).
- Verificado en vivo (v1.279): metas con semáforos + tablas asesor/aseguradora, sugeridor calcula y establece, dashboard con análisis crítico + tablas de respaldo/vendedor/aseguradora. 0 errores.
- Archivos: `modules/finanzas.js`, `docs/REQ-FINANZAS-PROFUNDO.md`, `index.html`.

## v1.79 — 2026-07-02 · Auditoría de salud de render (28/28) + limpieza de código muerto
- **Auditoría clic-por-clic / salud de render de los 28 módulos** (documentada en `docs/AUDITORIA-FORENSE.md`): `router.go(route)` real + espera del render async + captura de `window.onerror`. **Resultado: 0 errores JS en los 28**, todos con contenido real del store. Se descartó el clic-masivo a ciegas (contaminaba DOM/store con navegaciones en cascada). Flujos interactivos clave verificados aparte (ver AUDITORIA-SINCRONIAS.md).
- **Código muerto eliminado** en `finanzas.js`: además de `resumen()` (v1.78), se borraron las 1ª declaraciones duplicadas de `dashboard()` y `presupuesto()` + sus helpers `finRow`/`presupTabla` — contenían arrays HARDCODEADOS y nunca se invocaban (hoisting: ganan las versiones vivas que leen del store). −89 líneas. Verificado que dashboard/presupuesto vivos siguen renderizando (16 590 / 4 035 chars).
- Nota documentada: `finanzas` abre en el mes actual; con pocos movimientos en el seed la pestaña Movimientos se ve corta (dato vivo, no fallo).
- Archivos: `modules/finanzas.js`, `docs/AUDITORIA-FORENSE.md`, `index.html`.

## v1.78 — 2026-07-02 · Auditoría de sincronías cruzadas + fix pago→Finanzas
- **Auditoría real de sincronías** (nuevo doc `docs/AUDITORIA-SINCRONIAS.md` para ChatGPT): se enumeraron todos los `store.update(...)` de core+módulos y se barrió la **clase de bug de referencia viva** (releer un campo tras `update()`, que muta el objeto en sitio). Contenida: `ciclo.js#openGestion` (L465) y `cliente360.js#editarPoliza` (L1196) ya capturan el cambio ANTES del update; el único roto era `siniestros.js` (corregido en v1.77).
- **FIX sync pago→Finanzas**: aplicar el pago de un recibo NO posteaba recaudo a `finmovs`, así que "Ingresos/recaudo del mes" de Finanzas no reflejaba pagos aplicados. Nuevo helper **`Orbit.q.postRecaudo(cobro, fecha, metodo)`** (core/queries.js) que inserta un `finmovs` ingreso `recaudado` (clase "Recaudo de primas"), **idempotente** (id `fmv_cob_<cobroId>`). Cableado en `cobros.js` (pago rápido), `cliente360.js` (aplicar pago) e `importa.js` (conciliación de estado de cuenta). Verificado en vivo: finmov creado, periodo por fecha, e idempotente al re-aplicar (recaudados 199→200→200).
- **Datos hardcodeados eliminados**: `finanzas.js#resumen()` (array de movimientos literal) era **código muerto** (el dispatch usa `movimientos()`, que lee del store) → eliminada. Pendiente documentado: 2 duplicados muertos más (`dashboard`/`presupuesto` 1ª declaración) para limpieza por ChatGPT.
- Flujos cruzados verificados OK: cancelación→Leads/Ops/cliente, lead→cliente, renovación→póliza/recibos, comisiones→liquidación, correo/notify.
- Archivos: `core/queries.js`, `modules/cobros.js`, `modules/cliente360.js`, `core/importa.js`, `modules/finanzas.js`, `docs/AUDITORIA-SINCRONIAS.md`, `index.html`.

## v1.77 — 2026-07-02 · Revisión PROFUNDA Portal→Siniestro (bug real corregido)
- **Verificación por camino de código REAL** (no `insert` simulado): se ejecutó el flujo verdadero — clic en "Solicitar gestión" del Portal → drawer → tipo "Reclamo / Siniestro" → botón "Enviar solicitud". Confirmado en DOM: crea `reclamos` (+1), `gestiones` (+1, enlazada por `reclamoId`) y `actividades` (+1). Aparece renderizado en **módulo Siniestros**, **Cliente 360 → Siniestros** (número SIN-2026-#### visible), **Historial** y **Ops** (gestión enlazada).
- **BUG REAL detectado y corregido** en `modules/siniestros.js` (cambio de estado del siniestro): el store devuelve **referencias vivas**, y `S().update('reclamos', id, patch)` mutaba el objeto `r` en sitio. El handler usaba `if (nuevoEst !== r.estado)` **dos veces** — la 2ª, tras el update, ya veía `r.estado` cambiado y evaluaba falso, por lo que **NO se creaba la actividad de Historial ni se actualizaba la gestión de Ops**. Se captura `const cambioEstado` ANTES del update y se usa en ambos puntos.
- **Reflejo Siniestros→Ops/Historial (paso 8 del caso obligatorio)**: al cambiar el estado del siniestro ahora (a) inserta actividad en Historial con `reclamoId`, y (b) actualiza la(s) gestión(es) de Ops enlazadas (nota "[fecha] Siniestro SIN-#### → Estado" y, si Pagado/Rechazado, estado→Resuelta). **Cerrar la gestión NO borra el reclamo** (verificado).
- **Fechas quemadas eliminadas**: los timestamps de bitácora `'2026-06-24 '` en `siniestros.js` (2 sitios) → `Orbit.ui.today()`.
- Verificado en vivo con recarga real (v1.274): `{reclamoEstado:Pagado, actividadHistorial:true, gestionNotaActualizada:true, gestionResuelta:true, reclamoNoBorrado:true}`.
- Archivos: `modules/siniestros.js`, `index.html` (bump caché).

## v1.76 — 2026-07-02 · Portal→Siniestro canónico + badges ocultos + saneo refs ajenas
- **Portal → Siniestro CANÓNICO (P0.3)**: al reportar "Reclamo / Siniestro" desde el Portal del cliente, `modules/portal.js` ahora inserta un registro real en la colección `reclamos` (con `numero` SIN-AAAA-####, póliza/aseguradora heredadas, estado `Reportado`, bitácora inicial y `reclamoId`), además de crear la gestión en Ops y la actividad en Historial (ahora enlazada con `reclamoId`). **Verificado en vivo**: el reclamo aparece en el módulo **Siniestros** (lee de `reclamos`) y en la ficha **Cliente 360 → Siniestros** (filtra por `clienteId`). Prioridad Alta para siniestros. Fecha viva (`Orbit.ui.today()`), sin literal `2026-06-30`.
- **Cerrar gestión NO borra el siniestro (P0.3)**: verificado — `core/ciclo.js` no ejecuta `remove('reclamos', …)` al resolver/cerrar una gestión; el reclamo persiste como entidad independiente.
- **Badges técnicos ocultos por DEFAULT (P0.2)**: `Orbit.tenant.DEFAULT.hideTechnicalBadges = true` — el producto arranca comercializable (sin NÚCLEO/BETA/PRÓX/ROAD). Se añadió **merge de claves nuevas** del DEFAULT sobre el tenant persistido, para que instalaciones previas hereden la clave sin pisar lo que el cliente ya configuró. Toggle interno/demo sigue en Configuración → Marca. **Verificado**: activar oculta los 27 badges del sidebar.
- **Saneo de referencias ajenas (P0.6)**: `data/seed.js` — el enfoque de Marketing "CX / Mystery" y la pieza "Mystery Shopping…" se reemplazaron por "Servicio al cliente"; `modules/automatizaciones.js` — comentario "Inspirado en CXOrbia" → texto neutro. **Verificado**: 0 referencias CX/Mystery en los contenidos vivos de Marketing. `seed.__v` → 34 (re-siembra). Los docs internos (PLAN/MIGRACION) mantienen la nota de deslinde "NO es CXOrbia" a propósito.
- Archivos: `modules/portal.js`, `core/config.js`, `data/seed.js`, `modules/automatizaciones.js`, `index.html` (bump caché).

## v1.75 — 2026-07-02 · Calendario VIVO: el demo sigue la fecha real
- **CAUSA RAÍZ del "sigue en junio / no calcula días"**: tanto `core/ui.js` (NOW) como `data/seed.js` (NOW) estaban clavados en `2026-06-20`. Toda la data semilla se genera relativa a esa ancla, por eso el tablero mostraba "JUNIO 2026 · 10 días" aunque el sistema estuviera en julio.
- **Fix**: ambas anclas ahora usan `new Date()` (fecha real del sistema); `__v` de la semilla subido a 33 para re-sembrar coherente con hoy. El backend puede fijar una fecha con `Orbit.tenant.demoDate='YYYY-MM-DD'`.
- **Verificado en vivo (2026-07-02)**: encabezado "Julio 2026", "Quedan 29 días", cobros vencidos/renovaciones/prima recalculados desde la fecha real (19 vencidos, 5 renov ≤45d, prima Q1.029.346). 0 errores.
- Nota: al re-sembrar (`__v=33`) la data ficticia de demostración se regenera a la fecha actual; los datos son ficticios por diseño.

## v1.74 — 2026-07-01 · Datos vivos: metas sin literales quemados (auditoría profunda)
- **Auditoría línea-por-línea de inicio.js**: confirmado que TODOS los KPIs derivan del store (`carteraGlobal`, `primaVigenteGlobal`, `renovacionesProximas`, `cobrosVencidos`, `leaderboard`, clientes/pólizas, seguimientos de `Orbit.ciclo`). Verificado en vivo: al insertar un cobro vencido el badge pasó 11→12; el tablero reacciona a cambios de datos. La sensación de "fijo" venía de la data semilla estática, no de valores quemados.
- **Único literal real corregido**: las metas caían a `820000`/`760000` cuando la colección `metas` estaba vacía. Ahora la **meta de empresa = suma de metas por asesor** (dato real del store) y **recaudo = 85%** de esa meta; en Finanzas idéntico; el input de "Crear meta" prefill con la suma real. Verificado: la meta reacciona a cambios de `asesor.metaPrima` (730.000 derivado en vivo, 0 errores).
- Barrido de literales en todos los módulos (`val: <número/porcentaje>`): sin KPIs con valores quemados. Datos vivos garantizados.

## v1.73 — 2026-07-01 · §4 Pólizas: KPIs filtrables (cartera vs histórico) — §4 COMPLETO
- **modules/polizas.js**: los 4 KPIs ahora **filtran la tabla por estado** (`filtrarEstado`): Vigentes/Prima→Vigente, Por renovar, Canceladas→histórico. Ya existía: alta manual (`nuevaPoliza`), creación desde documento importado (kind `polizas` del importador inteligente), buscador por póliza/cliente/placa/vehículo, filtros por ramo/aseguradora/asesor/estado, filas que abren el detalle. Verificado (4 KPIs clicables, filtro por estado, 0 errores).
- **§4 del paquete V99 COMPLETO**: Cliente360, Pólizas, Cobros, Renovaciones, Cancelaciones, Siniestros, Marketing, Portal, Importadores, Insights — todos profundizados y verificados en vivo.

## v1.72 — 2026-07-01 · §4 Insights: filtro por asesor
- **modules/insights.js**: nuevo **filtro global por asesor** (`asesorSel`/`aseOK`) que afecta pólizas, vigentes, cobros y comisiones en todas las vistas; selector "👥 Todos los asesores" en la barra de controles junto al de país. Ya existía: selector de país y mes con re-render en vivo (store.on), comparativo general→particular (asesor/ramo/aseguradora) con drill por mes y fila, tabla de respaldo, análisis crítico con recomendaciones. Verificado (filtros país+asesor+mes en vivo, 0 errores).

## v1.71 — 2026-07-01 · §4 Renovaciones: campaña segmentada
- **modules/renovaciones.js**: la Campaña de renovación por lote suma **filtros por asesor y por ramo** (segmentación); al filtrar, re-selecciona el lote y recalcula el conteo. Ya existía: pipeline por tramos (vencidas/≤15d/≤30d/≤60d), envío WhatsApp+correo con propuesta IA, traza en el historial de cada cliente, tarjetas que abren la póliza. Verificado (filtros presentes y funcionales, 0 errores).

## v1.70 — 2026-07-01 · §4 Siniestros: analítica de tiempos
- **modules/siniestros.js**: dos KPIs nuevos de tiempo — **⏱ Días abiertos (prom.)** de reclamos en proceso (rojo si >30) y **✅ Días a pago (prom.)** de reclamos pagados (derivado de la bitácora de estados). Los estados ya se gestionan por reclamo con bitácora fechada. Verificado (KPIs de tiempo presentes, 0 errores).

## v1.69 — 2026-07-01 · §4 Marketing: estados + responsable/aprobador
- **modules/marketing.js**: la ficha de contenido suma **Responsable** (asesor asignado) y **Aprobación** (Pendiente/Aprobado/Rechazado), y el estado incorpora **Medido** (idea→programado→publicado→medido). Confirmado el flujo existente: generar mes con IA estratégica, reprogramar atrasados automáticamente, stats por pieza publicada. Verificado (ficha con responsable/aprobador, 4 estados, 0 errores).

## v1.68 — 2026-07-01 · §4 Cancelaciones: analítica por causal clicable
- **modules/cancelaciones.js**: las barras de "Motivos de cancelación" ahora son **clicables** (`filtrarMotivo`) → filtran la tabla por esa causal. Confirmado el flujo ya existente: recuperación comercial → **Negocio en Leads** con etapa mapeada + responsable (asesorId) + próximo toque en Cronograma; "Recuperada" → **gestión de reemisión en Ops**; toda acción deja actividad en el expediente del cliente/excliente. Verificado (5 causales clicables, 0 errores).

## v1.67 — 2026-07-01 · §4 Portal productivo: notificaciones con detalle
- **modules/portal.js**: las notificaciones de la campana ahora son **clicables** → abren un detalle completo (`verNotifDetalle`) con icono, título, fecha, tipo y cuerpo completo. Confirmado que **Aprende abre cursos** (`verCursoPortal`, 2 tarjetas clicables) y el glosario del cliente funciona. Verificado en vivo (0 errores).

## v1.66 — 2026-07-01 · §4 Importadores: resumen pre-escritura + dedupe visible
- **core/importa.js**: nueva `dryRun(kind)` que simula la escritura SIN tocar el store y calcula **crear nuevos / actualizar / omitir** + **errores por fila** (faltan campos clave, duplicado dentro del archivo). Se muestra en el paso 2 del importador como tarjeta "🔎 Resumen antes de guardar" con los 3 contadores y la lista de avisos por fila. Aclara que la dedup actualiza en vez de duplicar. Verificado (importador carga y abre, 0 errores).

## v1.65 — 2026-07-01 · Notificación al cliente desde la plataforma (pedido usuaria)
- **Nuevo `core/notify.js`** (`Orbit.notify.cliente` / `Orbit.notify.pedir`): capa transversal para avisar al cliente por WhatsApp (wa.me) o correo (compositor Orbit), con selector de canal + preview editable y **traza automática en el expediente** (actividades). `_deliver` es swappable por el backend para envío real.
- **Cableado en flujos clave**:
  - **Pago aplicado** (cliente360): checkbox "📲 Avisar al cliente" al aplicar pago → mensaje de confirmación con póliza/cuota/monto.
  - **Respuesta de gestión** (ciclo): al marcar una gestión Resuelta que involucra a un cliente, ofrece avisarle la resolución.
  - **Comparativo**: botón "📲 Enviar al cliente" → resumen de opciones + recomendación.
  - **Cotizador**: botón "📲 Enviar al cliente" por cotización → prima total/neta + adjunto.
- Todos registran el envío como actividad en el historial del cliente (canal, asunto, fecha viva). Verificado en vivo (helper, 2 canales, registro en expediente, 0 errores).

## v1.64 — 2026-07-01 · P0-04 fechas vivas en flujos operativos + P0-06 config backend-ready
- **P0-06 (cerrado por composición)**: Configuración backend-ready — sin prompts (v1.60), sin localStorage directo (v1.61: `Orbit.tenant` para marca/paleta/país, `Orbit.store.pref` para integraciones/planes/logo/países), `agregarPais` es modal. El backend persiste vía `Orbit.tenant` + `Orbit.store.pref`. **Bloque 1 de saneamiento (P0-01…P0-06) completo.**
- **core/ui.js**: nuevo `Orbit.ui.today()` → fecha YYYY-MM-DD derivada del ancla (`NOW`), dinámica; en modo real usa fecha del sistema.
- **Fechas operativas quemadas eliminadas**: reemplazados los literales `'2026-06-24'/'2026-06-20'/'2026-06-22'` por `Orbit.ui.today()` en los flujos que CREAN datos — academia (progreso/certificado), cliente360 (emisión/edición/renovación de póliza + recibos + actividades), cobros (recordatorio lote), comparativo (guardar historial), portal (reportar pago/subir doc/solicitar/aviso), renovaciones (lote), siniestros (crear/actualizar reclamo). El seed demo conserva sus fechas (documentado).
- Criterio P0-04: no se crean nuevas actividades/pólizas/recibos con fecha fija; el mes mostrado deriva de la fecha viva. Verificado (today()=fecha dinámica, 7 módulos montan, 0 errores).

## v1.63 — 2026-07-01 · Verificación Portal → Ops (bandeja única con responsable)
- **Verificado en vivo**: desde el Portal del cliente, **Reportar pago** (con soporte) y **Solicitar gestión** crean una gestión en Ops (lista "Gestiones Admin") vía `Orbit.ciclo.crearGestion`, con **responsable asignado** (ej. Ana Lemus) y actividad en el expediente del cliente. Notificaciones WhatsApp+correo cableadas al responsable en cambios/notas. **Subir documento** guarda en el expediente del cliente. Bandeja única: todas las solicitudes (cliente + equipo) confluyen en Ops. 0 errores.

## v1.62 — 2026-07-01 · P0-05 moneda por país sin mezcla opaca
- **core/queries.js**: `norm(m,cur)` ahora es **país-aware** — cuando hay un país activo (`Orbit.pais` GT/CO) NO convierte (montos nativos en su moneda); solo en la vista global mixta (`TODOS`) normaliza con una **tasa declarada** (`TC_COP_GTQ=1000`). Los agregados globales (`carteraGlobal`, `primaVigenteGlobal`, `leaderboard`) ahora **filtran por país** cuando hay uno activo, y `carteraGlobal` devuelve `moneda`. Nuevo helper `monedaPais()`.
- Criterio P0-05 cumplido: al filtrar Colombia todo en COP, Guatemala en GTQ; global usa tasa declarada. Verificado en vivo (CO→COP nativo, GT→GTQ, mixto→/1000, 0 errores).

## v1.61 — 2026-07-01 · P0-02 sin localStorage directo en módulos
- **store.js**: nueva capa KV `Orbit.store.pref(key, def)` / `setPref(key, val)` (persistida en `db.__prefs`, backend-swappable, con guarda para `db` null). Los módulos ya no tocan `localStorage`.
- **Migrados a pref/setPref**: `ia.js` (config IA), `plantillas.js` (migración legacy), `notificaciones.js` (wa_log), `cotizador.js` (historial), `automatizaciones.js` (cfg + log), `configuracion.js` (integraciones, planes, logo, países). `grep localStorage modules/*.js` = solo un comentario.
- Criterio P0-02 cumplido: persistencia funcional pasa por la capa de datos única; el backend hereda `pref/setPref` sin tocar módulos. Verificado en vivo (roundtrip OK, 6 módulos montan, 0 errores).

## v1.60 — 2026-07-01 · Saneamiento Bloque 1 (P0-01, P0-03)
- **P0-01 · core/ui.js**: nuevos helpers `Orbit.ui.confirm / prompt / alert / toast` (modales/drawers Orbit, promesa-based, tono danger auto para acciones destructivas). Verificado (confirm resuelve true/false).
- **P0-01 · empaquetado**: `Orbit360-demo-standalone.html` movido a `docs/legacy/Orbit360-demo-standalone-NO-USAR.html` — fuera del árbol operativo para no contaminar backend/auditorías. La app abre desde `index.html` canónico.
- **P0-03 · diálogos nativos eliminados**: reemplazados TODOS los `alert()/confirm()/prompt()` visibles al usuario en módulos y `core/ciclo.js` por helpers Orbit. `grep` en `modules/` y `ciclo.js` devuelve **cero** nativos. Archivos: academia, configuracion, finanzas, cliente360, comparativo, correo, cronograma, aseguradoras, plantillas, automatizaciones, calidad, notificaciones, ciclo, index.html (logout). agregarPais pasó de 5 prompts a un modal único.
- Criterio de aceptación cumplido: acciones destructivas mantienen confirmación con modal Orbit; sin cuadros nativos del navegador. Verificado en vivo, 0 errores de consola, 10 módulos montan.

## v1.59 — 2026-07-01 · Finanzas: botones demo → funcionales (#221)
- **finanzas.js**: los 2 botones placeholder `alert('Demo:…')` ahora son reales — **"+ Crear meta"** abre `crearMeta()` (mes+tipo+ámbito empresa/asesor+valor → upsert a la colección `metas`, alimenta Insights y el avance de empresa) y **"Generar mes"** llama a `crearMes()`. La meta de empresa en la vista lee la colección `metas` del mes (fallback base). Verificado (meta persiste, 0 errores).
- Nota: los `confirm()` nativos restantes (borrar curso/lección/aseguradora/plantilla, cerrar sesión) se conservan — funcionan correctamente; su reemplazo por modal Orbit queda como pulido cosmético futuro.

## v1.58 — 2026-07-01 · Reportes detalle + Cotizador "Otro" inline
- **reportes.js (#216)**: filas de todos los reportes ahora **clicables** → abren el registro origen (cartera → drawer de recibo; producción/comisiones/renovaciones/siniestros/cancelaciones → ficha del cliente). Builder de IDs paralelo alineado con el filtro de año. Verificado (46 filas clicables, 0 errores).
- **cotizador.js (#218)**: opción "➕ Otro…" en marca/línea/modelo con entrada de texto inline (sin prompt nativo) → no queda atado al catálogo. Verificado en vivo.
- **comisiones (#217)**: confirmado selector año/estado + toggle de estado (Liquidada↔Devengada) + CSV ya operativos (v1.52); comparativo inter vía Insights.

## v1.57 — 2026-07-01 · Cobros: conciliar factura post-pago (#219)
- **cobros.js**: botón "📄 Cargar factura y conciliar" en el drawer del recibo cuando está Pagado pero sin conciliar (`conciliarFactura`). Sube factura, registra fecha real de pago, pasa a Conciliado y deja actividad en el historial del cliente. Verificado en vivo (0 errores).

## v1.50 — 2026-07-01 · Lote auditoría migración (parte 1)
- **router.js**: `badgeHtml` respeta el flag `Orbit.tenant.get().hideTechnicalBadges` → oculta NÚCLEO/BETA/PRÓX. del sidebar en modo cliente/implementación (verificado: 27→0→27).
- **configuracion.js**: toggle "Ocultar etiquetas técnicas" en la pestaña Marca (autoadministrable), reconstruye el sidebar al cambiar.
- **inicio.js**: "Avance por asesor" ahora clickeable → abre Orbit Insights (analítica de metas). mesKey ya era dinámico (`U.monthKey()`).
- **Verificados sin cambio (reporte de caché v1.55)**: Finanzas detalle de movimiento abre y permanece (drawer con selector de estado + eliminar, 0 parpadeo); Historial KPIs ya clickeables (filtrarTipo); Plantillas "Usar" es drawer (no alert nativo), editor con título + eliminar.

## v1.49 — 2026-07-01
- **store.js**: se expone `Orbit.store._emit(collection)` como método **público** (antes privado). Permite a la capa backend emitir eventos de cambio manualmente sin tocar internals. API pública confirmada: `all, get, where, find, insert, update, remove, on, _emit, init, reseed, raw`.
- **Docs nuevos**: MEJORAS-DETECTADAS.md, BITACORA-ERRORES.md, BITACORA-CAMBIOS.md, REPORTE-SMOKE.md (solicitados por el doc de pendientes del backend 2026-07-01).

## v1.48 — 2026-07-01
- **calidad.js**: edición inline (`editarInline`) — botón "✏ Completar" abre solo los campos faltantes del cliente; al guardar, el registro sale de la lista de incompletos (re-render). Toast de confirmación con conteo restante.

## v1.47 — 2026-07-01
- **cotizador.js**: 3er nivel de vehículo marca→línea→**modelo/versión** (`VEH_MODELOS` + trims genéricos de fallback). Paridad con Comparativo.

## v1.46 — 2026-07-01
- **insights.js**: vista Metas lee colección editable `metas`; botón "✨ Sugerir metas del próximo mes" (tendencia 3m +10%, upsert a `metas`).

## v1.45 — 2026-07-01
- **cobros.js**: quick-pay "💳 Pagar" desde tabla (`aplicarPago` reutilizable); nº póliza y cliente enlazados; drawer con Ver cliente / Ver póliza. **Fix**: la tabla no refrescaba tras aplicar pago (re-render apuntaba a `mod-host` inexistente → `host`).

## v1.44 — 2026-07-01
- **finanzas.js**: KPIs con desglose (`drillKey`/`drillModal`); CxC/CxP abren movimiento completo (ver/editar/eliminar/estado) y arrastran mes a mes; Presupuesto editable (`editarPresup`/`replicarPresup`) desde store, sin arrays quemados.

## v1.42–1.43 — 2026-07-01
- **auth.js**: `applyBrand()` también al mostrar login (logo del cliente antes de entrar).
- **infra.css**: franja del logo en login blanca a sangre + cintilla roja.
- **ui.js**: `now()`/`monthLabel()` dinámicos (se elimina "Junio 2026" quemado).
- **index.html**: login sin badge técnico ni "Tu logo aquí"; slot centrado.

> Historial anterior (v0.1–v1.41): ver CHANGELOG.md.
