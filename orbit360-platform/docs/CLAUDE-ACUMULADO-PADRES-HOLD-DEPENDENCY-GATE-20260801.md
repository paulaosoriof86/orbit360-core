# Claude acumulado — Dependency gate para padres HOLD

Fecha: 2026-08-01

## Clasificación

```text
REPLICABLE_CLAUDE_ACUMULADO
```

Transferible:

- separar estado de validación de existencia del registro;
- detectar padres excluidos con dependientes activos;
- trazar dependencias directas y descendientes;
- comparar migración restringida frente a retención de dependientes;
- usar un plan digest sin exponer IDs ni valores;
- conservar la aprobación visual como decisión humana separada.

No transferible:

```text
TENANT_AYS_ONLY
```

- conteos exactos de Clientes, Aseguradoras, Pólizas y descendientes;
- digests de snapshots y del plan;
- nombres de proyecto, tenant, runs, jobs y artifacts;
- hallazgos específicos de datos A&S.

Protegido:

```text
BACKEND_PROTEGIDO_NO_CLAUDE
```

- rutas físicas Firestore;
- credenciales, identidad LAB y secrets;
- implementación exacta del validador y del writer;
- reglas de rollback y precondiciones internas.

Academia:

```text
ACADEMIA_ACTUALIZAR
```

Enseñar que `REQUIERE_VALIDACION` puede coexistir con presencia restringida en el read model cuando la integridad referencial lo exige.

## Patrón reusable

### Entrada

- conjunto de padres fuente;
- conjunto de padres destino;
- dependientes y descendientes;
- estado de validación;
- señales de trazabilidad;
- marcadores de seed;
- snapshot digests sellados.

### Proceso

1. Derivar padres fuente-only.
2. Confirmar estado de validación sin inferir validez.
3. Resolver relaciones exactas contra el universo fuente completo.
4. Contar dependientes por tipo de padre e intersección.
5. Recorrer descendientes por relaciones canónicas.
6. Clasificar cada padre:
   - `MIGRATE_RESTRICTED_PRESERVE_REQUIRES_VALIDACION`;
   - `CREATE_CORRECTION_MANAGEMENT_BEFORE_PARENT_MIGRATION`;
   - `HOLD_NO_ACTIVE_POLICY_DEPENDENCY`.
7. Comparar el costo de incorporar padres frente a retener dependientes.
8. Emitir únicamente agregados, categorías y digests.

### Salida

```text
parent classification
+ dependency counts
+ downstream counts
+ strategy comparison
+ plan digest
+ zero-write evidence
```

## Regla de seguridad

El dependency gate no autoriza escritura. Una futura creación de padres debe tener un gate independiente con:

- snapshot previo;
- `create-only`;
- idempotencia;
- preservación del estado pendiente;
- post-verificación;
- rollback exacto;
- cero adaptación del frontend.

## Lección de validador

Un acumulador debe respetar el tipo de colección usado. Tratar un `Map` como objeto plano puede producir conteos silenciosamente incorrectos. La verificación estática debe ocurrir antes de secrets y de cualquier lectura de datos.

Clasificación del correctivo previo:

```text
VALIDATOR_STALE
```

El correctivo se aplicó antes de la ejecución real y no generó evidencia de negocio inválida.
