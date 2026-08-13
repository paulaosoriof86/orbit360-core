# EVIDENCIA SOURCE V35 — EJECUTOR IAM SEPARADO NO IDENTIFICADO

Fecha: 2026-08-10

## Alcance

Revisión exclusivamente source/repo posterior al STOP runtime v35. No se leyeron secrets, IAM policies ni APIs de Google y no se realizaron writes IAM.

## Evidencia vigente

El runtime v35 demostró:

```text
executorGetPolicyEffective: false
executorSetPolicyEffective: false
rootCause: IAM_EXECUTOR_CANNOT_MODIFY_TARGET_LOG_VIEW
```

La identidad LAB objetivo no puede actuar como ejecutor IAM sobre la Log View.

## Evidencia histórica localizada

Commit histórico:

`d1e2b48dd440b1ec2f6132a99380c81ff9093272`

Workflow histórico:

`.github/workflows/orbit360-lab-temporary-dispatcher.yml`

Ese dispatcher:

- resolvía `FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB`, con fallbacks equivalentes;
- activaba esa misma cuenta con `gcloud auth activate-service-account`;
- intentaba agregar un binding IAM a esa misma cuenta;
- no utilizaba una identidad administrativa separada.

El workflow ya no existe en el HEAD vigente y no debe reactivarse.

## Búsqueda adicional

No se encontró evidencia en commits de una arquitectura Workload Identity u OIDC para Orbit 360 que pueda asumirse como ejecutor administrativo vigente.

Esta conclusión es limitada al source inspeccionado: no demuestra que no exista algún administrador fuera del repositorio, pero sí demuestra que no hay una identidad administrativa separada versionada que pueda reutilizarse de forma segura sin nueva autorización y nueva evidencia.

## Decisión

`NO_SEPARATE_AUTHORIZED_IAM_EXECUTOR_EVIDENCED_IN_VERSIONED_SOURCE`

No repetir v35 con la misma cuenta LAB.

## Siguiente acción

Cualquier diagnóstico runtime de una identidad administrativa distinta, creación/provisión de un ejecutor, o grant IAM requiere una operación nueva con autorización explícita. Antes de esa autorización, mantener IAM y Cloud Logging congelados.
