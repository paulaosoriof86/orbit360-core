# Avance de empalme v1.97 · Orbit 360

**Fecha:** 2026-07-03  
**ZIP fuente:** `Prototype Development Request - 2026-07-03T090030.154.zip`  
**Base anterior:** v1.88 / `Prototype Development Request - 2026-07-03T000030.492.zip`  
**Rama backend:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** preparado para empalme controlado, sin reemplazo ciego.

---

## 1. Decisión aplicada

El ZIP v1.97 se adopta como nueva base de prototipo, pero debe empalmarse sobre backend LAB de forma controlada.

No se crea rama nueva porque aplica la metodología de releases continuos:

- ZIP nuevo = release candidate incremental.
- Auditar delta.
- Documentar cerrados, abiertos y regresiones.
- Empalmar solo archivos necesarios.
- Preservar backend LAB.
- No tocar `main`.
- No deploy.

---

## 2. Paquete local preparado

Se preparó localmente:

`orbit360-v197-empalme-local-preparado.zip`

Este paquete parte del ZIP v1.97 y modifica únicamente `index.html` para empalme backend:

1. Reintegra hooks LAB:
   - `core/backend-lab-loader.js?v=lab-20260703`
   - `core/backend-lab-init.js?v=lab-20260703`
   - `data/store-firestore-lab.local.js?v=lab-store-20260703`
2. Mantiene `data/store.js?v1291` y `data/seed.js?v1291`.
3. Reemplaza persistencia del sidebar por:
   - `Orbit.store.pref('orbit360_sbhide', '0')`
   - `Orbit.store.setPref('orbit360_sbhide', value)`
4. Conserva versiones específicas del ZIP:
   - base mayoritaria `v1291`,
   - `core/auth.js?v1292`,
   - `core/ciclo.js?v1294`,
   - `modules/finanzas.js?v1294`.

---

## 3. Validaciones realizadas

### Estructura ZIP v1.97

- Raíz única `orbit360-platform/`.
- Sin ZIPs internos.
- Sin `orbit360-platform/` anidado.
- Sin `.bak`, `.old`, `.tmp`, `copy` o `copia`.
- Se eliminó `.verify-academia.png` respecto a v1.88.
- Mantiene `docs/legacy/Orbit360-demo-standalone-NO-USAR.html`, marcado como legacy.

### Sintaxis / estático

- Archivos del paquete v1.97 revisados con `node --check`.
- Resultado: 0 errores de sintaxis.
- `seed.__v = 36`.
- `modules/configuracion.js`: 0 `localStorage`.
- `modules/finanzas.js`: 0 `localStorage`.
- `data/seed.js`: 0 `localStorage`.
- `index.html` preparado: solo queda una mención a `localStorage` dentro del comentario “sin localStorage directo”; no hay uso ejecutable para sidebar.

---

## 4. Archivos cambiados por Claude v1.97 frente a v1.88

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

---

## 5. Reglas de empalme pendientes

Antes de aplicar archivos grandes a GitHub o al repo local:

1. No reemplazar `data/store.js`.
2. No reemplazar `data/store-firestore-lab.local.js v1.74`.
3. Preservar `core/backend-lab-loader.js`.
4. Preservar `core/backend-lab-init.js`.
5. No subir `core/auth-firebase.config.local.js`.
6. Empalmar `index.html` preparado, no el index original del ZIP.
7. Ejecutar smoke demo y LAB.

---

## 6. Estado

**EN PROGRESO.**

Ya quedó auditado y documentado. Falta aplicar el lote v1.97 completo a la rama backend estable y ejecutar smoke real.
