# ACADEMIA — ACTUALIZACIÓN WATCHDOG Y ROLLBACK SIGNAL-SAFE

Fecha: 2026-08-06

## Contenido por rol

- Dirección: entender por qué un precheck aprobado no equivale a una matriz completa ni a autorización productiva.
- Operativo: reconocer estados `en ejecución`, `timeout de rol`, `rollback pendiente`, `rollback confirmado` y `STOP_RETRY`.
- Asesor: comprender que una prueba incompleta no valida su experiencia móvil.
- Administrador técnico: diferenciar `FUNCTIONAL_DEFECT`, `PIPELINE_MECHANISM_FAILURE` y `ENVIRONMENT_FAILURE`.

## Caso práctico

Una matriz alcanza Auth, membership e Inicio, pero el proceso se queda activo sin avanzar. El watchdog corta el rol detenido antes del timeout global, publica el último checkpoint y activa un único rollback. Una segunda ejecución no se permite sin corregir la causa y emitir una autorización nueva.

## Criterio de aprendizaje

El participante debe explicar por qué:

1. no se corrige el producto cuando falla el runner;
2. el rollback debe responder a señales externas;
3. el progreso debe persistirse antes del cierre;
4. `STOP_RETRY` evita usar LAB o producción como entorno de desarrollo del validador.

Clasificación: `ACADEMIA_ACTUALIZAR`.
