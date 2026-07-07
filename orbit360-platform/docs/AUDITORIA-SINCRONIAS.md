# Auditoría de sincronías y flujos cruzados — Orbit 360

> Para ChatGPT/Codex antes de la auditoría de backend. Documenta cómo los módulos del prototipo se sincronizan a través de `Orbit.store` (colecciones compartidas), los bugs de sincronía encontrados y corregidos, y los guardarraíles a mantener. Método: ejercicio del **camino de código real** (clic real + `store` en vivo), no `insert` simulado.

## Modelo de sincronía (cómo funciona)
- **Única fuente de datos:** `Orbit.store` (colecciones: `clientes, polizas, cobros, comisiones, reclamos, negocios, gestiones, actividades, finmovs, presupuesto, notifs, contenidos, cursos, correos, …`). Los módulos NUNCA tocan `localStorage`; preferencias por `Orbit.store.pref/setPref`.
- **Reactividad:** `Orbit.store.on(fn)` / `_emit(coll)` notifican cambios; varios módulos re-renderizan al vuelo.
- **Regla de negocio:** producción/metas/comisiones sobre **prima NETA recaudada**. Moneda por país, sin mezclar (`Orbit.q.norm`).

## ⚠️ Clase de bug crítica: referencias VIVAS del store
`Orbit.store.get(coll,id)` devuelve el **objeto real** (no una copia). `store.update(coll,id,patch)` **muta ese objeto en sitio**. Patrón peligroso:
```js
if (nuevo !== r.estado) { ...patch bitacora... }   // TRUE (antes)
store.update('reclamos', id, patch);                // r.estado YA cambió
if (nuevo !== r.estado) { ...efectos cruzados... }  // FALSE → efectos NUNCA corren
```
**Regla:** capturar los cambios en una constante ANTES del `update` (`const cambioEstado = nuevo !== r.estado;`) y usarla en ambos puntos. Barrer TODO el código con este patrón antes de migrar.

## Hallazgos y correcciones (verificados en vivo)

### 1. Portal → Siniestro no creaba reclamo canónico  ✅ CORREGIDO (v1.76–1.77)
- **Antes:** reportar "Reclamo / Siniestro" en el Portal solo creaba una gestión en Ops + actividad. No aparecía en el módulo Siniestros ni en la ficha del cliente.
- **Ahora:** `modules/portal.js#solicitar` inserta un `reclamos` canónico (número `SIN-AAAA-####`, póliza/aseguradora heredadas, bitácora, `reclamoId`) + gestión Ops enlazada + actividad Historial.
- **Verificado (flujo real):** aparece en Siniestros, Cliente360→Siniestros, Historial y Ops.

### 2. Cambio de estado del siniestro no reflejaba en Ops/Historial  ✅ CORREGIDO (v1.77)
- **Causa raíz:** el bug de referencia viva descrito arriba (doble `if (nuevoEst !== r.estado)`).
- **Ahora:** al cambiar estado (a) inserta actividad en Historial con `reclamoId`, y (b) actualiza la(s) gestión(es) de Ops enlazadas por `reclamoId` (nota + `estado:Resuelta` si Pagado/Rechazado). Cerrar la gestión NO borra el reclamo.
- **Verificado:** `{estado:Pagado, actividadHistorial:true, gestiónActualizada:true, gestiónResuelta:true, reclamoNoBorrado:true}`.

### 3. Aplicar pago no posteaba recaudo a Finanzas  ✅ CORREGIDO (v1.78)
- **Antes:** aplicar el pago de un recibo (Cobros, Cliente360, Importador de estados de cuenta) actualizaba `cobros` pero NO creaba movimiento en `finmovs`. Finanzas → "Ingresos/recaudo del mes" (que lee `finmovs`) no reflejaba los pagos aplicados.
- **Ahora:** nuevo helper `Orbit.q.postRecaudo(cobro, fecha, metodo)` postea un `finmovs` ingreso `estado:'recaudado'` (clase "Recaudo de primas"), **idempotente** (id `fmv_cob_<cobroId>`: re-aplicar actualiza, no duplica). Cableado en `cobros.js` (pago rápido), `cliente360.js` (aplicar pago) e `importa.js` (conciliación de estado de cuenta).
- **Verificado:** finmov creado con estado recaudado, periodo correcto por fecha, e **idempotente** al re-aplicar.

### 4. Datos HARDCODEADOS en funciones muertas de Finanzas  ✅ PARCIAL
- `resumen()` tenía un array de movimientos literal y **nunca se invocaba** (el dispatch usa `movimientos()`, que lee del store). **Eliminada** (v1.78).
- **PENDIENTE (para ChatGPT):** quedan dos duplicados muertos por hoisting (gana la última declaración): el 1er `dashboard()` (~L349) y el 1er `presupuesto()` (~L415) contienen arrays hardcodeados pero son **código muerto** (las versiones vivas L653/L683 leen del store). No afectan la UI; conviene borrarlos para limpieza.

## Flujos cruzados auditados y OK (por lectura + prueba)
- **Cancelación** (`cancelaciones.js`): actualiza `cancelaciones`, inserta actividad en el cliente y enruta recuperación → Leads/Ops con etapa+responsable. OK.
- **Lead → Cliente** (`ciclo.js#emitir`): al pasar a "emitido" crea `clientes` + actividad + cadencia. NOTA: no auto-crea la póliza (intencional: la póliza se crea/importa aparte). Documentar en manual.
- **Renovación** (`cliente360.js`): actualiza la póliza y regenera recibos según forma de pago. OK.
- **Comisiones**: `finanzas` deriva base recaudada de la colección `comisiones` (no duplica); liquidación empresa/asesor sobre prima neta recaudada. OK.
- **Correo/Notificaciones**: `Orbit.notify` (cliente) + `Orbit.correo` cablean pago aplicado, respuesta de gestión, envío de comparativo/cotización. OK.

## Guardarraíles para mantener
1. Nunca releer un campo de un objeto del store después de `update()` esperando el valor viejo — capturar antes.
2. Toda transición de estado que tenga efectos cruzados debe: (a) escribir su colección, (b) insertar actividad en Historial con el `<entidad>Id` de enlace, (c) actualizar las entidades enlazadas (gestión, finmov, comisión) por su id de enlace.
3. Sin `localStorage` directo en módulos. Sin fechas quemadas (usar `Orbit.ui.today()` / `Orbit.ui.now()`).
4. Verificar SIEMPRE por camino de código real con recarga (no `insert` simulado).
