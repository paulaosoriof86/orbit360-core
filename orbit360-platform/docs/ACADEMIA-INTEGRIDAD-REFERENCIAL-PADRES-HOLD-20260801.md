# Academia — Integridad referencial y padres en REQUIERE_VALIDACION

Fecha: 2026-08-01

## Principio operativo

`REQUIERE_VALIDACION` es un estado de calidad y control. No significa que el registro deba desaparecer del modelo de lectura cuando otros documentos operativos dependen de él.

Un padre pendiente puede incorporarse con acceso restringido y señalización honesta cuando se cumplen simultáneamente estas condiciones:

- existe trazabilidad de fuente;
- no es seed, demo o mock;
- la relación con el dependiente es exacta;
- el estado pendiente se conserva sin convertirlo en validado;
- la acción queda auditada y puede revertirse.

## Caso LAB A&S

El diagnóstico encontró veinte padres pendientes utilizados por Pólizas:

```text
16 Clientes → 52 Pólizas
4 Aseguradoras → 23 Pólizas
Intersección → 0
Pólizas afectadas únicas → 75
```

Estas Pólizas sostienen además:

```text
47 Vehículos
76 Recibos
38 posiciones de Cartera
1 Cobro
```

Excluir veinte padres obligaría a retener 237 documentos operativos entre Pólizas y descendientes. El estado de calidad del padre no debe propagarse como inexistencia a toda la cadena.

## Diferencia entre HOLD documental y restricción operativa

### HOLD documental

Se usa cuando no existe trazabilidad suficiente, la relación es ambigua o el registro podría ser seed. El documento no se incorpora hasta resolver la causa.

### Padre restringido

Se usa cuando el registro está respaldado, es necesario para integridad referencial y conserva asuntos pendientes de calidad. Puede estar presente en el read model con:

- estado `REQUIERE_VALIDACION` visible;
- restricciones de edición y uso;
- bloqueo para decisiones que exijan validación completa;
- acceso a una gestión de corrección;
- trazabilidad del origen y de la futura migración.

## Multirol y permisos

La existencia del padre no amplía automáticamente permisos:

- Dirección y perfiles autorizados pueden revisar calidad y resolver la gestión.
- Asesores solo visualizan padres y dependientes dentro de su scope.
- Un asesor no puede borrar, fusionar, reasignar o marcar como validado un padre restringido.
- Una corrección debe conservar motivo, antes/después, fecha, responsable y evidencia.

## Importador

El importador debe separar tres decisiones:

1. existencia del registro;
2. estado de validación;
3. elegibilidad operativa.

Un registro puede existir, permanecer en `REQUIERE_VALIDACION` y estar restringido para acciones críticas. La decisión de omitirlo no debe tomarse solo por su estado de calidad si tiene dependencias activas.

## Gates y causa raíz

Cuando una revalidación falla por relación ausente:

1. comprobar que el payload dependiente no cambió;
2. comparar el universo de padres usado por el dry-run con el universo realmente migrado;
3. contar dependencias directas y descendientes;
4. clasificar cada padre como migrable restringido, sin dependencia o corrección requerida;
5. ejecutar un nuevo gate, no reabrir el gate congelado.

En este caso el gate 7.6 permaneció congelado y el diagnóstico 7.7 se ejecutó como gate nuevo, read-only y con autorización independiente.

## Distinción metodológica

- `VALIDATOR_STALE`: el validador o su evidencia no representan el contrato vigente.
- `DATA_CONTRACT_FAILURE`: los datos reales incumplen una relación o condición del modelo.
- `REQUIERE_VALIDACION`: estado de calidad del registro, no clasificación del fallo técnico.

El acumulador `Map` defectuoso fue corregido antes de abrir secrets; por ello no contaminó la evidencia real. La ausencia de padres en el read model sí era un fallo de contrato de datos y fue diagnosticada con el gate 7.7.
