# Academia Orbit 360 — delta F2 2026-08-19

Caso reusable: diferenciar un `FUNCTIONAL_DEFECT` del producto de un `VALIDATOR_STALE` posterior. Request06 ejecutó y encontró un valor visible no finito en Inicio; el producto se corrigió en una candidata sucesora. El gate histórico seguía validando correctamente al predecessor, por lo que no estaba roto: quedó obsoleto para la nueva candidata.

Patrón: ejecutar primero el gate canónico vigente; preservar la evidencia histórica; versionar owners del mismo gate; usar un estado intermedio `PENDING_REBIND_SOURCE_ONLY`; mantener runtime bloqueado hasta `CLOSED_PASS`; no tocar datos, Auth o Firebase para corregir una referencia de candidato.

## Segundo patrón reusable: composición lifecycle por gate

El primer SOURCE de la candidata 9385306424 se detuvo antes de descargar el artifact con `CANONICAL_LIFECYCLE_REVISION_MISMATCH`. El producto no participó. La causa fue un router canónico que exigía globalmente `phase-capability-contract-v1` aunque el gate F2 había versionado correctamente su lifecycle a `phase-capability-contract-v2-source-rebind`. El patrón correcto es conservar v1 como default y permitir que cada gate declare su composición esperada; nunca relajar capacidades ni convertir el router en un bypass.
