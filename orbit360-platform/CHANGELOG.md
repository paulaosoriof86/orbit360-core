# Changelog · Orbit 360 Plataforma

Formato basado en *Keep a Changelog*. Construcción greenfield, commits directos a `main`.

## [1.93.0] — 2026-07-03 · Consolidado v1.56–v1.93 (auditorías P0/P1 + profundización de módulos)
> Entrada consolidada para realinear el CHANGELOG con la bitácora viva (`docs/BITACORA-CAMBIOS.md`), que tiene el detalle versión por versión.

### Contabilidad y Finanzas
- **Regla contable recaudo ≠ `finmov`** (v1.83): el pago de póliza del cliente es recaudo comercial, no movimiento de caja; se revirtió el `postRecaudo`→finmovs.
- **Factura a aseguradora = CxC, no caja** (v1.86, v1.89, v1.92): la factura de comisiones se emite a la colección `facturas` (estado `por_cobrar`), con número **secuencial**, idempotencia por aseguradora+periodo, anulación/reversión y bitácora. El `finmov` (ingreso real) solo nace al **cobrar**. v1.92 añadió trazabilidad: enlace a las **comisiones** que factura (`comisionIds`) y **respaldo bancario** (banco/referencia/fecha) en el cobro.
- **Conciliación de planillas/statements de comisión** (v1.84): compara esperado (tarifas vigentes) vs registrado; detecta drift.
- **Finanzas profundo** (v1.80–v1.82): dashboard analítico, metas real vs ideal, presupuesto con fecha de pago, insights de concentración por aseguradora.
- **Config fiscal multi-tenant** (v1.87): `tenant.paisesCfg` como fuente única de IVA/moneda/gastos por país. Moneda por país sin mezclar (v1.62).
- **Modelo de comisión de asesor unificado** con `Orbit.comeng` (v1.91).

### Arquitectura y saneamiento
- **Sin `localStorage` directo en módulos** (v1.61, v1.89): capa `pref/setPref`; logo white-label vía `Orbit.tenant`. 
- **IA centralizada** en `Orbit.ia.complete` (v1.90): punto único de llamada al modelo.
- **Fechas vivas** (v1.64, v1.75): el demo sigue la fecha real del sistema; sin literales quemados (v1.74).
- **Auditoría de salud de render 28/28** (v1.79) + limpieza de código muerto.
- **Seed 100% ficticio / identidad ficticia** (v1.89, v1.93): sin nombres reales (asesor demo "Valeria Morán"; usuario de sesión "Andrea Beltrán").

### Módulos (profundización §4)
- **Portal → Ops/Siniestro canónico** (v1.63, v1.76–v1.77); **notify** cliente por WhatsApp/correo (v1.65).
- **Importadores** con dry-run + dedupe visible (v1.66).
- Cancelaciones (v1.68), Marketing (v1.69), Siniestros (v1.70), Renovaciones (v1.71), Insights (v1.72, v1.82), Pólizas (v1.73), Historial/Reportes/Comisiones profundizados.
- **Academia**: visor unificado (v1.85) + cursos profundizados (v1.88).

## [1.55.0] — 2026-07-01 · Demo standalone + handoff regenerados
### Changed
- **`Orbit360-demo-standalone.html`** regenerado desde el estado actual (v1.54): incluye todos los módulos profundizados (Finanzas, Cobros, Metas, Plantillas, Reportes, Comisiones, Historial). Archivo único autocontenido para demo offline.
- **`docs/handoff-migracion-as.html`**: marcador de versión actualizado a v1.54.

## [1.54.0] — 2026-07-01 · Doc backend: ambientes + caché (P0 Codex)
### Added
- **`docs/BACKEND-AMBIENTES-Y-CACHE.md`**: guía para Codex sobre versionado de scripts (anti-caché), Service Worker seguro, y separación demo/LAB/producción con el adaptador `Orbit.store` (modo backend estricto sin fallback demo, validación de seed por IDs `lab_`, sin UI técnica al cliente). No modifica el prototipo.

## [1.53.0] — 2026-07-01 · Historial: KPIs funcionales + cierre de módulos delgados
### Added — Historial
- **KPIs clicables** (Interacciones / Llamadas / WhatsApp / Reuniones) que ahora **filtran el feed por tipo** (antes eran rutas muertas).
### Verified
- **Historial** ya profundo: filtros (búsqueda/tipo/asesor), feed agrupado por fecha, detalle correcto por interacción + enlace a expediente.
- **Cronograma** monta con vistas día/semana/mes.
- **Thin-by-design confirmado**: leads/ops/polizas/importar delegan su lógica en `core/ciclo.js`, `crmkit.js`, `importa.js` y fichas compartidas — no requieren inflado.

## [1.52.0] — 2026-07-01 · Comisiones: filtros + export + conciliación
### Added — Comisiones
- **Filtros** por año (2024/25/26) y estado (Liquidada / Por liquidar); la agregación por asesor/aseguradora/periodo respeta el filtro.
- **Export CSV** del set filtrado (periodo, cliente, póliza, asesor, aseguradora, base, %, comisión, estado).
- **Conciliación**: en el detalle, clic en el badge de estado alterna **Liquidada ↔ Devengada** (escribe al store); nº de póliza enlazado abre el detalle de la póliza.

## [1.51.0] — 2026-07-01 · Reportes: agrupación + periodo + programación real
### Added — Reportes
- **Agrupar por** cualquier columna (general→particular): genera una **tabla resumen** con conteo por grupo + suma (Σ) de las columnas monetarias, encima del detalle. Ej: producción por asesor / por aseguradora / por ramo.
- **Filtro de año** (2024/2025/2026) sobre los reportes con fecha.
- **Programación real** (antes era un alert): modal con frecuencia (diaria/semanal/mensual), destinatarios y formato (PDF/Excel/CSV); persiste en la colección `reportes_prog`, se lista en la barra lateral y se puede quitar.
### Preserved
- Export CSV / Excel / PDF y filtro por país siguen funcionando.

