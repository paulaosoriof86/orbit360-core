# Auditoría prototipo Claude · Orbit 360 v1.97

**Fecha:** 2026-07-03  
**ZIP auditado:** `Prototype Development Request - 2026-07-03T090030.154.zip`  
**Base comparada principal:** `Prototype Development Request - 2026-07-03T000030.492.zip` / v1.88  
**Metodología:** release candidate incremental. No reinicia backend. No reemplazar a ciegas.

---

## 1. Resultado ejecutivo

El prototipo nuevo avanza de **v1.88 a v1.97** según `docs/BITACORA-CAMBIOS.md`.

La auditoría detecta **mejoras reales e importantes** en:

- facturación de comisión a aseguradoras,
- CxC financiero,
- trazabilidad banco/ref/fecha,
- modelo de comisión de asesor,
- IA centralizada,
- identidad ficticia del chrome,
- `CHANGELOG.md` alineado hasta v1.93,
- limpieza de artefacto `.verify-academia.png`,
- fechas vivas en `core/ciclo.js`.

No obstante, varios puntos que Claude marcó como pendientes **siguen abiertos** y deben mantenerse en el backlog:

- Renovaciones: comparativo multi-aseguradora y solicitud de propuestas.
- Integraciones reales: Outlook/Gmail/Green API/Sheets.
- Academia: recursos grandes embebidos y cursos por rol completos.
- Marketing: ficha de día más profunda por contenidos/piezas/redes/segmentación/stats.
- Reportes y Orbit IA: profundización pendiente.
- Localización/glosario por inquilino.
- Responsive global.

---

## 2. Estructura del ZIP

Conteo:

- Archivos: 82.
- Raíz única: `orbit360-platform/`.
- No contiene ZIPs internos.
- No contiene `orbit360-platform` anidado.
- No contiene `.bak`, `.old`, `.tmp`, `copy` o `copia`.
- Se eliminó `.verify-academia.png` respecto a v1.88.
- Único archivo tipo legacy detectado: `docs/legacy/Orbit360-demo-standalone-NO-USAR.html`. Está marcado como NO USAR y no representa duplicado operativo si no se referencia desde el shell.

Conclusión: **no se observa estructura duplicada que explique bloqueo**. Debe mantenerse la regla de no entregar a Claude paquetes con ZIPs internos ni carpetas anidadas.

---

## 3. Comparación contra v1.88

Contra `Prototype Development Request - 2026-07-03T000030.492.zip`:

- Agregados: 0.
- Eliminados: 1.
  - `orbit360-platform/.verify-academia.png`
- Modificados: 12.
  - `CHANGELOG.md`
  - `core/auth.js`
  - `core/ciclo.js`
  - `core/ia.js`
  - `core/importa.js`
  - `data/seed.js`
  - `docs/BITACORA-CAMBIOS.md`
  - `index.html`
  - `modules/academia.js`
  - `modules/configuracion.js`
  - `modules/finanzas.js`
  - `modules/marketing.js`

Contra V89:

- Agregados: 10.
- Eliminados: 2.
- Modificados: 45.

Lectura: el salto frente a v1.88 es acotado en archivos, pero funcionalmente importante. La mejora acumulada frente a V89 sigue siendo grande.

---

## 4. Versiones detectadas

- `docs/BITACORA-CAMBIOS.md`: llega a **v1.97**.
- `CHANGELOG.md`: tiene entrada consolidada **[1.93.0]**, pero no incorpora aún v1.94–v1.97 como entradas propias ni consolidado [1.97.0].
- `data/seed.js`: `__v = 36`.
- `index.html`: usa mayoritariamente `v1291`; excepciones:
  - `core/ciclo.js?v1294`
  - `core/auth.js?v1292`
  - `modules/finanzas.js?v1294`

Conclusión: el cache-bust es coherente con cambios parciales, aunque para mayor claridad de release puede convenir consolidar en una versión única por entrega cuando Claude cierre el paquete final.

---

## 5. Verificación técnica estática

Se ejecutó revisión de sintaxis sobre los JS del ZIP:

- Archivos JS revisados: todos los `.js` del paquete.
- Resultado: **0 errores de sintaxis con `node --check`**.

Búsquedas relevantes:

- `Paula` no aparece en `index.html`, `core/auth.js` ni `data/seed.js`; solo queda en documentación/legacy, no en UI activa.
- `window.claude.complete` ya no aparece en módulos funcionales; queda centralizado en `core/ia.js` como wrapper.
- `modules/configuracion.js`: 0 `localStorage`.
- `modules/finanzas.js`: 0 `localStorage`.
- `data/seed.js`: 0 `localStorage`.

