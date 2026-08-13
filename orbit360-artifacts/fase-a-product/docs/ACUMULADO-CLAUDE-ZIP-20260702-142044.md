# ACUMULADO CLAUDE - ZIP 2026-07-02 14:20:44

Fecha: 2026-07-02
Archivo auditado: `Prototype Development Request - 2026-07-02T142044.699.zip`
Estado: auditado como mini-release. No instalar directo. Empalmar selectivamente con backend protegido.

## Alcance

Este documento acumula el delta del nuevo ZIP de Claude frente al backlog previo. Claude debe seguir trabajando prototipo, UX, modulos, pantallas, textos, configuracion, encoding, flujos clickeables y calidad comercial. No debe tocar backend, Firestore, Auth, reglas ni contrato `Orbit.store`.

## Documentos generados en esta auditoria

- `docs/AUDITORIA-ZIP-CLAUDE-20260702-142044.md`
- `docs/EMPALME-ZIP-CLAUDE-20260702-142044.md`
- `docs/BITACORA-ERRORES-ZIP-CLAUDE-20260702-142044.md`

## Archivos nuevos del ZIP

- `core/notify.js`
- `docs/AUDITORIA-SINCRONIAS.md`
- `docs/REQ-FINANZAS-PROFUNDO.md`

## Archivos modificados relevantes

- `core/ciclo.js`
- `core/config.js`
- `core/importa.js`
- `core/queries.js`
- `core/ui.js`
- `data/seed.js`
- `index.html`
- `modules/automatizaciones.js`
- `modules/cancelaciones.js`
- `modules/cliente360.js`
- `modules/cobros.js`
- `modules/comparativo.js`
- `modules/cotizador.js`
- `modules/finanzas.js`
- `modules/inicio.js`
- `modules/insights.js`
- `modules/marketing.js`
- `modules/polizas.js`
- `modules/portal.js`
- `modules/renovaciones.js`
- `modules/siniestros.js`

## Pendientes que Claude resolvio o avanzo

1. **Portal -> Siniestros -> Ops/Historial/Cliente 360:** avance fuerte. `portal.js` crea reclamo canonico en `reclamos`, genera `reclamoId`, crea gestion Ops y actividad. `siniestros.js` refleja cambios de estado en Historial y gestion Ops enlazada. Pendiente validacion visual completa.
2. **Badges tecnicos:** `core/config.js` pone `hideTechnicalBadges: true` por defecto y migra claves nuevas del tenant default. Pendiente ver sidebar real.
3. **Encoding:** scan de archivos limpio. Pendiente visual.
4. **Referencias ajenas:** scan funcional limpio en archivos activos. Se corrigio comentario de Automatizaciones.
5. **Finanzas desde datos vivos:** se agrega `Orbit.q.postRecaudo` y cableado desde pagos/conciliacion hacia `finmovs`.
6. **Notificaciones cliente:** nuevo `core/notify.js`, con selector de canal y traza en actividades.
7. **Importador:** agrega dry-run antes de guardar y posteo de recaudo a Finanzas en conciliacion.
8. **Insights:** filtro global por asesor.
9. **Polizas:** KPIs filtrables por estado.
10. **Marketing:** responsable y aprobacion en piezas.

## Pendientes que siguen abiertos

1. **P0 localStorage en modulos:** `modules/configuracion.js` conserva `localStorage` directo para logo. No copiar este archivo sin parche.
2. **P1/P0 fechas vivas:** persisten fechas quemadas en `core/ciclo.js`, `modules/cliente360.js`, `modules/portal.js`, `modules/siniestros.js`.
3. **P0 hook LAB:** `index.html` del ZIP no trae `data/store-firestore-lab.local.js`; debe reinsertarse si se copia.
4. **P0 validacion visual:** pendiente validar login/sidebar/Portal/Ops/Historial/Siniestros/Cliente 360 en Chrome.
5. **P1 backend futuro:** `core/notify.js` usa `wa.me`/correo local; en produccion debe conectarse a Make/WhatsApp Cloud API/correo real.
6. **P1 profundidad comercial:** Aseguradoras, Plantillas, Reportes, Automatizaciones y Marketing deben seguir profundizandose con CRUD, duplicar, usar, programar, exportar, detalle y modales Orbit.

## Estado por P0 conocido

| P0 | Estado tras este ZIP | Evidencia | Cierre |
|---|---|---|---|
| Portal -> Siniestros -> Cliente 360 -> Historial -> Ops | En codigo: avanzado/resuelto | `portal.js`, `siniestros.js`, `cliente360.js` | Pendiente prueba visual completa |
| Sidebar sin badges tecnicos | En codigo: avanzado | `hideTechnicalBadges: true` | Pendiente prueba visual |
| Encoding/mojibake | Scan limpio | sin patrones mojibake | Pendiente visual |
| Sin referencias ajenas funcionales | Scan limpio | archivos activos | Mantener vigilancia |
| Sin localStorage directo real en modulos | No resuelto | `modules/configuracion.js` | ABIERTO |
| Fechas vivas | Parcial | seed/ui avanzan; flujos quedan | ABIERTO |
| Finanzas desde datos vivos | Avance importante | `postRecaudo` -> `finmovs` | Validar datos/render |

## Decision de empalme

Empalmar selectivamente. No full copy. No tocar backend. No deploy. No merge.

Archivos candidatos de alto valor: `core/notify.js`, `core/queries.js`, `core/importa.js`, `core/config.js`, `modules/portal.js`, `modules/siniestros.js`, `modules/cobros.js`, `modules/cliente360.js`, `modules/comparativo.js`, `modules/cotizador.js`, `modules/finanzas.js`, `modules/polizas.js`, `modules/insights.js`, `modules/marketing.js`, `modules/renovaciones.js`, `modules/cancelaciones.js`.

No copiar sin parche: `data/store.js`, `modules/configuracion.js`, `index.html` sin reinsercion LAB.

## Estado

ABIERTO. Mantener este acumulado para el proximo paquete Claude y para el empalme backend protegido.