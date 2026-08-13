# Cierre final post-rollback — Gravicentra Insurance RC1.2

Fecha: 2026-08-04

```text
run: 30915148859
requestCommit: dabbe73b1f166a1b8e766f170037a58d555285f5
rootfixCommit: e0ca04ae7bbebe001e51da57ec2512a83bad90a4
releaseCommit: b699ba329960cd830121b57452ce558399aa84fb
decision: RC12_BROWSER_THREE_PROFILE_SMOKE_FAILED_ROLLED_BACK
macroExitCode: 41
Gate 7.15.1: ejecutado antes de secretos
Gate 7.13 PASS: true
browser smoke PASS: false
data/Hosting smoke PASS: false
autorización consumida: sí
reimportación: no
Rules: no
Functions: no
main: no
merge: no
Gate 7.11: no
```

La fuente operativa es la evidencia sanitizada del run. Los usuarios y memberships solo se conservan cuando la decisión final es `RC12_APPROVED_ROSTER_CUMULATIVE_GO_LIVE_PASS`; ante fallo se exige el rollback corregido.
