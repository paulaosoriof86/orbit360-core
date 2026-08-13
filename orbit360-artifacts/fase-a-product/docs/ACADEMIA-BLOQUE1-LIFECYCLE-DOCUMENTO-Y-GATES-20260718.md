# Academia · Redirecciones y documento canónico en gates

Fecha: 2026-07-18

Una validación puede navegar primero a una página de entrada y después ser redirigida al documento real de la aplicación. Estos estados no deben confundirse:

1. `DOMContentLoaded` de la página de entrada.
2. Cambio de URL hacia el destino.
3. `DOMContentLoaded` del documento canónico.
4. Runtime controlado o cargado.
5. Interfaz lista para el flujo funcional.

Comprobar únicamente la URL no garantiza que el segundo documento haya terminado de construirse. Un gate debe registrar el lifecycle antes de navegar y exigir el evento del destino canónico antes de usar selectores o completar formularios.

Cuando las señales externas funcionan, pero Playwright todavía no puede consultar `body`, el problema puede ser el orden entre documentos y no Auth, credenciales o datos.

Clasificación:

```txt
PIPELINE_MECHANISM_FAILURE
```

Evidencia esperada:

```txt
canonical_domcontentloaded_ready: true
path: /index.html
method: playwright-page-event
beforeAuth: true
```

La corrección se limita al gate. Cliente 360, Aseguradoras, Auth, Legal, Store, reglas y datos permanecen intactos.
