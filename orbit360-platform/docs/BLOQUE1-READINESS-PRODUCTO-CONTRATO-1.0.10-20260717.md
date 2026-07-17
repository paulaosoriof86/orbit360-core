# Bloque 1 — Readiness funcional del producto · contrato 1.0.10

Fecha: 2026-07-17  
Gate: `block1-client360-insurers-lab-v20260717`

## Evidencia

El intento 2 del run `29614128345` aprobó preflight, entorno, publicación, navegador y ejecución del gate. El primer fallo fue `PIPELINE_STEP_TIMEOUT:canonical_runtime_atomic_ready`.

La versión 1.0.8 ya había confirmado URL, runtime, Firebase y owners. La condición agregada en 1.0.9 exigía `document.readyState === complete`, que depende también de recursos secundarios y no representa el cierre funcional de Orbit.

## Clasificación

- `VALIDATOR_STALE`: el criterio `document.complete` no pertenece al contrato funcional.
- `PIPELINE_MECHANISM_FAILURE`: el gate confundía transporte documental con readiness del producto.

No existe evidencia para modificar Auth, Legal, Store, Firebase, datos, Cliente 360 o Aseguradoras.

## Corrección

Readiness funcional verificado por postcondiciones públicas:

- documento ya parseado;
- runtime y Firebase correctos;
- proveedor Auth disponible;
- formulario con `data-auth-mode=firestore-lab`, posterior a `auth.init()`;
- `Orbit.route.key`, posterior al inicio del Router;
- sidebar con rutas, posterior a su construcción;
- Store, Router y Auth owners disponibles;
- estabilidad continua durante dos segundos.

El gate se modularizó sin crear un gate paralelo:

- `tools/orbit360-gate-runtime-crm-v20260716.mjs`: controlador único y vistas;
- `tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs`: readiness, Auth y Legal;
- `tools/orbit360-gate-environment-v20260717.mjs`: lectura aislada del entorno CI.

## Carriles

- A: frontend y renderers preservados.
- B: cambio exclusivo del validador/pipeline.
- C: 414 clientes, 26 aseguradoras y 7 asesores preservados; sin reimportación.

## Claude

`REPLICABLE_CLAUDE_INMEDIATO`: validar postcondiciones del producto, no el estado global de carga del navegador.

`REPLICABLE_CLAUDE_ACUMULADO`: bootstrap funcional → acción → postcondición observable.

`BACKEND_PROTEGIDO_NO_CLAUDE`: entorno, acceso y automatización LAB.

## Academia

`ACADEMIA_ACTUALIZAR`: diferencia entre una página que aún carga recursos secundarios y una aplicación funcionalmente lista.

## Estado

`ACTIVE_PENDING_RUNTIME_GATE`.

Siguiente acción: una sola ejecución del mismo gate sobre el HEAD final. Solo `ok:true` habilita la revisión visual. Bloque 2 y producción permanecen bloqueados.
