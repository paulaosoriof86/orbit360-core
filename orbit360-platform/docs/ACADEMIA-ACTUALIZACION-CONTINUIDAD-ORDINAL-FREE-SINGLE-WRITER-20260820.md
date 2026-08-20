# Academia Orbit 360 — continuidad viva sin Request hardcodeado

## Qué cambió
Un Request es evidencia de una ejecución, no un estado operativo. Su ordinal puede existir en historial, pero no debe definir `stateVersion`, fase, autorización activa, siguiente acción ni owner documental.

## Patrón correcto
1. Un ledger canónico representa el estado actual sin ordinales de Request.
2. Un solo sincronizador proyecta ese ledger a live-state, índice, lifecycle, README, CHANGELOG y PR.
3. Los workflows de evidencia no crean su propia versión del estado; cuando una evidencia cambia la frontera, delegan la proyección al mismo sincronizador.
4. Un invariant fail-closed busca ordinales en estado activo, referencias históricas indebidas y writers independientes.
5. Requests/autorizaciones consumidos permanecen en historia sellada con `allowedExecutions=0`, `consumed=true`, `replayAllowed=false`.

## Ciclo de una candidata sucesora source-only
1. La candidata se construye desde una base permitida y con deltas de producto explícitos.
2. Se reabre el paquete y se rehashean todos sus archivos antes de subirlo.
3. El artifact subido se vuelve a descargar y verificar; crear un artifact no equivale a certificarlo.
4. La evidencia terminal certificada se incorpora al ledger canónico.
5. El sincronizador proyecta `successorCandidateArtifactId`, `sourceHead` y estado de certificación a las vistas operativas sin habilitar runtime.
6. El invariant confirma que la candidata certificada persiste y que el artifact histórico no reaparece en el estado activo.
7. Solo después puede existir una autorización runtime fresca; nunca se hereda una autorización anterior.

## Regla artifact histórico vs candidata activa
El identificador de un artifact consumido puede existir en `history`, evidencia o boundary histórico, pero no debe quedar embebido en nombres de claves, guards ni estado activo. Incluso una clave como `historicalArtifact<ID>Used:false` viola la separación porque vuelve a acoplar el estado vivo a un ID histórico.

El patrón correcto usa claves semánticas genéricas, por ejemplo `historicalArtifactUsed:false`, y conserva el ID concreto únicamente en historia/evidencia.

## Diferencia causal
- `FUNCTIONAL_DEFECT`: defecto real del producto; ejemplo actual, amplificación de clones en `get()` read-only.
- `VALIDATOR_STALE`: el instrumento contradice el estado observado o sigue fijado a una candidata histórica.
- `PIPELINE_MECHANISM_FAILURE`: owners/writers/propagación de evidencia permiten una frontera incoherente o una certificación válida no puede persistir en el estado canónico.

## Caso aplicado F2
La candidata sucesora source-only fue certificada con dos deltas exactos: readiness del router y rootfix del store `cache.find -> clone(foundRow)`. El artifact histórico anterior no fue reutilizado. La certificación no habilita navegador, secrets, Firestore, writes, deploy ni producción; solo cambia la frontera canónica de `candidata pendiente` a `candidata certificada pendiente de autorización runtime fresca`.

## Regla de continuidad
Una conversación nueva debe iniciar en `orbit360-continuity-ledger-v20260820.json`, validar el writer registry y leer el audit vigente. Nunca debe inferir el estado actual desde el número del último Request ni desde un artifact histórico.