Alerta:

- `index.html` sí mantiene `localStorage.getItem/setItem` para el sidebar (`orbit360_sbhide`). Para el prototipo visual puede no bloquear, pero para el empalme backend debe reemplazarse por `Orbit.store.pref/setPref`, como ya se hizo en la rama backend LAB anterior.

---

## 6. Mejoras cerradas por Claude

### 6.1 Finanzas / factura de comisión / CxC

Estado: **mejora fuerte cerrada parcialmente y con buena profundidad**.

Claude corrigió el criterio:

- emitir factura a aseguradora crea registro en `facturas` con estado `por_cobrar`;
- ya no crea `finmov` al emitir;
- el `finmov` nace solo al cobrar;
- número secuencial `FAC-AAAA-####`;
- idempotencia por aseguradora + periodo;
- anulación revierte el `finmov` si existe;
- `comisionIds[]` enlaza la factura con las comisiones facturadas;
- cobro captura banco/cuenta, referencia y fecha;
- CxC/CxP incluye facturas `por_cobrar`.

Versiones asociadas:

- v1.89: CxC sin caja hasta cobro, idempotencia, secuencial.
- v1.92: `comisionIds`, banco/ref/fecha.
- v1.95: ver/reimprimir factura.
- v1.96: CxC incluye facturas por cobrar.

Pendiente menor backend/prototipo:

- smoke real sobre UI para validar que no hay duplicidad si se cobra/anula/reemite en varios periodos y países.

### 6.2 Modelo de comisión asesor

Estado: **cerrado en prototipo**.

`modules/finanzas.js#comisionAsesor()` ya usa `Orbit.comeng.comVendedorDe(...)`, respetando modo `comision`, `neta` o `fijo`, en lugar de fórmula simple contradictoria.

### 6.3 IA centralizada

Estado: **cerrado en módulos auditados**.

Módulos migrados a `Orbit.ia.complete`:

- `core/importa.js`
- `modules/marketing.js`
- `modules/academia.js`
- `modules/configuracion.js`

`window.claude.complete` queda dentro de `core/ia.js`, que es el wrapper central. Esto es correcto para backend: en producción se cambia el interior de `Orbit.ia.complete`, no cada módulo.

### 6.4 Seed e identidad ficticia

Estado: **cerrado en UI activa / seed**.

- Seed: `Paula Osorio` → `Valeria Morán`.
- Chrome/topbar: `Paula Osorio`/`PO` → `Andrea Beltrán`/`AB`.
- `core/auth.js` migra sesión persistida si venía con nombre anterior.

Observación: quedan menciones de Paula en documentación/legacy, no en UI activa. No bloquea, pero puede limpiarse al preparar paquete comercial final.

### 6.5 CHANGELOG

Estado: **parcial**.

Claude sí agregó entrada consolidada [1.93.0] para alinear v1.56–v1.93.

Pero el ZIP ya llega a v1.97 en `docs/BITACORA-CAMBIOS.md`; por tanto `CHANGELOG.md` vuelve a quedar parcialmente desalineado para v1.94–v1.97. Debe actualizarse en la próxima iteración.

### 6.6 Fechas vivas en core/ciclo

Estado: **cerrado en `core/ciclo.js` según auditoría estática y bitácora**.

Claude reemplazó fechas congeladas por helpers derivados de `Orbit.ui.today()/now()` en flujos que crean negocios, gestiones, actividades, bitácoras y clientes.

---

## 7. Pendientes que siguen abiertos según el propio Claude y la auditoría

### P0/P1 — Renovaciones comparativo multi-aseguradora

Estado: **ABIERTO**.

`modules/renovaciones.js` no cambió frente a v1.88 y no contiene lógica de `comparativo`, selección de varias aseguradoras, propuestas alternativas ni solicitud a aseguradoras.

Debe mantenerse pendiente:

- generar comparativo de renovación contra varias aseguradoras;
- no simular siempre la misma aseguradora;
- permitir seleccionar aseguradoras destino;
- crear solicitud de propuesta a una o varias aseguradoras;
- enlazar respuesta/propuesta recibida al expediente/renovación/comparativo.

### P1 — Integraciones reales

Estado: **ABIERTO / parcial UI**.

