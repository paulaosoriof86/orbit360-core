# Claude acumulado — Store canónico con owner único

Fecha: 2026-08-01

## Clasificación

```text
REPLICABLE_CLAUDE_ACUMULADO
```

Transferible:

- un solo propietario de lectura para el frontend;
- selección de autoridad por colección;
- API de store estable frente a cambios de backend;
- exclusión central de seeds;
- preservación de registros pendientes de validación;
- bridges visuales sin listeners ni caches paralelos;
- auditoría del grafo runtime activo;
- bloqueo de replay del pipeline después del cierre.

No transferible:

```text
TENANT_AYS_ONLY
```

- nombres y conteos exactos de colecciones;
- digests canónicos y del manifiesto;
- runs, jobs, artifacts y SHAs;
- configuración de identidad LAB;
- valores o relaciones reales del tenant.

Protegido:

```text
BACKEND_PROTEGIDO_NO_CLAUDE
```

- rutas físicas completas del proyecto real;
- implementación exacta de adapters y autenticación;
- credenciales y secrets;
- herramientas internas de gates;
- reglas de escritura, deploy y rollback.

Academia:

```text
ACADEMIA_ACTUALIZAR
```

Enseñar la diferencia entre autoridad de datos, propietario de lectura, proyección visual, seed y estado de calidad.

## Patrón reusable

### Problema

Dos componentes leen la misma entidad directamente desde backend y mantienen caches propios. El frontend puede mostrar estados distintos aun cuando ambos componentes sean individualmente correctos.

### Solución

```text
backend adapters
      ↓
  single store owner
      ↓
queries / permissions / scopes
      ↓
modules and visual bridges
```

Los módulos no conocen la ruta física. El store decide la autoridad por colección y conserva una API pública estable.

### Reglas del store

- una colección tiene una sola autoridad activa;
- los registros se normalizan en el borde;
- seeds se excluyen una vez para la operación;
- estados de calidad se conservan;
- listeners se crean únicamente en el owner;
- eventos de actualización se emiten desde el owner;
- bridges no sustituyen métodos del store.

### Regla para bridges

Un bridge visual puede:

- crear vistas derivadas;
- calcular resúmenes;
- adaptar etiquetas;
- reaccionar a eventos del store.

No puede:

- abrir Firestore directamente;
- mantener un segundo cache de negocio;
- combinar fuentes físicas;
- escribir fuera de la API autorizada;
- esconder registros pendientes para simular calidad.

## Auditoría del runtime

El scanner debe reconstruir los scripts realmente cargados por el entrypoint y sus loaders. Los archivos dormidos se auditan como inventario y deben tener cero referencias activas, pero no deben contarse como ejecución.

```text
tracked files ≠ active runtime graph
```

Modificar producto por un hallazgo de un archivo no cargado es un error metodológico.

## Validador obsoleto

Clasificar como `VALIDATOR_STALE` cuando:

- el scanner analiza comentarios como código;
- el universo auditado incluye artefactos retirados;
- el gate mide un contrato anterior;
- la evidencia no representa la capacidad realmente ejecutada.

La corrección debe hacerse en validador, lifecycle, preflight, workflow, documentación y Academia conjuntamente.

## Replay del pipeline

Después de un PASS aceptado:

1. consumir el request;
2. cerrar lifecycle;
3. retirar el trigger mutable;
4. preservar workflow como evidencia no ejecutable;
5. registrar cualquier run redundante como mecanismo, no como nuevo resultado de producto.

Clasificación reusable:

```text
PIPELINE_MECHANISM_DUPLICATE_STATIC_REPLAY
```

## Seguridad

El patrón no autoriza secrets, lectura de datos, navegador ni deploy. Esos pasos requieren un bloque runtime posterior con capacidades explícitas y deben reutilizar el mismo store y manifiesto ya auditados.
