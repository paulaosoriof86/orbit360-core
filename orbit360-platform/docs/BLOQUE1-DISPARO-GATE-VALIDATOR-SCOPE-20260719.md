# Bloque 1 · Despacho único posterior a corrección VALIDATOR_STALE · 2026-07-19

## Propósito

Disparar una sola ejecución oficial del gate `block1-client360-insurers-lab-v20260717` sobre el HEAD que ya contiene la corrección de alcance del grafo runtime.

## Antecedentes vinculantes

- Reparación visual: `b9f845de67c247f7a6b7435f1dac5bf52800c23b`.
- Run de preflight fallido: `29705973898`.
- Resultado: `1116/1117`; único fallo por escanear un validador como si fuera runtime de navegador.
- Corrección del overlay: `c5f74e5ed363cb5b6d324ae4b7da58c2bd73c719`.
- Clasificación: `VALIDATOR_STALE` seguida de `PIPELINE_MECHANISM_FAILURE` porque el overlay no figura entre las rutas de activación del workflow.

## Alcance de este commit

Documento de despacho únicamente. No modifica producto, Store, Auth, Router, importadores, datos, presupuestos, Firebase, reglas ni producción.

## Regla de aceptación

- Preflight obligatorio: `GO_GATE_CONTRACT`.
- Una sola ejecución oficial.
- Aceptar exclusivamente artefacto sanitizado `ok:true`.
- Si reaparece el mismo código, detener reintentos y revisar solamente la clasificación del grafo/activación.

## Pendiente de mantenimiento del pipeline

Agregar `tools/orbit360-gate-contract-overlay-v20260718.json` a los filtros `paths` de `push` y `pull_request` del workflow para que futuras modificaciones del overlay disparen el gate directamente. Esta mejora no altera el resultado funcional de M1 y no debe mezclarse con producto.

## Claude y Academia

`BACKEND_PROTEGIDO_NO_CLAUDE`. Academia no cambia: conserva la actualización 1.221 de la reparación visual.