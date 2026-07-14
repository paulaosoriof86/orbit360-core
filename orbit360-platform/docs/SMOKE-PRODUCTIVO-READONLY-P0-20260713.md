# Smoke productivo read-only P0 — Orbit 360

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Propósito

Preparar el primer smoke contra un entorno productivo autorizado sin habilitar escrituras, sin fallback demo/LAB y sin exponer secretos o datos personales en el reporte.

Este bloque no conecta Firebase, no instala el store, no adjunta snapshots y no autoriza deploy. Solo define el contrato que consumirá evidencias sanitizadas cuando el entorno exista.

## Cadena validada

```txt
readiness productivo
→ identidad autenticada
→ membresía activa del tenant
→ rol activo y scopes
→ planner de consultas
→ store productivo read-only
→ snapshots filtrados
→ aislamiento tenant
→ manifiesto sanitizado PASS/BLOCKED
```

## Archivo

```txt
core/product-readonly-smoke-contract-p0.js
```

Funciones principales:

```txt
validateReadiness
validateIdentity
validateStoreStatus
validateCollections
validateIsolation
validateWriteLock
buildManifest
```

## Gates bloqueantes

El smoke queda `BLOCKED` si ocurre cualquiera de estos casos:

- modo distinto de `product`;
- readiness incompleto;
- membresía inactiva o sin rol activo;
- tenant inconsistente;
- store con fallback;
- `writeEnabled` distinto de `false`;
- store no está en `ready-read-only`;
- colección requerida sin snapshot o sin denegación explícita;
- consulta sin constraint `tenantId`;
- error de snapshot;
- fila cross-tenant detectada;
- marcador read-only ausente;
- prueba de escritura ejecutada;
- dato demo/LAB o secreto dentro del reporte.

## Resultado sanitizado

El manifiesto no conserva UID ni correo completo. Solo reporta:

```txt
userRef hash
emailDomain
activeRole
assignedRoleCount
countryCount
tenantId
estado de fases
errores sanitizados
```

## Regla de escritura

```txt
writeAuthorized: false
deployAuthorized: false
```

Un `PASS` read-only no habilita escrituras. El siguiente paso sigue siendo una revisión humana explícita antes de cualquier cambio de modo.

## Validación

```txt
node tools/orbit360-validar-product-readonly-smoke-contract-p0.mjs
```

Criterio esperado:

```txt
ok: true
28 pruebas aprobadas
```

## Carriles

- Carril A: no modifica candidata Claude ni UX.
- Carril B: contrato de smoke productivo read-only preparado.
- Carril C: no escribe ni transforma fuentes reales.

## ¿Aplica a Claude/prototipo?

Sí, únicamente como patrón de estados honestos y Academia:

- Verificación de conexión pendiente.
- Verificación en solo lectura.
- Escritura bloqueada.
- Acceso restringido por rol o alcance.
- Requiere revisión antes de habilitar cambios.

No debe mostrarse al usuario final terminología como Firebase, Firestore, backend, LAB, smoke, localStorage o credenciales.
