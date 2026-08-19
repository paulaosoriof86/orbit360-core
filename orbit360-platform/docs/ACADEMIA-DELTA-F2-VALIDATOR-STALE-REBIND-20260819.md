# Academia Orbit 360 — delta F2 2026-08-19

Caso reusable: diferenciar un `FUNCTIONAL_DEFECT` del producto de un `VALIDATOR_STALE` posterior. Request06 ejecutó y encontró un valor visible no finito en Inicio; el producto se corrigió en una candidata sucesora. El gate histórico seguía validando correctamente al predecessor, por lo que no estaba roto: quedó obsoleto para la nueva candidata.

Patrón: ejecutar primero el gate canónico vigente; preservar la evidencia histórica; versionar owners del mismo gate; usar un estado intermedio `PENDING_REBIND_SOURCE_ONLY`; mantener runtime bloqueado hasta `CLOSED_PASS`; no tocar datos, Auth o Firebase para corregir una referencia de candidato.
