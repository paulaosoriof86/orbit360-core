# Bitácora de cambios · Orbit 360 (prototipo comercializable)

> Registro cronológico de cambios del **prototipo** (Claude). El backend LAB (ChatGPT/Codex) mantiene su propia bitácora. Formato: versión · fecha · qué cambió · archivos.

## v1.150 — 2026-07-06 · "Todo cuadra" neutralizado · index NO tocado
> `index.html` NO tocado (backend LAB + `portal-v1142-copyfix.js` conservados). Backend protegido y tools intactos. Sin datos reales.
- La cadena exacta "Todo cuadra — nada por crear." **no existe** en `core/importa.js` (verificado con grep en todo el proyecto; el resumen dry-run usa "Crear nuevos / Actualizar / Omitir"). La única ocurrencia real de "Todo cuadra" en un módulo estaba en **`modules/comisiones.js`** (empty-state de conciliación) → cambiada a "**Sin diferencias detectadas** — comisiones conciliadas con las tarifas vigentes." Con esto, **0 coincidencias de "Todo cuadra"** en módulos (solo permanece en `docs/BITACORA-CAMBIOS.md`, documentación interna no visible).
- Mantidos sin regresión: config "cobro confirmado/conciliado con póliza"; importa "quedan listos para revisión/aprobación", "Las propuestas quedan disponibles para revisión", "Revisión previa", "Alcance permitido / efecto propuesto", "Se propondrán para revisión", "Confirmar mapeo".
- **⚠ Para ChatGPT/Codex (cache-bust)**: bumpear `modules/comisiones.js` (y los ya corregidos `core/config.js`, `core/importa.js`) en el index híbrido para servir los cambios.
- Archivos tocados: `modules/comisiones.js`, `docs/BITACORA-CAMBIOS.md`.


## v1.149 — 2026-07-06 · Residuos finales config (scope) + step3 importa · index NO tocado
> `index.html` NO tocado (backend LAB loader/init/store/storeLAB/guard + `portal-v1142-copyfix.js` conservados). Backend protegido y tools intactos. Sin datos reales.
- **config.js**: el array `scope` de Finanzas todavía tenía "Doble conciliación: **pago aplicado a póliza creada**" (el `desc` ya estaba corregido en v1.145) → ahora "Doble conciliación: **cobro confirmado/conciliado con póliza**". Verificado 0 en fuente.
- **importa.js step3**: "…se integrarán a X — crea lo nuevo, actualiza lo existente, sin duplicar" → "…**quedan listos para revisión/aprobación** en X — se proponen altas y actualizaciones, sin duplicar"; "Los registros se integran a la capa de datos y quedan disponibles…" → "**Las propuestas quedan disponibles para revisión** en los módulos relacionados". Verificado 0 en fuente.
- **Nota**: la cadena "Todo cuadra — nada por crear" NO existe en la fuente actual (un `fetch` de prueba la mostró por **caché del service worker PWA**, no por el archivo real). El resumen dry-run usa "Crear nuevos / Actualizar / Omitir" — sin lenguaje de aplicación.
- Sin regresiones en Cliente360/Cobros/Finanzas/Automatizaciones/Academia (plus+seed)/Importador.
- **⚠ Para ChatGPT/Codex (cache-bust)**: bumpear en el index híbrido `core/config.js` y `core/importa.js` (a la siguiente vN) para servir los cambios; los archivos fuente ya están corregidos en el ZIP.
- Archivos tocados: `core/config.js`, `core/importa.js`, `docs/BITACORA-CAMBIOS.md`.


## v1.148 — 2026-07-06 · Residuos de importa (revisión ≠ aplicación) · index NO tocado
> **`index.html` NO tocado** (conserva backend LAB loader/init/store/storeLAB/guard + `portal-v1142-copyfix.js`). Backend protegido y tools intactos. Sin datos reales.
- **importa.js**: "Simulación pre-escritura" → "**Revisión previa**"; "Alcance (crea/actualiza)" (reporte CSV) → "**Alcance permitido / efecto propuesto**"; "Se crearán al confirmar" → "**Se propondrán para revisión**"; botón remap "Aplicar mapeo →" → "**Confirmar mapeo →**".
- **Ya corregidos en rondas previas (verificado, sin cambio)**: config.js "Doble conciliación: cobro confirmado/conciliado con póliza"; importa "Importación lista para revisión/aprobación", "Revisar propuestas de conciliación por póliza", checkbox "Aplicar estos % al tarifario" (propuesta, no carga directa).
- **QA**: `fetch` de la fuente servida → **0 residuos** de [Simulación pre-escritura, Alcance (crea/actualiza), Se crearán al confirmar, Aplicar mapeo, pago aplicado a póliza creada]. Sin regresiones en Cliente360/Cobros/Finanzas/Automatizaciones/Academia. Academia conserva jun/jul 2026, manifest de fuentes, banco no confirma cobro, histórico no crea cartera, documentos solo proponen, país/moneda faltante = REQUIERE_VALIDACION, GTQ/COP sin suma cruda.
- **⚠ Nota para ChatGPT/Codex (cache-bust)**: como NO toqué `index.html`, hay que **bumpear `core/importa.js?v1330 → v1331`** en el index híbrido de la rama viva para que el cambio se sirva. El archivo fuente ya está corregido en el ZIP.
- Archivos tocados: `core/importa.js`, `docs/BITACORA-CAMBIOS.md`.
- **Pendiente honesto (backend ChatGPT/Codex)**: persistencia real conciliaciones/auditLog, aplicación controlada de pagos, Storage/adjuntos reales.


## v1.147 — 2026-07-06 · Residuos finales de importa (gate) + index no tocado salvo cache-bust
> Sin tocar backend protegido ni tools. `index.html` solo cache-bust (scripts LAB y `portal-v1142-copyfix.js` conservados). Sin datos reales.
- **importa.js**: `estados-cuenta` desc "pagos aún no aplicados" → "**pagos pendientes de validación**"; detect "Pagado en banco, sin aplicar" → "**Pago en banco pendiente de validación**". `planillas-comision` desc "pagos no aplicados a póliza" → "**pagos pendientes de relación con recibo/póliza**"; detect "Comisión cobrada, pago no aplicado" → "**Comisión cobrada, propuesta pendiente de conciliación**". (Variable interna `noAplicados` se conserva; no se muestra cruda en UI.)
- **config.js**: metadata Finanzas ya en "cobro confirmado/conciliado" (v1.145) — sin cambio.
- Verificado: 0 matches de "aún no aplicados / no aplicados a póliza / Pagado en banco, sin aplicar / pago no aplicado"; app carga; 0 errores JS.
- Cache-bust: `importa.js?v1330`.
- Archivos: `core/importa.js`, `index.html`.
- **Pendiente honesto (backend ChatGPT/Codex)**: persistencia real conciliaciones/auditLog, aplicación controlada de pagos, Storage/adjuntos reales.


## v1.146 — 2026-07-06 · Corrección final: erradicación total de "aplicar/aplicado" (gate)
> Sin tocar backend protegido. `index.html` solo cache-bust (scripts LAB y `portal-v1142-copyfix.js` conservados). Sin datos reales.
- **Cliente360**: `actionRow` "Todo aplicado" → **"Cartera al día"** (estado sin cobros pendientes); botón tabla recibos "Aplicar pago" → **"Confirmar cobro"**.
- **seed.js**: "aplicar un pago baja la cartera y suma a Finanzas" → "**confirmar un cobro actualiza la cartera según validación** y suma a Finanzas"; "Cobros gestiona la cartera y aplica pagos" → "**Cobros gestiona cartera, reportes, revisión y confirmación de cobros**".
- **importa.js**: motivo de conciliación "Pago en estado de cuenta, sin aplicar" → "**Pago en estado de cuenta pendiente de validación**" (los copys "Pagos pendientes de validación" / "pendientes de relación con recibo/póliza" ya de v1.145).
- **config.js**: metadata Finanzas ya en "cobro confirmado/conciliado↔póliza" (v1.145) — sin cambio.
- **academia-plus.js**: sin literal "pago aplicado" (ni en negación); la lección "Estados honestos" usa "reportar/validar no confirma el cobro". Sin cambio de contenido este round.
- **QA (gate)**: recorrido de inicio/cobros/conciliaciones/cliente360/finanzas/importar/automatizaciones/academia → **0 resultados** para Todo aplicado, Aplicar pago, Pago aplicado, Aplicado a póliza, Pagos no aplicados, pago sin aplicar, "aplicar un pago baja la cartera", "Cobros gestiona la cartera y aplica pagos". 0 errores JS.
- Cache-bust: `seed.js`, `importa.js`, `cliente360.js` → `?v1329`.
- Archivos: `modules/cliente360.js`, `data/seed.js`, `core/importa.js`, `index.html`.
- **Pendiente honesto (backend ChatGPT/Codex)**: persistencia real conciliaciones/auditLog, aplicación controlada de pagos, Storage/adjuntos reales.


## v1.145 — 2026-07-06 · Corrección post-auditoría v1.144: "aplicar/aplicado" erradicado de la UI + Academia migración
> Sin tocar backend protegido (store/loader/init/guard/rules/tools). `index.html` solo cache-bust (scripts LAB y `portal-v1142-copyfix.js` conservados). Sin datos reales.
- **Cliente360 (fix 1)**: modal/botón "Aplicar pago" → **"Confirmar cobro"** / "Registrar cobro confirmado"; "Fecha de envío a gestión (día en que se aplica)" → "Fecha de confirmación (día en que el equipo confirma el cobro)"; estado "Validada (por aplicar)" → "Validada (por confirmar)"; miniStats/tooltips a confirmado/conciliado.
- **Cobros (fix 2)**: botón tabla "💳 Pagar" → "💳 Confirmar"; ficha "Aplicar pago" → "Confirmar cobro"; modal header "Cobros · aplicar pago"/"Aplicar pago" → "Confirmar cobro"; CTA "✅ Confirmar pago" → "✅ Confirmar cobro". (Reportado = pendiente de revisión/conciliación; confirmado = validado por equipo; conciliado = cruzado.)
- **Finanzas (fix 3)**: "Aplicado a póliza" → "Confirmado y conciliado con póliza"; "pago sin aplicar" → "pendiente de conciliación"; comentario "demo agregada" → "partidas agregadas".
- **Importador (fix 4)**: "Pagos no aplicados" → "Pagos pendientes de validación"; "aún no aplicados a su póliza" → "pendientes de relación con recibo/póliza"; "Importación lista para aplicar" → "…lista para revisión/aprobación"; "Aplicar pagos por póliza →" → "Revisar propuestas de conciliación por póliza →".
- **Config (fix 5)**: metadata Finanzas "DOBLE conciliación pago↔póliza" → "cobro confirmado/conciliado↔póliza".
- **Automatizaciones (fix 6)**: "clave detectada — conexión real al migrar backend" → "clave detectada · pendiente de activación técnica". Plantillas Pago confirmado / Pago reportado conservadas.
- **Academia (fix 7)**: nueva lección **"Migración honesta: fuentes, banco y caso jun/jul 2026"** (fuente separada + manifest; banco/estado de cuenta no son cobro; planilla no crea cartera/cobro; histórico no crea cartera/cobros/producción; documentos solo proponen; país/moneda faltante = REQUIERE_VALIDACION; GT=GTQ/CO=COP sin sumar crudo; jun/jul 2026 = migración, no productivo). "Cobros gestiona la cartera y aplica pagos" → "…confirma cobros (validados por el equipo)". `CONTENT_V=8` re-sincroniza (verificado `_cv=8`).
- **QA (fix 9)**: recorrido de inicio/cobros/conciliaciones/cliente360/finanzas/importar/automatizaciones → **0 textos prohibidos** (Pago aplicado, Aplicado a póliza, Todo aplicado, cobros aplicados, recaudo aplicado, Aplicar pago, listas p/ backend, conexión real). 0 errores JS.
- Cache-bust: `config/importa/cobros/cliente360/automatizaciones/finanzas.js` y `academia-plus.js` → `?v1328`.
- Archivos: `modules/{cliente360,cobros,finanzas,automatizaciones}.js`, `core/{config,importa}.js`, `data/academia-plus.js`, `index.html`.
- **Pendiente honesto (backend ChatGPT/Codex)**: persistencia real conciliaciones/auditLog, aplicación controlada de pagos, Storage/adjuntos reales.


