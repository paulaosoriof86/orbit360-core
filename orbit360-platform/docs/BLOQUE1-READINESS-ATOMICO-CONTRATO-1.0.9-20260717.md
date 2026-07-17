# Bloque 1 — Readiness atómico · contrato 1.0.9

Fecha: 2026-07-17  
Gate: `block1-client360-insurers-lab-v20260717`

## Evidencia

El run `29612533048` aprobó preflight, owners, entorno, canal y conteos 414/26/7. El primer fallo exacto fue `PIPELINE_STEP_TIMEOUT:canonical_runtime_snapshot`.

La espera canónica ya había aprobado. El gate intentaba reconstruir inmediatamente la misma evidencia mediante otra llamada al navegador, que podía quedar detrás del trabajo restante del bootstrap.

## Clasificación

`PIPELINE_MECHANISM_FAILURE`.

No existe evidencia para modificar Auth, Legal, Store, Firebase, datos, Cliente 360 o Aseguradoras.

## Corrección

- una sola condición atómica para URL, runtime, documento completo, Firebase, proveedor y owners;
- dos segundos de estabilidad continua;
- eliminación de `canonical_runtime_snapshot`;
- Auth comienza directamente desde la precondición aprobada;
- mismo gate, workflow, runtime y predicado `ok === true`.

## Carriles

- A: frontend y renderers preservados.
- B: cambio exclusivo del controlador del gate.
- C: 414 clientes, 26 aseguradoras y 7 asesores preservados; sin reimportación.

## Claude

`REPLICABLE_CLAUDE_INMEDIATO`: una precondición aprobada no debe reconstruirse en una segunda lectura.

`REPLICABLE_CLAUDE_ACUMULADO`: readiness atómico → acción → postcondición observable.

`BACKEND_PROTEGIDO_NO_CLAUDE`: entorno LAB, acceso y automatización interna.

## Academia

`ACADEMIA_ACTUALIZAR`: diferencia entre una aplicación no lista y un validador que duplica la lectura del mismo estado.

## Estado

`ACTIVE_PENDING_RUNTIME_GATE`.

Siguiente acción: una sola ejecución del mismo gate sobre el HEAD final. Solo `ok:true` habilita la revisión visual. Bloque 2 y producción permanecen bloqueados.
