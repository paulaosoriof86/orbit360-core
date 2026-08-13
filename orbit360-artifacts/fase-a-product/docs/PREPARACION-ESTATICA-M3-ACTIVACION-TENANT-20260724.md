# Preparación estática M3 — activación del tenant

Fecha: 2026-07-24  
Gate: `block3-tenant-activation-static-v20260724`  
Contrato: `3.0.0`

## Prerrequisito cerrado

M2 productivo read-only está cerrado con el run `30123408050`: identidad y membership existentes, store instalado, snapshots adjuntos, cero fallback y escrituras bloqueadas.

## Ejecución vinculante

```text
Run: 30125893901
Request commit: 290226d4c8c57d908c20e5559fc00ba1380991a7
Artifact: 8609200003
Digest: sha256:8ef2a04146ad96bc5506de6d2a4bb092afea43c84e24aab9b0306cfa7ad027a3
Preflight canónico: GO_GATE_CONTRACT 28/28
Contrato estático: PASS 37/37
Resultado: M3_TENANT_ACTIVATION_STATIC_READY
```

Todas las etapas del workflow finalizaron en success, incluida la validación de la solicitud inmutable y la aceptación sanitizada.

## Objetivo y cierre M3 estático

Se preparó una activación de tenant repetible y fail-closed sin ejecutar activación ni persistencia. El tenant debe resolverse exclusivamente desde membership y reutilizar el runtime productivo read-only ya validado.

La salida vinculante confirmó:

```text
writeAuthorized: false
writeExecuted: false
activationAuthorized: false
activationExecuted: false
secretAccess: false
firebaseAccess: false
firestoreRead: false
configurationWrites: 0
membershipWrites: 0
clientWrites: 0
insurerWrites: 0
m4Deferred: true
```

## Hallazgos de arquitectura

- `core/config.js` conserva `localStorage` como comportamiento de prototipo; no puede ser fuente productiva de configuración.
- `core/router-tenant-config-bootstrap.js` puede leer `tenant` desde query string para la experiencia visual M1; no puede resolver identidad ni tenant productivo.
- El owner M3 se apoya en `tenantCanonicalPathsP0`, `membershipMultirolP0` y la política de acceso, no en esos fallbacks visuales.

Clasificación de los fallbacks: `TEMPORAL_RETIRO`. No se eliminan en esta fase y no se convierten en backend.

## Contrato probado

`core/tenant-activation-plan-contract-p0.js` es puro, reusable y sin hardcode A&S. La evidencia 37/37 demostró:

- M2 runtime obligatorio y cerrado;
- tenant e identidad exclusivamente desde membership;
- allowlist de fuentes productivas;
- query string, localStorage, demo, seed, hardcode y fuentes desconocidas bloqueadas;
- store read-only sin fallback;
- moneda canónica por país: GT→GTQ y CO→COP;
- branding, módulos y una identidad elegible requeridos;
- integraciones activas solo con conexión real verificada;
- actor y motivo obligatorios;
- confirmación `CONFIRMO ACTIVAR TENANT` ante ampliación de acceso;
- auditoría y rollback planificados, no ejecutados;
- secretos, activación, Rules, deploy, importaciones y toda escritura bloqueados.

## Frontera M3 / M4

Se difieren expresamente a M4:

```text
persistencia de configuración
persistencia de memberships
migración de 414 clientes
migración de 26 aseguradoras
```

Ninguna de esas operaciones fue ejecutada ni está autorizada.

## Incidencia de mecanismo sin impacto

Antes del request se intentó registrar el HEAD dentro de metadata que a su vez movía el HEAD. La referencia circular fue retirada y el vínculo quedó únicamente en el request inmutable.

La comparación entre `49e2c7258a9ad5ee073ab8f06bee37f6cebc31eb` y `6352876bff645eef58be39fa04b1b45c4c9785fb` confirmó:

```text
commits intermedios: 2
archivos con delta neto: 0
gate afectado: no
producto afectado: no
```

Clasificación: `PIPELINE_MECHANISM_FAILURE_CORRECTED_BEFORE_GATE`.

## Estado

```text
M1: CERRADO
M2: CERRADO
M3 preparación estática: CERRADA / READY
M3 activación real: NO AUTORIZADA
Allowed static executions: 0
Allowed activation executions: 0
M4: BLOQUEADO
Pólizas: BLOQUEADO
Producción/deploy: NO EJECUTADO
```

## Siguiente acción exacta

Revisar esta evidencia y solicitar una autorización nueva, explícita y separada si se decide ejecutar la activación controlada de M3. El request estático consumido no puede reutilizarse y este cierre no autoriza persistencia ni migración.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.