## v1.144 — 2026-07-06 · Corrección post-auditoría v1.143: copy "aplicado" armonizado en toda la UI + Academia
> Sin tocar backend protegido (store/loader/init/guard/rules/tools ni index híbrido LAB). Sin datos reales.
- **Conciliaciones (fix 1)**: eliminado estado **APLICADA**, KPI "Aplicadas" y "listas p/ backend"; quitada la acción/función **`preparar_aplicacion_controlada`/`prepararAplicacion`** (VALIDADA ya no ofrece CTA de aplicar). KPIs: "Validadas → para proceso posterior autorizado", "En revisión". Banner: "para revisión técnica. No aplica pagos ni modifica cobros desde esta bandeja". Verificado: sin "Aplicadas", con "No aplica pagos", `prepararAplicacion` inexistente.
- **Cobros (fix 2)**: "cobros aplicados"→"cobros confirmados"; título actividad "Pago aplicado"→"Pago confirmado"; toast "✅ Pago aplicado"→"✅ Pago confirmado"; tooltip "Aplicado a póliza"→"Confirmado y conciliado con póliza".
- **Cliente360 (fix 3)**: tooltip "Pago aplicado a la póliza"→"Confirmado y conciliado"; actividad/aviso "Pago aplicado"→"Pago confirmado"; miniStats "Por aplicar/Aplicado"→"Por confirmar/Confirmado".
- **Automatizaciones (fix 4)**: template `pago_aplicado` label "Pago aplicado"→"Pago confirmado"; nuevo `pago_reportado` "Pago reportado · pendiente de revisión/conciliación".
- **Academia (fix 5)**: armonizadas lecciones previas — "Aplicar un pago"→"Confirmar un pago" (con nota reportado≠confirmado), "Al aplicarlo la cartera baja" reencuadrado, "confirma cada pago aplicado"→"cuando quede conciliado", etc. `CONTENT_V=7` re-sincroniza conservando progreso (verificado `_cv=7`, sin "Aplicar un pago").
- **index.html (fix 6)**: solo cache-bust; backend LAB (loader/init/store/storeLAB/guard) intacto.
- Verificado: 0 errores JS; app carga; Inicio "Recaudo confirmado/cobros confirmados".
- Cache-bust: `conciliaciones/cobros/cliente360/automatizaciones.js` y `academia-plus.js` → `?v1327`.
- **Pendiente honesto (backend ChatGPT/Codex)**: persistencia real conciliaciones/auditLog, aplicación controlada de pagos, Storage/adjuntos reales. (Bloques junio-julio 2026 / manifest de fuentes / banco-no-es-cobro / histórico-no-crea-cartera / documentos-solo-proponen: ya cubiertos en lecciones de Importador y "Estados honestos"; ampliación fina queda para próxima iteración.)
- Archivos: `modules/conciliaciones.js`, `modules/cobros.js`, `modules/cliente360.js`, `modules/automatizaciones.js`, `data/academia-plus.js`, `index.html`.


## v1.143 — 2026-07-06 · Copy honesto residual + Academia estados honestos por rol · acumulado post-v1.142
> Sin tocar backend protegido (store/loader/init/guard/rules/tools), sin datos reales, sin funcionalidad backend. Conserva empalmes ChatGPT/Codex (integraciones "Pendiente de conexión", conciliaciones no aplica pagos, inicio "confirmado", portal reporte pendiente).
- **P0.1/P0.3 copy residual**: `core/crmkit.js` KPI "Cobros aplicados" → **"Cobros confirmados"**; `modules/finanzas.js` nota de doble conciliación "pago aplicado ↔ póliza" → "cobro confirmado ↔ póliza" y KPI foot "aplicados a póliza" → "confirmados a póliza". (Inicio, Portal, Conciliaciones, Integraciones ya honestos desde v1.140–v1.142; verificado Inicio muestra "Recaudo confirmado"/"cobros confirmados".)
- **P0.5 Academia por rol**: nueva lección **"Estados honestos: reportado ≠ conciliado ≠ confirmado"** en el curso *Pólizas y Cobros* (4 secciones): pago reportado por cliente = soporte/evidencia + Pendiente de revisión (no aplicado); conciliación = PROPUESTA con score, **VALIDADA no es pagada ni aplicada**, no modifica cobros/cartera/producción/comisiones ni escribe finmovs; cobro confirmado solo tras validar+conciliar; cobros/recaudos ≠ finmovs; producción/metas/comisiones sobre prima neta recaudada; no sumar GTQ+COP en crudo. `CONTENT_V=6` re-sincroniza conservando progreso (verificado `_cv=6`, curso a 6 lecciones).
- Verificado: 0 errores JS; app carga; backend LAB intacto en index.
- Cache-bust: `academia-plus.js?v1326`, `crmkit.js?v1326`, `finanzas.js?v1326`.
- Archivos: `core/crmkit.js`, `modules/finanzas.js`, `data/academia-plus.js`, `index.html`.
- **Pendiente honesto (backend ChatGPT/Codex)**: persistencia real de conciliaciones/auditLog, aplicación controlada de pagos, Storage/adjuntos reales.


## v1.142 — 2026-07-05 · Copy honesto: estados de pago/conciliación · candidata 062855
> Candidata `2026-07-05T062855.313`. Cambios de copy quirúrgicos, sin funcionalidad nueva. Sin tocar backend protegido, sin datos reales.
- **Textos técnicos (P0-1)**: `integraciones-panel.js` "Sin conexión real" → "Pendiente de conexión"; `conciliaciones.js` "validación controlada en backend / mutación de cobros / bandeja del prototipo / requiere validación backend" → "validación controlada / afectación de cobros / requiere validación controlada" (sin palabra backend visible).
- **Copy de pagos (P0-2/4)**: `inicio.js` "Recaudo aplicado"→"Recaudo confirmado", "cobros aplicados"→"cobros confirmados" (estado honesto). `portal.js`: al reportar, toast "✓ Recibimos tu reporte · pendiente de revisión/conciliación" + nota en el detalle del recibo "Recibimos tu reporte. Está pendiente de revisión/conciliación; te confirmamos cuando quede conciliado." Portal ya no sugiere que un pago reportado esté aplicado.
- Estados honestos confirmados (sin cambio necesario): Portal reporta ≠ aplicado; Cobros/Cliente360 con Reportado/En revisión/Validada/Conciliado; Conciliaciones no aplica pagos; estado bancario propone; producción/metas/comisiones sobre prima neta recaudada; moneda por país.
- Verificado: app carga, Inicio muestra "Recaudo confirmado"; 0 errores JS.
- Cache-bust: `inicio.js?v1325`, `portal.js?v1325`, `conciliaciones.js?v1325`, `integraciones-panel.js?v1325` (on-demand).
- Archivos: `modules/inicio.js`, `modules/portal.js`, `modules/conciliaciones.js`, `core/integraciones-panel.js`, `index.html`.


## v1.141 — 2026-07-05 · Fix ruta Conciliaciones (tenant/roles) + copy residual · candidata 061837
> Candidata `2026-07-05T061837.674`. Sin tocar backend protegido, sin datos reales.
- **Ruta visible por tenant**: `conciliaciones` añadido a `Orbit.tenant.DEFAULT.modulosActivos` (tras `cobros`). Además `isActive()` ahora es **retrocompatible**: acepta rutas nuevas presentes en `DEFAULT.modulosActivos` aunque el tenant persistido no las tuviera (respetando `modulosDesactivados`). Verificado: `isActive('conciliaciones') === true`.
- **Rol Admin**: `conciliaciones` añadido a `Orbit.ROLES.Admin.modulos` (ya estaba en Dirección y Finanzas). Verificado: los 3 roles con acceso.
- **Copy residual (importa.js)**: "En el paso siguiente podés aplicar pagos por póliza." → "…podrás revisar propuestas de conciliación por póliza. No aplica pagos por sí sola."; "Se aplicarán sin duplicar." → "Se propondrán para validación sin duplicar."; "Sin pagos pendientes de aplicar." → "Sin pagos pendientes de validación."
- Verificado: 0 errores JS; `modules/conciliaciones.js` cargado; acciones solo `Orbit.store.update('conciliaciones', …)`, no mutan cobros; `preparar_aplicacion_controlada` solo informa. Sin persistencia real (queda para backend).
- Cache-bust: `config.js?v1324`, `importa.js?v1323`.
- Archivos: `core/config.js`, `core/importa.js`, `index.html`.


## v1.140 — 2026-07-05 · Bandeja de conciliaciones (UI segura) + copy residual · candidata 211525
> Candidata activa `2026-07-04T211525.464` (base comparada `205210.456`). Academia CONTENT_V=5. Sin tocar backend protegido, sin datos reales, sin localStorage operativo.
- **Nuevo módulo `modules/conciliaciones.js`** (ruta `conciliaciones`, NAV bajo Cobros; roles Dirección/Admin/Finanzas): bandeja que **lee solo `Orbit.store('conciliaciones')`**. Columnas del contrato: estado_bandeja, estado_revision, score/decision_score, fuente, archivo·fila, país/moneda, cliente·póliza·recibo, monto, acción propuesta, responsable, última actualización, acciones, bloqueos. Estados PROPUESTA/EN_REVISION/VALIDADA/RECHAZADA/BLOQUEADA/ANULADA/APLICADA (APLICADA solo histórico). Acciones por estado según contrato; las transiciones **solo** hacen `Orbit.store.update('conciliaciones', id, patch)` — **nunca tocan cobros** (verificado: validar deja cobros intactos). `preparar_aplicacion_controlada` abre modal informativo ("requiere validación backend · no aplica pago todavía"). **Estado vacío honesto** si no hay colección. Sin textos técnicos al cliente.
- **P0-2 copy** `estados-cuenta.desc`: "permite aplicar pagos por póliza" → "propone pagos para validación por póliza".
- **P0-3 copy** `planillaFlujo()`: "Pendiente de aplicar" → "Propuesta pendiente".
- **P0-4 limitación documentada**: `conciliacionPropuesta` es señal visual/prototipo dentro de cobros; la **persistencia real** en colección/bandeja `conciliaciones` + `auditLog` y la **aplicación controlada** quedan para backend ChatGPT/Codex.
- Verificado: 0 errores JS; bandeja navegable con estado vacío y con datos demo; transiciones no mutan cobros.
- Cache-bust: `importa.js?v1321`(copys), `conciliaciones.js?v1322`, `config.js?v1322`.
- Archivos: `modules/conciliaciones.js` (nuevo), `core/config.js` (NAV+ROLES+MODULE_TITLES), `core/importa.js` (copys), `index.html`, docs.


## v1.139 — 2026-07-04 · P0 candidata 205210: conciliación no aplica directo + validar≠aplicar + planilla sin GTQ
> Candidata activa `2026-07-04T205210.456` (base comparada `202655.833`). Academia CONTENT_V=5. Sin tocar backend protegido, sin datos reales.
- **P0-2 (CERRADO)** `core/importa.js` `applyConciliacion`: ya **no aplica pagos directo**. Genera **referencias** (registros faltantes) y **propuestas** sobre el recibo (`conciliacionPropuesta: {estado:'REQUIERE_VALIDACION'}`); copy → "referencias creadas · propuestas para revisión · no impacta cobros hasta aprobación".
- **P0-3 (CERRADO en Cobros+Cliente360; Portal ya correcto)** `cobros.js`: el modal de validación ahora es de **dos pasos** — "✓ Validar reporte" marca `validadoReporte:true` (estado "Validada (por aplicar)") **sin** poner Pagado; luego aparece "Aplicar pago" por separado. `cliente360.js` refleja "Validada (por aplicar)" y el botón cambia de 🔎 Validar → Aplicar pago. Verificado: validar no pone Pagado.
- **P0-4 (CERRADO)** `planillaFlujo()`: sin fallback `'GTQ'` — si falta moneda muestra "moneda requerida" y score **REQUIERE_VALIDACION**; etiquetas backend-compatibles **MATCH_EXACTO / MATCH_PROBABLE / REQUIERE_VALIDACION / BLOQUEADO**.
- **P0-1 (docs)** alineadas a la candidata activa (esta bitácora + CHANGELOG/PENDIENTES/SMOKE).
- **P0-5 (moneda residual — clasificación)**: **corregidos** los agregados de UII (metaPrima v1.135, KPIs v1.124/1.126). **Válidos por diseño** (cotización/comparativo manual y por-registro nativo `registro.moneda||'GTQ'`): `crmkit` (helper fallback), `comparativo`/`cotizador` (moneda del ejercicio), `cancelaciones`/`siniestros`/`insights`/`cliente360` (fallback por-registro), `finanzas` (moneda por país del movimiento). **Escrituras** basadas en país seleccionado (no asumen): altas de cliente/póliza/movimiento. Ninguno suma monedas en crudo; la vista global normaliza con tasa declarada.
- **Pendiente no cerrado (honesto)**: persistencia real de conciliaciones y conexión UI con la bandeja de conciliaciones del backend (score real desde `dryRunReport`); reflejar `conciliacionPropuesta` como fila visible en Cobros.
- Cache-bust: `importa.js?v1321`, `cobros.js?v1322`, `cliente360.js?v1322`.
- Archivos: `core/importa.js`, `modules/cobros.js`, `modules/cliente360.js`, `index.html`, docs.


