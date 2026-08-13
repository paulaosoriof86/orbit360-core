# CIERRE PREDEPLOY — GRAVICENTRA INSURANCE RC1

Fecha: 2026-08-03  
Decisión: `NO_GO`  
Clasificación primaria: `VALIDATOR_STALE`  
Clasificación del mecanismo: `PIPELINE_MECHANISM_FAILURE`  
Rama de trabajo: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Candidata sellada: `release/gravicentra-insurance-rc1-20260803`  
Release commit: `27cb7dfcda8568280ebef15993a953364304f29b`

## Ejecución autorizada

```text
run: 30868524436
job: 91865447742
requestCommit: 4bbc75b5b1f95179628bb784be59cede6b26d58b
artifact: 8877002560
artifactDigest: sha256:d61c81d34fb9b69aee0eca9c232064aad94ebc28012c6df2985a8c7c4153da47
conclusion: FAILURE / STOP_RETRY
```

La autorización fue utilizada una sola vez. No se reintentó y no se abrirá una auditoría general.

## Etapa exacta

```text
Verificar autorización inmutable: PASS
Contrato vigente antes de secrets: FAIL
Sello RC1 y delta permitido: NOT_EXECUTED
Credenciales: NOT_ACCESSED
Firestore: NOT_READ
Hosting API: NOT_READ
Activos públicos: NOT_READ
Deploy: NOT_EXECUTED
```

El preflight canónico produjo:

```text
status: VALIDATOR_STALE
classification: PIPELINE_MECHANISM_FAILURE
checks: 12/18 PASS
failed: 6
```

Checks fallidos:

```text
LIFECYCLE
AUTHORIZATION
REQUEST
CUMULATIVE
DIGESTS
NO_WRITES
```

Seguridad:

```text
secretAccess: false
secretsRead: false
firestoreRead: false
firestoreWrites: 0
operationalWrites: 0
runtimeExecuted: false
browserExecuted: false
rulesApplied: false
deployExecuted: false
productionTouched: false
main/merge: false/false
```

## Causa raíz

El router contractual canónico continúa leyendo dos artefactos históricos del 2 de agosto:

- `.github/orbit360-requests/canonical-runtime-cumulative-visual-lab-v20260801.json`;
- `tools/orbit360-validator-lifecycle-contract-canonical-runtime-cumulative-visual-lab-v20260801.json`.

Ambos permanecen en estado `STOP_RETRY`, con autorización consumida, cero ejecuciones disponibles y manifest previo. No representan el cierre real posterior del Gate 7.11.

La fuente vigente aceptada sí existe en:

- `tools/orbit360-validator-lifecycle-contract-gate711-release-critical-runtime-v20260802.json`;
- run `30816576914`;
- estado `CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_PASS_CLOSED`;
- Gate 7.11 runtime PASS;
- snapshots idénticos;
- conteos acumulativos completos;
- cero escrituras.

Por tanto, el problema no es una pérdida de clientes, aseguradoras, pólizas, vehículos, recibos, cartera, cobros, Ops o Leads. Es una desincronización entre el registro canónico que consume el entrypoint y la fuente posterior que cerró el gate.

Existe además una segunda obligación de sincronización: la candidata RC1 incorporó el correctivo autorizado de `styles/base.css`, pero los sellos históricos siguen vinculados a la candidata anterior. El release commit sella el código, pero el manifest contractual todavía no fue promovido a esa RC1.

## Owner exacto

Owner primario:

```text
tools/orbit360-validar-gate-contracts-v20260717.mjs
tools/orbit360-validar-gate-contracts-engine-canonical-runtime-cumulative-visual-lab-v20260801.mjs
```

Artefactos propietarios obsoletos:

```text
.github/orbit360-requests/canonical-runtime-cumulative-visual-lab-v20260801.json
tools/orbit360-validator-lifecycle-contract-canonical-runtime-cumulative-visual-lab-v20260801.json
```

Consumidor de sello que debe acompasarse con RC1:

```text
tools/orbit360-policies-dual-path-provenance-constants-v20260801.mjs
```

No son owners del defecto:

```text
styles/base.css
Cliente 360
Aseguradoras
Pólizas
Vehículos
Recibos/cartera
Cobros
Ops
Leads
Firestore
Hosting
```

## Solución mínima y estructural

Aplicar un único root fix source-only del contrato, sin tocar producto ni datos:

1. promover el cierre PASS de Gate 7.11 como fuente canónica vigente;
2. retirar del entrypoint el request/lifecycle histórico `STOP_RETRY` como estado activo;
3. registrar un contrato específico de predeploy read-only, separado de una autorización runtime ya consumida;
4. vincularlo al release commit `27cb7dfcda8568280ebef15993a953364304f29b` y al único delta permitido `styles/base.css`;
5. actualizar conjuntamente manifest, sello, registro, lifecycle, workflow y documentación;
6. validar estáticamente que el nuevo contrato autoriza secrets y Firestore únicamente para lectura, y mantiene escrituras, deploy, Rules, Functions, producción, main y merge en cero;
7. no repetir Gate 7.11 ni modificar la candidata sellada.

Clasificación para Cloud/Claude y Academia:

```text
mecanismo y entrypoint: BACKEND_PROTEGIDO_NO_CLAUDE
patrón reusable de promoción de cierres: REPLICABLE_CLAUDE_ACUMULADO
diferencia entre gate cerrado y contrato activo obsoleto: ACADEMIA_ACTUALIZAR
información real y secretos: SECRETO_DATO_REAL / no enviar
```

## Estado de los carriles

### A — frontend / producto

RC1 permanece sellada. No se aplicó parche ni cambio adicional.

### B — backend / seguridad / gates

STOP correcto antes de secretos. Causa raíz localizada en el registro contractual canónico.

### C — datos reales / migración

No fueron leídos en esta ejecución debido al STOP pre-risk. La última evidencia aceptada conserva:

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

Estos conteos no se vuelven a inferir ni se reimportan para resolver el contrato obsoleto.

## Siguiente acción exacta

```text
root fix source-only del registro/contrato canónico de predeploy
→ PASS estático antes de secrets
→ cerrar evidencia del correctivo
→ solicitar una sola autorización de reanudación del predeploy
```

No corresponde ahora acceder a credenciales, Firestore o Hosting; tampoco desplegar, reimportar, corregir módulos ni abrir otra auditoría general.