## [1.50.0] — 2026-07-01 · Plantillas profundizado + migrado al store
### Changed — Plantillas
- **Persistencia en `Orbit.store('plantillas')`** (antes localStorage propio — ahora respeta la capa de datos única; el backend hereda la colección). Migra automáticamente cualquier plantilla del localStorage viejo.
### Added — Plantillas
- **Editor completo** (drawer): emoji, nombre, canal (WhatsApp/Correo/Ambos/PDF), categoría, asunto (correo/PDF) y mensaje, con **9 chips de variables insertables** en el cursor.
- **CRUD**: crear, editar, **duplicar** y eliminar.
- **KPIs clicables** (total/WhatsApp/correo/PDF) que filtran por canal + buscador + filtros por canal/categoría.
- **"Usar"**: elige un cliente real, **resuelve las variables** ({nombre}/{poliza}/{monto}/{vence}/{ramo}/{aseguradora}/{asesor}/{placa}) con datos del store, y enruta a **WhatsApp** (wa.me con teléfono del cliente) o **Redactar correo** (abre el compositor de Correo con asunto+cuerpo+cliente prellenados) o copiar.

## [1.49.0] — 2026-07-01 · Contrato de datos + docs de migración (backend P0)
### Added
- **`Orbit.store._emit(collection)` público** — antes privado; permite a la capa backend emitir eventos de cambio manualmente. API pública confirmada: `all, get, where, find, insert, update, remove, on, _emit, init, reseed, raw`.
- **Docs nuevos para el LAB backend** (solicitados por el doc de pendientes 2026-07-01): `MEJORAS-DETECTADAS.md` (contrato de datos + colecciones + mejoras a preservar), `BITACORA-ERRORES.md` (E-01..E-04 resueltos + plantilla), `BITACORA-CAMBIOS.md` (v1.42→v1.49), `REPORTE-SMOKE.md` (flujos críticos verificados).

## [1.48.0] — 2026-07-01 · Calidad de datos: edición inline
### Added — Calidad
- **✏ Completar inline**: cada cliente incompleto abre solo sus campos faltantes; al guardar sale de la lista (re-render) con toast de conteo restante.

## [1.47.0] — 2026-07-01 · Cotizador marca→línea→modelo (3er nivel)
### Added — Cotizador
- **3er nivel de vehículo**: además de marca→línea, ahora hay **Modelo / Versión** (`VEH_MODELOS` con versiones específicas por línea popular + fallback de trims genéricos, editable en migración). Al cambiar marca se reinicia línea+modelo; al cambiar línea se recargan los modelos. Paridad con el Comparativo, que ya tenía los 3 niveles (incluido en su PDF).

## [1.46.0] — 2026-07-01 · Metas inteligentes en Insights
### Added — Insights
- **Metas autoadministrables**: la vista Metas lee la colección editable `metas` del mes seleccionado (empresa: prima/recaudo/nueva/renovada) con fallback al split por asesor. La nota indica si la meta viene de la colección o de la base.
- **✨ Sugerir metas del próximo mes**: botón que calcula metas por tendencia (promedio de los últimos 3 meses +10 %), permite ajustarlas y las guarda en la colección `metas` (upsert por mes/tipo) — quedan editables luego en Equipo.
### Verified
- **Comparativo general→particular** funciona en vivo: segmentos general/asesor/ramo/aseguradora (4), drill por mes (12 filas) y drill por fila del criterio, todos clicables con desglose de pólizas.

## [1.45.0] — 2026-07-01 · Navegación cruzada en Cobros
### Added — Cobros
- **Quick "💳 Pagar" en la tabla**: cada recibo pendiente/vencido tiene botón para aplicar el pago directo desde el listado, sin abrir la ficha del recibo (`aplicarPago` extraído a función reutilizable, exportada).
- **Navegación cruzada por fila**: el número de póliza es un enlace que abre el detalle de la póliza; el nombre del cliente ya abría su ficha. El drawer del recibo ahora tiene botones **👤 Ver cliente** y **📑 Ver póliza**.
### Fixed
- **Bug: la tabla no se refrescaba tras aplicar un pago** — el flujo re-renderizaba `mod-host` (inexistente) en vez de `host`. Corregido; el recibo pasa a Pagado/Conciliado y la lista se actualiza en el acto.

## [1.44.0] — 2026-07-01 · Finanzas profundo (audit P0 §2.5)
### Added — Finanzas
- **KPIs clicables con desglose**: en Movimientos, CxC/CxP y Presupuesto, clic en cada KPI abre un modal (`drillKey`) con los registros que lo componen; cada fila abre el movimiento para ver/editar.
- **CxC/CxP con detalle completo**: las filas ahora abren el drawer de movimiento (ver/editar/eliminar/cambiar estado + adjuntar); el badge de estado sigue permitiendo cambio rápido con un clic. El desglose aclara que las partidas pendientes **arrastran mes a mes** (se listan de todos los periodos).
- **Presupuesto editable**: `+ Partida`, editar/eliminar por fila y **Replicar mes anterior** (`editarPresup`/`replicarPresup`), leyendo/escribiendo la colección `presupuesto` del store (se eliminó la lectura de arrays quemados).
### Fixed
- El presupuesto ejecutado ahora normaliza moneda (`norm`) al sumar egresos.

## [1.43.0] — 2026-07-01 · Fecha dinámica + logo en login + inicio del audit funcional
### Fixed — Login white-label
- La franja del logo del cliente ahora es **cintilla blanca a sangre** separada del bloque oscuro por línea roja (3px); el logo resalta sobre blanco.
- `Orbit.applyBrand()` se invoca también en `auth.showLogin()` → el logo/nombre del cliente aparecen **en la pantalla de login** (antes solo tras entrar).
### Changed — Fecha dinámica (audit P0 §2.1/2.2/2.3)
- `core/ui.js`: la fecha deja de estar quemada. `Orbit.ui.now()/monthLabel()/monthKey()/monthProgressPct()` derivan de un **ancla configurable** (`Orbit.tenant.demoDate`); el backend pasa a fecha real con `demoDate='real'` sin tocar módulos.
- `modules/inicio.js`: etiqueta de mes dinámica (no "Junio 2026" quemado); metas leen la colección autoadministrable `metas` (fallback demo); días del mes calculados por mes real.
- `core/novedades.js`: fecha del modal de bienvenida dinámica.
### Note
- Recibida `AUDITORIA-FUNCIONAL-CLAUDE-20260630.md` (ChatGPT/Paula). Es un roadmap de profundización P0/P1 multi-sesión; ver `docs/PENDIENTES-Y-MEJORAS.md`.

