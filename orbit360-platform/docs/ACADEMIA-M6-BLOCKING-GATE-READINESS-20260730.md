# Academia Orbit 360 — Readiness de gates bloqueantes

Fecha: 2026-07-30

## Caso

Un smoke puede fallar aunque el módulo esté sano cuando existe una condición temporal no modelada por el validator. En M6 6.1.14 el acuerdo legal aparecía 520 ms después de mostrar la app. Un chequeo instantáneo concluyó erróneamente que el gate no existía y el modal apareció después sobre la prueba de Aseguradoras.

## Distinción metodológica

Esto es `VALIDATOR_STALE`, no `FUNCTIONAL_DEFECT`.

Para demostrarlo fue necesario conservar evidencia anterior al click: datos listos, target estable, centro dentro del viewport, elemento superior real y evento no despachado. El elemento superior fue `.conf-body`, perteneciente al gate legal diferido.

## Patrón reusable

Los validators de módulos deben cumplir:

`arranque → esperar gates diferidos → resolver gate → quietud → readiness de datos → interacción → resultado funcional`.

No basta con preguntar una vez “¿existe el modal?”. La ausencia instantánea no prueba ausencia durante la transición.

## Aplicación por rol y módulo

Esta regla precede las pruebas de Dirección, Operativo y Asesor y aplica a Pólizas, Vehículos, Cobros, Siniestros, Comisiones, Documentos, Cotizador/Comparativo y demás módulos. Es infraestructura de validación transversal, no lógica propia de Aseguradoras.

## Regla de causa raíz

Cuando una interacción está bloqueada:

1. identificar qué elemento recibe realmente el hit-test;
2. determinar si el bloqueador es funcional, legal, navegación, overlay o automatización;
3. comprobar si el evento llegó a despacharse;
4. corregir el owner correcto;
5. crear una prueba sintética que reproduzca el timing antes de reabrir producción.

Nunca se debe eliminar una protección legal, usar `force:true` ni modificar UI sana para hacer pasar un smoke.
