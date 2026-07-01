# Bitácora de cambios · Orbit 360 (prototipo comercializable)

> Registro cronológico de cambios del **prototipo** (Claude). El backend LAB (ChatGPT/Codex) mantiene su propia bitácora. Formato: versión · fecha · qué cambió · archivos.

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
