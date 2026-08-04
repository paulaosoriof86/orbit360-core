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

## Correctivo posterior al predeploy read-only

La reanudación autorizada cerró correctamente con:

```text
run: 30870375543
job: 91870978676
artifact: 8877668933
decisión emitida: GO_LIMITED_SCOPE
```

El producto, los módulos, los feature flags, los conteos operativos, los conteos canónicos, los activos públicos y las anclas de rollback resultaron correctos. La única condición que impidió `GO_FULL` fue `siteReadStatus:404` mientras `releasesReadStatus:200`, con cinco releases visibles y anclas exactas de versión actual y anterior.

Clasificación corregida:

```text
VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE
```

Causa raíz:

```text
HOSTING_SITE_GET_RESOURCE_NAME_INCOMPLETE
```

El probe consultaba:

```text
GET /v1beta1/sites/{SITE_ID}
```

El método oficial `projects.sites.get` requiere:

```text
GET /v1beta1/projects/{PROJECT_ID}/sites/{SITE_ID}
```

La consulta de releases sí utiliza correctamente `sites/{SITE_ID}/releases`, por eso devolvió 200 y permitió recuperar las anclas de rollback.

Correctivo aplicado en el owner real:

```text
tools/orbit360-gravicentra-rc1-predeploy-probe-v20260803.mjs
```

No se modificó RC1, Firestore, Hosting, datos, Rules, Functions, producción, main ni merge. No se repite el predeploy consumido: la evidencia ya confirmó candidato completo, datos completos, módulos presentes, sitio público accesible y rollback exacto. El correctivo queda sujeto a validación estática de sintaxis y contrato.

Clasificación transversal:

- mecanismo operativo: `BACKEND_PROTEGIDO_NO_CLAUDE`;
- patrón reusable de nombres de recursos REST completos: `REPLICABLE_CLAUDE_ACUMULADO`;
- caso académico `GO_LIMITED_SCOPE` falso por endpoint incorrecto: `ACADEMIA_ACTUALIZAR`;
- datos reales y anclas internas: no se envían externamente.
