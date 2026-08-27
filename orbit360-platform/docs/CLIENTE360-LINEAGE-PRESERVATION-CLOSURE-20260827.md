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

El cambio se prepara de forma conjunta en:

1. `orbit360-certified-product-preservation-registry-v20260827.json`
2. `orbit360-certified-product-preservation-v20260827.mjs`
3. workflow canónico source-only
4. fingerprint del workflow en `orbit360-gate-contract-registry-v20260717.json`

La rama canónica debe recibirlos en un único commit atómico. Después debe ejecutarse un `CONTROL_PLANE_SELFTEST` nuevo sobre el HEAD canónico.

## Carriles

- A: sin cambios de frontend/producto; solo trazabilidad y preparación de validación visual.
- B: sincronización source-only del guard de preservación y sus consumidores.
- C: datos A&S intactos; cero reimportación/reproceso.

## Claude / Academia

- Concepto: `REPLICABLE_CLAUDE_ACUMULADO`.
- Implementación del guard/control plane: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Academia: `ACADEMIA_ACTUALIZAR` para enseñar diferencia entre linaje source preservado y PASS visual, y entre `VALIDATOR_STALE` y omisión real de promoción.

## Estado

`PREPARED_AWAITING_CANONICAL_SOURCE_ONLY_SELFTEST`.
