# Academia — Padres restringidos, create-only y calidad de datos

Fecha: 2026-08-01

## Principio

La existencia de un registro y su estado de validación son decisiones distintas.

Un padre con `REQUIERE_VALIDACION` puede estar presente en el read model para mantener integridad referencial, siempre que:

- conserve íntegramente el estado pendiente;
- no se habilite como validado;
- tenga trazabilidad de fuente;
- sea necesario para relaciones operativas;
- se aplique mediante una escritura auditada y reversible.

## Escritura `create-only`

El gate 7.8 incorporó veinte padres restringidos mediante una sola operación atómica:

```text
16 Clientes
4 Aseguradoras
20 CREATE
0 UPDATE
0 sobrescrituras
```

`create-only` significa que la operación falla si el ID ya existe. No debe sustituirse por `set` o `update` cuando el contrato exige preservar documentos existentes.

## Integridad preservada

Los veinte padres sostienen:

```text
75 Pólizas
47 Vehículos
76 Recibos
38 posiciones de Cartera
1 Cobro
```

La post-verificación debe cubrir tanto el documento creado como la cadena que depende de él. Confirmar solo el conteo del padre no prueba que el read model sea coherente.

## Calidad y permisos

`REQUIERE_VALIDACION` debe seguir visible después de la migración. La presencia del padre no autoriza:

- marcarlo como validado;
- borrar alertas de calidad;
- ampliar el scope de un asesor;
- fusionar, reasignar o eliminar el registro;
- ejecutar acciones que exijan información plenamente validada.

Los perfiles autorizados deben resolver la calidad mediante una gestión trazable, con motivo, antes/después, fecha, responsable y evidencia.

## Snapshot e idempotencia

Antes de escribir se debe sellar:

- digest de la fuente;
- digest del destino;
- digest del plan;
- snapshot privado del destino;
- conjunto exacto de IDs a crear.

Después de un PASS, un replay debe bloquearse mediante:

1. lifecycle consumido;
2. digest del destino diferente;
3. precondición de existencia de `create-only`.

## Rollback

Un lote pequeño de padres relacionados puede escribirse en una sola operación atómica. Si la post-verificación falla después del commit, el rollback elimina únicamente los documentos creados por esa ejecución y debe comprobar que el digest anterior se restauró exactamente.

## Validación técnica y aprobación humana

Un PASS técnico confirma integridad, no diseño ni experiencia de usuario. Pólizas, Vehículos, Recibos y Cartera continúan pendientes de aprobación visual hasta que una candidata acumulativa completa sea entregada y revisada.

## Diferencia entre errores

- `VALIDATOR_STALE`: la herramienta de validación representa incorrectamente el contrato.
- `DATA_CONTRACT_FAILURE`: los datos incumplen el contrato vigente.
- `REQUIERE_VALIDACION`: estado de calidad de un registro.

En el gate 7.8 se corrigieron dos problemas estáticos antes de abrir secrets: soporte correcto para `Map` y conservación del conjunto previo de padres durante la post-verificación. Ninguno se convirtió en una corrida fallida ni modificó datos.
