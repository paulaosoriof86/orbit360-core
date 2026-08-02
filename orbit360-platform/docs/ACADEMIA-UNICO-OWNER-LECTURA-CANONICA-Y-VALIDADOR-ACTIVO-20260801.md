# Academia — Owner único de lectura, ruta canónica y grafo runtime activo

Fecha: 2026-08-01

## Principio

Una plataforma no debe tener varios componentes leyendo la misma entidad desde rutas o caches diferentes. Aunque cada componente funcione de forma aislada, el resultado puede ser inconsistente porque no comparten la misma autoridad, las mismas reglas de exclusión ni el mismo momento de actualización.

Orbit 360 define ahora un propietario único de lectura:

```text
Orbit.store
```

Los módulos consultan `Orbit.store`; los bridges visuales pueden proyectar o presentar datos, pero no deben abrir listeners Firestore, crear caches de negocio ni reemplazar la API del store.

## Ruta por colección

Las colecciones ya migradas usan el read model canónico:

```text
tenants/{tenantId}/data/{collection}/items
```

Las fuentes todavía no migradas conservan temporalmente su ruta heredada:

```text
tenantId/{tenantId}/{collection}
```

La autoridad se decide por colección. Una colección no debe combinar documentos de ambas rutas en el frontend porque eso oculta duplicados, diferencias de esquema y estados de validación.

## API estable

Los módulos no necesitan conocer la ruta física. Continúan usando:

```text
all / get / where / find / insert / update / remove / on / _emit
```

Esta separación permite adaptar backend y multi-tenancy sin reescribir cada módulo.

## Seeds y calidad

Un seed puede conservarse físicamente para trazabilidad técnica y quedar excluido de la operación. La exclusión debe hacerse una sola vez en el store, no en cada pantalla.

`REQUIERE_VALIDACION` es diferente:

- el registro existe;
- puede aparecer dentro del scope permitido;
- mantiene alertas y restricciones;
- no debe eliminarse del read model por estar pendiente;
- no debe confundirse con un seed.

Por eso el filtro operacional elimina seeds, pero no filtra `REQUIERE_VALIDACION`.

## Grafo runtime activo

No todo archivo rastreado se ejecuta. Para auditar acceso directo a backend se debe distinguir:

- archivos activos cargados por `index.html` o loaders vigentes;
- archivos dormidos conservados por trazabilidad o retiro temporal;
- archivos históricos que ya no son parte del runtime.

En el cierre 7.10:

```text
módulos rastreados: 62
módulos activos auditados: 52
módulos dormidos: 10
violaciones directas en módulos activos: 0
```

Un scanner que analiza todos los archivos sin reconstruir el grafo de carga puede reportar falsos positivos y provocar cambios innecesarios en producto.

## Defecto funcional frente a validador obsoleto

El primer intento del gate 7.10 detectó:

- `localStorage` dentro de un comentario;
- un fallback Firestore dentro de un importador dormido no cargado.

No eran defectos del runtime activo. La clasificación correcta fue:

```text
VALIDATOR_STALE
```

La respuesta correcta no era modificar el producto para que el scanner pasara, sino corregir el validador:

1. analizar ejecución, no comentarios;
2. derivar el grafo runtime real;
3. probar que los artefactos dormidos tengan cero referencias activas;
4. preservar la evidencia histórica.

## Replay de pipeline

Una ejecución redundante puede ocurrir cuando el request, lifecycle y workflow cambian mientras un run ya está cerrando. Aunque la ejecución sea read-only, debe clasificarse y bloquearse.

```text
PIPELINE_MECHANISM_DUPLICATE_STATIC_REPLAY
```

La corrección consiste en:

- consumir el request;
- cerrar el lifecycle;
- eliminar el disparador por push;
- impedir ejecuciones adicionales;
- registrar que no hubo impacto en datos ni producto.

## Regla para futuros módulos

Cada nuevo módulo o bridge debe acreditar:

```text
lee por Orbit.store
no abre Firestore directamente
no mantiene cache paralelo de negocio
no filtra REQUIERE_VALIDACION por defecto
no introduce seeds en la operación
respeta scope, roles y tenant
```

La Academia debe enseñar esta arquitectura como parte de seguridad, multi-tenancy, importadores, calidad y gates.