## [1.41.0] — 2026-06-30 · Login limpio + doc de pendientes para migración
### Changed — Login
- Quitado el badge superior "PLATAFORMA SEGURA · ACCESO DEL EQUIPO".
- Quitado el texto "Tu logo aquí · white-label" del footer; el slot del logo del cliente queda **centrado**.
- En la versión comercializable el slot va vacío; el cliente carga su logo en Configuración.
### Added
- `docs/PENDIENTES-Y-MEJORAS.md` — estado honesto (listo vs requiere backend vs profundización), reglas de trabajo para ChatGPT y orden de migración. Adjuntar como fuente del proyecto.

## [0.23.0] — 2026-06-23 · Fixes de navegación
### Fixed
- **Correo** ahora aparece en el menú (faltaba `'correo'` en `tenant.modulosActivos`; el sidebar filtra por esa lista).
- **Orbit Aseguradoras** movido al grupo **Operación** (uso frecuente), antes estaba en "Gestión y recursos".

## [0.22.0] — 2026-06-23 · Integración de Correo (Outlook/Gmail) — transversal
### Added — `core/correo.js` (capa transversal)
- Bandeja sobre el store (`correos`, seed `__v=15`), vínculo de correos a entidades (cliente/póliza/cobro/gestión/aseguradora), `enviar`, `vincular`, `marcarLeido`, `destacar`, `noLeidos`, y conector configurable (`conectar`/`desconectar`, persistente).
### Added — `modules/correo.js` (bandeja, menú Comunicación)
- Carpetas Recibidos/Enviados/Destacados, lista + lector, **redactar**, **vincular a cliente**, abrir entidad vinculada, badge de no leídos, banner "Conectar Outlook/Gmail" (modo demo → real al personalizar).
### Added — Ficha de cliente
- Nueva pestaña **Correos**: hilos vinculados al cliente + redactar contextual; helper `reabrir(cid, tab)`.

## [0.21.0] — 2026-06-23 · Módulo Equipo y permisos + Finanzas con emojis/lote
### Added — `modules/equipo.js`
- **Usuarios**: equipo del intermediario con rol, estado, color, metas; alta/edición de usuario en drawer.
- **Permisos**: matriz **rol × módulo** (Ver / Editar) persistente, con valores por defecto según nivel de rol y botón de restablecer.
- **Comisiones**: esquema por asesor (% de la comisión / % de prima neta / monto fijo) — reutiliza `Orbit.comeng`; las tarifas por aseguradora siguen en Comisiones › Tarifas.
- **Metas**: por asesor, **mes** y **tipo** (nueva vs renovada), sobre prima neta — guardadas en `Orbit.cat.metas` como **fuente única** para Insights y Finanzas (`equipo.metaDe()`).
- Ruta `equipo` activada (beta) y registrada en `index.html`.
### Changed — Finanzas
- Tabs con **emojis** (formato del resto) y scrollables; **liquidaciones con "Preparar lote"** (detalle + total en vivo, retirar partidas, incluir CxP de meses anteriores).

## [0.19.0] — 2026-06-23 · Orbit Finanzas dinámico (datos ficticios, en vivo)
### Added — Modelo de datos financiero (seed `__v=14`, **ficticio**, "Demo Corredores")
- Colecciones `finmovs` (movimientos por mes y país, 16 meses Mar-25→Jun-26), `acreedores` (deuda) y `presupuesto`.
- Ingresos: Comisiones aseguradora, Incentivos, **Financiación (aparte)**, Otros. Egresos: Comisiones asesores, Gastos fijos, Marketing, Operación, Devolución de préstamo. Estados ingreso (esperado/facturado/recaudado) y egreso (pendiente/pagado).
### Added — Módulo Finanzas reconstruido (lee datos reales del store, en vivo)
- **Selector de país + mes** (igual que Insights). Tabs **scrollables** (ya no se desbordan).
- **Movimientos**: tabla real del periodo; clic en fila **cambia el estado** (recaudado/pagado ↔ pendiente) en vivo.
- **CxC / CxP**: cuentas por cobrar (ingresos esperados/facturados) y por pagar (egresos pendientes), con posición neta; estados editables al clic.
- **Financiación**: ingreso NO operativo separado + **control de deuda por acreedor** (sube con financiación, baja con devoluciones).
- **Presupuesto vs real** con **semáforos** (verde/ámbar/rojo) y % de ejecución por categoría.
- **Dashboard**: comparativo **interanual** e **intermensual** real (ingresos/egresos/utilidad) con barras de marca.
- **✨ Análisis IA**: diagnóstico del periodo + metas sugeridas + estrategias (medios/segmentación/comercial) — listo para conectar Gemini.
- **Conservadas** Liquidación empresa, Liquidación asesores y Conciliación bancaria (no se eliminó nada de lo que ya servía).

## [0.18.0] — 2026-06-22 · Insights interactivo (selectores + comparativo por concepto)
### Added / Fixed — Orbit Insights
- **Selector de país** y **selector de mes** funcionales en las analíticas (acumulado Ene→mes); país se sincroniza con la barra superior.
- **Metas**: KPIs mensuales + acumulados (mes seleccionable); **arreglada** la tarjeta "nuevas vs renovadas por ramo" (antes mostraba solo ramos; ahora compara **nuevas vs renovadas** con barras duales). Producción mensual nuevas vs renovadas. Nota: las metas se asignan en **Equipo y permisos / Configuración**.
- **Comparativo por concepto**: control segmentado **General · Por asesor · Por ramo · Por aseguradora** (interanual 2025 vs 2026, var% y tendencia, de lo general a lo particular) + comparativo mensual y **intermensual**.
- **Top clientes** clasificable: por **volumen de prima**, **cantidad de pólizas**, **clientes nuevos**, **clientes antiguos**; columnas con asesor y badge de nuevo; distribución de cartera de clientes por **ramo** y **aseguradora**.

