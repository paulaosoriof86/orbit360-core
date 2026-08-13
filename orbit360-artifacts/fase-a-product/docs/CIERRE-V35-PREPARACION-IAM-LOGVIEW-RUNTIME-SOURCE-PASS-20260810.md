# CIERRE V35 — PREPARACIÓN IAM LOG VIEW + RUNTIME GRANT/AUDIT/REVOKE SOURCE PASS

Fecha: 2026-08-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate rector: `block1-client360-insurers-lab-v20260717` / contrato `1.0.41`

## Estado

`SOURCE_READY / RUNTIME_PREPARED / RUNTIME_NOT_AUTHORIZED`

Predecesor demostrado:

`ENVIRONMENT_FAILURE / REQUIRED_LOGGING_PERMISSION_NOT_EFFECTIVE`

V35 no aplica IAM, no consulta Google APIs, no repite v33/v34 y no ejecuta la auditoría real. Deja preparado el único runtime futuro de mínimo privilegio.

## Diseño de mínimo privilegio

Recurso objetivo único futuro:

`projects/ays-orbit-360-lab/locations/global/buckets/_Default/views/_AllLogs`

Rol temporal único:

`roles/logging.privateLogViewer`

Alcance:

`LOG_VIEW`

No se prepara grant a nivel de proyecto, folder u organización y no se crea custom role.

## Source plan v35

Primer run source:

`31434120313`

Checkpoint previo:

- canonical Block1 gate: PASS;
- STOP en validación del predecessor registry;
- causa: el workflow esperaba `runtimeAuthorized`, pero v34 registra `runtimeDiagnosticAuthorized`;
- clasificación: `VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`;
- secrets/red/IAM/data: 0.

Rootfix único del stage:

- commit: `4f5b59225f4500b3b46421938b06683cabea4c9d`;
- se corrigió únicamente el campo del validador;
- producto, planner, lifecycle y contratos no fueron modificados para obtener PASS.

Run source PASS:

`31434196310`

Artifact:

`9080310903`

Digest:

`sha256:d320a4c3773b9f986c5b93a6aa476f5c8d63e63b3d9c52755f3767ad0115600e`

Resultado offline:

- preserva bindings existentes;
- añade un miembro sintético exactamente una vez;
- retira exclusivamente ese miembro;
- restaura exactamente el baseline de bindings;
- networkAccess: false;
- secretAccess: false;
- iamPolicyRead: false;
- iamWrites: 0;
- logging/firestore/auth: 0.

## Runtime futuro preparado

Operación futura:

`TEMPORARY_LOG_VIEW_PRIVATE_LOG_VIEWER_AUDIT_REVOKE`

Contrato preparado:

1. request nuevo, exclusivo, parent-bound e inmutable;
2. canonical Block1 gate antes de secretos;
3. `GO_GATE_CONTRACT_RUNTIME_V35` antes de materializar credencial;
4. resolver únicamente la cuenta LAB autorizada;
5. comprobar primero `logging.views.getIamPolicy` y `logging.views.setIamPolicy` sobre la Log View;
6. si falta cualquiera, STOP antes del primer IAM write;
7. si existen, leer policy+etag;
8. máximo un grant temporal de `roles/logging.privateLogViewer` sobre la Log View;
9. readback y prueba de efecto;
10. auditoría focal únicamente por Cloud Logging sobre esa Log View y la ventana histórica ya cerrada de v33;
11. cero Firestore y cero Auth;
12. retiro obligatorio del binding temporal tanto ante PASS como ante STOP posterior al grant;
13. preservar cualquier cambio concurrente externo y nunca sobrescribir una policy obsoleta;
14. consumir y congelar request al finalizar.

Budgets futuros:

- policy reads: máximo 4;
- IAM writes: máximo 2;
- grant writes: máximo 1;
- revoke writes: máximo 1;
- Logging pages: máximo 10;
- page size: 100;
- Firestore reads: 0;
- Auth reads: 0;
- operational writes: 0;
- Hosting/browser/deploy/producción/main/merge: 0.

## Runtime-prep source

Primer run:

`31434609089`

PASS antes del STOP:

- canonical Block1 source gate;
- lifecycle y request fixture;
- GO fixture `17/17`;
- worker source-only;
- fixture grant/revoke baseline.

STOP:

el hard-boundary validator buscó el literal `firebase-admin` en todo el worker. El worker no importa ni usa Firebase Admin; la cadena aparece únicamente como texto de clasificación de `callerSuppliedUserAgent` de un log.

Clasificación:

`VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`

Rootfix:

- commit `2ebd58e0d3dd3f3e90440bc3da2d0b7dd787db34`;
- únicamente se sustituyó el detector textual por un detector semántico de imports/requires reales;
- worker, lifecycle, gate engine, runtime workflow y budgets permanecieron intactos.

Segundo y último intento del stage:

Run `31434758889`

Resultado:

`PASS_V35_RUNTIME_PREP_SOURCE`

Todos los checkpoints success.

Artifact:

`9080526852`

Digest:

`sha256:8f72a533bcee8ecee07f81c75a20534f382e68a21d9fb85592d011cb2276f6b8`

Capacidades reales durante preparación:

```text
runtimeRequestPresent: false
runtimeAuthorized: false
secretsRead: false
networkAccess: false
iamPolicyRead: false
iamWrites: 0
loggingRead: false
firestoreRead: false
authRead: false
operationalWrites: 0
runtimeExecuted: false
browserExecuted: false
deployExecuted: false
productionTouched: false
```

## Registry vivo

Commit de cierre del registry:

`e36453f3811ae8e548c0159c1357b9b815315f0c`

Revalidación source posterior:

`31434811176` — success.

Estado rector:

```text
runtimePrepared: true
runtimeAuthorized: false
runtimeRequestPresent: false
iamGrantPrepared: true
iamGrantAuthorized: false
freshExplicitAuthorizationRequired: true
```

## Carriles

A — frontend/UX: sin cambios; visual continúa condicionado al universe gate.  
B — backend/seguridad: mínimo privilegio y lifecycle temporal IAM preparados source-only.  
C — datos/migración: los 2 fingerprints siguen pendientes; no se leyó ni modificó dato de clientes en v35 source.

## Causa raíz y anti-bucle

Los dos STOP encontrados durante v35 fueron de stages distintos y ambos fueron validadores obsoletos/textuales, no fallos del producto:

1. predecessor registry field mismatch;
2. literal `firebase-admin` usado como clasificación analítica.

Cada stage tuvo un único rootfix y su segundo intento fue PASS. No hubo tercer intento.

## Siguiente acción exacta

El runtime ya está preparado, pero no está autorizado.

La siguiente operación real requiere autorización explícita separada porque puede realizar hasta dos IAM writes. No crear request ni acceder a secrets antes de esa autorización.
