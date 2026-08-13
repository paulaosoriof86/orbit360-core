# Academia — v33 auditoría externa, permisos y requests consumidos

Fecha: 2026-08-10

## Aprendizajes incorporados

1. Un `403/401` al consultar una fuente autoritativa se clasifica como `ENVIRONMENT_FAILURE`; no equivale a ausencia de evidencia.
2. `AUDIT_NO_MATCHING_WRITE_ENTRY` tampoco prueba ausencia histórica de un write cuando la disponibilidad/retención del audit log no está demostrada.
3. Un request ejecutado debe conservarse como evidencia inmutable y quedar `consumed/frozen`; borrarlo para que un validador pase destruye trazabilidad.
4. Un gate source puede aceptar un request histórico consumido únicamente cuando `allowedExecutions=0`, `consumed=true`, `authorizationFrozen=true` y `replayAllowed=false`. Ese estado no autoriza capacidades.
5. Los permisos IAM deben diagnosticarse antes de concederse. Un fallo de acceso a Logging no autoriza a agregar roles por inferencia.
6. La prueba de procedencia debe permanecer acotada al dato discutido. No se reutilizan Pólizas, Cobros o financiero histórico para inferir el origen de Clientes.

## Caso v33 sanitizado

- 2 objetivos de procedencia pendientes;
- 1 operación locator Firestore;
- 0 operaciones Logging completadas;
- 0 writes;
- auditoría externa no disponible/prohibida con la capacidad vigente;
- resultado: `STOP_RETRY` sin adjudicación de los clientes.

## Diferencia metodológica

- `VALIDATOR_STALE`: el source gate exigía ausencia física de un request ya consumido; se corrigió sin tocar producto.
- `ENVIRONMENT_FAILURE`: el runtime llegó correctamente al servicio externo, pero la capacidad disponible no permitió completar la consulta de Audit Logs.
- `DATA_CONTRACT_FAILURE`: seguiría aplicando a los 2 clientes mientras su procedencia no quede demostrada.

La Academia debe enseñar estas tres capas por separado para evitar convertir un problema de permisos o de validador en un cambio funcional o de datos.
