# Academia — Preflight portable y STOP_RETRY v8

Fecha: 2026-08-06  
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`

## Qué debe enseñar Academia

1. Un `ENGINE_EXCEPTION` del validador no equivale a defecto funcional del producto. En este caso fue `PIPELINE_MECHANISM_FAILURE` porque el router no propagó la ruta del request y el motor intentó leer un directorio.
2. Una dependencia local ausente, como `jq`, debe resolverse en el mecanismo del preflight, no mediante pasos manuales del usuario.
3. `STOP_RETRY` congela la autorización anterior. El request v8 no puede reutilizarse aunque no se hayan abierto secretos ni ejecutado Hosting.
4. El preflight debe ser portable, emitir evidencia sanitizada y terminar antes de secretos cuando no existe una autorización fresca.
5. Solo un request nuevo, inmutable y ligado al HEAD vigente puede desactivar el overlay de STOP y permitir buscar `GO_GATE_CONTRACT`.

## Evidencia

- Suite source-only: `17/17 PASS`.
- Sin Firebase, navegador, deploy, escrituras ni producción.
- Overlay activo: `tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json`.
