# ACADEMIA — ACTUALIZACIÓN V36 VISIBILIDAD IAM

Fecha: 2026-08-10

Clasificación: `ACADEMIA_ACTUALIZAR`

## Aprendizaje

Un diagnóstico IAM tiene al menos tres preguntas diferentes:

1. ¿qué permisos necesita el recurso objetivo?;
2. ¿quién podría administrar esos permisos?;
3. ¿la identidad que ejecuta el diagnóstico puede ver suficiente información IAM para responder la segunda pregunta?

V36 demuestra que la tercera pregunta debe resolverse antes de afirmar la segunda.

## Caso Orbit 360

La identidad LAB pudo leer la jerarquía del proyecto, pero no pudo completar Policy Analyzer.

Resultado:

`ENVIRONMENT_FAILURE / IAM_POLICY_ANALYZER_READ_FORBIDDEN`

Por tanto:

- no se identificó un administrador distinto;
- tampoco se demostró que no exista;
- no se ejecutó Policy Troubleshooter porque no existieron candidatos obtenidos de forma autoritativa;
- no hubo modificación IAM.

## Diferencia conceptual importante

`cero candidatos observados` no equivale necesariamente a `cero candidatos existentes`.

Si el mecanismo de observación fue bloqueado antes de enumerar el universo, la conclusión correcta es **visibilidad insuficiente**, no ausencia.

Esto es análogo a otros gates de Orbit 360: un validador o mecanismo de evidencia incompleto no autoriza a modificar el contrato para conseguir PASS.

## Rol y seguridad

Para Dirección/Administración técnica, Academia debe enseñar a distinguir:

- principal objetivo que necesita acceso;
- ejecutor IAM que podría modificar una policy;
- observador o identidad diagnóstica que necesita visibilidad suficiente para demostrar quién es ese ejecutor.

Una misma identidad no debe asumirse automáticamente como las tres.

## Regla reusable

Ante un 403 administrativo:

1. clasificar el fallo por capability;
2. registrar qué lecturas sí ocurrieron;
3. registrar qué etapa no llegó a ejecutarse;
4. no inferir contenido no observado;
5. no autoescalar;
6. cerrar la autorización de una sola ejecución;
7. exigir autorización nueva para un mecanismo de visibilidad materialmente distinto.
