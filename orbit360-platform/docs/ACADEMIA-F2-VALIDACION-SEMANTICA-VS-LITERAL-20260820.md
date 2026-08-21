# Academia Orbit 360 — validar semántica, no literales de implementación

Un validador puede quedar obsoleto aunque el componente que revisa sea correcto. En F2, el register ya cumplía el contrato V2, pero el self-test exigía una cadena textual de una revisión anterior y produjo `VALIDATOR_STALE:F2_REGISTER_NOT_V2` antes del gate.

La regla reusable es validar invariantes observables: versión de request, estado activo, identidad criptográfica, consumo, replay, capacidades y guards. Los nombres internos de status solo deben comprobarse cuando forman parte formal del contrato; no deben utilizarse como sustituto de una comprobación semántica.

Cuando el fallo ocurre antes del gate y la evidencia confirma `runtimeExecuted:false`, `browserExecuted:false`, `secretAccess:false` y `firestoreRead:false`, no corresponde corregir producto ni pedir una nueva autorización. Se corrige el validador y se reanuda el mismo request activo mientras siga no consumido y la superficie autorizada no cambie.
