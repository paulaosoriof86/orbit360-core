# Reporte SMOKE · Orbit 360

> Pruebas de humo rápidas tras cada versión. Objetivo: confirmar que la app **carga sin errores JS** y que los flujos críticos responden. No sustituye la auditoría forense (AUDITORIA-FORENSE.md).

## v1.49 — 2026-07-01
**Carga:** ✅ index.html sin errores de consola (verificado en vista).

**API del store** (`Orbit.store`): ✅ `all/get/where/find/insert/update/remove/on/_emit/init/reseed/raw` presentes. `_emit` público dispara listeners.

**Flujos críticos verificados en vivo (recarga real):**
| Flujo | Módulo | Resultado |
|---|---|---|
| KPIs con desglose (drill) | Finanzas | ✅ modal con registros, filas abren movimiento |
| CxC/CxP editar/estado | Finanzas | ✅ drawer completo, arrastre mes a mes |
| Presupuesto CRUD + replicar | Finanzas | ✅ +Partida / editar / replicar mes |
| Quick-pay desde tabla | Cobros | ✅ Vencido→Pagado, tabla refresca |
| Nav cruzada póliza/cliente | Cobros | ✅ enlaces abren detalle |
| Metas colección + sugerir | Insights | ✅ upsert a `metas`, tendencia +10% |
| Comparativo general→particular | Insights | ✅ segmentos + drill mes/fila |
| marca→línea→modelo | Cotizador/Comparativo | ✅ 3 niveles encadenados |
| Completar inline | Calidad | ✅ guarda y sale de la cola |

**Pendiente de smoke (módulos delgados a profundizar):** plantillas, reportes, comisiones (detalle), historial/cronograma (filtros).

## Cómo correr un smoke manual
1. Abrir `index.html` con **Ctrl+Shift+R** (evita caché de .js).
2. Consola sin errores rojos al cargar.
3. Recorrer: Inicio → Cliente360 (abrir ficha, tabs) → Pólizas (abrir detalle) → Cobros (aplicar pago) → Finanzas (drill KPI) → Insights (metas) → Academia (abrir curso).
4. Cualquier error → registrar en BITACORA-ERRORES.md.
