# Orbit 360 · Metodología de releases continuos

**Fecha:** 2026-07-03  
**Aplica a:** Orbit 360 — A&S / Backend LAB / Prototipos Claude  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama backend estable:** `ays/backend-tenant-lab-v99-20260703`

---

## 1. Decisión operativa

Paula enviará con frecuencia nuevos ZIP de Claude porque cada paquete busca mejorar el prototipo. Por tanto, **un ZIP nuevo no significa reiniciar el proyecto, crear una metodología nueva ni reabrir todas las decisiones**.

Desde ahora, cada ZIP nuevo se procesa como **release candidate incremental**.

La meta es:

1. aprovechar rápido las mejoras del prototipo más reciente,
2. evitar reprocesos,
3. no perder backend LAB,
4. no romper `Orbit.store`,
5. documentar lo que Claude resolvió y lo que sigue pendiente,
6. mantener una base comercializable SaaS multi-tenant.

---

## 2. Regla principal

**Trabajamos siempre sobre la versión más nueva aprobada por Paula, pero empalmándola sobre la rama backend estable.**

No se debe repetir este debate en cada conversación. El flujo ya queda definido.

---

## 3. Flujo ágil para cada nuevo ZIP Claude

### Paso 1 — Identificar release

Registrar:

- nombre del ZIP,
- fecha/hora,
- versión interna si existe,
- `?v` de scripts,
- `seed.__v`,
- archivos modificados frente al ZIP anterior.

### Paso 2 — Auditoría delta, no auditoría total desde cero

Comparar contra:

1. ZIP inmediatamente anterior,
2. V99/V89 o última base backend empalmada,
3. pendientes acumulados Claude,
4. backend LAB actual.

El objetivo es responder:

- qué resolvió,
- qué mejoró,
- qué rompió,
- qué sigue pendiente,
- qué debe pasar al prototipo base,
- qué debe pasar al backend.

### Paso 3 — Gate de seguridad

Antes de empalmar, revisar:

- no borra hooks backend LAB,
- no reemplaza `data/store.js` conectado o adaptado a backend sin revisión,
- no rompe API `Orbit.store`,
- no introduce `localStorage` directo en módulos,
- no hardcodea A&S o datos reales,
- no mezcla GTQ/COP,
- no introduce notas técnicas en UI cliente,
- no cambia reglas financieras ya corregidas.

### Paso 4 — Empalme selectivo

Se actualizan del ZIP nuevo los archivos que realmente cambiaron o que traen mejora funcional.

Regla práctica:

- `modules/`, `core/`, `styles/`: se pueden actualizar si pasan gate.
- `index.html`: se actualiza conservando hooks backend LAB y `Orbit.store.pref/setPref`.
- `data/seed.js`: solo demo ficticio; no reemplaza datos reales.
- `data/store.js`: no se reemplaza si ya está conectado/adaptado a backend sin revisión explícita.
- Archivos backend LAB: siempre se preservan.

### Paso 5 — Documentación inmediata

Actualizar o crear:

- documento de estado de versión,
- pendientes Claude,
- pendientes backend/Codex,
- changelog complementario o `CHANGELOG.md`,
- bitácora de cambios,
- bitácora de errores si hubo bug.

### Paso 6 — Smoke mínimo

Validar:

1. demo normal sin querystring,
2. modo LAB con `?orbitBackend=firestore-lab&tenant=alianzas-soluciones`,
3. no fallback silencioso,
4. módulos principales renderizan,
5. no errores JS críticos,
6. `Orbit.store` mantiene contrato.

---

## 4. Cuándo NO crear rama nueva

No crear rama nueva por cada ZIP si:

- el cambio es continuidad del prototipo,
- se trabaja sobre la rama backend LAB ya autorizada,
- no hay reestructura destructiva,
- se puede empalmar por archivos y documentar.

En ese caso, se trabaja directamente en:

`ays/backend-tenant-lab-v99-20260703`

con commits pequeños y documentados.

---

## 5. Cuándo SÍ crear rama nueva

Crear rama nueva solo si:

- el ZIP cambia arquitectura de forma masiva,
- se reemplaza `data/store.js`,
- se toca Auth/Firestore/tenant de forma riesgosa,
- se mezclan proyectos,
- hay riesgo de romper backend LAB validado,
- Paula pide explícitamente una rama separada,
- se prepara PR/release grande para revisión.

---

## 6. Regla financiera fija

- Pago de póliza por cliente no crea `finmov` como ingreso caja/banco.
- Factura de comisión emitida a aseguradora sí crea CxC/facturado.
- Solo pasa a ingreso real cuando se marca `recaudada` o se concilia banco/caja.
- Reportes deben separar `facturado` vs `recaudado`.

---

## 7. Regla backend fija

El backend LAB se conserva y no se reinicia.

Archivos protegidos:

- `core/backend-lab-loader.js`
- `core/backend-lab-init.js`
- `data/store-firestore-lab.local.js`
- `core/auth-firebase.config.local.js`

API protegida:

- `Orbit.store.all`
- `Orbit.store.get`
- `Orbit.store.where`
- `Orbit.store.find`
- `Orbit.store.insert`
- `Orbit.store.update`
- `Orbit.store.remove`
- `Orbit.store.on`
- `Orbit.store._emit`
- `Orbit.store.pref`
- `Orbit.store.setPref`
- `Orbit.store.init`
- `Orbit.store.reseed`
- `Orbit.store.raw`

---

## 8. Prompt corto para próximos chats

```text
Continúa Orbit 360 con metodología de releases continuos. Lee docs/METODOLOGIA-RELEASES-CONTINUOS.md y docs/ORBIT360_ESTADO_TRABAJO_ACTUALIZACION_V188_20260703.md. Cada ZIP nuevo de Claude es release candidate incremental: audita delta, compara contra ZIP anterior, V99/V89 y pendientes acumulados; empalma sobre rama backend estable sin reiniciar ni borrar backend LAB; documenta cambios y pendientes; smoke demo + LAB. No crear rama nueva salvo riesgo alto o instrucción expresa. Repo: paulaosoriof86/orbit360-core. Rama: ays/backend-tenant-lab-v99-20260703.
```
