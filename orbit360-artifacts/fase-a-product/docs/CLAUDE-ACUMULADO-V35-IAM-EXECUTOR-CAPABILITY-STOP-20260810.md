# CLAUDE ACUMULADO — V35 IAM EXECUTOR SEPARATION

Fecha: 2026-08-10

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Para remediaciones IAM temporales y reversibles:

1. distinguir principal objetivo de ejecutor IAM;
2. comprobar capacidad administrativa del ejecutor antes de leer/modificar policy;
3. no asumir autoescalamiento del principal objetivo;
4. si `getIamPolicy` o `setIamPolicy` no son efectivos, detener antes del primer write;
5. mantener request one-shot y consumirlo también en STOP;
6. no repetir automáticamente el runtime;
7. no convertir el fallo del ejecutor en un grant más amplio;
8. identificar un ejecutor administrativo existente y gobernado antes de cualquier nueva autorización.

## Evidencia Orbit 360

V35 runtime:

- run `31439991628`;
- `executorGetPolicyEffective=false`;
- `executorSetPolicyEffective=false`;
- `iamPolicyReads=0`;
- `iamWrites=0`;
- `grantWrites=0`;
- `loggingReadPages=0`.

La cuenta objetivo no pudo actuar como ejecutor IAM sobre la Log View y el lifecycle se detuvo fail-closed.

No incluir en entregables Claude principals, secrets, policies raw, document IDs, resource names ni logs raw.
