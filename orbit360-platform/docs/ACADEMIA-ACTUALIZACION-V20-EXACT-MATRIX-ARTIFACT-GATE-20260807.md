# Academia Orbit 360 — actualización v20

Fecha: 2026-08-07

## Lección incorporada

Un gate no puede afirmar que un mecanismo runtime está listo si solo valida el archivo que genera el código. Debe validar el **artefacto exacto que será ejecutado**.

Caso v19: el wrapper era sintácticamente válido, pero su transformación produjo un módulo inválido. La clasificación correcta es `PIPELINE_MECHANISM_FAILURE`, porque el producto ni siquiera alcanzó a ejecutar la matriz.

## Diferenciar tres casos

1. `FUNCTIONAL_DEFECT`: el producto ejecuta y una función observable incumple el comportamiento esperado.
2. `VALIDATOR_STALE`: el producto/owner vigente cambió correctamente, pero un validador sigue comprobando una arquitectura anterior. Se congela producto y se corrige validator/workflow/owner.
3. `PIPELINE_MECHANISM_FAILURE`: falla el mecanismo que prepara, transporta, compila, importa o ejecuta la prueba. No se atribuye el fallo al módulo funcional.

## Patrón v20

`fuente auditada → builder único → artefacto exacto → compile → import → runtime`

El mismo builder debe ser usado por el source gate y por runtime. No se permiten dos implementaciones equivalentes que puedan divergir.

El gate debe fallar antes de secretos si detecta:

- código residual de una transformación anterior;
- funciones duplicadas;
- `return` huérfano;
- error de parse/import;
- diferencia entre artefacto source validado y artefacto runtime;
- owner/validator obsoleto.

## Relación con Cliente 360

El bounded render de Cliente 360 continúa siendo un cambio funcional v19 separado: primera ventana de 40 filas, métricas por fase y readiness desacoplada. v20 no modifica ese módulo; únicamente garantiza que la matriz capaz de probarlo sea realmente ejecutable.

## Aplicación por rol

Dirección, Operativo y Asesor deben entender que un STOP de pipeline no demuestra que su pantalla esté defectuosa. El gate debe mostrar si el fallo ocurrió antes o después de llegar al módulo y conservar la frontera de cero escrituras.

## Regla reusable

Antes de abrir riesgo runtime, compilar/importar el mismo artefacto que runtime ejecutará y probar un artefacto corrupto conocido para demostrar que el gate falla de forma cerrada.
