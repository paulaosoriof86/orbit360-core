# ROOTFIX — Preflight causal de publicación del control-plane

Fecha: 2026-08-25

## Contexto

El run canónico `32871437905`, job `97879163353`, ejecutó correctamente `CONTROL_PLANE_HARDENING_CLOSE` sobre el handshake durable del run `32871269869`.

La transición local produjo estado coherente `ledger 43 / package 37`, `CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS`, progreso 75%, candidata `9504702901`, y mantuvo autorización/request/runtime cerrados. El behavioral selftest volvió a pasar íntegro, incluyendo `preProviderGatePathPass`, `runtimeRegisterReadOnlyPass`, `routerNativeRuntimeContractPass`, `negativeRegressionSuitePass`, CAS, STOP_RETRY, inmutabilidad y lifecycle class-wide. Convergencia, terminal truth, independent readback, composite invariant y documentation discovery también pasaron.

El run falló después, en `Publish hardening closure with dynamic revisions and CAS`, antes de que la rama canónica avanzara. La rama permaneció en `93aef5bc8a3efd7c2cc2d37e6a810514b67a9793`. No hubo F2, provider, browser, secrets, Firestore, writes operativos, deploy, producción, main ni merge.

## Clasificación

`PIPELINE_MECHANISM_FAILURE:CONTROL_PLANE_PUBLICATION_STAGE_NON_CAUSAL_SHELL_BLOCK`

La falla no está en la candidata, el owner lógico ni el cierre semántico. El defecto metodológico es que la publicación todavía agrupa stage, whitespace check, commit, remote CAS y push en una sola línea shell con `set -e`; varios fallos posibles pueden terminar como `exit 1` sin un código causal estable. Eso obliga a una investigación posterior y contradice el objetivo anti-bucle.

## Rootfix

Se conserva el path canónico `tools/orbit360-continuity-projection-atomic-v20260820.mjs` y su API. La implementación previamente auditada se congela como `tools/orbit360-continuity-projection-core-v20260825.mjs`, byte-identical al blob anterior.

El path canónico pasa a ser un wrapper que, después de la proyección, ejecuta `tools/orbit360-control-plane-publication-preflight-v20260825.mjs`.

El preflight usa un `GIT_INDEX_FILE` temporal y no altera el índice real ni el remoto. Valida:

- changed surface dinámica; para el cierre, `ledger + registry.projectionTargets`;
- staging completo en índice temporal;
- `git diff --cached --check` sobre exactamente lo que se publicaría;
- creación de tree y commit efímero con el mismo parent;
- remote HEAD CAS contra el HEAD local del runner canónico;
- `git push --dry-run` del commit efímero cuando existe `GH_TOKEN` en GitHub Actions;
- cero runtime/browser/secrets/Firestore/writes/deploy/producción.

Cada familia tiene código causal independiente: `PUBLICATION_PREFLIGHT_DIFF_CHECK`, `PUBLICATION_PREFLIGHT_COMMIT_TREE`, `PUBLICATION_PREFLIGHT_REMOTE_CAS_MISMATCH`, `PUBLICATION_PREFLIGHT_PUSH_DRY_RUN`, `CONTROL_PLANE_CLOSE_PUBLICATION_SURFACE`, etc.

## Criterio de cierre

No se repite el run fallido. Primero el nuevo preflight debe ejecutarse dentro del selftest/cierre source-only. Solo si pasa se permite un nuevo intent de hardening close. Si falla, el código causal se usa como causa raíz y no se crea otro parche ni otra autorización F2.

## Carriles

- A frontend/UX/Academia: producto congelado; Academia debe enseñar diferencia entre PASS lógico y publicación canónica, y entre defecto funcional y fallo del pipeline.
- B backend/seguridad/gates: este rootfix pertenece exclusivamente al control-plane y publicación source-only.
- C datos reales/migración: sin cambios, congelado.

## Claude

Clasificación: `BACKEND_PROTEGIDO_NO_CLAUDE` para el mecanismo; patrón reusable conceptual `REPLICABLE_CLAUDE_ACUMULADO`: preflight de publicación causal con índice temporal, CAS y dry-run.
