# Changelog · Orbit 360 Plataforma

Formato basado en *Keep a Changelog*. Construcción greenfield; el estado operativo vigente se mantiene en la rama obligatoria y PR #5 draft/open, sin merge ni producción salvo autorización explícita.

## [M4-4.2.11] — 2026-07-28 · Corrección durable 61 clientes GT/GTQ + cierre M4
### Changed
- Aplicadas exactamente 61 correcciones autorizadas de Clientes: `pais=GT`, `moneda=GTQ`.
- Escritura atómica confirmada con 61 snapshots durables, 61 eventos append-only y 61 updates de cliente.
- Los otros 353 clientes conservaron digest idéntico antes/después.
- Moneda faltante restante: 0; conteos preservados: 414 clientes / 26 aseguradoras; overlay target-only 0/0.
### Verified
- Preflight canónico: 27/27 PASS.
- Contrato ejecutado: 43/43 PASS.
- Run 30397573914: SUCCESS.
- Rollback exacto disponible desde 61 snapshots; no ejecutado porque el post-write fue íntegramente verde.
- Sin escrituras de Aseguradoras, configuración, memberships, Rules, Hosting, Functions, producción, `main` o merge.
### State
- M4: `M4_CLOSED_SUCCESS`.
- Siguiente bloque: M5 release candidate + visualización A&S.
- Pólizas permanecen bloqueadas y requieren fuente real actual específica cuando llegue su bloque; la hoja histórica de producción no es sustituto válido.

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
- `docs/PENDIENTES-Y-MEJORAS.md` — estado honesto (listo vs requiere backend vs profundización), reglas de trabajo...