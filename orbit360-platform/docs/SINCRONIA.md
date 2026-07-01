# Auditoría de sincronía (data-flow del ecosistema)

> Garantiza que **toda** la plataforma se alimenta de una sola fuente de verdad y
> que cualquier cambio se refleja en vivo en las tres caras (Operación · Cliente ·
> Comercial). Revisado en sesión 17.

## 1. Bus de eventos (núcleo)

`CX.bus.emit(ev)` ⟶ los listeners reaccionan. **Re-render central** registrado una sola
vez en `router.js` (sin fugas de listeners):

| Evento | Lo emite | Efecto |
|---|---|---|
| `project` | cambiar/crear proyecto, `hr.setFuente` | rail + re-render + persistir sesión + invalidar caché cliente |
| `visit-flow` | `assignVisit`, envío de **cuestionario/score**, `hr.sync`, **`payVisits`** | **re-render global** (vista activa + badges) |
| `shoppers` | alta/edición de evaluador | re-render global |
| `clients` | alta/edición de cliente | re-render global |
| `programa` | guardar/reset del cuestionario ponderado | invalidar caché cliente + re-render global |
| `fin` | movimiento/presupuesto financiero | redibuja dashboard financiero |
| `notif` | nueva notificación / leída | redibuja Tablón |

## 2. Cadenas de sincronía verificadas

### A) Visita → Liquidación → Beneficios → Finanzas → Fecha de pago ✅
- La liquidación **se deriva** del estado de la visita (`CX.liq.fromVisita`), no se captura.
- `realizada → pend. cuestionario → validada → en lote → pagada`.
- **Cierre del ciclo**: "Crear lote" llama `data.payVisits(ids)` → marca visitas `liquidada` con
  **`fechaPago`** real → emite `visit-flow` → en vivo se actualizan: Liquidaciones (pagada),
  Mis Beneficios (Pagado + fecha), Dashboard Financiero (baja CxP), KPIs y badges.
- Fecha estimada de pago = fecha base + `proyecto.pago.diasPago` (configurable).

### B) Cuestionario ponderado (fuente única) → 3 caras ✅
- Se edita en **Cuestionarios** (admin) → `CX.programa.save` persiste por proyecto.
- El **shopper** llena y se calcula **score real ponderado** (con KO) + **evidencia** por pregunta.
- El score real + desglose por sección se guardan en la visita (`score`, `scoreBySection`, `evaluada`).
- **Portal del Cliente** lee la misma estructura y ahora muestra **Resultados en vivo de operación**
  (`CX.clienteData.realResults`): score real promedio, # cuestionarios, KO, detalle por visita.

### C) Cliente → Proyectos → Operación ✅
- Cada proyecto cuelga de un **cliente** (`clientId`); abrir un proyecto desde el cliente lo activa
  (`setProject` → `project` → toda la operación cambia de contexto).

### D) HR (online) → Visitas → Postulaciones/Asignación ✅
- HR externa se lee en vivo; `hr.sync` crea/actualiza visitas **sin duplicar** (match por extId/visitId)
  y emite `visit-flow` → asignación, cronograma, finanzas y portal se recalculan.

### E) Cronograma (Mi Día) ✅
- Lee visitas + tareas en vivo; cualquier `visit-flow` lo refresca (admin y shopper).

## 3. Pendientes de sincronía (siguientes)
- ✅ **Visitas reales → sucursales del Portal del Cliente**: el scorecard se deriva de las visitas del
  proyecto; el score usa cuestionarios realmente enviados (real) con fallback determinístico. Pendiente:
  catalogar `sucursalId` formal del cliente (hoy se agrupa por nombre de sucursal de la visita).
- ✅ **Movimientos financieros automáticos** al pagar lote: `payVisits` genera el egreso consolidado por
  país y emite `fin` + `visit-flow` (Liquidaciones, Beneficios, Movimientos y Dashboard sincronizados).
- ⬜ **Automatizaciones externas** (Make/WhatsApp) al disparar cada evento del bus.
- ⬜ **Backend real**: reemplazar el mock en memoria por adapter (las visitas viven en memoria y se
  reinician al recargar; shoppers/clientes/programa sí persisten).
