# ACADEMIA — ACTUALIZACIÓN V35 IAM EXECUTOR CAPABILITY STOP

Fecha: 2026-08-10

Clasificación: `ACADEMIA_ACTUALIZAR`

## Lección incorporada

Un lifecycle IAM temporal tiene al menos tres elementos distintos:

1. principal objetivo que necesita el permiso temporal;
2. ejecutor IAM que tiene capacidad para modificar la policy del recurso;
3. permiso o rol temporal que se desea conceder.

No se debe asumir que el principal objetivo puede modificar su propia policy.

## Caso Orbit 360 v35

La cuenta LAB necesitaba acceso temporal de lectura privada sobre una Log View. Antes del grant, el runtime comprobó si esa misma cuenta podía gestionar la policy de la vista.

Resultado:

- capacidad efectiva para `getIamPolicy`: no;
- capacidad efectiva para `setIamPolicy`: no;
- IAM writes: 0;
- grant: 0;
- Cloud Logging reads: 0.

El sistema se detuvo antes de cualquier mutación.

## Distinción metodológica

Este resultado se clasifica como:

`ENVIRONMENT_FAILURE / IAM_EXECUTOR_CANNOT_MODIFY_TARGET_LOG_VIEW`

No es:

- un defecto funcional de Cliente 360;
- una ausencia demostrada de Audit Logs;
- una falla de Firestore;
- evidencia de que los 2 clientes sean legítimos o residuales;
- autorización para elevar privilegios de la cuenta objetivo.

## Regla reusable

Si el principal objetivo no puede modificar la policy:

- no intentar autoescalamiento;
- no ampliar el rol a nivel proyecto solo para facilitar el proceso;
- no repetir el mismo runtime;
- identificar un ejecutor administrativo separado mediante fuente controlada;
- requerir autorización nueva antes de usar una identidad distinta o escribir IAM.
