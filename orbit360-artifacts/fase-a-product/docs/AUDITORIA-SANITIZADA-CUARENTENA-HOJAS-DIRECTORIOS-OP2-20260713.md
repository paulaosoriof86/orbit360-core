# Auditoría sanitizada — cuarentena de hojas en directorios Aseguradoras OP-2

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Fuentes: directorios Guatemala y Colombia, revisados por separado  
Modo: lectura sanitizada, sin escritura ni aplicación

## Resultado por fuente

```txt
Guatemala:
  hojas totales: 18
  candidatas operativas: 14
  hojas de apoyo excluidas: 4
  hojas excluidas con contenido técnico o ajeno al directorio: 2

Colombia:
  hojas totales: 17
  candidatas operativas: 16
  hojas de apoyo excluidas: 1
```

No se copiaron al repositorio valores internos ni contenido de las hojas excluidas.

## Hallazgo

La exclusión solo por nombre de hoja era insuficiente. Una hoja técnica podía ser renombrada y llegar al parser como candidata.

## Corrección v1.219

Archivo:

```txt
core/aseguradoras-op2-sheet-quarantine.js
```

La cuarentena ocurre antes del parser y antes de construir operaciones.

Clasificaciones:

```txt
hoja_soporte_por_nombre
hoja_personal_interno
hoja_tecnica_sensible
```

El reporte conserva solamente hoja, motivo y conteos agregados. No conserva los valores que provocaron la exclusión.

## Gate automatizado

```txt
tools/orbit360-validar-cuarentena-hojas-aseguradoras-v1219.mjs
```

Prueba con datos ficticios que una hoja operativa se preserve, que una hoja técnica renombrada y un directorio interno se excluyan, y que el parser base reciba únicamente hojas permitidas.

## Carriles

```txt
Carril A: Academia actualizada para explicar la cuarentena.
Carril B: cuarentena previa al parser, prueba automatizada, CI y orden de carga.
Carril C: inventario GT/CO sanitizado; cero escrituras; dry-runs aún pendientes.
```

## Estado

```txt
Auditoría sanitizada: completada
Cuarentena reusable: implementada
Prueba estática: configurada
Dry-run Guatemala: pendiente
Dry-run Colombia: pendiente
Aplicación real: no ejecutada
```
