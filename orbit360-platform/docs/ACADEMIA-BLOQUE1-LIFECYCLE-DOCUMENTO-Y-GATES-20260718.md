# Academia · Lifecycle del documento y gates

Fecha: 2026-07-18

Un gate debe distinguir tres estados:

1. Bootstrap y Router listos.
2. Documento completamente cargado.
3. Interfaz lista para interacción funcional.

`router-ready` no equivale por sí solo a una interfaz interactuable. Antes de probar acceso, legal, roles o módulos, el gate debe confirmar el lifecycle `load` del navegador.

Cuando el producto y los datos están correctos pero la prueba interactúa demasiado pronto, la clasificación es `PIPELINE_MECHANISM_FAILURE`. Se corrige el gate, no Auth, Store, Router, módulos ni datos.

Evidencia esperada:

```txt
canonical_document_load_complete: true
method: browser-lifecycle-event
beforeAuth: true
```

La evidencia permanece sanitizada y no incluye datos personales ni credenciales.
