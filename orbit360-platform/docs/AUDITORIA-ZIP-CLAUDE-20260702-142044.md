# Orbit 360 - Auditoria ZIP Claude 2026-07-02 14:20:44

Fecha: 2026-07-02
ZIP auditado: `Prototype Development Request - 2026-07-02T142044.699.zip`
Estado: AUDITADO / NO EMPALMADO TODAVIA
Rama objetivo: `backend/v99-clean-claude-lab-20260701`
PR: #3 draft

## 1. Dictamen ejecutivo

El ZIP nuevo es un mini-release relevante del prototipo y trae mejoras reales, pero NO debe instalarse completo sobre la rama backend.

Motivos:

- Trae `data/store.js` de prototipo demo; aunque no cambio frente al ZIP anterior disponible, debe preservarse el backend LAB y su contrato.
- No trae `data/store-firestore-lab.local.js`.
- `index.html` no trae hook LAB; si se copia debe reinsertarse el orden `data/store.js -> data/store-firestore-lab.local.js -> data/seed.js`.
- `modules/configuracion.js` mantiene `localStorage` directo para el logo del cliente.
- Persisten fechas quemadas en flujos operativos.
- La validacion visual real en Chrome sigue pendiente.

## 2. Inventario

- Raiz interna: `orbit360-platform/`.
- Total de archivos: 83.
- Estructura: `index.html`, `core/`, `data/`, `modules/`, `styles/`, `docs/`, `sw.js`.
- No contiene `data/store-firestore-lab.local.js`.
- No contiene `core/auth-firebase.config.local.js`.
- No contiene reglas Firestore ni config local LAB.
- No se detectaron secretos reales en archivos activos.

## 3. Comparacion contra ZIP anterior disponible en esta sesion

Comparado contra `Prototype Development Request - 2026-07-01T131700.175.zip`.

Archivos nuevos:

- `core/notify.js`
- `docs/AUDITORIA-SINCRONIAS.md`
- `docs/REQ-FINANZAS-PROFUNDO.md`

Archivos eliminados: ninguno.

Archivos modificados:

- `core/ciclo.js`
- `core/config.js`
- `core/importa.js`
- `core/queries.js`
- `core/ui.js`
- `data/seed.js`
- `docs/AUDITORIA-FORENSE.md`
- `docs/BITACORA-CAMBIOS.md`
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

## 4. Scans ejecutados

### Encoding / mojibake

Resultado: LIMPIO en archivos.

No se detectaron patrones `Ã`, `Â`, `â`, `ðŸ` ni caracter de reemplazo.

Pendiente: validar visualmente login, sidebar, Portal, Ops, Historial, Siniestros y Cliente 360 en Chrome.

### Referencias ajenas funcionales

Resultado: LIMPIO en archivos activos.

No se detectaron referencias funcionales activas en `core/`, `modules/`, `data/`, `styles/` ni `index.html` a CXOrbia, Orbia, TyA, shopper, mystery shopping, Mystery Shopping o CX / Mystery.

Nota: documentos internos pueden conservar deslinde historico de que Orbit no es CXOrbia; no debe aparecer en UI/demo comercial.

### localStorage directo en modulos

Resultado: FALLA P0.

Hallazgo:

- `modules/configuracion.js` contiene `localStorage.setItem('orbit360_logo', ...)` y `localStorage.removeItem('orbit360_logo')` en el flujo de logo del cliente.
- `modules/plantillas.js` solo tiene una referencia textual/comentario legacy.

Esperado: ningun modulo debe tocar `localStorage` directo. Debe usarse `Orbit.tenant`, `Orbit.store.pref/setPref` o configuracion tenant.

### Dialogos nativos

Resultado: OK en modulos.

No se detectaron `alert()`, `prompt()` ni `confirm()` nativos en modulos. Los dialogos visibles usan helpers Orbit.

### Sintaxis JS

Resultado: OK.

`node --check` paso para `core/`, `data/` y `modules/` del ZIP.

## 5. Mejoras detectadas

### Portal -> Siniestros -> Cliente 360 -> Historial -> Ops

Avance real:

- `modules/portal.js` crea registro canonico en `reclamos` cuando la solicitud es `Reclamo / Siniestro`.
- Genera `reclamoId` y numero `SIN-AAAA-####`.
- Crea gestion Ops enlazada por `reclamoId`.
- Inserta actividad de historial con `reclamoId`.
- `modules/siniestros.js` actualiza Historial y gestiones Ops enlazadas cuando cambia el estado del reclamo.
- Si el estado pasa a `Pagado` o `Rechazado`, la gestion enlazada pasa a `Resuelta`.
- `modules/cliente360.js` permite ver y crear reclamos desde la ficha.

