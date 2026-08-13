# PREPARACIÓN V37 — VISIBILIDAD IAM DIRECTA DEL PROYECTO READ-ONLY

Fecha: 2026-08-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate rector: `block1-client360-insurers-lab-v20260717` / `1.0.41`

## Motivo

V36 cerró `ENVIRONMENT_FAILURE / IAM_POLICY_ANALYZER_READ_FORBIDDEN`. No se repite Policy Analyzer.

V37 usa un mecanismo materialmente distinto y más estrecho:

1. `projects.testIamPermissions` exclusivamente para `resourcemanager.projects.getIamPolicy`;
2. si y solo si esa capacidad es efectiva, una lectura `projects.getIamPolicy` solicitando policy version 3;
3. procesamiento en memoria;
4. evidencia únicamente sanitizada.

## Roles fuente-verificados

Intersección oficial de roles que contienen tanto `logging.views.getIamPolicy` como `logging.views.setIamPolicy` al 2026-08-10:

- `roles/owner`;
- `roles/iam.securityAdmin`;
- `roles/logging.admin`;
- `roles/iam.devOps`;
- `roles/iam.infrastructureAdmin`;
- `roles/iam.networkAdmin`.

No se consideran automáticamente candidatos inequívocos:

- grupos;
- dominios;
- bindings condicionales;
- custom roles no verificados;
- la cuenta LAB objetivo.

## Presupuesto runtime máximo

- `testIamPermissions`: 1;
- `getIamPolicy`: 1;
- policy version solicitada: 3;
- IAM writes: 0;
- Policy Analyzer: 0;
- Policy Troubleshooter: 0;
- Firestore/Auth/Logging entries: 0;
- operational writes: 0;
- Hosting/browser/deploy/producción/main/merge: 0.

## Fail-closed

Si `resourcemanager.projects.getIamPolicy` no es efectiva, se detiene antes de `getIamPolicy`.

Si la policy no puede leerse, hay cero candidatos directos, más de uno, o existen bindings privilegiados ambiguos/custom no verificables, el resultado es `STOP_RETRY` sin inferir inexistencia de administrador.

## Estado

`SOURCE_PREPARATION_INERT`.

El request runtime real permanece ausente hasta PASS source-only.