## v1.138 — 2026-07-04 · Academia: lección de conciliación (score/propuesta/validación) · CONTENT_V=5
- Nueva lección **"Conciliación: score, propuesta y validación"** en el curso *Importador y migración*: explica que la conciliación es **propuesta no aplicada**, el **score** (MATCH_EXACTO / MATCH_PROBABLE / REQUIERE_VALIDACIÓN / BLOQUEADO) y el **flujo correcto** (importar → dry-run → score → propuesta → validación → aplicación controlada), incl. planilla de comisión (esperada vs pagada, diferencia, retención, ajuste). Alinea la formación con el comportamiento real del importador (v1.131/v1.137).
- **`CONTENT_V=5`** re-sincroniza conservando progreso/certificado. Verificado: curso Importador con la lección (`_cv=5`); 0 errores.
- Cache-bust: `academia-plus.js?v1317`.
- Archivos: `data/academia-plus.js`, `index.html`.


## v1.137 — 2026-07-04 · P0-07-FIX Flujo visual completo de planilla de comisión
- En el importador de **planillas-comision** (paso 2), tras la tabla de tarifas, se añade el **🧾 Flujo de conciliación de la planilla**: por fila real muestra Fila · Aseguradora · Periodo · **Esperada · Pagada · Diferencia · Retención · Ajuste · Score (✓ Coincide/≈ Probable/🔎 Requiere validación/⛔ Bloqueado) · Acción propuesta · Estado (Requiere validación / Pendiente de aplicar)**.
- **Es propuesta**: la nota deja claro que ninguna fila impacta cobros/comisiones/liquidaciones hasta validar; el importe usa la moneda del país (no mezcla).
- Verificado en vivo con planilla CSV: flujo con score presente, no impacta hasta validar; 0 errores.
- Cache-bust: `importa.js?v1320`.
- Archivos: `core/importa.js`, `index.html`.


## v1.136 — 2026-07-04 · P0-05 punto 4: estados de validación reflejados en Cliente360
- **Cliente360** (pestañas Cobros y Recibos) ahora usa `cobBadge(c)` con los mismos estados de validación que Cobros: **Reportado por cliente / En revisión / Pagado (por conciliar) / Conciliado / Requiere validación / Bloqueado / Vencido / Pendiente**. Un pago reportado por el cliente muestra el botón **🔎 Validar** (→ `Orbit.modules.cobros.validarReporte`), no "Aplicar pago" directo — coherente con el flujo de Cobros y el Portal.
- Verificado en vivo: la pestaña Cobros del expediente muestra "Reportado por cliente"; 0 errores.
- Cache-bust: `cliente360.js?v1321`.
- Archivos: `modules/cliente360.js`, `index.html`.


## v1.135 — 2026-07-04 · P0-02-REV Auditoría de moneda residual
- **Auditados los `U.money(... 'GTQ')` residuales** en crmkit, importa, cancelaciones, cliente360, configuracion, finanzas, ia, insights, notificaciones, siniestros. Resultado: la gran mayoría son **por-registro nativos** (`registro.moneda || 'GTQ'` como fallback, que respeta la moneda real del dato) o **escrituras según país seleccionado** (`pais==='CO'?'COP':'GTQ'` al crear cliente/póliza/movimiento) — **correctos**, no mezclan moneda.
- **Corregido** el único agregado de display fijo: **`metaPrima` en Equipo/Configuración** → usa la moneda del país del asesor o la del país activo (`monedaPais()`).
- Regla confirmada: por-registro usa moneda nativa; agregados usan país activo; vista global normaliza con tasa declarada (`queries.norm`), sin suma cruda. Verificado: Equipo carga en CO sin errores.
- Cache-bust: `configuracion.js?v1320`.
- Archivos: `modules/configuracion.js`, `index.html`.


## v1.134 — 2026-07-04 · P0-FIX candidata 202655: flujo de validación de pago + gastos financieros
> Base activa `2026-07-04T202655.833`. Sin tocar backend protegido. Sin datos reales. Conserva todo lo previo (Academia CONTENT_V=4, moneda por país, desglose, estados, score, planillas).
- **P0-05-FIX** Cobros: nueva acción **`validarReporte()`** separada de `aplicarPago()`. Un pago **reportado por el cliente** ya no aplica directo — el botón "Validar" abre un modal con **◷ Marcar en revisión / ✕ Rechazar reporte / ✓ Validar y aplicar pago**. Solo tras validación explícita se abre el modal de aplicar. Flujo: Reportado por cliente → (En revisión) → Validar/Rechazar → Aplicado/Conciliado. En el detalle del recibo, si está reportado el botón es "🔎 Validar pago reportado". Verificado: modal de validación con los 3 caminos, sin decir "aplicado" hasta confirmar.
- **P0-03-FIX** Pólizas: el desglose usaba `p.gastosFinancieros` (campo inexistente) → corregido a **`p.gastosFinan`** (el nombre real del modelo de cobros/primas). Verificado: drawer abre y suma gastos correctamente.
- Cache-bust: `cobros.js?v1320`, `polizas.js?v1318`.
- **Pendientes** (próxima): reflejar mismos estados de validación en Cliente360 (P0-05 punto 4), score de conciliación también en Importar/Cobros/bandeja (P0-06-FIX), flujo visual completo de planilla de comisión (P0-07-FIX), moneda residual (P0-02-REV: crmkit/importa/cancelaciones/cliente360/config/finanzas/ia/insights/notificaciones/siniestros), y lección de conciliación + productos en Academia.
- Archivos: `modules/cobros.js`, `modules/polizas.js`, `index.html`.


## v1.133 — 2026-07-04 · P0-07 Planillas de comisión: columnas retención/ajuste/periodo (cierre de P0)
- La conciliación de comisiones ahora muestra por fila: **Póliza · Periodo · Base neta · Esperado · Registrado · Retención · Ajuste · Desviación · % · Conciliación (score)**. `conciliarStatement` incluye `periodo`, `retencion`, `ajuste`, `aseguradoraId`, `asesorId` en cada fila (desde la planilla importada o el registro de comisión).
- Verificado: los 10 encabezados presentes en la tabla; 0 errores.
- **Cierre**: con esto quedan cerrados **todos los P0** del paquete 193658 (P0-01→P0-08). Junio/julio 2026 se tratan como caso de migración (no lógica productiva fija). Pendientes menores/P1: reflejar el score del backend real cuando se empalme, vista de conciliación por aseguradora/periodo, y profundizar producto-por-ramo en Academia.
- Cache-bust: `comisiones-eng.js?v1317`, `comisiones.js?v1318`.
- Archivos: `core/comisiones-eng.js`, `modules/comisiones.js`, `index.html`.


## v1.132 — 2026-07-04 · P0-08 Textos técnicos por rol (verificación) + estado de P0
- **P0-08 verificado**: los módulos con lenguaje técnico interno (**Automatizaciones** —Make/webhook/payload—, **Configuración** —conexiones/APIs—, **panel de integraciones**) están gated por rol en `Orbit.ROLES`: solo **Dirección** y **Admin** los tienen en `modulos`. **Comercial, Asesor, Operativo, Marketing y Asistente NO los ven** (ni en NAV ni por ruta, vía `session.canSee`). Los textos cliente-facing (login, correo, integraciones-panel) ya se neutralizaron en v1.115–v1.117 (sin backend/LAB/demo/mock/credenciales). Conclusión: los términos técnicos quedan restringidos a roles internos, como pide el contrato. Sin cambios de código necesarios.
- **Estado de los P0 del paquete 193658**: P0-01 docs unificadas ✓ (v1.126), P0-02 moneda por país ✓ (v1.124/v1.126), P0-03 desglose de prima en Pólizas ✓ (v1.128), P0-04 estados históricos ✓ (v1.129), P0-05 estados de validación en Cobros ✓ (v1.130), P0-06 score de conciliación ✓ (v1.131), P0-08 textos por rol ✓ (v1.132). **Pendiente P0-07**: columnas de retención/ajuste/periodo en planillas de comisión (la conciliación ya muestra esperada/pagada/diferencia + score).
- Archivos: `docs/BITACORA-CAMBIOS.md` (documentación; sin cambios de código).


## v1.131 — 2026-07-04 · P0-06 Score de conciliación visible en Comisiones
- La conciliación de comisiones (esperada vs registrada/pagada + desviación) ahora muestra una columna **"Conciliación"** con el **score validable**: `scoreConciliacion()` mapea la desviación relativa a **✓ Coincide (MATCH_EXACTO)**, **≈ Probable (MATCH_PROBABLE)**, **🔎 Requiere validación** (incl. esperado sin pago registrado) y **⛔ Bloqueado** (desviación > 25%). El badge aclara que es **propuesta que requiere validación antes de aplicar** — no aplica pagos automáticamente.
- Verificado: columna Conciliación presente; carga sin errores. (Las badges se muestran por fila cuando hay desviación; si todo cuadra, "✅ Todo cuadra".)
- Cache-bust: `comisiones.js?v1317`.
- Archivos: `modules/comisiones.js`, `index.html`.


## v1.130 — 2026-07-04 · P0-05 Estados de validación en Cobros (reportado ≠ aplicado)
- **Cobros** ahora distingue el estado de validación: helper `estadoValidacion()` + `badgeValidacion()` muestran **Reportado por cliente / En revisión / Pagado (por conciliar) / Conciliado / Requiere validación / Bloqueado / Vencido / Pendiente**. Un pago **reportado por el cliente** NO se muestra como aplicado: aparece como "Reportado por cliente" con acción **"Validar"** (en vez de "Pagar"), y la ficha muestra el soporte adjunto.
- **Filtro de estado** ampliado con los estados de validación; `matchTxt()` centraliza el match de texto/asesor.
- **Portal** ya era correcto (reporta con "el equipo lo validará", badge Reportado, no dice aplicado) — se conserva.
- Verificado en vivo: cobro reportado muestra "Reportado por cliente" + botón "Validar"; filtro con los 4 estados nuevos; 0 errores.
- Cache-bust: `cobros.js?v1319`.
- Archivos: `modules/cobros.js`, `index.html`.


## v1.129 — 2026-07-04 · P0-04 Estados históricos completos en Pólizas
- **Filtro de estado** ahora incluye Vigente, Por renovar, Vencida, Cancelada, **Anulada, Rechazada, Requiere validación**.
- **KPI** "Canceladas" → **"Histórico / sin cartera"** (agrupa Cancelada/Vencida/Anulada/Rechazada).
- **Regla cartera/histórico reforzada en `queries.js`**: `renovacionesProximas` ahora solo considera Vigente/Por renovar (antes excluía solo Cancelada), así Anulada/Rechazada/Vencida no entran a renovación ni cartera. `primaVigenteGlobal`/`leaderboard` ya filtraban correctamente.
- Verificado en vivo: opciones Anulada/Rechazada/Requiere validación en el filtro; KPI histórico presente; 0 errores.
- Cache-bust: `polizas.js?v1317`, `queries.js?v1316`.
- Archivos: `modules/polizas.js`, `core/queries.js`, `index.html`.


## v1.128 — 2026-07-04 · P0-03 Desglose de prima visible en Pólizas
- **Botón "Desglose"** en cada fila de Pólizas → drawer autocontenido (`verDesglose`) con: **prima neta / gastos (emisión+financieros+otros) / IVA / prima total** en la moneda de la póliza; frecuencia, forma de pago, vigencia, suma asegurada; **recibos generados** (cuota, monto, vence, estado) o aviso de histórico sin cartera; **fuente de importación** (sourceRef/hoja/fila o carga manual); y **estado de validación** (Validada / ⚠ Requiere validación) + si genera cartera. Botón para abrir en Cliente 360.
- Verificado en vivo: el drawer muestra las 7 secciones requeridas; 0 errores.
- Cache-bust: `polizas.js?v1316`.
- Archivos: `modules/polizas.js`, `index.html`.


## v1.127 — 2026-07-04 · Academia: "Paso a paso" completado en cursos restantes (CONTENT_V=4)
- Se añadió lección **"Paso a paso"** (cómo se hace, botones, flujo) a 8 cursos más: Insights, Técnico avanzado, Siniestros, Venta consultiva, Liderazgo, Cumplimiento, Servicio/CX y Digital/IA. Con esto **todos los cursos de módulo, técnico, comercial, liderazgo, cumplimiento, servicio y digital** tienen su guía operativa concreta (además de los 5 de v1.125).
- **`CONTENT_V=4`**: re-sincroniza el contenido conservando progreso/certificado del usuario (verificado `_cv=4`).
- Verificado en vivo: los 8 cursos muestran "Paso a paso"; 0 errores.
- Pendiente menor: profundizar producto-por-ramo (Vida/GM/Hogar/Fianzas/RC/Transporte) con paso a paso si se requiere; agregar lección de score de conciliación cuando se integre P0-06.
- Cache-bust: `academia-plus.js?v1316`.
- Archivos: `data/academia-plus.js`, `index.html`.


