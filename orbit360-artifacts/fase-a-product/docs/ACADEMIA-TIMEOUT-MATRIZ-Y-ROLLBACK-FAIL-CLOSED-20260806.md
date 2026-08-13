# Academia — timeout de matriz y rollback fail-closed

Fecha: 2026-08-06  
Clasificación: `ACADEMIA_ACTUALIZAR`

## Objetivo formativo

Explicar por qué un precheck visual aprobado no equivale a una matriz completa, y por qué un fallo externo del runner debe cerrar fail-closed sin corregir módulos funcionales.

## Caso aplicado

El run `31116830824` alcanzó:

- contrato 28/28 PASS;
- backup Hosting PASS;
- un deploy Hosting LAB PASS;
- Auth/membership/ruta Inicio PASS;
- cero escrituras.

La matriz completa no produjo evidencia final antes del timeout. GitHub canceló el proceso y el rollback automático no se ejecutó porque el shell no tenía manejo signal-safe.

## Diferencias que debe aprender el equipo

### Precheck aprobado

Demuestra que la sesión, la membresía, la ruta y la hidratación inicial permiten empezar la matriz. No demuestra que Dirección, Operativo y Asesor hayan completado todas sus vistas.

### Matriz aprobada

Requiere evidencia durable para los tres roles y viewports, cero fallos, capturas acotadas y snapshot final verificado.

### Error funcional

El producto incumple el contrato vigente. Se corrige el owner funcional.

### Error de pipeline

La herramienta no consigue terminar, registrar o recuperar la prueba. No autoriza modificar el producto para “hacer verde” el gate.

### Error de entorno

GitHub Actions no pudo preparar el runner o descargar una acción. No se corrige Auth, datos ni UX.

## Regla de STOP_RETRY

Cuando la misma etapa o familia de fallo se repite dos veces:

1. no se crea otro workflow;
2. no se toca otro módulo;
3. se congela la autorización;
4. se documenta la última operación real;
5. se corrige el mecanismo fuera del runtime;
6. se prueba sintéticamente el camino de fallo.

## Patrón de diseño seguro

Todo gate con despliegue temporal debe incluir:

- watchdog por etapa;
- checkpoints persistentes;
- evidencia incremental;
- rollback idempotente;
- manejo de `TERM/INT/EXIT`;
- margen de tiempo reservado para recuperación;
- estado honesto cuando el rollback no pudo confirmarse.

## Evaluación aplicada

**Caso:** el precheck pasa, pero el proceso de matriz llega al timeout y GitHub mata Chromium. No existe JSON final ni evidencia de rollback.

Respuesta correcta:

- clasificar como fallo de mecanismo;
- marcar matriz no aprobada;
- no afirmar integridad final;
- ejecutar el rollback autorizado una sola vez;
- si la infraestructura de rollback falla dos veces en setup, aplicar STOP_RETRY;
- no modificar producto, datos o Auth;
- corregir source-only watchdog y señales antes de otra autorización.

## Manuales/rutas impactados

- Dirección/Superadmin: lectura de gates y estados honestos.
- Equipo técnico: watchdogs, cancelación externa y rollback.
- Academia de seguridad: diferencias entre `FUNCTIONAL_DEFECT`, `PIPELINE_MECHANISM_FAILURE` y `ENVIRONMENT_FAILURE`.
- Ruta de despliegue LAB: evidencia incremental y fail-closed.
