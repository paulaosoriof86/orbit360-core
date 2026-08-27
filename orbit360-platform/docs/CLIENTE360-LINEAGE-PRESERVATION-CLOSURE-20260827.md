# Cliente 360 — cierre de linaje preservado

Fecha: 2026-08-27  
Rama canónica: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Clasificación histórica: `VALIDATOR_STALE`; no se confirmó `PROMOTION_OMISSION` de producto.

## Necesidad

Cerrar la cadena histórica v17 → v18 → v19 → v21 → v22 sin reprocesar Cliente 360 y demostrar si la candidata certificada conserva el último source funcional aceptado.

## Evidencia de linaje

- v21 y v22 tienen el mismo árbol completo `orbit360-platform`: `dfae6d6281baa247f8cd52db7a8023f0021567e7`; los commits exclusivos v22 pertenecen a infraestructura de validación/gate y no cambian producto.
- El último commit que modifica `modules/cliente360.js` antes de la candidata certificada es `842f762f199f4c7dbf13062a33ca220d92398c51`, `fix(macro2): transversal safe read-model source acceptance`.
- Ese source genera/consume el contrato de aceptación transversal source-only con 107/107 checks, 194 archivos, 9 deltas y 185 archivos sin cambios; Cliente 360 forma parte explícita de los nueve deltas.
- El certificador posterior `8c9668d6d423e82826b0295431ec699390d79b4b` reconoce `842f762f199f4c7dbf13062a33ca220d92398c51` como `priorCandidate`, artifact `9485621192`, 194 archivos, 9 deltas, 185 sin cambios.
- El árbol completo `orbit360-platform/modules` en `842f762f...` y en la candidata certificada `8c9668d6...` es idéntico: `f61c22138107cae5971338ad45c2e6225f72da5b`.
- El blob de `orbit360-platform/modules/cliente360.js` en ambos sources es idéntico: `fa50bae659ed03909a220d720fc0305838c75b31`.

## Causa raíz del primer self-test

El primer `CONTROL_PLANE_SELFTEST`, run `33109149445`, confirmó que el guard exacto de Cliente 360 pasaba, pero se detuvo en `single-state-invariant` con `CLIENTE360_MODULE_LINEAGE_INVALID`.

Clasificación: `PIPELINE_MECHANISM_FAILURE` con manifestación `VALIDATOR_STALE`.

El invariant todavía exigía tres representaciones antiguas de `HISTORICAL_CHAIN_IN_PROGRESS`: validación del registro, validación del workflow y salida PASS. No se ejecutó runtime, secretos, Firestore, navegador, deploy ni producción.

El inventario de consumidores activos confirmó que writer registry, state contract, ledger owner y publication preflight no fijaban el estado histórico viejo. La corrección sincronizó el invariant y su fingerprint en el gate registry sin modificar producto ni datos.

## Cierre canónico

Commit canónico del rootfix del invariant:

`79378eb6809bfd2fda8a1a95234c958289f36520`

`fix(cliente360): synchronize invariant with preserved lineage proof`

El invariant ahora exige evidencia durable, no una etiqueta aislada: artifact aprobado `9485621192`, source `842f762f199f4c7dbf13062a33ca220d92398c51`, árbol de módulos `f61c22138107cae5971338ad45c2e6225f72da5b`, blob Cliente 360 `fa50bae659ed03909a220d720fc0305838c75b31`, v22 sin delta de producto, `promotionOmissionConfirmed:false`, evidencia visual humana todavía requerida y `visualPass:false`.

## Self-test final

Run: `33116493744`  
Job: `98672352408`  
Resultado: `PASS`

Evidencia simultánea:

- `CERTIFIED_PRODUCT_BASELINE_PRESERVATION_PASS`
- `SINGLE_STATE_CONTROL_PLANE_STATIC_INVARIANT_PASS`
- `SINGLE_STATE_CONTROL_PLANE_SELFTEST_PASS`
- `ASEGURADORAS_FINAL_OWNER_PRESERVATION_PASS`
- `cliente360LineageStatus: LAST_APPROVED_LINEAGE_PRESERVED_SOURCE`
- `cliente360LineageProofStatus: CLIENTE360_LAST_APPROVED_LINEAGE_PRESERVATION_PASS`
- `cliente360VisualPass:false`
- `changedProductFilesSinceBaseline:0`
- `noReprocess:true`
- `noReimport:true`
- runtime/browser/secrets/Firestore/writes/deploy/production: cero/no ejecutados

El workflow confirma además la secuencia visual vigente: `aseguradoras → cliente360 → polizas`.

## Decisión

Cliente 360 queda cerrado a nivel de linaje source como `LAST_APPROVED_LINEAGE_PRESERVED_SOURCE`.

Esto **no** equivale a `PASS_PRESERVED_VISUAL`. La revisión visual humana sigue pendiente y la anomalía visual previamente observada no autoriza rebuild, reimport ni mutación de producto/datos.

## Carriles

- A: sin cambios de frontend/producto; siguiente validación visual: Aseguradoras, luego Cliente 360.
- B: invariant/control plane sincronizado y self-test PASS.
- C: datos A&S intactos; cero reimportación/reproceso.

## Claude / Academia

- Concepto: `REPLICABLE_CLAUDE_ACUMULADO`.
- Implementación del guard/control plane: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Academia: `ACADEMIA_ACTUALIZAR` para enseñar diferencia entre linaje source preservado y PASS visual, y entre `VALIDATOR_STALE` y omisión real de promoción.

## Estado

`CONTROL_PLANE_SELFTEST_PASS_SOURCE_LINEAGE_CLOSED_VISUAL_PENDING`.
