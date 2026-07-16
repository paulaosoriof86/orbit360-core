# Incidente — verificación de aseguradoras pendientes restringidas

Fecha: 2026-07-15  
Módulo: Importación inteligente / carga inicial A&S  
Carriles: B (contrato de escritura) y C (migración operativa)

## Necesidad

La carga inicial aprobó un dry-run con 414 clientes, 26 retenidos y 26 aseguradoras, de las cuales 8 debían conservar estado pendiente de validación y capacidades restringidas.

## Incidente

Al confirmar, `core/importa-write-p0.js` aplicó una regla genérica que bloqueaba cualquier registro con `requiereValidacion=true` o `validationStatus!='validado'`. El lote se rechazó antes de escribir y mostró dos alertas por cada una de las 8 aseguradoras pendientes.

## Causa raíz

El contrato genérico confundía dos estados diferentes:

1. registro inválido/no escribible;
2. directorio de aseguradora escribible, pero pendiente y restringido.

Además, la capa de escritura imponía `validationStatus='validado'` a todos los registros, lo que habría eliminado el estado honesto de una aseguradora pendiente si se hubiera omitido el bloqueo.

## Corrección

Una aseguradora pendiente solo es escribible cuando cumple simultáneamente:

- `requiereValidacion=true`;
- `validationStatus='requiere_validacion'`;
- `estadoOperativo='pendiente_validacion'`;
- `vinculada=false`;
- `cotizadorHabilitado=false`;
- `comparativoHabilitado=false`;
- `tarifasHabilitadas=false`.

La escritura preserva esos campos y registra auditoría `written_controlled_restricted`. Cualquier aseguradora pendiente con una restricción incompleta sigue bloqueada.

La verificación posterior usa la cola y los errores reales del adapter LAB para evitar depender únicamente de `_syncStatus`, que puede cambiar con los snapshots.

## Resultado y alcance

- El intento fallido no escribió clientes ni aseguradoras porque `validateBatch` terminó antes del bucle de escritura.
- No se modificó el JSON fuente.
- No se relajaron país, moneda, credenciales, cuarentena, colecciones permitidas ni confirmación reforzada.
- El patrón es reusable para próximos tenants y debe reflejarse en Academia: pendiente restringido no significa validado ni habilitado.

## Prueba automática

`tools/orbit360-test-import-initial-pending-insurers.mjs` verifica:

- dry-run permitido para pendiente estrictamente restringido;
- escritura que conserva el estado pendiente;
- bloqueo de una restricción incompleta;
- cuarentena explícita no escribible.
