# Claude acumulado — Autoridad, read model y dry-run

Fecha: 2026-08-01

## Clasificación

`REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Separar siempre:

1. fuente operativa autoritativa;
2. destino multi-tenant/read model;
3. declaración documental de autoridad;
4. dry-run de reconciliación;
5. escritura posterior con autorización independiente.

## Contrato del plan

Cada documento debe clasificarse como `CREATE`, `UPDATE`, `OMIT` o `HOLD`, con un motivo estable y un digest reproducible. El plan debe incluir:

- snapshot digest de la fuente;
- snapshot digest del destino;
- digest del conjunto de acciones;
- preservación explícita de estados de validación;
- verificación de relaciones;
- tratamiento independiente de referencias de importación;
- cuarentena sin borrado para seeds o registros no operativos.

## Patrón de relaciones compuestas

No combinar relaciones de tipos distintos en un único conjunto de candidatos. Cuando una entidad requiere Póliza y Recibo, deben validarse como grupos independientes. Ambigüedad significa múltiples candidatos dentro del mismo tipo, no la existencia correcta de ambos tipos.

## Patrón de causa raíz

Cuando un validador produce un bloqueo masivo inesperado:

- clasificar antes de tocar datos;
- congelar el resultado;
- comparar la regla del validador con el contrato de negocio;
- corregir conjuntamente lifecycle, preflight, workflow, documentación y Academia;
- reanudar solo el alcance original;
- invalidar expresamente la evidencia obsoleta.

## Seguridad reusable

- gate canónico antes de secrets;
- dry-run sin escrituras;
- evidencia sanitizada sin IDs o valores;
- autorización de lectura separada de autorización de escritura;
- replay bloqueado al cierre;
- futura escritura condicionada a snapshot, idempotencia, post-verificación y rollback.

## No transferir

No enviar datos, conteos específicos del tenant, IDs, digests privados, credenciales, rutas sensibles de ejecución ni implementación protegida de backend.

## Continuidad visual

La migración de datos y la candidata visual deben permanecer desacopladas. Una futura visualización debe usar una única candidata acumulativa, sin shells reducidos, paralelos o fragmentados.
