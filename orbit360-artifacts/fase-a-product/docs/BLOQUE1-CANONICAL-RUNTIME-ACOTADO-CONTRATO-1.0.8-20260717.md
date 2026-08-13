# Bloque 1 — Runtime canónico acotado · contrato 1.0.8

Fecha: 2026-07-17  
Gate: `block1-client360-insurers-lab-v20260717`

## Evidencia

El run `29611381628` aprobó preflight, owners, entorno, conteos 414/26/7, sellado, canal y navegador. El artefacto terminó en `GATE_TIMEOUT:canonical_runtime`.

El controlador usaba un bucle nominal de 60 segundos, pero cada lectura `page.evaluate` carecía de límite individual. Si el hilo del documento permanecía ocupado, el controlador no recuperaba el control hasta el watchdog global de cinco minutos.

## Clasificación

`PIPELINE_MECHANISM_FAILURE`

No se demostró defecto en Auth, Legal, Store, datos, Cliente 360 ni Aseguradoras.

## Corrección

- mismo gate y mismo workflow;
- controlador consolidado, sin gate paralelo;
- espera canónica administrada por Playwright;
- estabilidad continua requerida durante 1.2 segundos;
- timeout propio de 95 segundos;
- snapshot final acotado a 12 segundos;
- conservación del handoff del owner Auth;
- errores por etapa antes del watchdog global.

Archivos coordinados:

- `tools/orbit360-gate-runtime-crm-v20260716.mjs`;
- `tools/orbit360-gate-contract-registry-v20260717.json`;
- este registro.

## Carriles

- A: renderers y UX preservados.
- B: corrección exclusiva del pipeline del gate.
- C: 414 clientes, 26 aseguradoras y 7 asesores preservados; sin reimportación.

## Claude

`REPLICABLE_CLAUDE_INMEDIATO`: toda operación de validación del navegador debe tener límite propio.

`REPLICABLE_CLAUDE_ACUMULADO`: precondición → espera acotada → snapshot → acción → postcondición.

`BACKEND_PROTEGIDO_NO_CLAUDE`: entorno, acceso, canal y automatización interna.

## Academia

`ACADEMIA_ACTUALIZAR`: diferenciar un producto no disponible de un controlador que perdió capacidad de recuperar el control.

## Estado

`ACTIVE_PENDING_RUNTIME_GATE`.

Siguiente acción: una sola ejecución del mismo gate sobre el HEAD final. Solo `ok:true` habilita la revisión visual; Bloque 2 y producción continúan bloqueados.
