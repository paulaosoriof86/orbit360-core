# Cierre runtime v10 — contrato de transporte por base SHA — 2026-08-06

## Bloque

```text
gateId: block2.7-visual-matrix-corrected-post-auth-lab-v20260805
contractVersion: 2.7.8
requestVersion: 20260806.10-phase-aware-runtime
requestCommit: 604b7587fc34080ec30b6065e494e99578124b16
runId: 31134090771
jobId: 92729505356
```

## Resultado

```text
GO_GATE_CONTRACT: 28/28 PASS
restauración backup v6: PASS
nuevo backup: no ejecutado
Hosting deploys: 0
precheck/matriz: no ejecutados
snapshot: NOT_VERIFIED_FINAL
STOP_RETRY: aplicado
```

## Clasificación y causa raíz

```text
PIPELINE_MECHANISM_FAILURE
RUNTIME_TRANSPORT_BASE_REF_CONTRACT_MISMATCH
checkpoint: RUNTIME_TRANSPORT_CONTEXT_VALIDATION
```

El transporte PR #31 fue correcto para preservar un único commit y un único archivo: su base fue la rama de activación cuyo SHA coincidía con `request.parentHead`. El runner v3, sin embargo, exigía que el nombre de `GITHUB_BASE_REF` fuera la rama canónica. Esa regla era incompatible con el transporte inmutable y provocó STOP después de restaurar el backup v6, pero antes de credenciales internas del runner, backup nuevo, deploy o navegador.

## Estado de Hosting LAB

La restauración externa previa al runner fue exitosa:

```text
source: visual-matrix-corrected-backup-31116830824
target: live
state: RESTORED_TO_VISUAL_MATRIX_CORRECTED_BACKUP_31116830824
```

No hubo deploy posterior; por ello no se requirió rollback adicional.

## Estado protegido

```text
request v10 consumido: sí
allowedExecutions: 0
authorizationFrozen: true
replayAllowed: false
Firestore/Auth/operational writes: 0
Functions/Rules/reimportación: 0
producción/main/merge: 0
```

## Rootfix source-only

Se añadió una envoltura v4 que:

1. resuelve el SHA real de `origin/$GITHUB_BASE_REF`;
2. compara ese SHA con `request.parentHead`;
3. valida evento, rama canónica y autorización de una sola ejecución;
4. solo después delega al runner v3 auditado.

El nombre de la rama base deja de ser la identidad; la procedencia inmutable queda definida por SHA.

## Siguiente acción exacta

Validar el rootfix exclusivamente source-only. No reutilizar v10 ni ejecutar runtime sin autorización explícita nueva ligada al HEAD entonces vigente.