## v1.126 — 2026-07-04 · P0-02 moneda por país completada en módulos restantes · candidata 2026-07-04T193658.630
> Base activa: `2026-07-04T193658.630`. Sin tocar backend protegido. Sin datos reales. Conserva Academia v1.125 (paso a paso + `CONTENT_V`), moneda v1.124, importador (fuentes separadas, país/moneda sin default, planillas, documentos como parches, banco→conciliación) e integraciones/marketing.
- **P0-02 completada**: los KPIs/agregados de display con `GTQ` fijo restantes → `Orbit.q.monedaPais()` en **leads** (prima estimada, pronóstico ponderado, subtotal de columna), **renovaciones** (prima en juego), **siniestros** (indemnización pagada) y **portal** (monto reclamado usa moneda del cliente). Los importes **por-registro** (siniestros montoReclamado en tabla/ficha, renovaciones `cur`) ya usaban la moneda nativa del registro con fallback — se conservan (correcto). Verificado: CO muestra `$` en Leads, GT muestra `Q` en Siniestros; vista global normaliza con tasa declarada (queries.js), sin suma cruda.
- Versión unificada: candidata activa `2026-07-04T193658.630` · base frontend v1.117 · importador/documentos/comisiones v1.118–v1.123 · moneda por país v1.124/v1.126 · Academia paso a paso + `CONTENT_V=3` v1.125.
- **Pendientes P0** (próxima sesión): P0-03 desglose de prima visible en Pólizas; P0-04 estados Anulada/Rechazada en filtros; P0-05 estados de validación (reportado/en revisión/conciliado/requiere validación/bloqueado) en Cobros/Portal/Cliente360; P0-06 score de conciliación (MATCH_EXACTO/PROBABLE/REQUIERE_VALIDACION/BLOQUEADO); P0-07 planillas comisión esperada/pagada/diferencia visual; P0-08 textos técnicos por rol; profundizar "Paso a paso" en cursos restantes de Academia.
- Cache-bust: `leads.js`, `renovaciones.js`, `siniestros.js`, `portal.js` → `?v1315`.
- Archivos: `modules/{leads,renovaciones,siniestros,portal}.js`, `index.html`.


## v1.125 — 2026-07-04 · Academia: lecciones "Paso a paso" (cómo se hace, botones, flujos) + re-sync de contenido
- **Profundización**: se agregó una lección **"Paso a paso"** con instrucciones concretas (módulo, botones, flujo, estados) a 5 cursos de módulo: Orbit Clientes (crear/buscar/editar/adjuntar-propuesta), Pólizas y Cobros (abrir póliza con desglose, aplicar pago vs reportado, aging, conciliar), Ops+Leads (lead→cotiza→emitir→crea cliente, "Ver como"), Finanzas (registrar/clasificar, estados de cierre, liquidar comisión esperada vs pagada), Importador (elegir fuente, banner de alcance, dry-run, reporte, estados de validación).
- **Mecanismo `CONTENT_V`** en `data/academia-plus.js`: `apply()` ahora **actualiza** el contenido de los cursos PLUS cuando cambia la versión de contenido, **conservando `progreso` y `certificado`** del usuario (antes solo insertaba si no existían, por lo que las mejoras no se propagaban a un store ya poblado). Base para seguir profundizando sin duplicar ni perder progreso.
- Verificado en vivo: Clientes pasa a 5 lecciones con "Paso a paso"; Pólizas idem; `_cv=3`; 0 errores.
- Cache-bust: `academia-plus.js?v1314`.
- **Pendiente**: profundizar con "Paso a paso" el resto (técnico del sector, comercial, liderazgo, producto por ramo, servicio, digital/IA).
- Archivos: `data/academia-plus.js`, `index.html`.


## v1.124 — 2026-07-04 · P0-02 Moneda por país en KPIs/totales (fin de GTQ fijo) · candidata 2026-07-04T152321.882
> Sin tocar backend protegido (`data/store.js`, `store-firestore-lab.local.js`, `core/backend-lab-*`, `firestore.rules`, `tools/orbit360-*`). Sin datos reales. Conserva avances de la candidata (importador con fuentes separadas, país/moneda sin default, trazabilidad, conciliación bancaria, parches de documentos, planillas de comisión, integraciones/marketing, Academia v1.118–v1.123).
- **P0-02 Moneda fija corregida**: 57 literales de display `, 'GTQ')` → `, Orbit.q.monedaPais())` en `polizas, cobros, comisiones, finanzas, insights, inicio, cancelaciones, equipo, cliente360, reportes`. `monedaPais()` devuelve GTQ (GT), COP (CO) según país activo; en vista global mixta se mantiene la normalización declarada de `queries.js` (no suma cruda). Solo cambió **display**, no escrituras (país/moneda no se asumen al escribir).
- Verificado en vivo: país CO muestra `$` (COP), país GT muestra `Q` (GTQ), vista global normaliza; app carga sin errores.
- **Versión unificada**: candidata activa `2026-07-04T152321.882` · base frontend congelada v1.117 · Academia acumulada v1.118–v1.123 · esta corrección v1.124.
- **Pendientes P0 abiertos** (documentados, próxima sesión): P0-03 desglose de prima en Pólizas (neta/gastos/IVA/total/frecuencia/forma pago/recibos/fuente/validación), P0-04 estados históricos completos (Anulada/Rechazada), P0-05 estados de validación en Cobros/Portal/Cliente360 ("recibido para validación" ≠ "pagado"), P0-06 conciliación como propuesta con score, P0-07 planillas comisión esperada/pagada/diferencia, P0-08 textos técnicos por rol, y profundización de contenido de Academia.
- Archivos: `modules/{polizas,cobros,comisiones,finanzas,insights,inicio,cancelaciones,equipo,cliente360,reportes}.js`, `index.html`.


## v1.123 — 2026-07-04 · Fix legibilidad Academia (título de lección + formato de secciones)
- **Título de lección ilegible corregido**: en el visor de curso, el ítem activo (fondo rojo claro) mostraba el título en blanco → ahora `color:var(--ink)` (oscuro, legible) en `.acv-lec-t`/`.acv-lec.active`. `styles/infra.css`.
- **Secciones sin formato corregidas**: el cuerpo de sección (`s.d`) se mostraba con `**` literales y sin saltos → nuevo helper `fmtSec()` que renderiza **negritas** (`**texto**`→`<b>`) y saltos de línea. `modules/academia.js`. Verificado: título activo oscuro, negritas renderizan, 0 asteriscos literales.
- Cache-bust: `infra.css` y `academia.js` → `?v1311`.
- **Pendiente**: revisar "Manuales" (manual-maestro) por posible texto blanco ilegible reportado por la usuaria — a verificar en próxima sesión.
- Archivos: `modules/academia.js`, `styles/infra.css`, `index.html`.


## v1.122 — 2026-07-04 · Academia: ruta de inducción IT / Superadmin · total 40 cursos
> Solo agrega contenido de cursos (data layer). Sin tocar backend protegido, sin Firestore, sin datos reales. Editable con el editor existente.
- **⚙️ Inducción IT / Superadmin — configurar la plataforma** (destinatarios `Dirección` → visible para Dirección/Admin/superadmin en la Ruta por rol; verificado). 6 lecciones que cubren la **puesta en marcha completa** en orden: (1) Configuración — marca/paleta/white-label, países/monedas/glosario, catálogo financiero, planes y módulos por tenant/usuario; (2) Usuarios y roles (multi-rol, restricción por usuario, asesor no ve Ops); (3) Carga de base de datos inicial + Importador inteligente (fuentes separadas, dry-run, trazabilidad, estados honestos, no mezclar país/moneda); (4) Correos (permisos mínimos, pendiente de conexión), Integraciones (panel/eventos por tenant) y Automatizaciones + **addons por plan** (contratar y configurar); (5) Academia (crear cursos con IA/desde documento, asignar a rol, rutas y certificado); (6) mantenimiento trimestral. Con evaluación de 4 preguntas.
- Refuerza los principios del producto: todo autoadministrable por configuración (nada hardcodeado), integraciones/addons honestos (pendiente de conexión, nunca simular activo), país/moneda sin mezclar, datos ficticios en pruebas.
- Verificado en vivo: curso presente (total 40); Dirección/superadmin lo ve en su ruta; 0 errores.
- Cache-bust: `academia-plus.js?v1311`.
- Archivos: `data/academia-plus.js`, `index.html`.


## v1.121 — 2026-07-04 · Academia: cierre de cobertura de módulos + habilidades blandas + inducción Marketing · total 39 cursos
> Solo agrega contenido de cursos (data layer). Sin tocar backend protegido, sin Firestore, sin datos reales. Todo editable con el editor existente.
- **Módulos que faltaban (autocapacitación)**: "Aseguradoras, Cotizador y Comparativo" (directorio/ficha, cotización multicompañía, comparativo consultivo) y "Comunicación con el Cliente: Correo, WhatsApp y Plantillas" (bandeja vinculada, plantillas, notificaciones del portal, integraciones honestas).
- **Habilidades blandas**: "Productividad, Agenda y Gestión del Tiempo" (módulo Cronograma + priorización por impacto) y "Negociación Efectiva para Intermediarios" (preparación, crear valor, precio con criterio, acuerdos que duran).
- **🎯 Inducción del Rol Marketing — ruta completa** (destinatarios `Marketing`): bienvenida + ruta guiada (empresa/marca → Marketing Digital → Digital e IA → Comunicación → Cumplimiento), calendario de contenidos, integraciones honestas, medición por leads y colaboración con Comercial. **Visible para el rol Marketing y para Dirección/Admin (superadmin)** en la Ruta por rol — verificado en ambos.
- Con esto la Academia cubre **todos los módulos** de la plataforma + técnico del sector + producto por ramo + comercial + liderazgo + cumplimiento + servicio + digital/IA + habilidades blandas + rutas de inducción por rol (asesor, operativo, marketing, cliente). Total: 39 cursos, todos autoeditables (IA, desde documento, complementar/eliminar/reordenar) con Ruta por rol y certificado.
- Verificado en vivo: 5 cursos nuevos presentes; ruta de Marketing y de Dirección incluyen la inducción; 0 errores.
- Cache-bust: `academia-plus.js?v1310`.
- Archivos: `data/academia-plus.js`, `index.html`.


## v1.120 — 2026-07-04 · Rutas de inducción guiadas (asesor, administrativo/operativo, cliente) · total 34 cursos
> Solo agrega contenido de cursos (data layer). Sin tocar backend protegido, sin Firestore, sin datos reales. Todo editable con el editor existente.
- **🚀 Inducción del Asesor Nuevo — ruta completa** (destinatarios Asesor): bienvenida + ruta de aprendizaje explícita en 3 tramos (empresa → comercial → plataforma) con **ritmo de 30 días** y lista ordenada de cursos a tomar; incluye empresa/valores, ética/marca, lo comercial en Leads y cierre con Cumplimiento. Verificado: aparece en la **Ruta por rol** del Asesor.
- **🗂️ Inducción Administrativa y Operativa — ruta completa** (equipo): ruta por módulos en orden (Clientes → Pólizas/Cobros → Ops/Leads → Importador → Renovaciones → Finanzas → Cumplimiento), qué hacer en cada uno, sincronía en vivo y valores agregados.
- **🎉 Bienvenido a tu Portal — guía y seguros básicos** (destinatarios clientes, cat Producto → visible en el **portal → Aprende**): bienvenida, recorrido del portal en 4 pasos, y conceptos básicos por ramo (prima/cobertura/deducible, Auto, Vida, GM, Hogar/RC) con evaluación. Verificado: se muestra en el portal del cliente.
- Las rutas se apoyan en la **Ruta por rol** existente (ordena por categoría, Inducción primero) y el **certificado imprimible** al completar. Todo editable: regenerar/complementar con IA, cargar desde documento, eliminar/reordenar.
- Verificado en vivo: 3 cursos presentes (total 34); Asesor ve su inducción en la ruta; portal muestra la bienvenida; 0 errores.
- Cache-bust: `academia-plus.js?v1309`.
- Archivos: `data/academia-plus.js`, `index.html`.


## v1.119 — 2026-07-04 · Academia PLUS: cursos por producto/ramo + guía del editor (21 cursos, total 31)
> Solo agrega contenido de cursos (data layer). Sin tocar backend protegido, sin Firestore, sin datos reales. Todo **editable** con el editor existente.
- **Por producto/ramo (6 cursos, categoría Producto)**: Vida e Invalidez (suma asegurada por necesidad, declaración de salud), Gastos Médicos/Salud (deducible/coaseguro/red/tope, preexistencias), Hogar y Patrimonio (reposición vs valor real, multiventa), Fianzas y Cumplimiento (3 partes, recuperación del fiado, tipos, afianzamiento), Responsabilidad Civil (RC general/profesional/D&O), Transporte y Carga (viaje vs flotante, Incoterms). Cada uno con lecciones por secciones + evaluación.
- **Guía del editor (1 curso)**: "Cómo crear y editar cursos en la Academia" — documenta para administradores los 4 tipos de lección (video/lectura/quiz/recurso), **regenerar/complementar con IA**, **crear desde documento** (PDF/Word/imagen/texto → extracción y quiz), eliminar/reordenar, y cómo las **rutas por rol** + **certificado** funcionan.
- **Editabilidad confirmada**: los cursos inyectados son cursos normales del store, por lo que TODO el editor aplica — ✏ Editar lección, ✨/🧠 IA (redactar/expandir/replantear quiz), 📎 cargar desde documento/recurso, agregar/eliminar/reordenar lecciones, marcar certificado. Verificado: acciones "+ Curso" y "Crear con IA" presentes; cursos nuevos con quiz editable.
- Verificado en vivo: 21 cursos PLUS (total 31), los 7 nuevos presentes; 0 errores de consola.
- Cache-bust: `academia-plus.js?v1308`.
- Archivos: `data/academia-plus.js`, `index.html`.


