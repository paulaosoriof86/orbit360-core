# Preparación estática M3 — activación del tenant

Fecha: 2026-07-24  
Gate: `block3-tenant-activation-static-v20260724`  
Contrato: `3.0.0`

## Prerrequisito cerrado

M2 productivo read-only está cerrado con el run `30123408050`: identidad y membership existentes, store instalado, snapshots adjuntos, cero fallback y escrituras bloqueadas.

## Objetivo M3

Preparar una activación de tenant repetible y fail-closed sin ejecutar activación ni persistencia. El tenant debe resolverse exclusivamente desde membership y reutilizar el runtime productivo read-only ya validado.

## Hallazgos de arquitectura

- `core/config.js` conserva `localStorage` como comportamiento de prototipo; no puede ser fuente productiva de configuración.
- `core/router-tenant-config-bootstrap.js` todavía puede leer `tenant` desde query string para la experiencia visual M1; no puede resolver identidad ni tenant productivo.
- El owner M3 debe apoyarse en `tenantCanonicalPathsP0`, `membershipMultirolP0` y la política de acceso, no en esos fallbacks visuales.

Clasificación de los fallbacks: `TEMPORAL_RETIRO`. No se eliminan en esta fase y no se convierten en backend.

## Contrato implementado

`core/tenant-activation-plan-contract-p0.js` es puro, reusable y sin hardcode A&S. Exige:

- M2 runtime cerrado;
- tenant e identidad desde membership;
- fuente productiva distinta de query string, localStorage, demo, seed o hardcode;
- store read-only sin fallback;
- países y moneda configurados;
- branding y módulos declarados;
- una identidad existente elegible;
- integraciones con estados honestos;
- actor y motivo;
- confirmación reforzada si existe ampliación de acceso;
- cero secretos, cero escrituras, cero Rules, cero deploy y cero importaciones.

## Frontera M3 / M4

M3 prepara activación y evidencia. Se difieren expresamente a M4:

```text
persistencia de configuración
persistencia de memberships
migración de 414 clientes
migración de 26 aseguradoras
```

Ninguna de esas operaciones está autorizada por este gate.

## Salida esperada

```text
M3_TENANT_ACTIVATION_STATIC_READY
writeAuthorized: false
writeExecuted: false
activationAuthorized: false
activationExecuted: false
m4Deferred: true
```

## Seguridad

```text
Secretos: no
Firebase: no
Firestore: no
Runtime: no
Escrituras: 0
Rules: no
Hosting/Functions: no
Importaciones: no
Pólizas: no
Merge/main: no
```

## Siguiente acción exacta

Ejecutar una sola vez el gate estático ligado a un request inmutable. Solo después de evidencia sanitizada `ok:true` podrá presentarse una autorización separada para la activación controlada de M3.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.
