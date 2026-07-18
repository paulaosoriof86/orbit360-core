# Academia · Estados terminales de un runtime

Fecha: 2026-07-18

Un runtime puede terminar de tres formas válidas o bloqueantes:

1. **Cargado:** el loader ejecuta sus recursos y publica una señal de éxito.
2. **Controlado:** la configuración desactiva intencionalmente el montaje automático y devuelve una promesa resuelta con estado honesto.
3. **Error:** el loader publica fallo, contexto bloqueado o recurso no disponible.

Un gate debe reconocer los dos primeros caminos cuando el contrato del owner los permite. Exigir únicamente el evento de carga convierte el validador en obsoleto cuando el runtime está controlado por configuración.

La clasificación correcta es `VALIDATOR_STALE`: se actualiza el gate y se mantiene congelado el producto.

Evidencia esperada:

```txt
canonical_post_router_runtime_terminal: true
method: external-custom-event-binding
beforeAuth: true
```

Estados `load_failed`, `error` o `blocked_context` permanecen bloqueantes. La evidencia no incluye datos personales ni credenciales.
