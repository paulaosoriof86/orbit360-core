# Academia Orbit 360 — continuidad viva sin Request hardcodeado

## Qué cambió
Un Request es evidencia de una ejecución, no un estado operativo. Su ordinal puede existir en historial, pero no debe definir `stateVersion`, fase, autorización activa, siguiente acción ni owner documental.

## Patrón correcto
1. Un ledger canónico representa el estado actual sin ordinales de Request.
2. Un solo sincronizador proyecta ese ledger a live-state, índice, lifecycle, estado PR y checkpoint.
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
- `PIPELINE_MECHANISM_FAILURE`: owners, observers o proyecciones permiten una frontera incoherente, degradan evidencia ya terminal o dejan documentación viva desincronizada.

## Caso aplicado F2
La candidata sucesora source-only fue certificada con readiness del router y el rootfix del store `cache.find -> clone(foundRow)`. El artifact histórico anterior no fue reutilizado. La certificación no habilita navegador, secrets, Firestore, writes, deploy ni producción; solo cambia la frontera canónica de candidata pendiente a candidata certificada pendiente de autorización runtime fresca.

La ejecución F2 real posterior llegó al navegador en modo read-only y terminó con `VALIDATOR_STALE` porque el polling de readiness agotó su ventana en `polizas`, aunque la captura final demostraba simultáneamente `routeKey` correcto, hash correcto, host visible y contenido renderizado. La regla aprendida es que una contradicción demostrable entre timeout y captura final no debe abrir un fix de producto: se congela producto y se corrige el validador propietario.

## Consumo one-shot aunque el resultado sea VALIDATOR_STALE
Si una ejecución alcanzó secrets, Firestore read o browser, la autorización one-shot se considera consumida aunque el resultado terminal sea FAIL. Deben sellarse autorización y request con `allowedExecutions=0`, `consumed=true`, `historical=true` y `replayAllowed=false`. La ejecución no se repite con el mismo digest.

En el caso F2, la integridad before/after confirmó hashes y conteos idénticos y cero escrituras. Eso permite reconciliar el fallo como seguro, pero no convertirlo en autorización reutilizable.

## Observer monotónico
Una evidencia terminal ya sellada no puede ser degradada por un observer posterior a `pending`, `not found` o a un run distinto. El observer debe comprobar primero si ya existe terminal evidence vinculada al mismo request y artifact; si existe, termina sin sobrescribirla. Esto evita que un corte de observación posterior reescriba la historia real.

## Frontera fresca después de un terminal consumido
Una nueva autorización no reutiliza el digest previo. La identidad se vuelve a calcular con:

`gateId + gateContractVersion + candidateArtifactId + candidateArtifactDigest + candidateSourceHead + ledgerRevision + packageRevision + executionProfile`.

El auditor debe recomputar el SHA-256 y compararlo, no limitarse a verificar que tenga 64 caracteres. Mientras no exista autorización explícita para ese digest nuevo, `authorized`, `authorizationPersisted`, `requestMaterialized` y `runtimeAllowed` permanecen en `false`.

## Generator y proyección son owners distintos pero complementarios
El transition owner cambia el estado revisionado. El `authorizationBoundaryGenerator` es la autoridad que materializa la frontera a partir del ledger/package ya vigentes. Después, la `atomic projection` actualiza live-state, índice, lifecycle, estado PR y checkpoint. Una transición que cambie ledger/package y omita esa proyección produce un `PIPELINE_MECHANISM_FAILURE` documental, aunque la frontera en sí sea correcta.

Por eso el refresh durable debe cerrar en una sola secuencia source-only: transición revisionada → generator canónico → proyección atómica → audit de frontera → composite invariant/readback. Ninguno de esos pasos concede autorización runtime.

## Regla de continuidad
Una conversación nueva debe iniciar en `orbit360-continuity-ledger-v20260820.json`, validar el writer registry, leer package + authorization boundary y verificar HEAD real. Nunca debe inferir el estado actual desde el número del último Request, desde un artifact histórico ni desde un PR body no proyectado.
