# Cliente 360 — cierre de linaje preservado

Fecha: 2026-08-27  
Rama canónica objetivo: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Clasificación: `VALIDATOR_STALE` para la divergencia histórica v22; no se confirmó `PROMOTION_OMISSION` de producto.

## Necesidad

Cerrar la cadena histórica v17 → v18 → v19 → v21 → v22 sin reprocesar Cliente 360 y demostrar si la candidata certificada conserva el último source funcional aceptado.

## Evidencia

- v21 y v22 tienen el mismo árbol completo `orbit360-platform`: `dfae6d6281baa247f8cd52db7a8023f0021567e7`; los commits exclusivos v22 pertenecen a infraestructura de validación/gate y no cambian producto.
- El último commit que modifica `modules/cliente360.js` antes de la candidata certificada es `842f762f199f4c7dbf13062a33ca220d92398c51`, `fix(macro2): transversal safe read-model source acceptance`.
- Ese source genera/consume el contrato de aceptación transversal source-only con 107/107 checks, 194 archivos, 9 deltas y 185 archivos sin cambios; Cliente 360 forma parte explícita de los nueve deltas.
- El certificador posterior `8c9668d6d423e82826b0295431ec699390d79b4b` reconoce `842f762f199f4c7dbf13062a33ca220d92398c51` como `priorCandidate`, artifact `9485621192`, 194 archivos, 9 deltas, 185 sin cambios.
- El árbol completo `orbit360-platform/modules` en `842f762f...` y en la candidata certificada `8c9668d6...` es idéntico: `f61c22138107cae5971338ad45c2e6225f72da5b`.
- El blob de `orbit360-platform/modules/cliente360.js` en ambos sources es idéntico: `fa50bae659ed03909a220d720fc0305838c75b31`.

## Decisión

El linaje source de Cliente 360 puede pasar de `HISTORICAL_CHAIN_IN_PROGRESS` a `LAST_APPROVED_LINEAGE_PRESERVED_SOURCE`.

Esto **no** equivale a `PASS_PRESERVED_VISUAL`. La validación visual humana sigue pendiente y la anomalía visual previamente observada no autoriza rebuild, reimport ni mutación de producto/datos.

## Sincronización del mecanismo

El primer cierre atómico se publicó en la rama canónica como `5f19d2eb8fa58a31d57ee0d64659a851a4468d11`, sincronizando:

1. `orbit360-certified-product-preservation-registry-v20260827.json`
2. `orbit360-certified-product-preservation-v20260827.mjs`
3. workflow canónico source-only
4. fingerprint del workflow en `orbit360-gate-contract-registry-v20260717.json`

El `CONTROL_PLANE_SELFTEST` run `33109149445` confirmó que el guard exacto de Cliente 360 pasa con `CLIENTE360_LAST_APPROVED_LINEAGE_PRESERVATION_PASS`, pero se detuvo inmediatamente después en `single-state-invariant` con `CLIENTE360_MODULE_LINEAGE_INVALID`.

## Causa raíz del self-test fallido

Clasificación: `PIPELINE_MECHANISM_FAILURE` con manifestación `VALIDATOR_STALE`.

El invariant activo todavía exigía tres representaciones antiguas de `HISTORICAL_CHAIN_IN_PROGRESS`: validación del registro, validación del workflow y salida PASS. No se ejecutó self-test posterior, claim, secretos, Firestore, navegador, runtime, deploy ni producción.

El inventario de consumidores activos comprobó que writer registry, state contract, ledger owner y publication preflight no fijan el estado histórico viejo. El consumidor obsoleto restante es `tools/orbit360-single-state-invariant-v20260827.mjs`; como el state contract fingerprinta ese archivo, su corrección exige actualizar conjuntamente `singleStateInvariantBlobSha` en `tools/orbit360-gate-contract-registry-v20260717.json`.

La corrección del invariant no acepta una etiqueta aislada. Debe verificar el artifact aprobado `9485621192`, source `842f762f199f4c7dbf13062a33ca220d92398c51`, árbol de módulos `f61c22138107cae5971338ad45c2e6225f72da5b`, blob Cliente 360 `fa50bae659ed03909a220d720fc0305838c75b31`, v22 sin delta de producto, `promotionOmissionConfirmed:false`, evidencia visual humana todavía requerida y `visualPass:false`.

## Carriles

- A: sin cambios de frontend/producto; solo trazabilidad y preparación de validación visual.
- B: sincronización source-only del guard de preservación, invariant y fingerprints.
- C: datos A&S intactos; cero reimportación/reproceso.

## Claude / Academia

- Concepto: `REPLICABLE_CLAUDE_ACUMULADO`.
- Implementación del guard/control plane: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Academia: `ACADEMIA_ACTUALIZAR` para enseñar diferencia entre linaje source preservado y PASS visual, y entre `VALIDATOR_STALE` y omisión real de promoción.

## Estado

`INVARIANT_STALE_ROOTFIX_PREPARED_AWAITING_CANONICAL_SOURCE_ONLY_SELFTEST`.