## [0.17.0] — 2026-06-22 · Insights profundo + correcciones de póliza
### Added — Orbit Insights v2 (analítica profunda, KPIs clicables)
- **9 vistas**: Resumen · **Metas (nuevas vs renovadas)** · Producción · Cartera · **Comparativo** · **Top clientes** · Pipeline · Renovaciones · **Análisis crítico**.
- **KPIs clicables (⤢)**: cada indicador abre un **drawer de detalle** con los registros que lo componen (pólizas, recibos, clientes), clicables a su vez.
- **Producción nueva vs renovada** con **metas separadas** y % de cumplimiento (clasifica por contador de renovaciones).
- **Comparativo interanual** (2025 vs 2026, mismos meses, barras duales + tabla por aseguradora con var % y tendencia) e **intermensual**.
- **Top clientes** con **modal de detalle** (KPIs del cliente + pólizas + acceso al expediente); concentración top-10, ticket promedio.
- **Análisis crítico**: alertas automáticas (caída de PN, tasa de cancelación, recaudo, vencimientos) + **recomendaciones por área**; composición de cartera y producción mensual.
- Tabla **asesor × aseguradora**. Todo sobre **prima neta**, normalizado a base GTQ, respeta país, en vivo.
### Fixed / Changed — Póliza
- **Subramos por país CORREGIDOS** (GT/CO): vehículo liviano/pesado/grúa/RC/pérdidas totales/parciales/por km, tipos de fianza, GM individual/familiar, CO todo riesgo/cumplimiento/multirriesgo/salud ind-fam, etc.
- **Editar póliza**: cambiar el **asesor que comercializó** (independiente del asesor del cliente); **recargo financiero** por **%** (auto) **o valor** directo (para importación); **concepto automático** por patrón (Ramo · Subramo · Tipo); al cambiar **forma de pago/frecuencia** se **regeneran los recibos pendientes** (preservando los pagados).

## [0.15.0] — 2026-06-22 · Reconstrucción de la ficha de póliza (lo perdido en el undo) + ramos por país
> El *undo* de una sesión previa había revertido estas mejoras; se reconstruyen y se confirma su estado en el plan (R7.6 checklist consolidado).
### Added — Catálogos ramos/subramos por país (`Orbit.cat`)
- `ramosPais` GT/CO con lenguaje local + API `ramosDe(pais)` / `subramosDe(pais, ramo)` / `addRamo` / `addSubramo`. Transversal (lo usa también el importador de planillas).
### Added — Ficha de póliza administrable
- **Editar póliza**: ramo/subramo **por país** (con "➕ Otro"), datos, vigencia, pago, **renovable**, suma; **auto-cálculo** de gastos de expedición (GT 5%) + IVA (modificable) con resumen de desglose en vivo.
- **Qué cubre**: vehículo (con enlace a **Ver detalle del vehículo**) o inmueble/grupo/contrato según ramo.
- **Historial y endosos**: registrar endoso/sustitución/cambio de propietario/beneficiario (manual·importar·inteligente) → historial de la póliza + actividad del cliente.
- **Ver detalle de vehículo** desde la póliza, con acción de sustitución por endoso.
### Added — Cancelaciones con detalle (`detalle`)
- Drawer con **tiempo activa** (días/meses), valor perdido, **comisión generada** (derivada en vivo), aseguradora, asesor, motivo, fechas y **acción de recuperación** editable + nota.
### Docs
- **R7.6**: checklist consolidado de TODAS las observaciones de la ficha de póliza con estado real ítem por ítem (lo hecho y lo pendiente: Drive aseguradora/formularios, gestión documental, importador que cruza sin duplicar, siniestros, nuevas vs renovadas).

## [0.14.0] — 2026-06-22 · Inicio aligerado + comisión por asesor flexible (Ronda 7 1/n)
### Changed — Inicio (visual)
- El panel **"Metas del mes"** pasa de gradiente oscuro a **card claro** con acento rojo superior; los dials se adaptan a fondo claro. Elimina la sobrecarga de dos paneles oscuros consecutivos (título + metas).
### Added — Comisión del vendedor por asesor (modelo flexible)
- `core/comisiones-eng.js`: cada asesor puede tener **modelo distinto** — `comModo`: **% de la comisión** de la aseguradora · **% de prima neta** · **monto fijo** (`comValor`). `calc`/`calcSobre` lo respetan.
- **Tarifas de comisión** (módulo Comisiones): por asesor se elige el **modelo** (selector) y su valor (% o Q fijo). Seed demo: L. Herrera = % de prima neta, A. Lemus = monto fijo.
- Seed `__v=13` con `comModo`/`comValor` por asesor.
### Docs — RONDA 7 (plan)
- Registrada completa y priorizada: A&S como primer cliente; comisión por asesor; comisiones visibles al asesor en ficha; **KPIs clicables en todas las secciones**; **Insights profundo** (Metas, Cumplimiento, Recaudo, Cartera, Devengado, Top clientes con modal, Vencidas, Análisis crítico; **nuevas vs renovadas con metas**; comparativos **interanual/intermensual** por aseguradora/producto/ramo/asesor); ficha de póliza pendientes; **Automatizaciones (Make) + herramientas creativas**; **Academia** (bloques de capacitación); **Correo (Outlook)** transversal; **Siniestros/reclamos** + importador; **Finanzas** y **Marketing**.

## [0.13.0] — 2026-06-22 · Motor de comisiones + aplicar pago con factura
### Added — `core/comisiones-eng.js` (motor de comisiones)
- **Comisión de la aseguradora**: % por **ramo** con override por **producto**, sobre **prima neta**. Tarifas viven en cada aseguradora (`comisiones`, `comisionesProd`, `comisionDefault`).
- **Comisión del vendedor**: **participación %** que asignamos a cada asesor (`shareCom`) sobre la comisión de la aseguradora; el resto es **comisión de la empresa**.
- API: `calc(poliza)`, `calcSobre(neta, poliza)`, `pctAseguradora`, `shareVendedor`, setters que persisten, y `aplicarPlanilla(filas)`.
- Seed `__v=12`: aseguradoras con matriz de % por ramo; asesores con `shareCom`. La generación de recibos/comisiones usa estas tarifas (consistencia total).
### Added — Tarifas de comisión (módulo Comisiones)
- Nueva vista **⚙ Tarifas**: matriz **editable** por aseguradora × ramo (+ overrides por producto) y **participación del vendedor** por asesor. Explica la fórmula de cálculo.
- Botón **⬇ Importar planilla**: la importación de planilla de comisiones **lee, por producto, cuánto paga cada aseguradora**, muestra las tarifas detectadas **editables** y al confirmar las **aplica al matriz** (sin duplicar).
### Added — Aplicar pago (Cliente 360 · Recibos)
- Modal de **aplicar pago**: **fecha de envío a gestión** (default hoy, editable), forma de pago, y **carga de factura** opcional que fija la **fecha real** en que pagó la aseguradora y **concilia** el recibo (medio adicional de conciliación). Distingue **Pagado** vs **Conciliado**. Deja rastro en el historial del cliente.

