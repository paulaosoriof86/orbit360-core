# Academia — Integridad referencial, padres HOLD y read model

Fecha: 2026-08-01

## Regla central

Un registro en `REQUIERE_VALIDACION` no debe presentarse como validado, pero tampoco debe excluirse automáticamente si otros registros operativos dependen de él.

La calidad de datos y la existencia referencial son dimensiones distintas:

- `REQUIERE_VALIDACION` describe el estado de revisión del registro.
- La integridad referencial exige que los dependientes puedan resolver su padre.
- Un read model puede incluir un padre en estado restringido, sin habilitar acciones operativas que requieran validación completa.

## Caso observado

La ruta canónica contiene las Pólizas migradas, pero dejó fuera 16 Clientes y 4 Aseguradoras en `REQUIERE_VALIDACION`. El gate posterior detectó que al menos una Póliza depende de esos padres excluidos.

La solución no es ocultar el fallo ni cambiar el validador para aceptar relaciones rotas. Debe analizarse cuál alternativa conserva mejor la verdad operacional:

1. migrar el padre conservando `REQUIERE_VALIDACION` y restricciones de uso;
2. mantener el padre fuera y retener temporalmente la Póliza dependiente;
3. crear una gestión de corrección cuando la relación sea realmente dudosa.

## Diferencia entre fallos

### `VALIDATOR_STALE`

Ocurre cuando el producto o los datos pueden estar correctos, pero el validador usa una variable, regla o contrato incorrecto. Se congela el resultado, se corrige el validador y no se transforma el dato para hacer pasar la prueba.

### `DATA_CONTRACT_FAILURE`

Ocurre cuando la representación destino no puede sostener una relación exigida por el negocio. La corrección requiere revisar el plan de datos, no solo el código del gate.

## Gate correcto para este caso

El siguiente diagnóstico debe contar dependencias sin exponer IDs ni valores reales y producir un dry-run de alternativas. Debe incluir:

- padres HOLD por tipo;
- Pólizas directamente afectadas;
- Vehículos, Recibos, Cartera y Cobros descendientes;
- estados de validación preservados;
- impacto de incluir padres restringidos frente a retener dependientes;
- cero escrituras hasta autorización separada.

## Regla reusable

Antes de excluir un registro por calidad, un importador o migrador debe ejecutar un `dependency gate`:

```text
clasificar calidad
→ detectar dependientes
→ decidir existencia restringida o retención
→ preservar estado honesto
→ impedir huérfanos
```

Un HOLD de calidad no equivale a inexistencia.