## v1.118 — 2026-07-04 · Academia PLUS: autocapacitación por módulo + técnico/liderazgo/comercial/servicio en profundidad
> Solo agrega contenido de cursos (data layer). Sin tocar backend protegido, sin Firestore, sin datos reales.
- **Nuevo `data/academia-plus.js`** (cargado tras `seed.js`): inyecta **14 cursos** nuevos de forma **idempotente** (clave = id; no duplica; sobrevive a reseed vía `Orbit.SEED.cursos` + reintento hasta que el store esté listo). Total de cursos: 24.
- **Autocapacitación por módulo** (7 cursos, categoría Producto/Técnico/Comercial/Finanzas): Orbit Clientes (Expediente 360 + Calidad de datos), Pólizas/Cobros/Cartera, Renovaciones/Cancelaciones/Retención, Ops+Leads (ciclo comercial), Finanzas/Comisiones/Conciliación operativo, Importador y migración, Insights/Reportes/IA. Cada uno con 2-3 lecciones de lectura por secciones + quiz con respuestas correctas.
- **Técnico del sector (profundo)**: "Técnico de Seguros Avanzado" (suscripción/underwriting, tarificación —prima pura, frecuencia×severidad, ley de grandes números—, reaseguro proporcional/no proporcional) y "Gestión Profesional de Siniestros".
- **Comercial avanzado**: "Venta Consultiva Avanzada y Manejo de Objeciones" (diagnóstico, valor, objeciones, multiventa, cierre).
- **Liderazgo**: "Liderazgo de Equipos Comerciales" (metas sobre neta recaudada, cadencia de gestión, coaching, cultura, retención) — destinatarios Dirección.
- **Otros sugeridos**: "Cumplimiento, PLD/LAFT y Protección de Datos" (KYC/beneficiario final, señales de alerta, Habeas Data), "Servicio y Experiencia del Cliente (CX)" (momentos de la verdad, NPS, recuperación) y "Habilidades Digitales e IA para Intermediarios" (automatización, integraciones honestas, IA responsable).
- Todo el contenido respeta reglas del producto (prima **neta recaudada**, país/moneda sin mezclar, integraciones "pendiente de conexión", documentos que proponen y no imponen). Cada curso trae recurso(s) y evaluación.
- Verificado en vivo: 14 cursos presentes, Academia renderiza, categoría Liderazgo visible, lecciones + quiz operativos; 0 errores de consola. La **Ruta por rol** ordena estos cursos por categoría y el **certificado imprimible** aplica al completarlos.
- Cache-bust: nuevo `academia-plus.js?v1307`.
- Archivos: `data/academia-plus.js` (nuevo), `index.html`.


## v1.117 (congelada) — 2026-07-04 · Base frontend aprobada · cierre de documentación
> Candidata **congelada** como base frontend v1.117. Las 6 correcciones 134907 pasaron auditoría. **Sin cambios funcionales nuevos** en esta entrega — solo documentación.
- **Confirmado por auditoría**: clientes mapea moneda explícita; `estados-banco`→`conciliacionBanco`; documentos solo proponen cambios; UI sin "diff"; integraciones mapea estados técnicos a lenguaje usuario; smoke aclarado como visual/prototipo local; `Listado producción 2025-2026` ignorado.
- **Backend protegido INTACTO** (no tocado en ninguna versión de Claude): `data/store.js`, `data/store-firestore-lab.local.js`, `core/backend-lab-loader.js`, `core/backend-lab-init.js`, `core/backend-lab-security-guard.js`, `firestore.rules`, `tools/orbit360-*`. Sin Firestore, sin datos reales, sin merge/deploy.
- Entrega: ZIP completo de `orbit360-platform/` sin cambios funcionales nuevos.


## v1.117 — 2026-07-04 · Correcciones puntuales 134907 (moneda clientes, banco→conciliación, copy, estados)
> Sin tocar backend protegido (`data/store.js`, `data/store-firestore-lab.local.js`, `core/backend-lab-*`, `firestore.rules`, `tools/orbit360-*`), sin Firestore, sin datos reales, sin merge/deploy.
- **P0-134907-01** `IMPORT_MAP.clientes.fields` ahora mapea `moneda: ['moneda','divisa','currency']`. Con moneda explícita (GTQ/COP/USD) se respeta; sin ella queda `''` + `requiere_validacion`; `monedaSugerida` no sustituye. Verificado: cliente CO con `moneda=COP` → se acepta sin validación.
- **P0-134907-02** `estados-banco` ya **no escribe `finmovs`**: colección `conciliacionBanco` (flag `conciliacionBanco:true`), `estado:'pendiente_conciliacion'`, `requiereValidacion:true`; SCOPE `crea:['conciliacionBanco']`. Se sacó `estados-banco` del enrutado `applyConciliacion` (que creaba finmovs) → ahora va por `applyImport`. Copy: "Se cargará para conciliación bancaria. No crea cobros ni movimientos financieros hasta que se valide." Verificado: 0 finmovs creados; registro en `conciliacionBanco`.
- **P1-134907-03** `KINDS.documentos.desc`: "Carga documentos del expediente. El sistema extrae posibles datos y propone cambios para revisión/aprobación; no modifica clientes ni pólizas directamente."
- **P1-134907-04** `SCOPE.documentos.label` sin "diff" → "Propuestas de actualización del expediente (pendientes de aprobación)".
- **P1-134907-05** `core/integraciones-panel.js`: estados técnicos mapeados a etiqueta legible (`pendiente_backend`→"Pendiente de conexión", `pendiente_configuracion`→"Pendiente de configuración", `sin_estado`→"Sin estado", botón `Simulando…`→"Probando…") en badges y filtro; el valor interno se conserva.
- **P1-134907-06** `docs/REPORTE-SMOKE.md`: aclarado que es smoke visual/prototipo local (no backend/Firestore/LAB/datos reales).
- **Regla**: `Listado producción 2025-2026` sigue ignorada (excluida por hojas soporte).
- Cache-bust: `importa.js`→`?v1307`. (`integraciones-panel.js` se carga on-demand.)


## v1.116 — 2026-07-04 · Paquete completo A&S: P0 finales de moneda/documentos + regla "Listado producción"
> Sin tocar backend protegido (`data/store.js`, loaders/guards, `firestore.rules`, tools `orbit360-*`), sin `Orbit.store`, sin Firestore, sin deploy, sin datos reales. A&S solo desde tenant demo.
- **P0-01 (moneda de hoja)** `core/importa.js`: el parseo Excel ya NO infiere moneda por país. `monedaHoja = detectaMoneda(sn)` (explícita) y `_monedaSugeridaHoja = monedaDe(paisHoja)` aparte (sugerencia, no se escribe). Trazabilidad extendida con `_monedaSugeridaHoja`.
- **P0-02 (clientes sin default GTQ)** `IMPORT_MAP.clientes.build`: eliminado `rec.moneda = pais==='CO'?'COP':'GTQ'`. Ahora: país normalizado, `monedaSugerida` aparte, moneda solo explícita; sin país o moneda → `requiere_validacion`. Verificado: cliente sin país → `pais:''`, `moneda:''`, `requiereValidacion:true` (no GTQ).
- **P0-03 (SCOPE.documentos)** cambiado de `crea:['clientes']` a `crea:['parchesPendientes']` (label "Propuestas de cambio al expediente (diff)"; bloquea clientes/pólizas/cobros directos). Coherente con el flujo docPatch de v1.115.
- **Regla de alcance confirmada**: la hoja **`Listado producción 2025-2026` se ignora** — no es fuente de pólizas ni financiero histórico, no genera manifest/preview/cartera. Ya queda cubierta por la exclusión de hojas soporte (`HOJA_SOPORTE` matchea "produccion/producción"); verificado que el nombre se excluye. La fuente real de pólizas la entregará Paula como archivo separado.
- **P1-04 (texto técnico)** `core/integraciones-panel.js`: columna `LAB` → `Prueba` (solo visible en modo prueba interno). Junto con lo ya suavizado en v1.115 (Pendiente de conexión / Estado de integraciones / Probar / sin cuenta conectada).
- Cache-bust: `importa.js` → `?v1306`.
- **Backend protegido NO tocado** (confirmado): `data/store.js`, `data/store-firestore-lab.local.js`, `core/backend-lab-*`, `firestore.rules`, `tools/orbit360-*`.


## v1.115 — 2026-07-04 · Reauditoría 072304: trazabilidad real, moneda no autocompletada, comisiones, documentos, textos
> Sin tocar backend/LAB, `data/store.js` backend, Firestore, ni deploy. Sin datos reales.
- **P0-01 Trazabilidad a `rec`** (`core/importa.js`): helper `copyRowMeta(cells, rec)` llamado en `applyImport`, `dryRun`, `conciliarRows` y el flujo scoped → `_origenHoja/_paisHoja/_monedaHoja/_periodoHoja/_bloqueOrigen/_numeroFila` llegan al registro final (`finmovs`). Verificado: `_numeroFila` presente en el finmov creado.
- **P0-02 Moneda no autocompletada**: `finmovShape` y pólizas separan `moneda` (solo **explícita** de fila/hoja) de `monedaSugerida` (`monedaDe(pais)`, no se escribe). País reconocido pero sin moneda explícita → `requiere_validacion`. Verificado: GT sin moneda → `requiere_validacion`, `monedaSugerida:GTQ`.
- **P0-03 Contrato real de planillas de comisión**: campos aseguradora/póliza/recibo/asesor/ramo/producto/**primaNeta**/**comEsperada**/**comPagada**/pais/moneda/periodo; conciliación esperada vs pagada (`difComision`); falta país/moneda/periodo/aseguradora → `requiere_validacion`. Tarifas **solo** se aplican con **diff confirmado** (checkbox "Aplicar estos % al tarifario" + columna % actual vs nuevo con Δ).
- **P0-04 Documentos → parches con diff**: `documentos` escribe a `parchesPendientes` (nunca a `clientes` directo). Con expediente abierto genera un parche con el **diff** (campo: actual→propuesto) pendiente de confirmación; sin expediente, no hace nada.
- **P1-05 Fechas fijas**: cierre financiero por defecto **relativo** a la fecha viva (2 meses atrás) en `modules/finanzas.js`; `core/config.js` `cierreFinanciero:{}`; vigencia de ejemplo en `core/ia.js` relativa a hoy. (Seeds de `core/integraciones.js` son tenant demo aislado — permitido.)
- **P1-06 Textos técnicos**: "Pendiente de backend"→"Pendiente de conexión" (configuración ×5); "backend del tenant" removido; panel "Diagnóstico…"→"Estado de integraciones", "🧪 Simular"→"▶ Probar"; marketing "backend seguro"→"conexión"; correo "modo demo"→"sin cuenta conectada".
- **P1-07 Financiero histórico**: conceptos ingreso que parecen cobro/recaudo de cliente (pago cliente/recibo/póliza/prima/cuota/recaudo/abono) → `requiere_validacion` (no entran a caja). Verificado: "Pago cliente REC-99" bloqueado.
- Cache-bust: `importa.js`→`?v1305`, `config.js`/`ia.js`→`?v1305`, `finanzas.js`/`configuracion.js`/`correo.js`/`marketing.js`→`?v1305`.


## v1.114 — 2026-07-04 · Candidato corregido · auditoría ampliada A&S (P0/P1/P2)
> No se tocó backend/LAB, `data/store.js` backend, Firestore, ni se hizo deploy. Sin datos reales. A&S solo desde config/tenant demo. Detalle de estado P0/P1 en `docs/BITACORA-ERRORES.md`; smoke en `docs/REPORTE-SMOKE.md`.