## [0.12.0] — 2026-06-22 · Ronda 5 (4/n): modelo de póliza + motor de primas/recibos
### Added — `core/primas.js` (motor de primas y recibos)
- **Desglose de prima** confirmado con pólizas reales: Prima Neta + Gastos de Expedición + Gastos Financieros (recargo por fraccionamiento, % sobre neta, solo si fraccionado) + Otros/asistencias = Base gravable; + **IVA** (configurable por país) = **Prima Total**. Validado con el ejemplo GT (Q17 752,15).
- **Generación de recibos por forma de pago**: Contado / Tarjeta de crédito / Visa Cuotas al contado → **1 recibo** (sin recargo); fraccionado (Mensual=12, Bimestral=6, Trimestral=4, Cuatrimestral=3, Semestral=2) → **N recibos** prorrateados con recargo, ajustando el residuo de redondeo en el último para cuadrar exacto. Cada recibo trae su propio desglose + comisión aseguradora/vendedor + fecha límite.
### Added — Tasas por país configurables
- `Orbit.PAISES` ahora define `iva` y `recargoFinanciero` por país (demo: **GT IVA 12% · CO IVA 19%**); `Orbit.paisCfg()` y `Orbit.primas.cfgPais()` los exponen. Pensado para fijarse al **dar de alta el país**.
### Changed — Seed `__v=11` (pólizas enriquecidas)
- Cada póliza incluye: primaNeta, gastosEmision, gastosFinan, otros, ivaPct/ivaMonto, recargoFinPct, baseGravable, prima(total), frecuencia, formaPago, conducto, tarjeta, tipoPoliza, subramo, concepto, **renovable** (~15% no renovables), multianual, contadorRenovaciones, comAseguradoraPct, comVendedorPct, vendidaPor.
- Los **cobros/recibos se generan desde el motor** (coinciden con el desglose); cada recibo guarda neta/gastos/g.finan/otros/iva + comisiones + fecha límite + conducto.
### Changed — Drawer de póliza (Cliente 360)
- Rediseñado: cabecera grafito, tags (estado, **Renovable/No renovable**, multianual, contador), datos clave, **conducto de pago**, **cuadro de desglose de prima**, y **cuadro de recibos** con columnas Neta/Gastos/G.Finan/Otros/IVA/Total + fila Total y fechas límite. Botón Renovar solo si la póliza es renovable.

## [0.11.0] — 2026-06-21 · Ronda 5 (3/n): Orbit Insights (analítica)
### Added — `modules/insights.js`
- **Orbit Insights**: módulo de analítica real con 5 vistas conmutables:
  - **Resumen**: KPIs (prima vigente, recaudado, por cobrar, comisión) + dona de prima por ramo + dona de estado de cartera + top aseguradoras + producción por canal.
  - **Producción**: avance por asesor vs meta (barras con %), prima por ramo, top productos.
  - **Cartera**: aging de vencido por tramos, saldo por forma de pago, recibos vencidos prioritarios (clicables al 360).
  - **Pipeline**: embudo comercial por etapa del ciclo, prima potencial/ponderada, tasa de conversión, pipeline por canal.
  - **Renovaciones**: prima a renovar por mes (6 meses), motivos de cancelación, renovaciones inminentes (clicables al detalle de póliza).
- **Micro-gráficos sin librerías** (barras, donas conic-gradient, embudo, barras de meta) con CSS propio.
- Respeta el **selector de país** y normaliza a base GTQ para comparación; se re-renderiza en vivo ante cambios del store/país/ciclo.
- Registrado en NAV (ya existía la ruta) + `MODULE_TITLES.insights` + script en `index.html`.
### Docs
- **PLAN**: agregado **CHECKLIST MAESTRO 1.0** explícito (todo el alcance, con estado ✅/🟡/⏳/🧩) para que ningún módulo quede fuera de vista; aclaración de cómo opera "Solicitud del cliente" hoy (proxy) vs en el Portal 1.0.

## [0.10.0] — 2026-06-21 · Ronda 5 (2/n): catálogos, listas editables, notificaciones, confidencialidad
### Added — Catálogos configurables (`Orbit.cat`)
- Catálogos persistentes y editables: **canales** (redes sociales, conocido, referido, cliente actual/antiguo, web…), **ramos**, **productos**, **prioridades**, **tipos de gestión**. Todo desplegable para alimentar analítica.
- **Opción "➕ Otro…"** en los desplegables del ciclo: al elegirla se agrega el valor al catálogo (persistente).
### Added — Listas de Ops y Leads EDITABLES
- Botón **⚙ Listas** en ambos tableros → **crear, renombrar, recolorear, reordenar y eliminar** listas. Las del ciclo (atadas a etapa) se editan pero no se eliminan; al renombrar una lista de gestiones se migran sus tarjetas. Listas personalizadas de Leads aceptan negocios vía selector "Columna en Leads".
### Added — Notificaciones (WhatsApp / correo) + Portal del cliente
- `Orbit.ciclo.notify()`: al **solicitar** una gestión (equipo o cliente) y al **resolverla** se notifica al asesor con **toast + enlaces a WhatsApp y correo**; queda registro en `avisos`.
- **Solicitud del cliente** (🙋): crea la gestión en Ops con origen "Solicitud del cliente" y notifica.
- **Adjuntos de soporte** en Solicitar gestión (drag&drop; se listan en la ficha).
### Added — Mi Día · seguimientos manuales
- Sección **"Seguimientos de hoy"** en Inicio: negocios sin cadencia con toque vencido/hoy y botón directo a **WhatsApp** (o correo).
### Changed
- **Cadencias** = seguimiento por **WhatsApp** y, en su ausencia, **correo** (no llamadas por defecto).
- **Ficha de gestión**: **Responsable** (por defecto asesor, seleccionable); **Nota debajo del checklist**; tipo/estado con "Otro".
- **País con bandera** en tarjetas + seleccionable.
- **Ficha del cliente**: se quitó "Importar estado de cuenta"; **pólizas y vehículos abren detalle** (drawer + renovar/comparar/solicitar gestión).
- **CRM**: filas de **Pólizas, Cobros y Cancelaciones** abren detalle.
### Added — Seguridad
- **Acuerdo de confidencialidad** obligatorio en el primer ingreso (aceptar + se almacena fecha/usuario).

