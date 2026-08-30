# Rootfix post-go-live: overlays aceptados → release servido — 2026-08-30

Clasificación principal: **PIPELINE_MECHANISM_FAILURE**. Secundaria: **VALIDATOR_STALE**.

## Causa raíz
La cadena llegaba a stage → aceptación → composición → owner-lineage, pero no tenía un bridge registrado para materializar el artefacto histórico más el `activeOverlay` en un release post-go-live. Además, el primer helper de autoridad semántica consumía una forma inexistente del visible-priority lock.

## Solución
- Autoridad semántica corregida para consumir directamente `visibleBlockerIds`, `insurerCredentialReveal`, `cliente360` y `login`.
- Reutilización del rootfix semántico existente para corregir drift dinámico del ledger.
- `POST_GO_LIVE_OVERLAY_RELEASE_PREP_SOURCE_ONLY` valida overlay, blobs, entrypoint, owner y semántica antes de abrir autorización.
- `POST_GO_LIVE_OVERLAY_RELEASE_WINDOW` compone dinámicamente baseline + activeOverlay y delega al executor de release certificado para rollback, Hosting-only deploy, rehash remoto, browser e integridad.
- Browser smoke prueba reveal temporal de Aseguradoras sin persistir ni registrar el valor secreto.
- El release no cierra automáticamente los blockers visibles; la aceptación visual humana sigue siendo obligatoria.

No reimportación. No escrituras de negocio/Auth/Firestore. No Rules deploy. No main/merge.