Configuración ya lista catálogo de Outlook/M365, Gmail/Workspace, Google Sheets, Make, Metricool, Mailchimp, Drive, Calendar, etc. Pero:

- no hay conexión real OAuth/API desde frontend;
- no hay prioridad backend implementada para Outlook/Gmail;
- no aparece Green API como integración específica;
- Google Sheets sigue como catálogo, no sincronización real;
- Make debe ser el puente inicial para WhatsApp/correo/Sheets.

### P1 — Academia recursos embebidos grandes + cursos por rol

Estado: **PARCIAL**.

Existe:

- visor de lecciones con video/iframe/lectura/quiz;
- manuales in-app con iframe por rol;
- filtrado de cursos por `destinatarios` y rol;
- cursos Marketing/Portal profundizados.

Sigue pendiente:

- recursos grandes estructurados por curso/rol;
- biblioteca de recursos por aseguradora/producto/rol;
- progreso/certificados ligado a roles y rutas de aprendizaje;
- carga/preview robusta de documentos externos grandes;
- parametrización completa por tenant.

### P1 — Marketing calendario con ficha por día profunda

Estado: **PARCIAL**.

Existe:

- calendario mensual;
- ficha de contenido;
- responsable/aprobación;
- estados;
- stats de alcance/interacciones/leads;
- generación con IA centralizada;
- referencia a Metricool como integración.

Sigue pendiente:

- ficha por día más completa como centro operativo del día;
- piezas/redes/segmentación/estadísticas por publicación;
- vinculación real a Metricool/Make;
- campañas por segmento/ramo/cliente objetivo;
- medición histórica y recomendaciones accionables.

### P1 — Reportes y Orbit IA

Estado: **ABIERTO**.

`modules/reportes.js` y `modules/ia.js` no cambiaron en este ZIP. No se observa profundización nueva.

Pendiente:

- reportes más analíticos con drill real;
- Orbit IA con capacidades por módulo, explicación, tareas sugeridas y acciones;
- conexión de IA real backend vía `Orbit.ia.complete`.

### P1 — Localización / glosario por inquilino

Estado: **ABIERTO**.

No hubo cambios relevantes en localización/glosario. Sigue pendiente:

- glosario configurable por tenant;
- términos por país;
- etiquetas de UI dependientes de país/cliente;
- evitar mezclar términos Colombia/Guatemala.

### P1 — Responsive global

Estado: **ABIERTO**.

No hubo cambios CSS ni auditoría responsive global en este ZIP. Sigue pendiente revisar todos los módulos en móvil/tablet.

---

## 8. Riesgos para empalme backend

El ZIP nuevo es prototipo puro. No contiene:

- `core/backend-lab-loader.js`
- `core/backend-lab-init.js`
- `data/store-firestore-lab.local.js`
- `core/auth-firebase.config.local.js`

Además, `index.html` no trae los hooks backend LAB y mantiene persistencia de sidebar por `localStorage`.

Acción backend obligatoria antes de usarlo en la rama:

1. Reinsertar hooks backend LAB.
2. Mantener `data/store-firestore-lab.local.js v1.74` con trazabilidad de escrituras.
3. Reemplazar sidebar `localStorage` por `Orbit.store.pref/setPref`.
4. No reemplazar `data/store.js` conectado/adaptado a backend sin revisión.
5. Ejecutar smoke demo + LAB.

---

## 9. Estado de documentación acumulada

Con este ZIP se deben actualizar los pendientes acumulados de Claude a post-v1.97.

No se debe generar aún paquete nuevo para Claude hasta que Paula lo solicite. Mientras tanto, este reporte y el documento `PENDIENTES-CLAUDE-POST-V197-20260703.md` serán la fuente acumulada.

---

## 10. Conclusión

Claude sí atendió una parte importante de los P0/P1 del paquete anterior, especialmente Finanzas, CxC, IA centralizada, seed ficticio, identidad ficticia, CHANGELOG parcial y fechas vivas.

Pero no cerró los puntos grandes que él mismo dejó pendientes para la próxima sesión:

- Renovaciones multiaseguradora/propuestas.
- Integraciones reales.
- Academia por rol/recursos grandes.
- Marketing operativo profundo por día.
- Reportes + Orbit IA.
- Localización/glosario por tenant.
- Responsive global.

El próximo paso de ChatGPT/Codex es empalmar v1.97 sobre backend LAB preservando el adaptador Firestore LAB v1.74 y corrigiendo `index.html` para hooks LAB + `Orbit.store.pref/setPref`.