## [0.9.0] — 2026-06-21 · Ronda 5 (1/n): Ops+Leads ciclo completo, multi-rol, solicitar gestión
### Added — Motor del ciclo comercial (`core/ciclo.js`)
- **Modelo unificado `negocios`**: una sola oportunidad se **proyecta en dos tableros** (Ops equipo / Leads asesor) según su **etapa canónica** (nuevo → contactado → cotizando → propuesta → negociación → inspección → emisión → emitido). **Sincronización en vivo**: cambiar la etapa en cualquier lado se refleja al instante en el otro (misma fuente de datos + listeners).
- **Automatizaciones**: al **enviar propuesta** se activa la **cadencia** de seguimiento; al cotizar se genera N.º de cotización; al **emitir** se **crea el cliente** heredando datos + se activa **cadencia de encuestas de satisfacción**.
- **Cierre con decisión** (Inspección o Emisión) → **reaparece en Ops sin salir de Leads** (listas espejo Inspección/Emisión en Leads, solo lectura para el asesor).
- **Bitácora estructurada** + **comentarios** + **checklist** por negocio y por gestión.
### Changed — Orbit Ops (`modules/ops.js`) y Orbit Leads (`modules/leads.js`) — rediseño
- **Listas con emoji + color** por columna (cabecera `.kcol-h2`). Ops = tablero **interno** (Cotizaciones/Inspecciones/Emisiones del ciclo + Gestiones Admin + Renov./Modif.). Leads = **vista del asesor** con listas espejo y subtotales.
- Tarjetas clickeables a **ficha rediseñada** (drawer con **stepper de etapas**, datos editables, indicador de **sincronización** Ops↔Leads, cadencia, bitácora, acciones de etapa contextuales).
- Ambos tableros **re-renderizan en vivo** ante cualquier cambio del ciclo.
### Added — Multi-rol "ver como" (`Orbit.session`)
- Selector de **rol activo** en la topbar. Con rol **Asesor** se **oculta Orbit Ops** (interno) y se filtra el pipeline a sus negocios; ve las etapas operativas vía Leads. El router respeta `session.canSee()`.
### Added — Solicitar gestión desde la ficha del cliente
- Botón **🗂 Gestión** en la ficha (y por póliza en Renovaciones): elige **tipo** (con opción de **crear otro**), nota y póliza → crea la gestión en **Orbit Ops** en la lista correcta, asociada al cliente/póliza, con bitácora y checklist. Deja rastro en el historial del cliente.
### Fixed — UI
- **Tabs de la ficha** ahora con **indicador "hay más"** (degradado + flecha que aparece al desbordar y desplaza; lleva la pestaña activa a la vista).
- **Quitadas notas técnicas** visibles (login "DEMO", pie del sidebar, "capa de datos/localStorage", referencias de build, confirmaciones "(demo)").
- Seed `__v=10`: colección `negocios` (14) + `gestiones` admin/renov (9); se retira `leads` legacy.

## [0.8.0] — 2026-06-21 · Ops + Leads, Finanzas avanzada, Novedades, Renovación IA
### Added — Ops + Leads (`modules/ops.js`, `modules/leads.js`)
- **Orbit Ops**: kanban operativo (Gestiones Admin, Cotizaciones, Inspecciones, Emisiones, Renovaciones/Modif.), **sin prospectos**, listas personalizables, tarjetas clickeables, enlace a Leads.
- **Orbit Leads**: pipeline por etapa con **probabilidad**, **cadencias** y pronóstico ponderado; convierte a cliente.
- Seed: colecciones `leads`, `gestiones`, `novedades` (`__v=9`).
### Added — Finanzas avanzada
- **Dashboard**: comparativo intermensual e interanual, salud financiera, fijar metas desde datos.
- **Presupuesto**: ingresos (comisiones + financiamiento) y egresos (comisiones + gastos fijos + operación), ppto vs real.
- **Metas**: por asesor/empresa/aseguradora, mensual/anual, sobre **prima NETA**; deriva recaudo.
- **Producción neta** con **ajuste por no devengado** (cancelaciones).
- **Liquidación asesores**: el asesor ve **solo su** liquidación; pagos cruzables/ajustables.
### Added — Novedades / Incentivos (`core/novedades.js`)
- Tablón con **contador** de no leídas (campana), **modal grande al ingresar** (1/día), publicación por todo el equipo.
### Added — Renovación inteligente (Cliente 360)
- **Renovar** modificando N.º de póliza, **aseguradora**, prima, producto (renovación con otra aseguradora).
- **Comparativo IA**: renovación vs actual con análisis crítico y recomendación; cargar propuesta y enviar al cliente.

## [0.7.0] — 2026-06-21 · Finanzas + Calidad de datos + Plantillas
### Added — Orbit Finanzas (`modules/finanzas.js`, `#/finanzas`)
- **Movimientos**: KPIs (recaudo, comisión a cobrar, a pagar asesores, vencida), tabla, importar histórico, generar cierre mensual.
- **Liquidación empresa**: comisión a **cobrar a cada aseguradora** (prima neta recaudada), conciliable contra planilla.
- **Liquidación asesores**: % fijo/variable por asesor sobre **prima neta recaudada** (no sobre venta); a pagar / pendiente / liquidar.
- **Conciliación bancaria**: doble conciliación (depósito↔recaudo y pago↔póliza); importar estado bancario.
### Added — Importación
- KIND **`estados-banco`** (estado de cuenta bancario, cualquier formato) con detección.
- **Planillas de comisiones** ahora con detección: pagos no aplicados y validación de liquidación por asesor.
### Added — Calidad de datos (`modules/calidad.js`, `#/calidad`)
- Reporte de **expedientes incompletos**, prioridad **teléfono › dirección › resto**, foco en **póliza vigente**; campaña de actualización por **WhatsApp** (con tel) o **correo** (sin WA, con email). `seed __v=8` con clientes incompletos.
### Added — Plantillas de mensajes (`modules/plantillas.js`, `#/plantillas`)
- Plantillas WhatsApp/correo (propuesta, prima pendiente, actualización de datos, renovación, bienvenida) con variables; editables y persistentes.
### Added — Configuración interna
- **Planes comercializables**: importar catálogo o **crear plan**; editable por acuerdos/promos. Asignación de plan configura funcionalidades.

