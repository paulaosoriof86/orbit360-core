# Claude acumulado — barrera reusable de doble ruta en visualización

Fecha: 2026-08-01  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Antes de considerar lista una vista conectada a backend, el frontend debe recibir un descriptor sanitizado del origen físico de cada colección:

```text
collection
pathContract
sourceMode
scope
countryProjection
countExpected
countObserved
```

La UI no debe mostrar copy técnico, pero el gate automatizado debe probar que todas las colecciones relacionadas provienen del mismo contrato de ruta.

## Barrera requerida

Un preview visual debe bloquearse cuando:

```text
baseline.pathContract != runtime.pathContract
```

También debe bloquearse cuando la colección principal y sus relaciones provienen de rutas diferentes, aunque sus IDs o conteos parezcan válidos.

## Aplicación a módulos reutilizables

El patrón aplica a:

- Pólizas y Vehículos;
- Recibos, Cartera y Cobros;
- Clientes y Cliente 360;
- Siniestros y documentos;
- Comisiones y conciliaciones;
- cualquier importador que escriba en una ruta distinta de la consultada por el producto.

## No enviar a Claude

No incluir:

- datos reales;
- nombres de clientes;
- números de póliza;
- rutas con secretos o credenciales;
- IDs privados;
- configuración protegida de Firebase;
- writers o adaptadores backend protegidos.

## Criterio de aceptación

Claude puede implementar UX reusable para estados como:

```text
Información pendiente de sincronización
Relaciones todavía no disponibles
Revisión de datos requerida
```

No debe implementar un fallback silencioso, mostrar términos como Firebase/Firestore/LAB o inventar que la información está vacía cuando el gate detecta una divergencia de ruta.
