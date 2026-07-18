# Academia · Owners dinámicos y gates funcionales

Fecha: 2026-07-18

Un gate debe distinguir cuatro estados:

1. Bootstrap y Router listos.
2. Loader post-Router iniciado.
3. Loader post-Router terminado mediante su señal propia.
4. Interfaz lista para interacción funcional.

`router-ready` no significa que todos los loaders dinámicos hayan terminado. Tampoco debe usarse `window.load` como sustituto, porque recursos adicionales pueden mantener abierto el lifecycle global sin impedir que el shell cumpla su contrato.

Cada loader debe publicar un evento terminal de éxito o error. El gate observa ese evento desde fuera y después prueba el flujo visible real.

Cuando producto y datos están correctos, pero la prueba usa una condición de espera que no pertenece al owner, la clasificación es `PIPELINE_MECHANISM_FAILURE`. Se corrige el gate, no Auth, Store, Router, módulos ni datos.

Evidencia esperada:

```txt
canonical_post_router_runtime_terminal: true
method: external-custom-event-binding
beforeAuth: true
```

La evidencia permanece sanitizada y no incluye datos personales ni credenciales.
