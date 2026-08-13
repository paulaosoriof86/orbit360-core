# Academia — Autoridad operativa, read model y dry-run

Fecha: 2026-08-01

## Aprendizaje central

Una ruta puede ser la fuente operativa vigente y otra el destino arquitectónico futuro. Declarar esa autoridad no implica copiar datos ni modificar el producto.

En este caso:

- `tenantId/{tenantId}/{collection}` conserva el universo operativo vigente.
- `tenants/{tenantId}/data/{collection}/items` será el destino multi-tenant y read model.

## Diferencia entre autoridad y migración

La declaración de autoridad responde de dónde se obtiene hoy la verdad operativa. El dry-run responde qué ocurriría al reconciliarla con el destino. Ninguno de los dos pasos autoriza escritura.

## Acciones del dry-run

- `CREATE`: falta el documento fuente en el destino y sus relaciones son exactas.
- `UPDATE`: existe en ambas rutas y la información de negocio requiere modificación.
- `OMIT`: la proyección de negocio ya es equivalente.
- `HOLD`: no debe ejecutarse todavía, por validación pendiente, seed en cuarentena o contrato no resuelto.

El gate produjo 4,377 CREATE, 0 UPDATE, 440 OMIT y 25 HOLD.

## Validación honesta

Los registros en `REQUIERE_VALIDACION` no se eliminan ni se presentan como plenamente validados. Pueden incluirse en una migración futura conservando su estado, siempre que sus relaciones y trazabilidad sean exactas.

Los veinte registros adicionales de Clientes/Aseguradoras permanecen en HOLD para una decisión independiente. Los registros de otras colecciones con validación pendiente pueden proponerse como CREATE preservando esa condición.

## Defecto funcional vs. validador obsoleto

El primer cálculo marcó 678 relaciones como ambiguas. Los datos tenían una Póliza y un Recibo exactos; el validador los había combinado como alternativas. La clasificación correcta fue `VALIDATOR_STALE`, no `DATA_CONTRACT_FAILURE`.

La respuesta metodológica correcta fue:

1. congelar el resultado;
2. no corregir datos;
3. documentar la causa raíz;
4. separar los grupos Póliza y Recibo;
5. reanudar el mismo alcance read-only;
6. comprobar cero relaciones bloqueadas.

## Referencias de batch

Una referencia de importación no resuelta nunca debe inventarse. El dry-run distingue:

- `NORMALIZE`: existe evidencia para apuntar a un batch disponible;
- `HOLD`: la referencia no se puede resolver;
- `NONE`: el documento no trae referencia;
- `OMIT`: el destino ya contiene la referencia adecuada.

## Gates y seguridad

Antes de abrir secrets o Firestore debe ejecutarse el gate canónico. Un dry-run válido debe dejar:

- cero escrituras;
- plan reproducible por digest;
- relaciones exactas;
- estados de validación preservados;
- límites explícitos sobre navegador, deploy y producción;
- autorización consumida al cierre.

## Continuidad visual

Una reconciliación de datos no autoriza una visualización reducida. La futura candidata debe conservar el manifiesto acumulativo completo, todos los módulos y la mejor versión acreditada de cada uno.