Estado: RESUELTO EN CODIGO / PENDIENTE VALIDACION VISUAL CLIC POR CLIC.

### Badges tecnicos

Avance:

- `core/config.js` agrega `hideTechnicalBadges: true` por defecto.
- Agrega merge de claves nuevas del tenant default para instalaciones persistidas.

Estado: RESUELTO EN CODIGO / PENDIENTE VALIDACION VISUAL.

### Finanzas desde datos vivos

Avance:

- `core/queries.js` agrega `Orbit.q.postRecaudo(cobro, fecha, metodo)`.
- `modules/cobros.js`, `modules/cliente360.js` y `core/importa.js` lo llaman al aplicar pagos o conciliar.
- El movimiento financiero se crea en `finmovs` con id idempotente `fmv_cob_<cobroId>`.
- `modules/finanzas.js` elimina codigo muerto/hardcodeado segun la bitacora del ZIP.

Estado: AVANCE IMPORTANTE / PENDIENTE VALIDACION VISUAL Y DE DATOS.

### Notificacion transversal al cliente

Avance:

- Nuevo `core/notify.js` con `Orbit.notify.cliente` y `Orbit.notify.pedir`.
- Soporta WhatsApp/correo, preview editable y registro en actividades.
- Cableado en pagos, gestion resuelta, comparativo y cotizador.
- Es prototipo: usa `wa.me`, compositor Orbit o `mailto`; backend real por Make/webhook queda pendiente.

### Importador inteligente

Avance:

- `core/importa.js` agrega dry-run antes de guardar: crear / actualizar / omitir / errores por fila.
- Conciliacion de pagos postea recaudo a Finanzas mediante `Orbit.q.postRecaudo`.

### Otros avances

- `modules/insights.js`: filtro global por asesor.
- `modules/polizas.js`: KPIs filtrables por estado.
- `modules/marketing.js`: responsable y aprobacion en calendario.
- `modules/renovaciones.js`: avances de campana segmentada y notificacion por lote segun bitacora.
- `modules/automatizaciones.js`: elimina referencia funcional ajena en comentario.

## 6. Regresiones / pendientes que NO deben perderse

1. P0: eliminar `localStorage` directo de `modules/configuracion.js`.
2. P1/P0: sustituir fechas quemadas en `core/ciclo.js`, `modules/cliente360.js`, `modules/portal.js`, `modules/siniestros.js`.
3. P0: no copiar `index.html` sin reinsertar hook LAB.
4. P0 backend: no sobrescribir ni degradar `data/store-firestore-lab.local.js` ni contrato `Orbit.store`.
5. P1: `core/notify.js` debe convertirse a adaptador backend-ready cuando se reactive backend real.
6. P1: validar Finanzas con pagos aplicados y conciliacion sobre `finmovs`.

## 7. Recomendacion de empalme

Empalme selectivo, no full copy.

Candidatos de alto valor:

- `core/notify.js`
- `core/queries.js`
- `core/importa.js`
- `core/config.js`
- `modules/portal.js`
- `modules/siniestros.js`
- `modules/cobros.js`
- `modules/cliente360.js`
- `modules/comparativo.js`
- `modules/cotizador.js`
- `modules/finanzas.js`
- `modules/polizas.js`
- `modules/insights.js`
- `modules/marketing.js`
- `modules/renovaciones.js`
- `modules/cancelaciones.js`
- docs nuevos de auditoria/sincronias/finanzas.

No copiar sin revision/parche:

- `data/store.js`
- `modules/configuracion.js`
- `index.html` sin reinsercion LAB
- `docs/legacy/Orbit360-demo-standalone-NO-USAR.html`

## 8. Prueba visual obligatoria pendiente

URL demo local recomendada:

`http://127.0.0.1:5177/index.html`

No usar `?orbitBackend=firestore-lab` para esta prueba si Firestore LAB esta vacio.

Caso obligatorio:

1. Entrar a Portal cliente demo.
2. Reportar Reclamo/Siniestro.
3. Confirmar que aparece en Ops.
4. Confirmar que aparece en Historial.
5. Confirmar que aparece en modulo Siniestros.
6. Confirmar que aparece en Cliente 360 > ficha > Siniestros.
7. Cambiar estado en Siniestros.
8. Confirmar reflejo en Ops/Historial.
9. Cerrar gestion Ops.
10. Confirmar que cerrar gestion no borra siniestro.

## 9. Estado

ABIERTO. Mini-release auditado, documentado y preparado para empalme seguro. No se hizo deploy, merge ni produccion.