## [0.6.0] — 2026-06-21 · Configuración (sin código) + detección en cartera
### Added — Configuración (dos niveles)
- **`Orbit.tenant`** (config.js): fuente única de la cuenta — `plan`, `modulosActivos[]`, `branding`, `paises[]`, `addons`, `portalVisibility`, `apis`. Persistente.
- **`Orbit.PLANES`** (Estándar / Profesional / Personalizado) y **`Orbit.ROLES`** (Dirección, Admin, Finanzas, Asesor, Asistente).
- **Módulo Configuración** (`modules/configuracion.js`, `#/configuracion`):
  - *Self-service del cliente* (según plan): Marca (logo, paleta, menú claro/oscuro, auto-branding IA por manual de marca), Usuarios y permisos (roles, comisión, metas), Países y monedas (multipaís, no se mezclan), Integraciones (Make, Drive, WhatsApp), APIs (cifradas, scopes, por rol), Plan.
  - *Interna (Orbit)*: banner privado, asignación de plan y **selección de módulos activos por cliente** → el sidebar se ajusta solo.
- **Sidebar dinámico**: filtra por `tenant.modulosActivos`; `router.rebuildSidebar()` en caliente.
### Added — Importación de estados de cartera
- **Detección** en estados de cuenta (cualquier formato): **recibos no creados** y **pagos no aplicados**; conciliación **no-duplicante**.

## [0.5.0] — 2026-06-21 · Ficha rediseñada + campos + importación en ficha
### Changed
- **Ficha cliente rediseñada**: header con chips de contacto, KPIs con acento e ícono, **menú interno tipo píldoras con íconos** (ya no se corta), bandera de país.
### Added
- **Campos extendidos** (editables, cascada): país → departamento → ciudad, dirección, canal, **contacto alterno (check)**, fecha de nacimiento, sexo (segmentación). `seed __v=7`.
- **Importar al expediente** (`importa.openFor`): multi-archivo, vincula al cliente, asocia vehículo a póliza/cliente; tipos **facturas** y **documentos** (DPI/RTU/patente).
- **Comisiones**: % por asesor, fija/variable; nota de base (prima neta, sobre recaudada).
- **WhatsApp** en renovaciones y ficha. **Sidebar claro/oscuro** con auto-contraste. **FIX** deep-link abre la pestaña correcta.

## [0.4.0] — 2026-06-21 · UI ronda 2 + Expediente del cliente
### Changed (refinamiento UI)
- **Topbar blanca** con **slot de logo del cliente** (white-label).
- **Sidebar**: títulos de grupo con **cintilla** (barra de acento) + texto blanco de mayor contraste.
- **Header de módulo tipo banda** (oscuro, ícono + título + descriptor rojo + features) vía `K.banner`/`K.bannerFor` y registro `Orbit.MODULE_TITLES` (personalizable por plantilla). Aplicado a CRM global, Inicio, Importa.
- **Login**: órbita sobre fondo claro y sobrio, **ambos anillos giran** (con dots), núcleo = marca del cliente, **footer centrado** con texto blanco corregido.
- Ícono de Inicio: **🌅** (sol) en lugar de asterisco.
### Added (Expediente del cliente)
- **Vehículos** (pestaña + datos por póliza de auto: placa, marca/línea, año, uso, color, VIN, motor, suma asegurada) — `seed __v=6` con colección `vehiculos`.
- **Recibos y pagos**: recibos por forma de pago + **aplicar pago** (concilia recibo↔póliza).
- **Comisiones**: split **vendedor/empresa** con **visibilidad por rol** (empresa interna, configurable).
- **Contacto alterno** + Drive link editables en la ficha.
- Queries `vehiculosDe`, `vehiculoDePoliza`.
- Docs: PLAN actualizado (Expediente + modelo de Configuración en dos niveles + visibilidad Portal).

## [0.3.0] — 2026-06-21 · Infraestructura transversal (white-label)
### Added
- **Theming / paleta seleccionable** (`core/theme.js`): 6 paletas, cambia el color primario en toda la plataforma y el login. Default Rojo Orbit. Persistente. Picker en topbar (🎨) y en login.
- **Login white-label** (`core/auth.js` + markup en `index.html` + `styles/infra.css`): órbita dinámica animada, palette-adaptive, slot de logo del cliente, gate de sesión demo + logout.
- **Operación multipaís**: `Orbit.PAISES` + switcher en topbar (Todos / GT / CO).
- **Importación inteligente** (`core/importa.js` + `modules/importar.js`): drawer/wizard reutilizable (cargar → extracción → confirmar) que acepta cualquier formato; hub con 9 secciones (base inicial, clientes, pólizas, vehículos, directorio aseguradoras, estados de cuenta, planillas comisiones, movimientos finanzas, calendario marketing). Estados de cuenta despliegan recibos por forma de pago y permiten aplicar pagos por póliza.
- **Cliente 360**: ficha **editable** (modal: nombre, contacto, asesor, segmento, Drive link, notas), **link de Drive**, hook de importación, **gestionar renovaciones** desde la ficha.
- **Config**: nav nuevos (Importación inteligente, Reportes, Portal del Cliente) + metadata; `seed __v=5` con `driveLink`.
- **Docs**: `docs/PLAN-INFRAESTRUCTURA.md` (plan maestro con todos los requisitos).

## [0.2.0] — 2026-06-20 · CRM vistas globales
### Added — núcleo CRM completo (vistas por cartera)
- **CRM Kit** (`core/crmkit.js`): piezas compartidas (page head, KPI row, celdas cliente/asesor/aseguradora, barra de filtros con wiring) para módulos delgados y consistentes.
- **Pólizas** (`modules/polizas.js`, `#/polizas`): cartera completa con KPIs, filtros (búsqueda en vivo, ramo, aseguradora, asesor, estado) y tabla enlazada a Cliente 360.
- **Cobros y cartera** (`modules/cobros.js`, `#/cobros`): KPIs de cartera, **aging** de vencidos (1–30/31–60/61–90/90+), tabla con conciliación pago↔póliza.
- **Renovaciones** (`modules/renovaciones.js`, `#/renovaciones`): tablero kanban por urgencia (vencidas/≤15/16–45/46–90 d) con prima en juego.
- **Cancelaciones** (`modules/cancelaciones.js`, `#/cancelaciones`): motivos, valor perdido y tasa de fuga.
- **Comisiones** (`modules/comisiones.js`, `#/comisiones`): generada vs liquidada con cortes por asesor / aseguradora / periodo.
- **Historial** (`modules/historial.js`, `#/historial`): feed cronológico de la cartera agrupado por día, con KPIs por tipo.
- **Queries** (`core/queries.js`): nuevas agregaciones `agingVencido()`, `comisionesPor(campo)`, `norm()`.
- Docs: `docs/crm-vistas-globales.md`.

