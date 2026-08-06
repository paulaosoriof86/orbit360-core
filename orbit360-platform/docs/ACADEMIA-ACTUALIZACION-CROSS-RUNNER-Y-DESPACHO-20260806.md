# Academia — cross-runner y despacho de workflows — 2026-08-06

## Aprendizaje por rol

- Dirección: un precheck exitoso no equivale a certificación visual completa.
- Operativo: separar defecto funcional, defecto de validador, falla del runner y falla de despacho.
- Asesor: una pantalla inicial lista no demuestra todas las rutas ni todos los datos relacionados.
- Administrador: `7 cobros observados` no significa migración completa ni conciliación cerrada; Cobros 4.1 permanece pausado.

## Gates

1. Validar contratos antes de secretos.
2. Probar source-only.
3. Confirmar que el evento crea un run.
4. Confirmar que el runner inicia checkout.
5. Solo después habilitar runtime autorizado.

## Diferencias clave

- `FUNCTIONAL_DEFECT`: falla el producto después de ejecutar.
- `PIPELINE_MECHANISM_FAILURE`: el mecanismo de prueba no controla timeout, señales o persistencia.
- `ENVIRONMENT_FAILURE / RUNNER_QUEUE_UNAVAILABLE`: existe run, pero no recibe runner.
- `ENVIRONMENT_FAILURE / EVENT_DISPATCH_UNAVAILABLE`: ni siquiera se crea el run.

El estado actual corresponde al último caso; no certifica ni invalida funcionalmente la candidata.
