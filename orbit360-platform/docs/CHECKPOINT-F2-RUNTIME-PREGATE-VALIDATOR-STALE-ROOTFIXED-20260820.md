# Checkpoint F2 — runtime pre-gate VALIDATOR_STALE cerrado source-only

Fecha: 2026-08-20

## Estado
La candidata sucesora source-only permanece certificada e inmutable: artifact `9395391426`, source `6af0c029aebb1bfecd05569452c814584110ae4c`, 194 archivos y rehash completo.

La autorización fresca produjo una única ejecución runtime, sellada en historia como ordinal 13. El run `32339845253` terminó **antes del gate** con `VALIDATOR_STALE:F2_ACTIVE_PIPELINE_HISTORICAL_CANDIDATE_LITERAL`; artifact de evidencia `9395952863`. No hubo acceso a secrets, Firestore ni navegador, y los writes Firestore/Auth/operacionales fueron `0/0/0`.

## Causa raíz del pre-gate
El self-test prohibía correctamente referencias literales al artifact histórico en el pipeline activo, pero el propio engine mantenía el mismo identificador como constante de bloqueo. La regla se autocontradecía: una referencia histórica usada para prohibir reutilización era detectada como reutilización.

## Rootfix persistente
El engine ya no contiene un identificador histórico hard-codeado. Obtiene `candidateBoundary.historicalArtifactId` del ledger canónico y compara dinámicamente contra la candidata activa. Así se conserva el guard de no-reuso sin contaminar el pipeline con IDs históricos.

Request y autorización de la ejecución quedaron consumidos, congelados y sin replay. No existe autorización runtime activa ni carry-forward.

## Clasificación
`VALIDATOR_STALE` — producto y candidata permanecieron congelados.

## Siguiente acción
`AWAIT_FRESH_EXPLICIT_AUTHORIZATION_FOR_CERTIFIED_F2_SUCCESSOR_RUNTIME`.

No se autoriza replay, nuevo runtime, deploy, publicación, producción, main ni merge desde este checkpoint.
