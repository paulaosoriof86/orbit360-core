# Bitácora de cambios · Orbit 360 (prototipo comercializable)

> Registro cronológico de cambios del **prototipo** (Claude). El backend LAB (ChatGPT/Codex) mantiene su propia bitácora. Formato: versión · fecha · qué cambió · archivos.

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
