# CLAUDE ACUMULADO — V35 MÍNIMO PRIVILEGIO SOBRE LOG VIEW

Fecha: 2026-08-10

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Ante una capacidad de lectura ausente demostrada por `testIamPermissions`:

- no otorgar roles de proyecto por defecto;
- localizar el recurso de menor nivel compatible con el rol;
- separar preparación source-only de autorización runtime;
- usar policy+etag para evitar overwrite concurrente;
- preservar todos los bindings preexistentes;
- limitar el runtime a un grant y un revoke;
- volver obligatorio el revoke tanto en PASS como en STOP;
- persistir únicamente evidencia sanitizada, nunca principal, token ni credencial.

## Implementación Orbit 360 v35

Recurso objetivo futuro:

`projects/ays-orbit-360-lab/locations/global/buckets/_Default/views/_AllLogs`

Rol:

`roles/logging.privateLogViewer`

Scope:

`LOG_VIEW`

Máximo de mutaciones IAM futuras:

`2 = 1 grant + 1 revoke`

No usar:

- grant a nivel proyecto;
- custom role temporal;
- IAM policy completa sin etag;
- segundo intento automático;
- persistencia del principal real.

## Límites de replicación

Este patrón es reusable como arquitectura/control. No exportar secretos, IDs reales, principales reales ni evidencia de clientes.
