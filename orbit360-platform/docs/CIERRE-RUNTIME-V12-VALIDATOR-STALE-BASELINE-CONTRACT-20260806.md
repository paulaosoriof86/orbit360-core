# CIERRE RUNTIME V12 — VALIDATOR STALE BASELINE CONTRACT — 2026-08-06

## Bloque
Gate `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`, contrato `2.7.8`, RC `RC-AYS-LAB-CANONICA-01`.

## Ejecución observable
- request: `20260806.12-capture-watchdog-runtime`
- request commit: `f604bcf5609529b1115d16bb2a8b4f2e7388a4b4`
- run: `31141619020`
- job: `92752532512`
- checkpoint: `REQUEST_CONTRACT_INVALID`
- decisión: `STOP_RETRY`
- clasificación final: `VALIDATOR_STALE`
- failureCode: `REQUEST_GUARD_STALE_HARDCODED_V6_BASELINE`

## Avance visible
La activación source-only v12 pasó antes del runtime: fase-aware 17/17, transporte por base SHA 12/12, capture watchdog 17/17, signal-safe 48/48, cross-runner 24/24 y Windows 7/7.

El runtime fue detenido por el preflight registrado antes de secretos. No se ejecutaron Firebase, restauración, backup, deploy Hosting, navegador, precheck ni matriz.

## Causa raíz
`tools/orbit360-json-guard-visual-matrix-runtime-v20260806.mjs` validaba el request contra campos históricos v6:

- `restorePriorV6BackupBeforeRuntime === true`
- `restorePriorV6BackupChannel === visual-matrix-corrected-backup-31116830824`

El lifecycle y request v12 ya usaban correctamente el contrato vigente de baseline:

- `restorePriorBaselineBeforeRuntime === true`
- baseline `visual-matrix-corrected-backup-31135532118`
- restaurador `tools/orbit360-restore-visual-matrix-v12-baseline-before-runtime-v20260806.sh`

Por tanto, el request no era defectuoso: el validador estaba obsoleto respecto del contrato vigente. No existe evidencia de defecto funcional de Auth, Cliente 360, navegador, Hosting o datos en esta ejecución.

## Corrección source-only
El guard deja de aceptar un backup histórico hardcodeado. La validez se liga a un lifecycle source-controlled vigente: versión esperada, gate, rama, proyecto, tenant, canal de baseline, script de restauración, límites de Hosting y denegaciones de escritura deben coincidir exactamente entre lifecycle y request.

El preflight pasa explícitamente el lifecycle al guard. El request v12 queda consumido y congelado; el relay queda fail-closed con `NONE_PENDING_FRESH_AUTHORIZATION`.

## Riesgo ejecutado
- secretos: 0
- Firebase: 0
- Firestore reads/writes: 0/0
- Auth writes: 0
- operational writes: 0
- Hosting deploys: 0
- navegador: 0
- Functions/Rules/reimportación: 0
- producción/main/merge: 0
- rollback requerido: no

## Estado
`PASS_VISUAL_POST_AUTH = NO`. La matriz Dirección/Operativo/Asesor continúa pendiente. No reejecutar v12. Cualquier runtime futuro requiere autorización explícita nueva y request nuevo e inmutable después de validar el rootfix source-only.
