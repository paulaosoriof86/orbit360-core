# Claude acumulado v20 — exact runtime artifact gate

Fecha: 2026-08-07

## Clasificación

### BACKEND_PROTEGIDO_NO_CLAUDE

No enviar a Claude:

- rutas y contenido exactos del control-plane Orbit 360;
- lifecycle/overlay/request;
- runners, restore, rollback, credenciales o Firebase LAB;
- evidencia de tenant o datos reales;
- implementación exacta de `tools/orbit360-*` protegidos.

### REPLICABLE_CLAUDE_ACUMULADO

Patrón reusable permitido, sin detalles protegidos:

> Cuando un pipeline genera código o un artefacto ejecutable, el gate previo a runtime debe construir con el mismo generador el artefacto exacto que será ejecutado, compilarlo/importarlo y probar además un artefacto corrupto conocido. Una falla de generación, parse o import se clasifica como fallo del pipeline, no como defecto funcional del producto. Si un validator espera un owner anterior, se congela producto y se actualizan juntos owner, validator y workflow.

## Razón

v19 demostró que validar solo el generador no garantiza que el producto generado sea ejecutable. v20 cierra esa brecha con una única fuente de generación y evidencia exacta.

## Academia

`ACADEMIA_ACTUALIZAR`: sí. Incorporar diferencia entre defecto funcional, validator stale y pipeline failure; y el principio de exact-artifact gate antes de secretos/runtime.

## Tenant A&S

No hay cambio tenant-only en v20. Cliente 360 bounded render sigue siendo funcional reusable; la reconciliación 414/26/7 no forma parte de este rootfix.
