# Smoke estático local · Orbit 360 v1.88 empalme backend LAB

**Fecha:** 2026-07-03  
**Base local:** `/mnt/data/orbit360-v188-prepared/orbit360-platform`  
**Paquete local preparado:** `orbit360-v188-empalme-local-preparado.zip`  
**Rama destino:** `ays/backend-tenant-lab-v99-20260703`

---

## 1. Referencias en `index.html`

- Scripts referenciados: 52
- CSS referenciados: 3
- Referencias faltantes dentro del paquete local: 3
  - `core/backend-lab-loader.js?v=lab-20260703`
  - `core/backend-lab-init.js?v=lab-20260703`
  - `data/store-firestore-lab.local.js?v=lab-store-20260703`

Estas referencias faltan en el paquete local porque el ZIP de Claude no trae los archivos backend LAB. En la rama GitHub sí existen y están protegidos.

---

## 2. Hooks backend LAB

Validación local del paquete preparado:

- `core/backend-lab-loader.js`: falta dentro del ZIP local preparado.
- `core/backend-lab-init.js`: falta dentro del ZIP local preparado.
- `data/store-firestore-lab.local.js`: falta dentro del ZIP local preparado.

Validación GitHub rama backend:

- `core/backend-lab-loader.js`: existe.
- `core/backend-lab-init.js`: existe.
- `data/store-firestore-lab.local.js`: existe.
- `core/auth-firebase.config.local.js`: no existe en repo, correcto porque debe ser local/ignorado y no contener secretos en GitHub.

---

## 3. `localStorage` en archivos clave

- `index.html`: 1 ocurrencia, solo comentario de control; no uso ejecutable para sidebar.
- `modules/configuracion.js`: 0 ocurrencias.
- `modules/finanzas.js`: 0 ocurrencias.
- `data/seed.js`: 0 ocurrencias.
- `core/config.js`: 6 ocurrencias internas de core/tenant/catálogos; pendiente para fase backend profunda si se decide migrar también esas preferencias a `Orbit.store`.

---

## 4. `node --check`

Resultado local:

- `core/config.js`: OK
- `data/seed.js`: OK
- `modules/configuracion.js`: OK
- `modules/finanzas.js`: OK
- `data/store.js`: OK

---

## 5. Sintaxis JS total

- Archivos JS revisados: 49
- Errores de sintaxis: 0

---

## 6. Versionado

- `v1287` en `index.html`: 52 ocurrencias.
- `seed.__v` detectado: 35.

---

## 7. Conclusión

El paquete local v1.88 está preparado para empalme frontend y pasa smoke estático. No debe usarse como reemplazo completo del repo sin reincorporar/preservar los hooks backend LAB desde la rama GitHub.

Estado siguiente:

1. Aplicar lote grande de archivos v1.88 con trazabilidad.
2. Preservar hooks backend LAB.
3. Ejecutar smoke demo + LAB con servidor local antes de migrar datos reales.
