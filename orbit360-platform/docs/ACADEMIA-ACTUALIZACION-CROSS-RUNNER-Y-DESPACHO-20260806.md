# Academia — cross-runner y causa externa de GitHub Actions — 2026-08-06

## Corrección metodológica

Una ausencia de run no debe clasificarse como configuración deshabilitada sin revisar primero:

1. configuración visible del repositorio;
2. estado oficial del proveedor;
3. existencia de un incidente activo que explique los síntomas.

La configuración de Orbit 360 permitía todas las acciones. La causa vigente es un incidente crítico activo de GitHub Actions.

## Aprendizaje por rol

- Dirección: un precheck exitoso no equivale a certificación visual completa.
- Operativo: separar defecto funcional, validador obsoleto, falla del pipeline y falla externa del proveedor.
- Asesor: una pantalla inicial lista no demuestra todas las rutas ni todos los datos relacionados.
- Administrador: `7 cobros observados` no significa migración completa ni conciliación cerrada; Cobros 4.1 permanece pausado.

## Gates

1. Validar contratos antes de secretos.
2. Probar source-only.
3. Verificar configuración del repositorio.
4. Verificar estado oficial del proveedor antes de inferir falla local.
5. Confirmar que el evento crea un run.
6. Confirmar que el runner inicia checkout.
7. Solo después habilitar runtime autorizado.

## Diferencias clave

- `FUNCTIONAL_DEFECT`: falla el producto después de ejecutar.
- `PIPELINE_MECHANISM_FAILURE`: el mecanismo de prueba no controla timeout, señales o persistencia.
- `ENVIRONMENT_FAILURE / RUNNER_QUEUE_UNAVAILABLE`: existe run, pero no recibe runner.
- `ENVIRONMENT_FAILURE / GITHUB_ACTIONS_MAJOR_OUTAGE_ACTIVE`: el proveedor confirma una interrupción mayor que explica colas, timeouts, fallos de despacho y errores de API.

El estado actual corresponde al último caso. No certifica ni invalida funcionalmente la candidata.
