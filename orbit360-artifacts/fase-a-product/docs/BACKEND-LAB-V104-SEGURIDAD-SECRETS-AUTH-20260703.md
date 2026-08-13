# Backend LAB v1.104 — seguridad de secretos, tenant y auth

**Fecha:** 2026-07-03  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** aplicado en rama / pendiente smoke local real.

## 1. Objetivo

Continuar backend sin sacrificar estabilidad ni perder el empalme del prototipo. Este bloque no inicia producción, no hace deploy y no carga datos reales. Refuerza el Backend LAB para que el trabajo posterior de Firestore/Auth/Integraciones no reintroduzca exposición de secretos desde el navegador.

## 2. Archivos modificados o creados

- `orbit360-platform/core/backend-lab-loader.js`
- `orbit360-platform/core/backend-lab-init.js`
- `orbit360-platform/core/backend-lab-security-guard.js`
- `tools/orbit360-integrar-backend-lab-index.ps1`
- `tools/orbit360-validar-backend-lab-contrato.mjs`
- `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260703.md`
- `orbit360-platform/docs/BACKEND-LAB-V104-SEGURIDAD-SECRETS-AUTH-20260703.md`

## 3. Cambios técnicos

### 3.1 Loader LAB

`core/backend-lab-loader.js` queda en v1.104 y solo actúa cuando la URL usa:

```txt
?orbitBackend=firestore-lab&tenant=alianzas-soluciones
```

Se agregó allowlist de tenant. Cualquier tenant distinto queda bloqueado en modo LAB.

### 3.2 Init Firebase LAB

`core/backend-lab-init.js` queda en v1.104. Valida que el config local ignorado exponga al menos `projectId` y `authDomain`. No escribe secretos en el repo. Solo guarda metadata pública de diagnóstico: proyecto, dominio y banderas de presencia.

### 3.3 Security Guard

Nuevo archivo:

```txt
orbit360-platform/core/backend-lab-security-guard.js
```

Responsabilidades:

1. Bloquear persistencia frontend de claves sensibles en `Orbit.store.setPref`.
2. Limpiar campos sensibles antes de `Orbit.store.insert` y `Orbit.store.update`.
3. Bloquear `insert/update/remove` si el usuario autenticado no es el usuario LAB esperado.
4. Emitir eventos de diagnóstico:
   - `orbit:backend:sensitive-blocked`
   - `orbit:backend:auth-blocked`
   - `orbit:backend:security-guard-installed`
5. Exponer estado en `OrbitBackend.securityGuard` sin secretos.

### 3.4 Script de integración local del index

`tools/orbit360-integrar-backend-lab-index.ps1` ahora inserta el guard en este orden:

```txt
backend-lab-loader.js
backend-lab-init.js
data/store.js
data/store-firestore-lab.local.js
backend-lab-security-guard.js
data/seed.js
```

El script conserva:

- verificación de rama obligatoria;
- backup local del `index.html`;
- reporte `.txt`;
- copia al portapapeles;
- apertura en Notepad;
- sin commit/push/deploy automático.

### 3.5 Validador estático

Nuevo archivo:

```txt
tools/orbit360-validar-backend-lab-contrato.mjs
```

Verifica sin red, sin Firebase y sin secretos:

- archivos LAB requeridos;
- `use strict`;
- allowlist tenant;
- presencia de guard;
- API `Orbit.store` esperada en store LAB;
- `.gitignore` para config local;
- estado de integración permanente en `index.html`.

## 4. Qué no se hizo

- No se editó `main`.
- No se hizo merge.
- No se hizo deploy Hosting.
- No se publicaron reglas.
- No se cargaron datos reales.
- No se persistieron secretos.
- No se reemplazó `data/store.js` del prototipo.
- No se tocó ningún módulo funcional para backend.
- No se hizo smoke visual real desde este entorno porque no hay navegador autorizado aquí.

## 5. Pendientes inmediatos

1. Ejecutar localmente en la rama obligatoria:

```txt
node tools/orbit360-validar-backend-lab-contrato.mjs
```

2. Ejecutar el flujo maestro local cuando corresponda:

```txt
tools/orbit360-run-flujo-ays-lab-v99.ps1
```

3. Revisar reportes en `_orbit360_reports`.
4. Solo después decidir si se hace commit local del `index.html` integrado o si se mantiene como inyección temporal.
5. Empalmar el candidato Claude final completo sobre la rama sin reemplazar backend LAB.

## 6. Nota para Claude/prototipo

Este aprendizaje debe reportarse a Claude cuando Paula pida el archivo de pendientes:

- no pedir API keys ni webhooks como valores visibles finales en pantallas cliente;
- no persistir secretos en frontend ni Firestore directo;
- mantener copy comercial de “conexión segura / proveedor seguro”;
- dejar credenciales reales como backend/secret manager por tenant;
- conservar `core/backend-lab-security-guard.js` y los scripts de validación si el prototipo vuelve a tocar Integraciones/Automatizaciones.
