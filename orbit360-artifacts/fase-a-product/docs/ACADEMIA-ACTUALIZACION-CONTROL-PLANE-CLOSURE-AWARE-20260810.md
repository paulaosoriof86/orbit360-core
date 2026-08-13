# ACADEMIA — ACTUALIZACIÓN CONTROL-PLANE CLOSURE-AWARE

Fecha: 2026-08-10

Clasificación: `ACADEMIA_ACTUALIZAR`.

## Aprendizajes por rol

Dirección / Superadmin:
- distinguir un defecto funcional de un `VALIDATOR_STALE`;
- entender que un `WRITE_PASS` consumido no se reabre porque el archivo de autorización siga conservado como evidencia;
- exigir causa raíz y evidencia nueva antes de reabrir riesgo.

Operativo:
- interpretar estados de gate y cierre sin convertir fallos del pipeline en cambios de datos;
- no reimportar ni repetir fuentes para resolver una validación obsoleta;
- reconocer que los conteos del cierre se preservan hasta una migración posterior autorizada.

Asesor:
- los cambios de validadores y pipeline no alteran permisos ni autorizan modificaciones operativas;
- los módulos deben conservar comportamiento funcional aunque cambie el mecanismo de prueba.

## Caso práctico reusable

Un módulo ya tiene `WRITE_PASS`, pero un workflow antiguo de prewrite vuelve a ejecutarse y falla porque encuentra un request histórico. La acción correcta no es borrar el request ni repetir la escritura: se clasifica `VALIDATOR_STALE`, se conserva la evidencia inmutable y se actualiza el gate para reconocer el estado post-write.

## Diferencia clave

`request presente` ≠ `autorización activa`.

La autorización activa depende del lifecycle vigente, estado de consumo, alcance y contrato; la evidencia histórica debe permanecer trazable.