**Importador (`core/importa.js`, `modules/importar.js`)**
- **P0-02** Excel multihoja con trazabilidad por fila: `_origenHoja/_paisHoja/_monedaHoja/_periodoHoja/_bloqueOrigen/_numeroFila`. Cada hoja infiere país/moneda/periodo de su nombre (sin asumir GT). Resumen de hojas procesadas/excluidas en el paso 2 y en el reporte CSV.
- **P1-02** Exclusión de **hojas soporte** por patrón de nombre (dashboard, resumen, presupuesto, análisis, producción, metas…) antes de mapear, con conteo y motivo.
- **P0-03** `normPais()` devuelve `''` cuando no reconoce país (antes: GT). `finmovShape` usa país de fila→hoja; sin país/moneda confiables marca `estado:'requiere_validacion'` y `requiereValidacion:true`. **No se asume GTQ.**
- **P0-04** Pólizas: nuevos campos `pais`/`moneda`; estado sin evidencia → `Requiere validación` (no `Vigente`). `afterInsert` genera recibos/cartera **solo** si Vigente/Por renovar **y** país+moneda+forma de pago confiables **y** sin `requiereValidacion`.
- **P1-04** Pólizas separan `primaNeta`/`gastos`/`iva`/`primaTotal`; si no se puede determinar la neta → `requiere_validacion` (producción/comisiones deben usar neta recaudada).
- **P0-05** `tarifasDetect()` lee **filas reales** (aseguradora/ramo/producto/%/base) del archivo; sin aseguradora reconocida y % válido, `tarifasConfiables=false` → **no** actualiza tarifas (referencia). Nuevo contrato `IMPORT_MAP['planillas-comision']` → colección `comisiones`.
- **P0-06** `docs-aseguradora` forzado a **modo documental** (solo almacena; SCOPE `crea:[]`). Todo tipo visible tiene contrato o queda documental/bloqueado.
- **P1-01** Ejemplo y descripción de `movimientos-finanzas` aclara que pagos de clientes NO van a caja (van a cobros/conciliación).
- **P1-03** `documentos` sin expediente abierto (scope) **no crea ni modifica clientes**: avisa y requiere abrir el expediente.

**UI comercializable**
- **P1-05** (`index.html`, `core/auth.js`) Login sin credenciales demo (`admin@demo.com`/`demo123`) → placeholders. (`core/integraciones-panel.js`) textos "demo/LAB" suavizados a lenguaje de usuario (sin tocar lógica ni contratos).
- **P1-06** Fechas quemadas operativas → fecha viva: `modules/portal.js`, `modules/cliente360.js` (×2), `core/correo.js` (×2).
- **P1-07** (`core/theme.js`) "White-label para Alianzas" → "Se aplica a toda la plataforma y al login". A&S solo desde tenant demo (slot white-label).
- **P2-01** (`core/pwa.js`) 3 estados: instalada (`✓ App instalada`, verde, auto-oculta), iOS (guía Compartir→Agregar a inicio), otros navegadores (`⬇ Instalar como app`).

**Verificado en vivo**: financiero-histórico excluye `TOTALES`; finmov sin país → `requiere_validacion` sin GT/GTQ; documentos = documental y no crea clientes; app carga sin errores de consola.
- Cache-bust: `importa.js`→`?v1304`, `config.js`/`finanzas.js`→`?v1300`, `theme.js`/`auth.js`/`correo.js`/`pwa.js`/`cliente360.js`/`portal.js`→`?v1304`, `configuracion.js`→`?v1301`.


## v1.113 — 2026-07-03 · Cierre opcionales: reporte de exclusiones descargable + cierre/catálogo por país
- **Reporte de importación descargable (CSV)**: nuevo botón **⬇ Reporte** en el paso 2 del importador. Exporta tipo de fuente, archivo, alcance (crea/actualiza y bloqueado), **estado del archivo** (`listo`/`requiere_validacion`/`sin_datos`), resumen dry-run (crear/actualizar/omitir/total) y el **detalle de filas excluidas con su motivo**. Trazabilidad completa de cada importación. Verificado: botón presente tras cargar archivo.
- **Cierre financiero por país** (`periodoEstado(ym, pais)`): `tenant.cierreFinanciero` admite ahora override por país `{ cerradoHasta:'2026-04', CO:{cerradoHasta:'2026-02'} }` con fallback al cierre global. El badge de estado del mes en Finanzas usa el país activo. Verificado: con CO cerrado hasta feb, marzo-2026 muestra "Referencia" (mientras el global GT lo daría "Cerrado").
- **Catálogo financiero por país** (`catFin`): admite `catalogoFinanciero.{GT|CO}.{ingresos,egresos}` con fallback al catálogo global del tenant. Backward-compatible con el catálogo plano existente.
- Reglas respetadas: sin backend/`store.js`, sin datos reales, sin hardcode A&S, sin notas técnicas.
- Con esto se cierran los opcionales pendientes del paquete A&S; el prototipo queda listo para el carril de backend.
- Cache-bust: `importa.js` → `?v1303`, `finanzas.js` → `?v1303`.
- Archivos: `core/importa.js`, `modules/finanzas.js`, `index.html`.


