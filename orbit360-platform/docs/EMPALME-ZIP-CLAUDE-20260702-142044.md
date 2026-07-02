# Orbit 360 - Plan de empalme seguro ZIP Claude 2026-07-02 14:20:44

Fecha: 2026-07-02
Estado: PREPARADO / NO EJECUTADO
ZIP: `Prototype Development Request - 2026-07-02T142044.699.zip`
Rama objetivo: `backend/v99-clean-claude-lab-20260701`
PR: #3 draft

## 1. Decision

No hacer reemplazo completo del ZIP. El empalme debe ser selectivo porque el backend LAB ya esta protegido y el ZIP nuevo es un mini-release visual/UX de Claude.

## 2. Proteccion obligatoria

Preservar siempre:

- `orbit360-platform/data/store-firestore-lab.local.js`
- `orbit360-platform/core/auth-firebase.config.local.js`
- Firestore rules y scripts LAB existentes
- configuracion local ignorada por Git
- documentacion backend ya creada
- API completa de `Orbit.store`

Orden script obligatorio cuando se valide backend LAB:

`data/store.js -> data/store-firestore-lab.local.js -> data/seed.js`

## 3. Pre-gate local

1. Confirmar rama `backend/v99-clean-claude-lab-20260701`.
2. Ejecutar `git status --short`.
3. Si hay cambios locales, no destruirlos y hacer backup antes de cualquier copia.
4. Confirmar existencia de `data/store-firestore-lab.local.js`.
5. Confirmar que el ZIP contiene `orbit360-platform/`.

## 4. Empalme recomendado

Copiar selectivamente desde el ZIP:

- `core/notify.js`
- `core/queries.js`
- `core/importa.js`
- `core/config.js`
- `core/ciclo.js`
- `core/ui.js`
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
- `modules/automatizaciones.js`
- `modules/inicio.js`
- `data/seed.js` solo para demo local, no como backend real
- docs nuevos y bitacoras de Claude

Copiar `index.html` solo si el script reinsertara el hook LAB.

No copiar sin parche:

- `modules/configuracion.js`, porque trae `localStorage` directo para logo.
- `data/store.js`, porque la rama backend/LAB tiene contrato y hook protegidos.

## 5. Parches post-copia obligatorios

1. Reinsertar hook LAB en `index.html` si existe `data/store-firestore-lab.local.js`.
2. Corregir `modules/configuracion.js` si se copia por error: eliminar `localStorage.setItem/removeItem('orbit360_logo')` y usar `Orbit.tenant` / `Orbit.store.pref/setPref`.
3. Sanear fechas quemadas detectadas:
   - `core/ciclo.js`
   - `modules/cliente360.js`
   - `modules/portal.js`
   - `modules/siniestros.js`
4. Ejecutar scans:
   - mojibake
   - referencias ajenas funcionales
   - `localStorage` real en modulos
   - `alert/prompt/confirm` nativos
5. Ejecutar `node --check`.
6. Ejecutar Fase 7D.
7. Validar visualmente en Chrome.

## 6. Prueba visual obligatoria

URL demo local recomendada:

`http://127.0.0.1:5177/index.html`

No usar `?orbitBackend=firestore-lab` para la prueba Portal -> Siniestros si Firestore LAB esta vacio.

Caso:

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

## 7. Estado de cierre

Pendiente de ejecutar localmente. No hay autorizacion para deploy, merge ni produccion.