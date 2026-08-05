# Academia Orbit 360 — Auth callable, paridad del actor y evidencia opcional

Fecha: 2026-08-05

## Caso

Un gate puede pasar configuración, censo y disponibilidad de Function, pero fallar al invocar la callable. Esto no debe confundirse con un error de contraseña ni con una pérdida de CRM.

## Contratos que deben coincidir

El censo y la Function deben considerar elegible al mismo actor administrativo:

- misma identidad;
- mismo tenant;
- membresía activa;
- rol activo realmente asignado;
- rol privilegiado o permiso explícito para gestionar accesos.

Si el censo valida menos condiciones que la Function, el runtime llega innecesariamente a una llamada que será rechazada.

## Estados honestos

```text
NOT_POSTVERIFIED ≠ CHANGED
```

Que la integridad CRM no haya podido postverificarse no significa que el CRM haya cambiado. Deben distinguirse:

- `VERIFIED_UNCHANGED`;
- `VERIFIED_CHANGED`;
- `NOT_POSTVERIFIED`.

## Evidencia por etapas

Los archivos de scopes y rollback son condicionales. Un cierre correcto:

1. persiste siempre la evidencia alcanzada;
2. agrega solo archivos que existen;
3. conserva `errorCode` sanitizado;
4. registra qué etapas se omitieron;
5. no rellena ausencias con falsos negativos.

## Clasificación

- rechazo o respuesta inválida de la callable: `FUNCTIONAL_DEFECT` hasta aislar su contrato exacto;
- pérdida de evidencia porque `git add` exige un archivo de una etapa omitida: `PIPELINE_MECHANISM_FAILURE`;
- actor que no satisface tenant/rol/permiso: `DATA_CONTRACT_FAILURE`.

## Aplicación por rol

- Dirección: ve el estado real sin interpretar un control no ejecutado como daño.
- Operativo: sabe que crear un registro de Equipo no equivale todavía a acceso autenticable.
- Asesor: recibe roles y scopes desde configuración, no desde excepciones hardcodeadas.
- Academia técnica: aprende a separar defecto funcional, contrato de datos y mecanismo de pipeline.
