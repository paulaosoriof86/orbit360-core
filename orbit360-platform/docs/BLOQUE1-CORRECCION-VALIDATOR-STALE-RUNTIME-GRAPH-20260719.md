# Bloque 1 · Corrección de validador obsoleto · 2026-07-19

## Clasificación

`VALIDATOR_STALE`

## Evidencia

- Run: `29705973898`.
- HEAD: `b9f845de67c247f7a6b7435f1dac5bf52800c23b`.
- Preflight: `1116/1117` comprobaciones aprobadas.
- Único fallo: `RUNTIME_GRAPH_NO_RETIRED_REF:tools/orbit360-gate-runtime-crm-v20260716.mjs:const deadline = Date.now() + 60000`.

## Causa raíz

El overlay de reparación visual incluyó validadores y workflow dentro de `runtimeGraphFiles`. El escáner de referencias retiradas debe revisar únicamente archivos que cargan en el navegador. El deadline de 60 segundos pertenece a la evidencia externa de `DOMContentLoaded` del validador y no representa runtime cliente activo.

## Corrección

- Retirar validadores y workflow del grafo runtime agregado por el overlay.
- Mantenerlos bajo `runtimeVersionContracts`, donde se validan existencia y tokens sin confundirlos con scripts del navegador.
- Conservar el deadline válido y todos los cambios funcionales del parche visual.

## Preservado

No se modifica producto, datos, presupuestos, Store, Auth, Router, importador protegido, reglas Firestore, conteos ni producción.

## Claude y Academia

Clasificación: `BACKEND_PROTEGIDO_NO_CLAUDE`. No cambia UX ni contenido de aprendizaje; Academia conserva la actualización visual 1.221. La regla reusable para pipelines queda documentada: separar grafo runtime de archivos de validación/evidencia.

## Siguiente acción

Ejecutar una sola vez el gate oficial 1.0.27 después de `GO_GATE_CONTRACT`. Aceptar exclusivamente evidencia sanitizada `ok:true`.