# P0 Backend LAB · Escrituras fallidas no deben parecer guardadas

**Fecha:** 2026-07-03  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Archivo auditado:** `orbit360-platform/data/store-firestore-lab.local.js`

---

## 1. Hallazgo

En el adaptador Firestore LAB actual, las funciones:

- `insert(collection, payload)`
- `update(collection, id, patch)`
- `remove(collection, id)`
- `setPref(key, value)`

actualizan caché local primero y después intentan escribir en Firestore. Si Firestore falla, el error se registra con `setError(...)`, pero la UI puede quedar mostrando el dato como si se hubiera guardado.

Esto no es fallback demo completo, pero sí puede generar una falsa sensación de persistencia.

---

## 2. Riesgo

Para LAB/demo técnica es tolerable temporalmente, pero para backend comercializable es P0 porque:

- el usuario puede creer que una póliza, factura, cobro o gestión quedó guardada cuando Firestore falló;
- una recarga puede perder el dato;
- no hay cola visible de escrituras pendientes/fallidas;
- no hay evento claro para UI/diagnóstico;
- puede ocultar errores de permisos, reglas o tenant.

---

## 3. Regla esperada

El backend debe mantener la API síncrona compatible con módulos, pero agregar trazabilidad:

1. Cada escritura debe registrar estado:
   - `pending`,
   - `synced`,
   - `failed`.
2. Si Firestore falla:
   - conservar `state.lastError`,
   - registrar item en `state.writeErrors`,
   - emitir evento `orbit:backend:write-error`,
   - marcar registro con `_syncStatus: 'failed'` si aplica.
3. Si Firestore confirma:
   - marcar `_syncStatus: 'synced'` o limpiar marca técnica,
   - emitir `orbit:backend:write-ok`.
4. La UI comercial no debe mostrar notas técnicas al cliente, pero el smoke/backend sí debe poder leer el estado.

---

## 4. Restricción

No se debe cambiar el contrato de módulos:

- `insert` debe seguir devolviendo el registro.
- `update` debe seguir devolviendo el registro.
- `remove` debe seguir devolviendo `true`.
- `setPref` debe seguir devolviendo el valor.

La mejora debe ser interna del adaptador/backend y compatible con UI existente.

---

## 5. Propuesta de implementación mínima

Agregar al `state`:

```js
writeQueue: [],
writeErrors: [],
lastWriteAt: null,
lastWriteErrorAt: null
```

Agregar helpers:

```js
function markPending(collection, id, op) { ... }
function markSynced(collection, id, op) { ... }
function markWriteFailed(collection, id, op, error) { ... }
function emitBackendEvent(name, detail) { ... }
```

Modificar `.catch(...)` de Firestore en `insert/update/remove/setPref` para registrar fallo de escritura sin romper retorno síncrono.

---

## 6. Estado

**ABIERTO / P0 Backend LAB.**

Debe implementarse antes de declarar Backend LAB listo para migración operativa real de A&S.
