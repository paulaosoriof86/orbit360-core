# Gravicentra Insurance — Mechanism Freeze V4 · Monotonic Evidence and Causal Execution

Estado: `FROZEN`
Fecha: 2026-09-10
Gate activo al congelar: `I4A`

## Prevalencia

Este documento complementa y prevalece sobre `MECHANISM_FREEZE_V3_20260909.md` únicamente en acumulación de evidencia, reejecución de pruebas, adjudicación de gates y sincronización de estado. V3 continúa vigente para identidad de release, bloqueo de reentrada I2/I3, autoridad única del Control Plane, lineage y prohibición de split authorities.

## Causa raíz que V3 no cubría

V3 convirtió `CONTROL_PLANE.json` en autoridad operativa única y bloqueó la reentrada I2/I3 sin cambio causal de source. No convirtió la preservación de evidencia en una invariante ejecutable. I4A seguía siendo un executor monolítico: un intent dirigido podía volver a ejecutar pruebas ya aceptadas y el resultado del último run podía volver a ponerlas rojas aunque no existiera cambio causal en sus owners. Además, `latestAuthoritativeRunId` y el ledger se materializaban manualmente, por lo que podían quedar detrás de la evidencia física.

## Reglas V4

1. `I4A_PROOF_REGISTRY.json` es un registro derivado de evidencia, no una nueva autoridad de gate ni release.
2. Cada PASS queda sellado por `proofId + releaseBinding + contractVersion + runId + artifactId + artifactDigest`.
3. Dentro de la misma release un PASS es monotónico. No puede volver a OPEN/FAIL ni modificarse su receipt.
4. Solo un `causalInvalidation` activo, con cambio real de source de producto y evidencia causal, puede invalidar un PASS.
5. Un fallo de QA, cambio de harness, timeout, conversación, documentación o rerun no invalida un PASS previo.
6. I4A ejecuta exclusivamente `executionScope.proofIds` de un intent V2. Pedir un proof ya PASS sin invalidación causal debe fallar cerrado antes de ejecutar.
7. El intent debe listar todos los PASS preservados en `preserveProofIds`; omitir uno es error de mecanismo.
8. El resultado de una ejecución dirigida solo adjudica los proofs solicitados. Nunca equivale por sí solo a PASS del gate.
9. El cierre de I4A se obtiene por unión de receipts sellados, no porque todas las pruebas vuelvan a pasar en un mismo run.
10. El cierre del gate exige un único commit atómico que actualice `CONTROL_PLANE.json`, `CAPABILITY_STATUS_LEDGER.json` e `I4A_PROOF_REGISTRY.json` y deje cero proofs OPEN.
11. Mientras ese commit no exista, `stateSealPending:true` hace explícito que la evidencia física puede ir por delante del estado formal sin que exista doble autoridad.
12. Ninguna regla V4 autoriza reentrada I2/I3, modificación de producto, producción, datos ni agosto.

## Evidencia física congelada al activar V4

Release: `73674c5f0a0b28ed5b0df65e0c6e182345851375` / `gi-i3-73674c5f0a0b-57f234755dc1`.

- Run `34545473273`: Aseguradoras targeted role UI PASS en Dirección, SuperAdmin, AdminTenant, Operativo y Asesor; writes=0; auth adjudicator PASS. Artifact `10179031611`, digest `sha256:d8efac61a213773541f1eb38d4f581f6bfc7e33bf6489ab5ec6690e7ac69aa7d`.
- Run `34548315048`: Login/session/reload residual PASS en los cinco roles. Public, bootstrap y runtime boundary también completaron correctamente. Artifact `10180024717`, digest `sha256:3e04b799083f9df837e7a1940615af244c2d8e0ee40b1aef7072bdfde5bd4682`.
- El rojo global de `34548315048` no invalida el PASS anterior de Aseguradoras: el workflow monolítico la reejecutó aunque no estaba en el scope causal. Esa conducta queda prohibida por V4.

## Próximo paso autorizado

No ejecutar otro barrido global I4A. Reconciliar los 15 contratos de capacidad contra receipts y evidencia preservada. Si todos están completos, realizar el seal atómico de I4A y pasar a I4B. Si falta prueba física, abrir únicamente ese `proofId` y ejecutar solo ese proof.
