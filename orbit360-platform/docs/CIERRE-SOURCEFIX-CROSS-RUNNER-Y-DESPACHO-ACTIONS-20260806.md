# Cierre sourcefix cross-runner y despacho Actions — 2026-08-06

## Clasificación

- Defecto original: `PIPELINE_MECHANISM_FAILURE`, corregido source-only.
- Bloqueo actual: `ENVIRONMENT_FAILURE / EVENT_DISPATCH_UNAVAILABLE`.

## Avance visible

- Timeout portable Node añadido.
- Runner v3 compatible con Linux/macOS y bloqueado sin autorización.
- Prueba cross-runner local: `PASS_VISUAL_MATRIX_CROSS_RUNNER_SOURCE`, 24/24.
- Sourcefix signal-safe conservado: 48/48.
- Canario macOS PR #25 cerrado sin merge.
- Eventos intentados: opened, reopened, synchronize y push.
- Runs/checks creados: 0.

## Estado funcional honesto

- Auth, membership, tenant e Inicio: PASS en precheck.
- Matriz completa Dirección/Operativo/Asesor: no completada.
- Snapshot final: no verificado.
- `PASS_VISUAL_POST_AUTH`: NO.
- Cobros observados: 7.
- Cobros 4.1: pausado.

## Restricciones cumplidas

Cero secretos, Firebase, Firestore/Auth/operational writes, navegador, Hosting, deploy, Functions, Rules, producción, main o merge.

## Siguiente acción exacta

No repetir canarios por PR o push. Restaurar el despacho de GitHub Actions a nivel repositorio/cuenta o autorizar un ejecutor independiente para el runner v3. Después ejecutar una sola validación source-only cross-runner y únicamente con PASS solicitar autorización runtime nueva ligada al HEAD vigente.
