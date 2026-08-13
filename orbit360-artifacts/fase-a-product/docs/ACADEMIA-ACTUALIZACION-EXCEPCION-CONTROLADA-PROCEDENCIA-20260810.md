# ACADEMIA — EXCEPCIÓN CONTROLADA DE PROCEDENCIA Y GATES

Fecha: 2026-08-10
Clasificación: `ACADEMIA_ACTUALIZAR`

## Aprendizaje por rol

### Dirección
Una deuda de calidad acotada puede diferirse sin ocultarla cuando no altera seguridad, cálculos, permisos ni relaciones operativas. El release debe mostrar que existe la excepción y quién la resolverá después.

### Operativo
No borrar, fusionar ni reasignar un registro solo para hacer coincidir un conteo esperado. Si el registro sigue operativo, se conserva y se documenta la incertidumbre pendiente.

### Asesor
Una relación existente con cliente/póliza debe preservarse. La incertidumbre administrativa de procedencia no autoriza modificar pólizas, cobros o documentos validados.

### Equipo técnico
Diferenciar:

- `FUNCTIONAL_DEFECT`: producto realmente falla;
- `VALIDATOR_STALE`: el comprobador no representa el contrato vivo;
- `DATA_CONTRACT_FAILURE`: dato contradice un contrato demostrado;
- excepción controlada: incertidumbre conocida, acotada, reversible/no destructiva y explícitamente aceptada para no bloquear release.

Un fixture correcto debe reproducir la forma real que escribe el owner. Si `Orbit.store` escribe `ownerUid/ownerEmail/updatedByUid/updatedByEmail`, un validator de actor no puede probar únicamente campos alternativos como `updatedBy` o `_audit.actor`.

## Regla de release

Una excepción nunca convierte un dato incierto en dato válido. Solo cambia su condición bloqueante cuando el riesgo residual fue aceptado explícitamente y la operación puede continuar sin alterar ni ocultar evidencia.
