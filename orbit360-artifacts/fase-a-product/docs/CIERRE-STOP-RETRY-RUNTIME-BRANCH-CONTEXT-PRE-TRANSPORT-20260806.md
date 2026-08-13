# Cierre STOP_RETRY — contrato de rama en runner runtime

Fecha: 2026-08-06  
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR rector: #5 draft/open

## Bloque

Reapertura macro autorizada sobre `db7670158ca4591dc56071a07cefe5be08382c14`.

## Secuencia ejecutada

```text
39/39 lifecycle sequence: PASS
18/18 preflight observable: PASS
24/24 preflight branch context: PASS
lifecycle padre exclusivo: f37bd92eebe6860336487a7406d3f2ef50052d21
request hijo exclusivo: d7d8521c531eb266222ebb01ee5491a096747f5d
parentHead exacto: PASS
```

Antes de crear transporte runtime se inspeccionó el runner posterior a `GO_GATE_CONTRACT`.

## STOP exacto

```text
classification: PIPELINE_MECHANISM_FAILURE
checkpoint: RUNTIME_RUNNER_GITHUB_REF_NAME_CONTRACT_STALE
transport runtime: NO CREADO
GO_GATE_CONTRACT runtime: NO EJECUTADO
secretos: 0
Firestore reads/writes: 0/0
Auth/operational writes: 0
backup/deploy/browser: 0
Functions/Rules/reimportación/producción/main/merge: 0
```

## Causa raíz

El preflight ya utilizaba `ORBIT360_CANONICAL_BRANCH` y validaba `GITHUB_BASE_REF`, pero el runner posterior al GO todavía comprobaba `GITHUB_REF_NAME` como rama canónica.

En un workflow `pull_request`, `GITHUB_REF_NAME` es contexto técnico de GitHub y puede representar un merge ref. Continuar habría contradicho la autorización explícita y podía generar un fallo después del GO.

## STOP_RETRY

El request `d7d8521c531eb266222ebb01ee5491a096747f5d` quedó consumido, sin replay y con `allowedExecutions: 0`. El lifecycle quedó congelado antes de transporte, secretos o infraestructura.

## Sourcefix

El runner ahora:

- usa `ORBIT360_CANONICAL_BRANCH` como contrato canónico;
- valida `GITHUB_BASE_REF` cuando el contexto es pull request;
- no usa `GITHUB_REF_NAME` para identidad de rama;
- mantiene el guard antes de secretos, backup y deploy;
- conserva Hosting-only y cero Functions/Rules.

## Validador obsoleto

El primer run source-only `31114761477` obtuvo 23/24 por un falso negativo:

```text
failedCheckId: branchGuardBeforeBackup
classification: VALIDATOR_STALE
```

El validador buscaba la primera aparición de `hosting:clone`, correspondiente a la función de rollback declarada antes del guard, no a la ejecución real del backup.

Se corrigió el ancla al checkpoint real:

```text
BACKUP_CHANNEL="visual-matrix-corrected-backup-${GITHUB_RUN_ID}"
```

## Evidencia final

Run source-only: `31114904985`.

```text
PASS_RUNTIME_BRANCH_CONTEXT_SOURCE
24/24 PASS
0 fallos
secretos/Firestore/runtime/browser/backup/deploy: 0
```

Evidencia:

`orbit360-platform/runtime-gate-crm-v20260716/runtime-branch-context-source-test-sanitized-v20260806.json`

## Estado

```text
SOURCE_RUNTIME_BRANCH_CONTEXT_PASS_PENDING_EXPLICIT_REAUTHORIZATION
PASS_VISUAL_POST_AUTH: NO
Hosting LAB: versión previa
Cobros 4.1: PAUSED
```

## Siguiente acción exacta

Esperar una autorización macro nueva sobre el HEAD vivo. La próxima ejecución deberá exigir 39/39 + 18/18 + 24/24 preflight branch context + 24/24 runtime branch context antes de `GO_GATE_CONTRACT`.
