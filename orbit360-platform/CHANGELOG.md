# Changelog · Orbit 360 Plataforma

Formato basado en *Keep a Changelog*. Construcción greenfield; el estado operativo vigente se mantiene en la rama obligatoria y PR #5 draft/open, sin merge ni producción salvo autorización explícita.

## [M5-5.0.4] — 2026-07-29 UTC · Entrega Hosting LAB RC post-Access
### Changed
- Entregada una sola vez al canal Hosting LAB la RC `d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045`.
- Publicados `index.html`, taxonomía productiva de roles y owner fail-closed de sesión/selector junto con el resto de la candidata.
- Corregido el generador de resumen del workflow: `??` ya no se mezcla con `||` sin paréntesis.
### Verified
- Run `30411375732`; job `90447991314`; artifact `8708510538`.
- Digest: `sha256:fbe4ba382fe6d51294b2a08f17e2ba48a35e8b36dd0973303943cef8c631e1ec`.
- Preflight canónico 16/16; contrato ejecutable 31/31.
- Activos críticos 41/41; paridad pública LAB 24/24; cero diferencias.
- Cero Firestore, escrituras operativas, navegador, Functions, Rules, producción, `main`, merge o Pólizas.
### Fixed
- `PIPELINE_MECHANISM_FAILURE` posterior al deploy: el status rojo fue causado exclusivamente por una expresión inválida en el resumen sanitizado; Hosting y la revalidación ya habían pasado.
- No se ejecutó un segundo deploy; la autorización quedó consumida.
### State
- M5 5.0.4: `M5_LAB_HOSTING_DELIVERED_AND_24_OF_24_VERIFIED`.
- Runtime smoke y revisión visual permanecen bloqueados hasta autorización explícita separada.

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
