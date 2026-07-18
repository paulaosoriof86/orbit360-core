# Academia Orbit 360 · Importación dinámica determinista

## Qué debe aprender cada rol

Un contrato runtime atraviesa hitos distintos: solicitud, respuesta, parseo, ejecución y owner listo. Ninguno debe confundirse con el siguiente.

## Patrón aplicado

El Router es el único propietario del bootstrap. Usa `import()` sobre una URL same-origin, espera la resolución del navegador, valida el owner canónico y solo después avanza al contrato siguiente.

Los módulos consumidores, como Cliente 360 y Aseguradoras, no cargan contratos de bootstrap. Sus recursos adicionales se activan después del render propietario.

## Clasificación de fallos

- `FUNCTIONAL_DEFECT`: el cargador no garantiza ejecución o readiness.
- `VALIDATOR_STALE`: el producto está correcto, pero el registro o validador exige una versión anterior.
- `PIPELINE_MECHANISM_FAILURE`: el observador o la medición bloquean el mismo hilo que intentan evaluar.

El caso 1.0.26 es un defecto funcional del cargador, no de datos, Auth, Store, Service Worker, Cliente 360 ni Aseguradoras.