## v1.112 — 2026-07-03 · Fix: movimientos importados ahora suman en Finanzas (forma real de finmovs)
- **Bug corregido** (pendiente #1 de la auditoría): los builds del importador para finmovs producían `{ monto, tipo:'Ingreso', clasificacion, fecha }`, forma que **no coincide** con la del seed que lee Finanzas (`{ tipo:'ingreso'|'egreso', clase, pais, moneda, periodo, dia, valor, estado }`), por lo que los movimientos importados **no sumaban** en KPIs/dashboard.
- **Solución**: nuevo normalizador `finmovShape(rec, clase)` en `core/importa.js` que emite la forma real del seed (deriva `periodo`/`dia` de la fecha, `valor` absoluto, `tipo` en minúsculas, `pais`/`moneda` sin mezclar, `estado` recaudado/pagado, y `saldo_inicial`/`referencia` para saldo anterior). Aplicado a las 3 fuentes finmovs: `movimientos-finanzas`, `estados-banco`, `financiero-historico` (mutando `rec`, que es lo que consume `applyImport`).
- Verificado por importación real: CSV con fila `TOTALES` (excluida) + comisión GT 3.500 → el movimiento se crea con forma correcta y el total de ingresos GT del mes pasa de 15.503 a 19.003 (+3.500).
- Actualizado `docs/BITACORA-ERRORES.md`: el hallazgo del casing/forma queda **RESUELTO**.
- Cache-bust: `importa.js` → `?v1302`.
- Archivos: `core/importa.js`, `index.html`, `docs/BITACORA-ERRORES.md`.


## v1.111 — 2026-07-03 · Auditoría clic-por-clic (base 1.0) + limpieza de notas técnicas (P9)
- **Auditoría runtime de las 30 rutas del NAV**: navegación programática módulo por módulo → **0 pantallas en blanco, 0 errores de consola**; todos los `#host` con contenido. (Ver `docs/BITACORA-ERRORES.md`.)
- **Higiene de datos (checklist del paquete)**: `localStorage` directo en `modules/` = **0** (todo pasa por `Orbit.store`). Sin `Firestore/Firebase/localhost` en UI de módulos.
- **P9 · Notas técnicas visibles eliminadas**: quitadas de la UI las menciones "Demo: motor simulado / en producción se conecta el extractor real" (Importar hub y pasos del importador) y "(demo: solo la UI de gestión)" (Configuración → APIs). Reemplazadas por copy orientado al usuario. Verificado en vivo.
- Reglas respetadas: sin backend/`store.js`, sin datos reales, sin hardcode A&S.
- Cache-bust: `importa.js`, `importar.js`, `configuracion.js` → `?v1301`.
- Archivos: `core/importa.js`, `modules/importar.js`, `modules/configuracion.js`, `index.html`, `docs/BITACORA-ERRORES.md` (nuevo).


## v1.110 — 2026-07-03 · Estados de cierre por periodo (paquete A&S · P5)
- **`tenant.cierreFinanciero.cerradoHasta`** (nuevo, default `2026-04`): último periodo consolidado, configurable por tenant (sin hardcode A&S).
- **`periodoEstado(ym)`** en Finanzas clasifica cada mes: `≤ cerradoHasta` → **🔒 Cerrado**; mes siguiente → **◷ Referencia** (requiere conciliación manual, no es cierre); meses posteriores pasados → **✎ Captura y conciliación**; mes actual/futuro → **● Abierto / en validación** ("no se cierra sin planillas, estados de cuenta o respaldo").
- **UI**: badge de estado junto al título de Movimientos + nota explicativa (oculta cuando el mes está cerrado). Verificado cambiando de mes: abril=Cerrado, mayo=Referencia, junio=Captura, julio=Abierto — exactamente los cortes del paquete.
- No-destructivo; sin backend/`store.js`, sin datos reales, sin notas técnicas.
- Con esto quedan implementadas del paquete A&S: **P1, P2, P4, P5, P6, P7** (importador con alcance/guarda/saldo/histórico + catálogo financiero + cierres). Pendiente opcional: catálogo/cierre por **país** (hoy por tenant) y reporte de exclusiones descargable.
- Cache-bust: `config.js` y `finanzas.js` → `?v1300`.
- Archivos: `core/config.js`, `modules/finanzas.js`, `index.html`.


## v1.109 — 2026-07-03 · Catálogo financiero editable por tenant (paquete A&S · P6)
- **`tenant.catalogoFinanciero`** (nuevo en DEFAULT): `{ ingresos, egresos, especiales }` — precargado con las clases del seed (para no romper movimientos existentes) más las categorías sugeridas del paquete (honorarios, reintegros, aportes, tecnología, administración, impuestos, bancos…). Heredable, por tenant, sin hardcode A&S.
- **Finanzas lee del catálogo**: `catFin('ingreso'|'egreso')` reemplaza los arrays fijos `CLASES_ING/EGR`; el alta/edición de movimiento y el presupuesto usan las categorías del tenant (fallback a los valores previos si no hay catálogo).
- **Editor "⚙ Categorías"** en la barra de Movimientos: agrega/quita categorías por grupo (💰 Ingresos / 💸 Egresos / 🔖 Especiales), persiste en `tenant.catalogoFinanciero`. Verificado: agregar "Consultoría" persiste y aparece de inmediato en el dropdown de alta de ingreso.
- No-destructivo; sin backend/`store.js`, sin datos reales, sin notas técnicas.
- **Pendiente del paquete que queda**: P5 (cierres mayo/junio/julio como referencia/captura/abierto) y catálogo por **país** (hoy es por tenant; puede extenderse a por-país si se requiere).
- Cache-bust: `config.js` → `?v1299`, `finanzas.js` → `?v1299`.
- Archivos: `core/config.js`, `modules/finanzas.js`, `index.html`.


## v1.108 — 2026-07-03 · Importador: fuente dedicada `financiero-historico` (P4) + alcance primero (P1)
- **Fuente `financiero-historico`** (nueva tarjeta en Importar → Finanzas): carga movimientos financieros históricos GT/CO. En `build`: **excluye filas no-movimiento** (títulos, subtotales, `TOTALES`/`Total general`, dashboards, presupuestos, producción) marcándolas `_excluir` con motivo; **separa país/moneda** (GTQ/COP, sin mezclar); trata **saldo anterior** como `SaldoInicial`/`referencia`/`requiereValidacion` (no suma). Las filas excluidas se **omiten** en `applyImport` y aparecen listadas como "excluida: …" en el resumen dry-run. Verificado con CSV real (TOTALES y Subtotal excluidos; comisión GT y nómina CO reconocidas).
- **P1 alcance-primero (satisfecho)**: el flujo ya obliga a elegir el **tipo de fuente** (tarjeta del hub Importar) antes de procesar, y el nuevo **banner "🔒 Alcance de esta fuente"** (v1.107) declara en el paso 1 qué crea/actualiza y qué queda bloqueado, antes de subir el archivo. La guarda `scopeGuard` impide escrituras fuera del alcance. Queda como mejora opcional cambiar el tipo dentro del propio drawer.
- Reglas respetadas: sin backend/`store.js`, sin datos reales, sin hardcode A&S, sin notas técnicas en UI.
- Cache-bust: `importa.js` → `?v1299`, `importar.js` → `?v1299`.
- Archivos: `core/importa.js`, `modules/importar.js`, `index.html`.


## v1.107 — 2026-07-03 · Importador: alcance por fuente + guarda anti-inferencia + regla de saldo anterior (paquete A&S P1/P2/P4/P7)
- **Alcance visible por fuente** (`core/importa.js`): cada tipo de importación muestra un **banner "🔒 Alcance de esta fuente"** en el paso 1 y 2 con lo que **crea/actualiza** y lo que **NO crea (bloqueado)**. Ej.: movimientos-finanzas / estados-banco → crean solo `finmovs`, **bloquean** clientes, pólizas, cobros y cartera. Verificado: el banner aparece y lista los bloqueos.
- **Guarda anti-inferencia cruzada** (`scopeGuard`): `applyImport` rechaza escribir en cualquier colección fuera del alcance declarado de la fuente (defensa además de que cada fuente ya escribía solo a su colección). Si se intenta, avisa "⛔ Bloqueado por alcance".
- **Regla de SALDO ANTERIOR** (build de `movimientos-finanzas`): conceptos "saldo anterior/inicial" ya **no** se cargan como ingreso/egreso operativo — se marcan `tipo:'SaldoInicial'`, `signo:0`, `estado:'referencia'`, `requiereValidacion:true`. Finanzas filtra estrictamente `ingreso`/`egreso`, por lo que estos **no suman** en totales (verificado por lectura del filtro).
- **Pendientes del importador (abiertos, documentados)**: (a) selector de tipo de fuente como **primer paso obligatorio** con lista de tipos del paquete (clientes/polizas/cobros_realizados/planilla_aseguradora/estado_cuenta/financiero_historico/siniestros/documentos_soporte/configuracion_catalogo); (b) modo **financiero_historico** dedicado con detección de hojas mensuales por país/mes/año y exclusión de títulos/subtotales/dashboards; (c) reporte de exclusiones y estados por archivo (listo/requiere_validacion/bloqueado/superado); (d) catálogo financiero editable por tenant. Estos quedan para la próxima sesión.
- Reglas respetadas: sin tocar backend/`data/store.js`, sin datos reales, sin hardcode A&S, sin notas técnicas en UI.
- Cache-bust: `importa.js` → `?v1298`.
- Archivos: `core/importa.js`, `index.html`.


## v1.106 — 2026-07-03 · Localización cableada en módulos internos (cobros, cliente360) + fix fecha congelada
- **Cobros · detalle del recibo** (`modules/cobros.js`): helper `TT(k)` resuelve por el país del cliente del recibo; el crumb "Recibo", el título "Desglose del recibo", "Prima neta" y "Total del recibo" ahora usan `Orbit.termino()`. Verificado: con override CO `recibo→Comprobante` / `prima_neta→Prima neta base`, el detalle refleja ambos.
- **Cliente360 · alta de cliente**: el label del campo de identificación usa `Orbit.termino('id_fiscal')` (NIT/RFC/RUC/… según país) en vez del texto fijo "DPI/Cédula/NIT".
- **Fix fecha congelada**: el endoso tenía `value="2026-06-22"` quemado; ahora `Orbit.ui.today()` (fecha viva).
- No-destructivo: sin overrides, los términos por defecto quedan idénticos.
- **Pendiente menor**: cablear encabezados de tablas analíticas de comisiones (país mixto — requiere criterio); el resto de localización queda cerrado.
- Cache-bust: `cobros.js`, `cliente360.js` → `?v1298`.
- Archivos: `modules/cobros.js`, `modules/cliente360.js`, `index.html`.


## v1.105 — 2026-07-03 · Marketing historial de eventos + responsive global (endurecimiento)
- **Marketing · historial de eventos por contenido**: la ficha de contenido ahora muestra **🧾 Historial de eventos** (leído de `Orbit.integraciones.list({entidad:'contenidos', entidadId})`) con evento (pieza/programación/guardado/sync), estado (badge) y fecha-hora. Se **refresca en vivo** al Crear pieza / Programar. Verificado: al emitir, los eventos aparecen al instante.
- **Responsive global (endurecimiento)** en `styles/base.css`: tablas `.tbl` con scroll horizontal ≤900px (no desbordan el viewport); Configuración `.cfg-wrap`/`.cfg-side` pasan a columna con navegación horizontal ≤820px; portal `.pt-cards` compactas y formularios a 1 col ≤560px; **calendario de marketing** con scroll horizontal (min-width 560px) en vez de aplastar 7 columnas ≤640px; drawers `max-width:96vw`; `.page{overflow-x:hidden}`. Verificado a ~390px: sin desbordes horizontales.
- Cache-bust: `marketing.js` → `?v1298`, `base.css` → `?v1298`.
- Archivos: `modules/marketing.js`, `styles/base.css`, `index.html`.


## v1.104 — 2026-07-03 · Localización por país: editor de glosario + cableado en portal
- **Editor de glosario** en Configuración → Países y monedas: selector de país (entre los activos del tenant) + 17 campos (póliza, recibo, prima, prima neta, cliente, asegurado, aseguradora, comisión, ramo, vigencia, deducible, siniestro, cobro, tomador, **id fiscal**, corredor, gestión). Cada campo muestra el valor por defecto como placeholder; vacío = usa default. Botones **Guardar** (escribe `tenant.glosario[pais]`) y **Restablecer a defaults**. Verificado: guardar GT `poliza→Contrato` hace que `Orbit.termino('poliza','GT')` devuelva "Contrato"; restablecer vuelve a "Póliza".
- **Cableado en Portal del Cliente** (`modules/portal.js`): helper `TT(k)` resuelve por el país del cliente activo; labels de detalle de póliza (N.º de póliza, prima total), recibo (título, póliza, prima neta) ahora usan `Orbit.termino()`. Así el cliente ve la terminología de su país.
- No-destructivo: sin overrides, todos los textos quedan idénticos.
- **Pendiente localización**: cablear términos en más módulos internos (cliente360, cobros, comisiones, aseguradoras) — el editor y el helper ya están listos para ello.
- Cache-bust: `configuracion.js` y `portal.js` → `?v1298`.
- Archivos: `modules/configuracion.js`, `modules/portal.js`, `index.html`.


## v1.103 — 2026-07-03 · Localización por país: base `Orbit.termino()` + glosario por tenant
- **Nuevo helper `Orbit.termino(clave, pais)`** en `core/config.js`: resuelve términos de seguros con prioridad `tenant.glosario[pais]` → `tenant.glosario['*']` → `Orbit.TERMINOS[pais]` → `Orbit.TERMINOS['*']` → la clave literal. Todo override es **opcional y no-destructivo**: sin config usa los defaults, así que ningún texto existente cambia.
- **`Orbit.TERMINOS`** con defaults por país para las claves clave (poliza, recibo, prima, prima_neta, cliente, asegurado, aseguradora, comision, ramo, vigencia, deducible, siniestro, cobro, tomador, **id_fiscal**, corredor, gestion). Ej.: `id_fiscal` = NIT (GT/CO), RFC (MX), RUC (PA), Cédula jurídica (CR); `corredor` varía (Corredor / Intermediario / Agente).
- **`tenant.glosario: {}`** añadido al DEFAULT (heredable), para que cada cliente sobreescriba términos por país desde Configuración (editor de glosario = pendiente de UI).
- **Alcance de esta entrega**: base transversal lista y probada de forma aislada. **Pendiente (próxima sesión)**: (a) editor de glosario en Configuración → Localización; (b) cablear `Orbit.termino()` en los textos de módulos (póliza, recibo, prima, id fiscal, comisión) y en el portal del cliente.
- Cache-bust: `config.js` → `?v1297`.
- Archivos: `core/config.js`, `index.html`.


## v1.102 — 2026-07-03 · Reportes: análisis IA (lectura ejecutiva + acciones sugeridas) · CL-009
- **Nuevo botón 🤖 Analizar con IA** en cada reporte: arma un resumen en vivo (totales por columna numérica + concentración por la principal dimensión categórica) y pide a **`Orbit.ia.complete`** (IA centralizada) una **lectura ejecutiva** (qué pasa y por qué importa) + **3 acciones concretas priorizadas**, renderizadas en un panel. Con **timeout de resguardo (15s)** y **fallback determinista** (lectura + acciones calculadas de los datos) cuando la IA no está conectada — nunca se queda colgado.
- Respeta el contrato: única llamada al modelo vía `Orbit.ia.complete`; si `Orbit.ia.disponible()` es falso, usa el análisis automático y lo indica en el panel.
- Verificado por camino real: panel genera análisis real del reporte de Producción (1.2k chars, secciones Lectura/Acciones); 0 errores.
- Cache-bust: `reportes.js` → `?v1297`.
- Archivos: `modules/reportes.js`, `index.html`.


## v1.101 — 2026-07-03 · FUSIÓN con lane ChatGPT/Codex (Integraciones + Marketing) + rebase v1.98–v1.100
- **Base adoptada**: `ORBIT360-PLATFORM-FUSIONADO-CHATGPT-CODEX-POST-V197` (mi v1.97 + trabajo real de ChatGPT/Codex). **Conservado sin tocar**: `core/integraciones.js` (contratos `emit/configurar/status/list/resumen/diagnostico/openPanel/ensureLabMock/labMock/mark`), `core/integraciones-panel.js` y `core/integraciones-lab-mock.js` (se cargan on-demand desde `integraciones.js`), `modules/marketing.js` conectado a eventos (`marketing_sync_sheets/generar_pieza/programar_publicacion/contenido_creado`), `modules/automatizaciones.js` (banner "Automatizaciones & Integraciones"), `tools/orbit360-validate-marketing-integraciones.mjs`.
- **Rebasado encima (aditivo, sin borrar contratos)**: mis 3 archivos post-v1.97 — `modules/renovaciones.js` (v1.98 comparativo multi-aseguradora + solicitar propuestas), `modules/configuracion.js` (v1.99 Outlook + estados tenant-wide; ya puentea a `Orbit.integraciones.configurar/mark` que ahora EXISTE de verdad), `modules/academia.js` (v1.100 rutas por rol + certificado imprimible).
- **index.html**: base fusionada (con `core/integraciones.js?v1296`, `marketing.js?v1296`) + cache-bump de los 3 rebasados a `?v1297`.
- Verificación pendiente en esta entrega: `Orbit.integraciones` presente y funciones de marketing/mis-features operativas (ver resumen).
- Archivos tocados en la fusión: `modules/renovaciones.js`, `modules/configuracion.js`, `modules/academia.js`, `index.html`, `docs/BITACORA-CAMBIOS.md` (los demás provienen de la base fusionada).


## v1.100 — 2026-07-03 · Academia: rutas de aprendizaje por rol + certificado imprimible (CL-008)
- **Ruta por rol** (nuevo toggle 📚 Catálogo / 🧭 Ruta por rol): para el rol activo (o cualquiera vía selector) arma una **secuencia curada** de cursos ordenada por categoría (Inducción→Técnico→Producto→Comercial→…), con pasos numerados, barra de progreso por curso, **avance %/completados/certificados** de la ruta y botón **▶ Continuar ruta** (salta al primer curso pendiente). Reusa `destinatarios`/`progreso`/`certificado` — sin nuevo modelo de datos. El asesor ve su ruta (8 cursos) distinta de Dirección (10).
- **Certificado imprimible** (`verCertificado`): botón 🏅 en cursos completados (catálogo + ruta) → documento de certificado (empresa/tenant, nombre del usuario, curso, categoría, **folio** y fecha viva) con Imprimir/PDF. Antes `certificado` era solo un flag sin documento.
- Verificado por camino real: toggle de vista, selector de rol (10↔8 cursos), certificado renderiza "Certificado de finalización"; KPIs con valores; 0 errores.
- Cache-bust: `academia.js` → `?v1294`.
- Archivos: `modules/academia.js`, `index.html`.


## v1.99 — 2026-07-03 · Integraciones tenant-wide + Outlook (CL-001/CL-006)
- **Estados claros por integración** (`integEstado`): cada tarjeta muestra badge **No configurado / Pendiente de backend**. En demo/LAB **nunca** se presenta como conexión real (regla CL-001): guardar parámetros deja la integración en *Pendiente de backend*, no "conectada".
- **Modal Outlook dedicado** (Microsoft 365): cuenta del usuario, tipo de buzón (personal/compartido), **permisos** (leer bandeja + asociar correos a clientes/pólizas/gestiones · enviar en nombre del usuario · guardar adjuntos como documentos del cliente), **patrón de asunto** `{cliente} · {poliza} · {gestion}`, y Client ID/Tenant OAuth. El resto de integraciones mantiene el modal genérico (API key/endpoint/cuenta).
- **Puente al contrato del lane backend**: al guardar se llama `Orbit.integraciones.configurar(id, data)` y `Orbit.integraciones.mark(id, estado)` **si existen** (fuente de verdad tenant-wide); si no, respaldo en el **store del tenant** (`Orbit.store.setPref`, no localStorage crudo). **No** se crea un `core/integraciones.js` propio para no chocar con el del lane ChatGPT/Codex.
- Quitada la nota técnica "quedan en este navegador" y el "Conectado" simulado en la tabla de APIs.
- Verificado por camino real: modal Outlook guarda cuenta/permisos/patrón en store del tenant; lista muestra estados; 0 errores.
- Cache-bust: `configuracion.js` → `?v1294`.
- Archivos: `modules/configuracion.js`, `index.html`.
- ⚠️ **Entrega/merge**: mi ZIP **no** incluye `core/integraciones.js` / `-panel.js` / `-lab-mock.js` (viven en el lane ChatGPT/Codex). Al consolidar, **conservar** esos archivos — no subir mi ZIP como reemplazo total si borra los del backend.


## v1.98 — 2026-07-03 · Renovaciones: solicitar propuestas + comparativo MULTI-aseguradora
- **Nuevo `solicitarPropuestas(polizaId)`** (botón 📋 Propuestas en cada tarjeta de renovación): antes solo existía la campaña por lote (WhatsApp) y no había comparativo — solo "simulaba la misma". Ahora abre un comparativo real con **elección de alcance**: 🔁 Solo la misma / 🏛️ Comparar con otras / ☑️ Seleccionar aseguradoras.
- **Comparativo multi-aseguradora**: tabla con **prima estimada** por aseguradora (proyección determinista y estable — las tarifas oficiales se integran luego con el cotizador), **Δ vs prima actual** (color) y **comisión estimada** con el **% vigente por aseguradora/ramo** (`Orbit.comeng.pctAseguradora`). Ordenada por prima; se elige la ganadora con radio. Moneda del país, **sin mezclar** (candidatas filtradas por país del cliente).
- **Acciones**: 📧 Enviar comparativo al cliente (correo + actividad en su expediente) y ✅ Registrar propuesta → crea gestión en **Ops · Renovaciones / Modif.** enlazada a cliente/póliza con checklist, notifica al asesor, y registra actividad. Todo con fecha viva.
- Verificado por camino real: 6 aseguradoras comparadas, scope Seleccionar con candidatas, registrar → gestión creada en la lista correcta enlazada a la póliza (fecha de hoy); 0 errores.
- Cache-bust: `renovaciones.js` → `?v1294`.
- Archivos: `modules/renovaciones.js`, `index.html`.


## v1.97 — 2026-07-03 · Ciclo Ops↔Leads: fechas vivas (fin de fechas congeladas) + auditoría
- **Defecto real corregido**: `core/ciclo.js` tenía `'2026-06-20'` (y `'2026-06-27'`, `'2026-06-22'`) **hardcodeado** en todos los flujos que CREAN datos — negocios, gestiones, actividades, bitácoras y clientes nacían con fecha congelada, violando la regla de "fechas vivas". Sustituido por helpers locales `today()` / `stamp()` / `inDays(n)` derivados de `Orbit.ui.today()/now()` (ancla real). 5 timestamps, 3 vencimientos (+7d), 1 próximo toque (+2d) y 12 fechas migrados.
- **Auditoría del ciclo (sin cambios necesarios, confirmado sólido)**: registro único `negocio` proyectado a ambos tableros; `setEtapa` con automatizaciones (nº cotización, cadencia al pasar a Propuesta); `decidirCierre` → reaparece en Ops (Inspección/Emisión); `emitir` crea cliente heredando datos + cadencia de encuestas; `solicitarGestion` desde ficha/portal → Ops asociada a cliente/póliza (tipo seleccionable + crear nuevo + adjuntos + nota); listas editables/reordenables por tablero; sync en vivo (`orbit:ciclo`). **Rol Asesor NO ve Ops** (excluido en `ROLES.Asesor.modulos`; ve su trabajo por Leads) — verificado.
- Verificado por camino real: gestión y cliente creados hoy (2026-07-03), bitácora con hora real; 0 errores.
- Cache-bust: `ciclo.js` → `?v1294`.
- Archivos: `core/ciclo.js`, `index.html`.


## v1.96 — 2026-07-03 · Finanzas CxC unificado (incluye facturas de comisión emitidas)
- **Inconsistencia corregida**: desde v1.89 las facturas de comisión viven en la colección `facturas` (fuera de `finmovs`), así que **no contaban** en el KPI/tab "Por cobrar (CxC)" — solo aparecían en su tabla aparte de Liq. empresa. Ahora el tab **CxC/CxP** suma las facturas `por_cobrar` al **KPI "Por cobrar"** (monto + nº de partidas), las lista en la tarjeta **Cuentas por cobrar** (fila 🧾 con nº y nº de comisiones) y las incluye en el **drill** de CxC.
- **Interacción coherente**: clic en fila de factura → **ver documento** (`verFactura`); clic en fila de movimiento → editar / cambiar estado (como antes). Moneda respetada por país (`norm`).
- Verificado por camino real: emitir factura → aparece en CxC con su número, la fila abre el visor; 0 errores.
- Cache-bust: `finanzas.js` → `?v1294`.
- Archivos: `modules/finanzas.js`, `index.html`.


## v1.95 — 2026-07-03 · Facturas CxC: ver / reimprimir factura emitida
- **Nuevo `verFactura(facId)`**: reabre una factura ya emitida como **documento de solo lectura** reconstruido desde el store (emisor, facturar-a, base/IVA/total, estado, y — si cobrada — banco/ref/fecha del cobro), con **Imprimir / PDF**. Antes solo se podía imprimir en el momento de emitir; ahora se reimprime/reenvía cuando haga falta.
- Botón **🖨 Ver** añadido en cada fila de la tabla de facturas de comisión (CxC), junto a Registrar cobro / Anular.
- Verificado por camino real: emitir → 🖨 Ver abre el documento con número/total/impresión; 0 errores.
- Cache-bust: `finanzas.js` → `?v1293`.
- Archivos: `modules/finanzas.js`, `index.html`.


## v1.94 — 2026-07-03 · Cierre P0 paquete V188 (CHANGELOG alineado + limpieza)
- **P0.1 — `CHANGELOG.md` realineado**: estaba en [1.55.0] mientras la bitácora iba en v1.93. Añadida **entrada consolidada [1.93.0]** que cubre v1.56→v1.93 agrupada por área (Contabilidad/Finanzas, Arquitectura, Módulos), remitiendo a la bitácora para el detalle.
- **P0.7 — sin duplicados**: verificado (sin `.bak/.old/.tmp`, sin `index-copy/dev`, sin `orbit360-platform` anidado). Eliminado artefacto suelto `.verify-academia.png`.
- **Estado P0 V188**: P0.1 ✅ · P0.2 ✅ (regla recaudo≠finmov) · P0.3 ✅ (factura CxC + trazabilidad v1.92) · P0.4 ✅ (sin localStorage en módulos) · P0.5 ✅ (seed + identidad ficticia v1.93) · P0.6 ✅ (sin notas técnicas en UI) · P0.7 ✅.
- Archivos: `CHANGELOG.md`, `docs/BITACORA-CAMBIOS.md`.


## v1.93 — 2026-07-03 · P0.5 identidad de sesión ficticia (sin nombres reales en el chrome)
- **"Paula Osorio" seguía hardcodeado** como usuario logueado en el chrome: `index.html` (topbar `<b>Paula Osorio</b>` + avatar "PO", estáticos — nada los sobrescribía) y `core/auth.js` (nombre por defecto del login, 2 ocurrencias). El seed ya se había saneado (v1.89 → "Valeria Morán"), pero la **identidad de sesión** no.
- **Reemplazado por director ficticio**: **"Andrea Beltrán"** · avatar "AB" · Dirección. Distinto del asesor demo (Valeria Morán) para no confundir roles. Migración suave: si la sesión persistida traía el nombre viejo, se actualiza al ficticio.
- Verificado en vivo: topbar "Andrea Beltrán"/"AB", 0 ocurrencias de "Paula" en el render, 0 errores. Sin notas técnicas (Firebase/Firestore/LAB) visibles en módulos.
- Cache-bust: `auth.js` → `?v1292`.
- Archivos: `index.html`, `core/auth.js`.


## v1.92 — 2026-07-03 · P0.3 factura de comisión: trazabilidad (enlace planilla + respaldo bancario)
- **Enlace factura ↔ comisiones (planilla/statement)**: al emitir, `facturaAseg()` guarda `comisionIds[]` — snapshot de las comisiones devengadas (no liquidadas) de esa aseguradora que la factura factura. La tabla de CxC muestra **"cubre N com."** bajo el número. Da trazabilidad: qué líneas de comisión respalda cada factura (sin entidad `statements` persistida, el set de comisiones ES la planilla).
- **Enlace factura ↔ banco (respaldo del cobro)**: `facturaAccion(id,'cobrar')` ahora abre un modal (`cobrarFacturaModal`) que captura **banco/cuenta**, **referencia/N.º de depósito** y **fecha de cobro**. Se guardan en la factura (`cobro:{banco,ref,fecha}`) y en el `finmov` `recaudado` (`banco`, `refBanco`); el `finmov` deriva su periodo de la **fecha de cobro** (base caja). La tabla de CxC muestra banco·ref bajo el badge "cobrada". La bitácora de la factura registra el ref.
- **Regla intacta**: emitir factura = CxC sin `finmov`; el `finmov` (dinero real) solo nace al cobrar; anular revierte el `finmov`. Verificado por camino real (emit→por_cobrar, comisionIds=2, cobro con banco/ref→`finmov` recaudado con `refBanco`, moneda sin mezclar), 0 errores.
- Cache-bust: `finanzas.js` → `?v1292`.
- Archivos: `modules/finanzas.js`, `index.html`.


## v1.91 — 2026-07-03 · P1-08 modelo de comisión de asesor unificado (Finanzas ↔ comeng)
- **`comisionAsesor()` en Finanzas** usaba una fórmula simple (`a.comPct × baseRecaudada / 100`) que **contradecía el motor** `Orbit.comeng`. Ahora calcula con **`comeng.comVendedorDe(comisiónAseg, baseNeta, asesorId)`** por cada cuota, respetando el **modo del asesor**: `comision` (% sobre la comisión de la aseguradora), `neta` (% sobre prima neta recaudada) o `fijo` (monto), más su `shareCom`. Un solo modelo entre Equipo/Configuración, el core y Finanzas.
- Verificado en vivo (v1.291): ase003 (modo `neta` 10%) → a pagar = 10% de la base neta recaudada (coincide con `comeng`), la pestaña Liq. asesores renderiza (5.6k chars), 0 errores. La tabla ahora expone `modo` además del %.
- Archivos: `modules/finanzas.js`, `index.html`.

## v1.90 — 2026-07-03 · P1-01 IA centralizada en Orbit.ia.complete
- **Punto único de llamada al modelo**: nuevo `Orbit.ia.complete(prompt, modulo)` + `Orbit.ia.disponible()` en `core/ia.js`. Es el ÚNICO sitio que invoca `window.claude.complete`; enruta al proveedor configurado (por módulo o global vía `proveedorDe`) y devuelve `null` si no hay motor → cada módulo aplica su fallback local.
- **Módulos migrados** (ya no llaman `window.claude.complete` directo): `core/importa.js` (aiExtract), `modules/marketing.js` (generar mes + copy con IA), `modules/academia.js` (iaText/iaQuiz/iaQuizFromDoc + crear curso con IA), `modules/configuracion.js` (auto-branding por manual). Total ~10 llamadas + guards centralizados.
- Verificado en vivo (v1.290): `Orbit.ia.complete('test')` devuelve respuesta del modelo sin recursión, `disponible()=true`, y marketing/academia/configuracion/importar montan sin errores. (Se corrigió una recursión que el reemplazo masivo introdujo momentáneamente en el propio wrapper.)
- Para migración: el backend solo cambia el interior de `Orbit.ia.complete` para enrutar a Gemini/OpenAI/Claude según `cfg`; los módulos no se tocan.
- Archivos: `core/ia.js`, `core/importa.js`, `modules/marketing.js`, `modules/academia.js`, `modules/configuracion.js`, `index.html`.

## v1.89 — 2026-07-03 · P0/P1 de la auditoría ChatGPT v1287 (contabilidad, seed, localStorage)
- **P0-01 + P1-02 — Factura a aseguradora = CxC, NO caja hasta cobro**: `facturaAseg()` ya no crea `finmov` al emitir. Emite a la colección `facturas` con estado `por_cobrar`, número **secuencial por año** (`FAC-AAAA-####`, no aleatorio), e **idempotente por aseguradora+periodo** (no duplica). El `finmov` real (ingreso `recaudado`) se crea **solo al pulsar "💵 Registrar cobro"** en la nueva lista de facturas (Liq. empresa), con acciones cobrar/anular y bitácora. Verificado en vivo: emitir no crea finmov, idempotente, cobrar sí crea finmov.
- **P0-02 — Sin `localStorage` ejecutable en módulos**: los botones inline de subir/quitar logo en `configuracion.js` usaban `localStorage.setItem/removeItem`; ahora usan `Orbit.store.setPref('logo', …)` + `Orbit.tenant`. Grep confirma 0 `localStorage.setItem/removeItem` en el módulo.
- **P0-04 — Seed sin nombres reales**: `Paula Osorio` (asesor demo `ase001` + autor de novedad) → **`Valeria Morán`** (ficticio comercial). 2 reemplazos. NIT/DPI/cédula se mantienen como tipos documentales ficticios. `seed.__v` → 36.
- **P1-04 — `agregarPais` con dedupe**: si el código de país ya existe, **actualiza** (país + `tenant.paisesCfg`); si no, inserta. Antes hacía `push` ciego (duplicaba). Toast diferenciado agregar/actualizar.
- Verificado en vivo (v1.289): ase001='Valeria Morán', sin Paula, sin localStorage ejecutable, dedupe OK. 0 errores.
- **NO tocado** (respetando separación de la auditoría): backend LAB, `Orbit.store` API, Auth/Firestore/reglas. Sin datos reales nuevos. Sin `localStorage` ejecutable nuevo.
- Archivos: `modules/finanzas.js`, `modules/configuracion.js`, `data/seed.js`, `index.html`.

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
