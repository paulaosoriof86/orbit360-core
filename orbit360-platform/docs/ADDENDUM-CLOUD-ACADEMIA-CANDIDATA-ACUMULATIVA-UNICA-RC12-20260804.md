# Addendum Cloud / Claude / Academia — candidata acumulativa única RC1.2

Fecha: 2026-08-04

## CL-101 — La candidata debe unir producto, datos y precondiciones

Una candidata acumulativa no se define únicamente por su commit de Hosting. Debe enlazar expresamente:

- baseline y release commit;
- árbol de módulos y paridad;
- snapshot canónico aceptado;
- conteos operativos;
- digest sellado del store;
- rutas de autoridad por colección;
- precondiciones de acceso que permiten adjuntar los datos.

Sin este vínculo, una aplicación puede parecer vacía aunque el dataset esté íntegro.

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

## CL-102 — Datos ausentes y datos inaccesibles son estados distintos

El estado `waiting-membership` no demuestra ausencia de información. Indica que el store se mantiene cerrado hasta recibir una proyección válida de Auth + membership.

La evidencia debe separar:

```text
dataAbsent
dataInvisibleWithoutMembership
membershipRequired
snapshotAttached
```

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO` y `ACADEMIA_ACTUALIZAR`.

## CL-103 — No reimportar para resolver acceso

Cuando el snapshot canónico, sus digests y sus conteos permanecen aceptados, una falla de Auth, membership, loader, cache o proyección no se corrige reimportando Clientes, Aseguradoras, Pólizas, Vehículos, Recibos, Cartera o Cobros.

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

## CL-104 — Padrón aprobado separado del código genérico

Los usuarios, correos, UID, roles efectivos y `advisorId` son configuración protegida del tenant. Los manifiestos reutilizables solo conservan referencias sanitizadas y digests; la resolución de valores reales ocurre en runtime protegido.

Clasificación: `BACKEND_PROTEGIDO_NO_CLAUDE`.

## Academia

La Academia debe explicar por rol:

1. qué integra una candidata acumulativa;
2. diferencia entre release de código y snapshot de datos;
3. por qué `Orbit.store` espera una membership;
4. diferencia entre `PIPELINE_MECHANISM_FAILURE` y `DATA_CONTRACT_FAILURE`;
5. por qué un problema de acceso no autoriza reimportación;
6. cómo funcionan snapshot, rollback y onboarding multirol.

No se envió información externa a Cloud/Claude.
