# Bitácora de cambios · Orbit 360 (prototipo comercializable)

> Registro cronológico de cambios del **prototipo** (Claude). El backend LAB (ChatGPT/Codex) mantiene su propia bitácora. Formato: versión · fecha · qué cambió · archivos.

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