## [0.1.0] — 2026-06-20 · Fundación + CRM Cliente 360
### Added — Paso 1: Shell + capa de datos + tokens
- **Shell** (`index.html`): topbar (marca Orbit 360, búsqueda, badge demo, usuario), sidebar agrupado y host de contenido. Responsive con sidebar colapsable en móvil.
- **Tokens** (`styles/tokens.css`): paleta de marca (rojo #C5162E, grafito #1E2227), tipografías (Manrope / Source Sans 3 / JetBrains Mono), escalas de radio, sombra y espaciado.
- **Base** (`styles/base.css`): componentes compartidos — KPIs, tablas, badges, botones, tabs, avatares, drawer, controles de formulario.
- **Capa de datos** (`data/store.js`): API única (`all/get/where/find/insert/update/remove/on`) sobre localStorage, swappable a backend. Versión de seed con re-siembra.
- **Seed ficticio** (`data/seed.js`): universo relacional determinista — 5 asesores, 6 aseguradoras, 20 clientes, pólizas, cobros, comisiones, actividades y cancelaciones.
- **Core**: `ui.js` (formato moneda/fecha, avatares, badges de estado), `config.js` (navegación + metadatos de módulos), `queries.js` (agregaciones de negocio), `router.js` (sidebar + router por hash con query params).

### Added — CRM · Cliente 360 (núcleo de oro)
- **Lista de cartera**: KPIs (clientes, pólizas activas, prima vigente, por renovar), filtros (búsqueda en vivo, tipo, país, segmento, asesor), tabla con asesor, pólizas, prima, estado de cartera y barra de salud.
- **Ficha 360 (el "cerebro")**: encabezado con datos de contacto, asesor, segmento, score de salud, y banda KPI (pólizas vigentes, prima anual, cartera al día/vencida, comisión generada).
- **Desglose** por pestañas:
  - *Resumen*: próximas acciones, distribución de cartera por ramo, actividad reciente.
  - *Pólizas*: detalle por ramo/producto/aseguradora/vigencia/estado.
  - *Cobros y cartera*: cuotas con estado y bandera de **conciliación** (pago ↔ póliza).
  - *Renovaciones*: línea de tiempo por póliza con días a vencer.
  - *Comisiones*: por periodo, base, %, monto y estado (devengada/liquidada).
  - *Historial*: timeline + alta de interacción (escribe en la capa de datos).
- **Deep-link**: `#/cliente360?c=<id>` desde Inicio y desde la lista.

### Added — Orbit Inicio (Mi Día)
- Metas del mes (diales prima/recaudo), KPIs de cartera, avance por asesor (leaderboard) y prioridades (renovaciones próximas + cobros vencidos), todo derivado del CRM.

### Notes
- Los módulos no construidos muestran una pantalla de estado honesta con su alcance objetivo.
- Pendiente backend real: reimplementar `store` manteniendo la API.

## v0.83–v0.86 (25 Jun 2026)
### Nuevo
- ✉️ Correo interno: helper Orbit.correoCompose — todos los botones de correo abren redactor interno (no mailto)
- 🤖 Orbit IA: módulo completo con 3 contextos (equipo/asesor/cliente), respuestas sobre datos reales del CRM
- 💬 Notificaciones WhatsApp: 6 plantillas, envío wa.me + API, historial en expediente del cliente
- 🧮 Cotizador: campos dinámicos por ramo (Auto/Vida/GM/Hogar/Daños), historial tab, tabs con navegación
- 💳 Cobros: aplicar pago con modal real (fecha + factura + conciliación automática al cargar factura)
- 💳 Filtro por póliza en cobros de la ficha del cliente
- 📊 Insights comparativo profundo: tabla 12 meses clicable, drill-down por mes y por segmento, nueva vs renovada
- 🎓 Academia: bug de backticks anidados corregido, cursos sin null
- ⚡ Automatizaciones: ruta añadida al NAV
- 📊 Reportes: exportar Excel (.xls) y PDF además de CSV
- 🎨 Paletas: Suave/Orbia (púrpura) + Coral cálido; selector de tipografía
- 👥 Roles: 8 roles con módulos predeterminados (Dirección/Admin/Comercial/Finanzas/Marketing/Operativo/Asesor/Asistente)
- 🔒 Confidencialidad doble vía en el portal del cliente
- 📚 Cursos por rol: 4 cursos nuevos (Leads para Asesores, Finanzas para Directores, Marketing Digital, Portal del Cliente)
- 🔧 Capacitación técnica interna (docs/capacitacion-tecnica-interna.html)
- 📱 Responsive global CSS pass

### Corregido
- Academia: función cursos() usaba Orbit.session.rol() inexistente → Orbit.auth.user().rol
- Academia: template literals anidados en quiz → concatenación pura
- Academia: curso null por doble coma en seed → eliminado
- Tipografía duplicada en theme.js → removida
- KPIs clicables en 10 módulos (renovaciones, aseguradoras, finanzas, marketing, siniestros, historial, polizas, cobros, cancelaciones, comisiones)
- Editor de novedades: reemplaza prompt() con modal real con emoji picker y formato
- Configuración: logo y manual usan FileReader real (no alert)
- Cotizador: syntax error onclick quotes → data-drill attributes
- Insights: syntax error onclick quotes → data-drill-mes/label attributes

### Pendiente (todo #121)
- Cotizador: guardar en historial al cotizar; PDF upload propuestas
- Conciliación Finanzas: widget estado bancario vs recibos
- Ficha póliza: editar asesor + sustitución vehículo desde endosos
- Demo interactivo: actualizar con módulos v0.83-v0.86
- Academia: 14 cursos por módulo completos
- Handoff A&S: actualizar con v0.86+
