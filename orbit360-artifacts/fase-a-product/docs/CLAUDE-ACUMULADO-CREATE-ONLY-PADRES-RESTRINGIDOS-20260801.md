# Claude acumulado — Create-only para padres restringidos

Fecha: 2026-08-01

## Clasificación

```text
REPLICABLE_CLAUDE_ACUMULADO
```

Transferible:

- distinguir existencia, validación y elegibilidad operativa;
- usar `create-only` para incorporar padres ausentes sin sobrescribir;
- ejecutar lotes atómicos cuando el conjunto cabe en un solo batch;
- verificar dependencias directas y descendientes después del commit;
- bloquear replay con lifecycle, digest y precondiciones;
- mantener aprobación visual separada del PASS técnico.

No transferible:

```text
TENANT_AYS_ONLY
```

- conteos exactos de registros y dependencias;
- digests de snapshots y plan;
- nombres de tenant, proyecto, runs, jobs y artifacts;
- datos o relaciones específicas de A&S.

Protegido:

```text
BACKEND_PROTEGIDO_NO_CLAUDE
```

- rutas Firestore;
- secrets e identidad LAB;
- implementación exacta del writer, preflight y rollback;
- IDs de documentos y contenido real.

Academia:

```text
ACADEMIA_ACTUALIZAR
```

Enseñar que `REQUIERE_VALIDACION` se conserva como estado de calidad después de incorporar un padre necesario para la integridad referencial.

## Patrón reusable

### Precondiciones

- diagnóstico read-only cerrado;
- conjunto de padres exacto y sellado;
- fuente y destino sin deriva;
- plan digest reproducible;
- cero casos de corrección pendientes;
- autorización explícita para un solo write gate.

### Ejecución

1. Generar snapshot privado del destino.
2. Recalcular el conjunto y el plan digest.
3. Confirmar estado pendiente, trazabilidad y ausencia de seeds.
4. Verificar referencias auxiliares sin inventarlas.
5. Preparar `batch.create()` para todos los padres.
6. Ejecutar un único lote atómico.
7. Post-verificar conteos, contenido, estados y relaciones.
8. Ejecutar rollback compensatorio solo si falla la post-verificación.

### Evidencia

```text
created documents
+ zero updates
+ zero overwrites
+ validation preserved
+ dependencies verified
+ before/after digests
+ rollback state
```

## Regla de post-verificación

El conjunto de padres debe conservarse desde el prewrite. Después de crearlos ya no aparecen como `source-only`; recalcular ese conjunto desde la diferencia posterior produciría un falso cero y ocultaría las dependencias que deben validarse.

## Correctivos estáticos

Antes de secrets deben comprobarse:

- compatibilidad del acumulador con `Map` y otros tipos usados;
- persistencia del conjunto sellado a través del cambio de estado;
- sintaxis del router, engine y writer;
- límites exactos de capacidad.

Estos hallazgos se clasifican como `VALIDATOR_STALE`, no como defectos de los datos.
