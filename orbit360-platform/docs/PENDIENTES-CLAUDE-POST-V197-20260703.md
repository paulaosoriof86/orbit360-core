# Pendientes Claude acumulados post v1.97 · Orbit 360

**Fecha:** 2026-07-03  
**ZIP auditado:** `Prototype Development Request - 2026-07-03T090030.154.zip`  
**Versión auditada:** v1.97 según `docs/BITACORA-CAMBIOS.md`  
**Estado:** acumulado vivo. No generar paquete para Claude hasta instrucción de Paula.

---

## 1. Pendientes cerrados desde el paquete v1.88

### Cerrado — Factura de comisión a aseguradora / CxC

Claude corrigió y profundizó:

- factura emitida a aseguradora = CxC `por_cobrar`;
- no crea `finmov` al emitir;
- `finmov` nace solo al cobrar;
- número secuencial;
- idempotencia por aseguradora + periodo;
- anulación;
- bitácora;
- `comisionIds[]` como enlace a la planilla/set de comisiones;
- cobro con banco, referencia y fecha;
- reimpresión/ver factura;
- facturas por cobrar incluidas en CxC/CxP.

Estado: **RESUELTO EN PROTOTIPO**. Pendiente solo smoke backend/empalme.

### Cerrado — IA centralizada

Módulos migrados a `Orbit.ia.complete`:

- Importador,
- Marketing,
- Academia,
- Configuración.

`window.claude.complete` queda solo en `core/ia.js` como wrapper central.

Estado: **RESUELTO EN PROTOTIPO**.

### Cerrado — Seed / chrome sin nombres reales en UI activa

- `Paula Osorio` sale de seed y topbar.
- Asesor demo: `Valeria Morán`.
- Usuario sesión/chrome: `Andrea Beltrán`.

Estado: **RESUELTO EN UI ACTIVA / SEED**. Quedan menciones en documentación/legacy, no bloqueantes.

### Cerrado — Comisión asesor unificada

Finanzas usa `Orbit.comeng.comVendedorDe(...)` para comisión de asesor.

Estado: **RESUELTO EN PROTOTIPO**.

### Cerrado — Fechas vivas en `core/ciclo.js`

Claude eliminó fechas congeladas en creación de negocios, gestiones, actividades, bitácoras y clientes.

Estado: **RESUELTO EN PROTOTIPO**.

### Cerrado parcial — `CHANGELOG.md`

Claude agregó consolidado `[1.93.0]` para v1.56–v1.93.

Estado: **PARCIAL** porque la bitácora ya llega a v1.97. Debe actualizarse otra vez.

---

## 2. Pendientes que siguen abiertos para Claude

### P0/P1 — Renovaciones: comparativo multi-aseguradora + solicitud de propuestas

Estado: **ABIERTO**.

Auditoría: `modules/renovaciones.js` no cambió frente a v1.88 y no contiene lógica de comparativo multiaseguradora ni solicitud de propuestas.

Debe implementar:

1. Comparativo de renovación contra varias aseguradoras.
2. Selección manual de aseguradoras a consultar.
3. Solicitud de propuesta a misma aseguradora y a otras.
4. Registro de propuestas recibidas.
5. Enlace de propuestas a póliza, cliente y renovación.
6. Generación de comparativo para el cliente.
7. Estado operativo: solicitada / recibida / seleccionada / descartada.

### P1 — Integraciones reales Config / Backend

Estado: **ABIERTO / UI parcial**.

Existe catálogo en Configuración para Outlook/M365, Gmail, Google Sheets, Make, Metricool, etc. Pero falta:

1. Prioridad real Outlook/Microsoft 365.
2. Gmail / Google Workspace.
3. Green API como integración explícita.
4. Google Sheets real.
5. Make como puente operativo.
6. Variables/plantillas por evento.
7. Webhooks activos por tenant.
8. Estado de conexión real y errores.

### P1 — Academia: recursos embebidos grandes + cursos por rol

Estado: **PARCIAL**.

Existe:

- visor de curso,
- videos/iframe,
- manuales in-app por rol,
- filtro por destinatarios/rol,
- cursos Marketing y Portal profundizados.

Falta:

1. Recursos grandes por curso/rol/aseguradora/producto.
2. Biblioteca de recursos filtrable.
3. Rutas de aprendizaje por rol.
4. Certificación ligada a rol y progreso.
5. Preview robusto de documentos externos grandes.
6. Carga real/Drive/Storage en backend.

### P1 — Marketing: calendario con ficha diaria profunda

Estado: **PARCIAL**.

Existe:

- calendario mensual,
- ficha de contenido,
- responsable,
- aprobación,
- estados,
- stats básicos,
- generación con IA.

Falta:

1. Ficha por día como centro operativo.
2. Múltiples piezas por día.
3. Segmentación por público/ramo/etapa.
4. Stats por pieza/canal.
5. Enlace Metricool/Make real.
6. Recomendaciones basadas en rendimiento.
7. Vista de campaña/objetivo, no solo contenido individual.

### P1 — Reportes y Orbit IA

Estado: **ABIERTO**.

`modules/reportes.js` y `modules/ia.js` no se profundizaron en este ZIP.

Falta:

1. Reportes con drill más profundo.
2. IA con análisis por módulo.
3. Sugerencias accionables con acciones ejecutables.
4. Explicación de KPIs.
5. Conexión backend a IA real vía `Orbit.ia.complete`.
6. Trazabilidad de prompts/respuestas por tenant cuando aplique.

### P1 — Localización por país / glosario por inquilino

Estado: **ABIERTO**.

Falta:

1. Glosario configurable por tenant.
2. Variantes por país.
3. Etiquetas por país/cliente.
4. Parametrización de términos como póliza/certificado/recibo/factura/etc.
5. Evitar mezcla de términos Guatemala/Colombia.

### P1 — Responsive global

Estado: **ABIERTO**.

No hubo cambios CSS ni auditoría responsive global en v1.97.

Falta revisar:

1. Sidebar/topbar móvil.
2. Tablas grandes.
3. Drawers/modales.
4. Finanzas.
5. Academia.
6. Marketing.
7. Configuración.
8. Cliente360.
9. Cotizador/Comparativo.
10. Reportes.

---

## 3. Pendientes de empalme ChatGPT/Codex derivados del ZIP v1.97

Estos no son para Claude salvo que se le pida explícitamente.

### P0 — `index.html` backend LAB

El ZIP no contiene hooks backend LAB:

- `core/backend-lab-loader.js`
- `core/backend-lab-init.js`
- `data/store-firestore-lab.local.js`

Al empalmar v1.97 sobre backend debe reinsertarse la secuencia:

```html
<script src="core/backend-lab-loader.js?v=lab-20260703"></script>
<script src="core/backend-lab-init.js?v=lab-20260703"></script>
<script src="data/store.js?v1291"></script>
<script src="data/store-firestore-lab.local.js?v=lab-store-20260703"></script>
<script src="data/seed.js?v1291"></script>
```

### P0 — Sidebar aún usa `localStorage` en `index.html`

El ZIP v1.97 mantiene persistencia del sidebar con `localStorage.getItem/setItem`.

Debe empalmarse con:

- `Orbit.store.pref('orbit360_sbhide', '0')`
- `Orbit.store.setPref('orbit360_sbhide', value)`

### P0 — Preservar adaptador Firestore LAB v1.74

La rama backend ya tiene:

- `data/store-firestore-lab.local.js v1.74`
- trazabilidad `writeQueue/writeErrors`
- eventos `orbit:backend:write-pending`, `write-ok`, `write-error`

No reemplazarlo por ZIP de Claude.

### P1 — `CHANGELOG.md` otra vez desalineado

Actualizar próximo paquete Claude:

- de `[1.93.0]` a `[1.97.0]` o entradas separadas v1.94–v1.97.

---

## 4. Instrucción viva para próxima entrega Claude

No entregar todavía paquete. Cuando Paula lo pida, el paquete debe incluir:

1. Este documento.
2. Auditoría v1.97.
3. Regla de releases continuos.
4. Backend LAB no tocar.
5. Pendientes reales todavía abiertos.
6. Cambios locales/ChatGPT aplicados después de esta auditoría.

---

## 5. Estado general

El prototipo v1.97 es una mejora real y debe usarse como nueva base de prototipo, pero con empalme backend seguro.

No se debe volver a mantener como pendiente lo que ya quedó cerrado en Finanzas/CxC/IA/seed/chrome/comisiones/fechas vivas.
