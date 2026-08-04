# Root fix contractual — predeploy Gravicentra Insurance RC1

Fecha: 2026-08-03  
Clasificación: `VALIDATOR_STALE + PIPELINE_MECHANISM_FAILURE`  
Producto: congelado  
Datos: sin cambios  
Deploy/producción: no ejecutados

## Necesidad

El predeploy autorizado se enroutó por error al contrato histórico del Gate 7.11 que permanecía en `STOP_RETRY`, aunque el Gate 7.11 posterior ya había cerrado PASS. La ejecución se detuvo antes de secretos, Firestore, Hosting y producción.

## Causa raíz

`PREDEPLOY_ROUTED_TO_HISTORICAL_GATE711_STOP_RETRY_CONTRACT`

El entrypoint canónico consumía el lifecycle histórico `canonical-runtime-cumulative-visual-lab-v20260801`, en vez de un contrato específico de predeploy basado en el cierre aceptado `gate711-release-critical-runtime-v20260802` y en la candidata RC1 sellada.

## Implementación estructural

Se creó un contrato independiente y tenant-neutral para el predeploy read-only:

- gateId: `block7-gravicentra-insurance-rc1-predeploy-readonly-v20260803`;
- contractVersion: `7.12.0`;
- lifecycle propio;
- engine propio;
- sello de release RC1 propio;
- registro en el entrypoint canónico;
- fase de capacidades `GRAVICENTRA_RC1_PREDEPLOY_READONLY`;
- workflow de ejecución reenlazado al nuevo gate y a un request futuro e inmutable.

El contrato histórico `STOP_RETRY` se conserva como auditoría y deja de ser fuente activa para predeploy.

## Candidata preservada

```text
releaseBranch: release/gravicentra-insurance-rc1-20260803
releaseCommit: 27cb7dfcda8568280ebef15993a953364304f29b
baselineProductHead: 267f7231b46d65b80c167f54567a67503b6a6793
único delta permitido: orbit360-platform/styles/base.css
```

No se modificó la rama RC1.

## Alcance de capacidades

El lifecycle declara capacidades posibles solamente después de una autorización nueva e inmutable:

```text
secrets: true
Firestore read: true
runtime read-only: true
writes: false
browser: false
deploy: false
Rules: false
Functions: false
production writes: false
main/merge: false/false
```

La validación estática no lee secretos ni Firestore y debe cerrar con `executionAuthorized:false`.

## Datos y módulos preservados

El sello reutiliza el cierre aceptado del Gate 7.11:

```text
clientes: 430
aseguradoras: 30
pólizas: 1,373
vehículos: 1,032
recibos esperados: 1,294
cartera: 673
cobros: 5
asesores: 7
```

Módulos requeridos: Cliente 360, Aseguradoras, Pólizas, Cobros, Ops y Leads.

## Cloud / Claude / Academia

- mecanismo y entrypoint: `BACKEND_PROTEGIDO_NO_CLAUDE`;
- patrón de promoción de un gate cerrado hacia el siguiente contrato: `REPLICABLE_CLAUDE_ACUMULADO`;
- diferencia entre evidencia PASS y registro activo obsoleto: `ACADEMIA_ACTUALIZAR`;
- datos reales, IDs y secretos: excluidos.

El delta queda documentado, pero no se declara enviado a Cloud/Claude hasta contar con evidencia de recepción.

## Criterio de cierre

El root fix solo queda cerrado cuando el workflow estático obtenga:

```text
GO_GATE_CONTRACT
GRAVICENTRA_RC1_PREDEPLOY_CONTRACT_STATIC_READY
staticReady: true
requestPresent: false
executionAuthorized: false
secretsRead: false
firestoreRead: false
writes/deploy/production: 0/false/false
```

Después corresponderá una nueva autorización única para crear el request de reanudación del predeploy. No se repetirá Gate 7.11.
