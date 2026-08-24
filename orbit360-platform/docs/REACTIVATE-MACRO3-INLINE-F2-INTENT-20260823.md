# REACTIVACIÓN FINAL MACRO-3 INLINE F2 — 2026-08-23

> **HISTORICAL SUPPORTING EVIDENCE — NOT CURRENT STATE AUTHORITY.** Este registro describe una activación anterior ya detenida; no define el estado vivo ni autoriza un nuevo intento.

Clasificación previa: `PIPELINE_MECHANISM_FAILURE` con `VALIDATOR_STALE` secundario, corregidos source-only.

Este registro no autoriza producción, deploy, main ni merge y no crea una autorización nueva. Conserva la autorización explícita existente ligada a la identidad `9b50d4e95cf32cc8e693dd184ca945e1f532521f37ea8b64f7a1c65e546baa22` y artifact `9485621192`.

Condiciones de reactivación verificadas antes de retirar el freeze:

- un solo workflow físico canónico;
- cero `workflow_dispatch` operativo, `workflow_run`, dispatch REST/CLI o `actions:write`;
- un solo transition owner;
- ledger como único estado operativo mutable;
- autorización/request actuales aún inexistentes;
- exactamente un intent fresco con la identidad autorizada;
- `F2_RUNTIME_ATTEMPT_ACCEPT` consume el presupuesto antes de preflight (`allowedExecutions:0`);
- intento ligado al mismo `GITHUB_RUN_ID` que debe aparecer en evidencia terminal;
- reducer terminal obligatorio para PASS o cualquier clasificación admitida;
- commits internos de AUTH y terminal fuera de `on.push.paths`, por lo que no auto-disparan otro run;
- remote CAS obligatorio en publicación;
- runtime únicamente read-only después del gate; cero writes/deploy/production/main/merge.

Siguiente acción histórica de ese intento: retirar el freeze mediante una sola restauración del workflow inline canónico. Ese intento fue posteriormente detenido por `STOP_RETRY`; consultar el ledger y el comentario vivo de PR #5 para el estado vigente.
