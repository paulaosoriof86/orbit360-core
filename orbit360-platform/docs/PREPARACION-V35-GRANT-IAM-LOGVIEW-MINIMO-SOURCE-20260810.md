# PREPARACIÓN V35 — GRANT IAM TEMPORAL MÍNIMO SOBRE LOG VIEW

Fecha: 2026-08-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate rector: `block1-client360-insurers-lab-v20260717` / contrato `1.0.41`

## Motivo

V34 demostró objetivamente que la cuenta LAB no posee `logging.logEntries.list` ni `logging.privateLogEntries.list`. No se autoriza repetir v33/v34 ni otorgar privilegios de forma automática.

Clasificación de entrada:

`ENVIRONMENT_FAILURE / REQUIRED_LOGGING_PERMISSION_NOT_EFFECTIVE`

## Decisión de mínimo privilegio

La preparación v35 no propone un grant a nivel de proyecto.

Recurso futuro único:

`projects/ays-orbit-360-lab/locations/global/buckets/_Default/views/_AllLogs`

Rol futuro único:

`roles/logging.privateLogViewer`

Alcance:

`LOG_VIEW`

Motivo técnico:

- `_AllLogs` incluye todos los logs almacenados en el bucket;
- la vista `_Default` excluye Data Access;
- `roles/logging.privateLogViewer` contiene `logging.logEntries.list`, `logging.privateLogEntries.list` y acceso de lectura a vistas privadas;
- el rol admite Log View como nivel de recurso;
- no se crea custom role, evitando escrituras IAM adicionales y lifecycle permanente de un rol temporal.

## Contrato futuro preparado, NO autorizado

Secuencia futura prevista:

1. gate canónico y gate específico antes de secretos;
2. resolver principal exclusivamente desde la credencial LAB autorizada, sin persistir correo/principal;
3. leer policy+etag de la Log View;
4. comprobar capacidad del ejecutor para modificar esa policy; si falta, STOP sin grant;
5. aplicar exactamente un binding temporal `roles/logging.privateLogViewer` sobre esa Log View;
6. readback y verificación de que todos los bindings previos permanecen intactos;
7. ejecutar una auditoría focal acotada únicamente si el grant quedó demostrado;
8. retirar exactamente el binding añadido, haya PASS o STOP posterior;
9. readback final y demostrar restauración exacta de bindings baseline;
10. consumir y congelar el request.

Máximos futuros:

- IAM grant writes: 1;
- IAM revoke writes: 1;
- IAM writes totales: 2;
- project-level grants: 0;
- custom role writes: 0;
- Hosting/browser/deploy/producción/main/merge: 0.

## Concurrencia y rollback

Toda mutación futura debe usar policy `etag` y preservar bindings existentes. Ante drift concurrente, `etag` distinto, binding inesperado o imposibilidad de retiro:

`STOP_RETRY`

No debe reemplazarse una policy con una copia obsoleta.

El rollback obligatorio es retirar exclusivamente el binding creado por el runtime y verificar por readback que la policy vuelve al baseline material en bindings.

## Source-only actual

Esta preparación:

- no lee secrets;
- no llama Google APIs;
- no lee IAM policies reales;
- no lee Logging/Audit Logs;
- no lee Firestore/Auth/clientes;
- no realiza IAM writes;
- no ejecuta Hosting/browser/deploy;
- no toca producción/main/merge.

El planner source usa identidades sintéticas `.invalid` y valida offline:

- preservación de bindings preexistentes;
- alta exactamente una vez del binding sintético;
- retiro únicamente del miembro añadido;
- restauración exacta del conjunto baseline de bindings.

## Estado de autorización

`iamGrantPrepared: true`

`iamGrantAuthorized: false`

`runtimeAuthorized: false`

`freshExplicitAuthorizationRequired: true`

## Siguiente gate

El workflow source v35 debe obtener PASS con cero capacidades. Solo después de ese PASS podrá formularse una autorización nueva y separada para el runtime grant → auditoría focal → revoke.

No existe autorización implícita para ese runtime por haber preparado v35.
