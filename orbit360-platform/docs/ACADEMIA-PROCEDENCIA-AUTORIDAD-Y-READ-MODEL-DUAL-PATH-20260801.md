# Academia — procedencia, autoridad y read model en rutas duales

Fecha: 2026-08-01

## Objetivo

Enseñar por qué una ruta con nombres canónicos no se convierte automáticamente en la fuente autoritativa y por qué una diferencia de digest no equivale necesariamente a un conflicto de negocio.

## Caso aprendido

Orbit 360 encontró dos rutas físicas:

```text
canónica: tenants/{tenantId}/data/{collection}/items
heredada: tenantId/{tenantId}/{collection}
```

La ruta canónica tenía 445 documentos y la heredada 4,837. Los 440 IDs compartidos presentaban digests distintos, pero el análisis semántico confirmó que los 414 Clientes y 26 Aseguradoras compartidos tenían la misma proyección de negocio y el mismo estado de validación.

La diferencia estaba en metadatos, trazabilidad, envolvente o representación. Por eso el gate no debía corregir datos ni concluir que existían 440 conflictos funcionales.

## Diferencias clave

### Fuente autoritativa

Es el lugar desde el cual se consideran vigentes los datos operativos. Requiere cobertura, procedencia, trazabilidad y una decisión explícita.

### Read model

Es una proyección diseñada para lectura o visualización. Puede omitir campos técnicos y conservar la misma información de negocio. No debe convertirse en fuente de escritura por accidente.

### Seed o bootstrap

Es información de arranque, muestra o estructura. No compite con datos operativos reales y debe identificarse antes de una migración.

### REQUIERE_VALIDACION

No significa eliminar o descartar. Significa preservar el documento y su incertidumbre hasta resolverla con evidencia.

## Resultado del gate

```text
5 registros solo-canónicos: seed/bootstrap no operativo
20 Clientes/Aseguradoras solo-heredados: con fuente, pero REQUIERE_VALIDACION
440 compartidos: negocio equivalente y validación alineada
```

La recomendación fue usar la ruta heredada como fuente operativa para las siete colecciones y la canónica como destino/read model. La recomendación no declaró autoridad porque esa decisión requería autorización separada.

## Import batches

Un documento puede contener `sourceTrace` y a la vez apuntar a un `importBatchId` inexistente. En ese caso:

```text
no inventar el batch
no borrar la referencia
no considerar la trazabilidad completamente cerrada
marcar la referencia para normalización o HOLD
```

## Gate y seguridad

Antes de abrir Firestore se ejecutó el gate canónico. El análisis tuvo capacidades de lectura, pero cero escritura, navegador, preview, deploy o producción.

La aprobación humana de Pólizas, Vehículos, Recibos y Cartera permaneció pendiente. Un PASS técnico no sustituye la revisión visual.

## Continuidad visual

La candidata posterior debe ser acumulativa:

```text
última baseline auditada y aceptada
+ HEAD incremental
+ todos los módulos rastreados
+ mejor versión acreditada por módulo
```

No se permite construir una página reducida para resolver un módulo aislado. La plataforma debe visualizarse como un sistema completo y no como fragmentos desconectados.
