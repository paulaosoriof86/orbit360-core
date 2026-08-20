# Academia Orbit 360 — continuidad viva sin Request hardcodeado

## Qué cambió
Un Request es evidencia de una ejecución, no un estado operativo. Su ordinal puede existir en historial, pero no debe definir `stateVersion`, fase, autorización activa, siguiente acción ni owner documental.

## Patrón correcto
1. Un ledger canónico representa el estado actual sin ordinales de Request.
2. Un solo sincronizador proyecta ese ledger a live-state, índice, lifecycle, README, CHANGELOG y PR.
3. Los workflows de evidencia no crean su propia versión del estado; cuando una evidencia cambia la frontera, delegan la proyección al mismo sincronizador.
4. Un invariant fail-closed busca ordinales en estado activo y writers independientes.
5. Requests/autorizaciones consumidos permanecen en historia sellada con `allowedExecutions=0`, `consumed=true`, `replayAllowed=false`.

## Diferencia causal
- `FUNCTIONAL_DEFECT`: defecto real del producto; ejemplo actual, amplificación de clones en `get()` read-only.
- `VALIDATOR_STALE`: el instrumento contradice el estado observado.
- `PIPELINE_MECHANISM_FAILURE`: owners/writers/propagación de evidencia permiten una frontera incoherente.

## Regla de continuidad
Una conversación nueva debe iniciar en `orbit360-continuity-ledger-v20260820.json`, validar el writer registry y leer el audit vigente. Nunca debe inferir el estado actual desde el número del último Request.
