# Estado vigente — Gate 7.11 STOP_RETRY

Fecha: 2026-08-02  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
HEAD de cierre previo al documento: `971e291813814e3bf00ccdb208ee749a01eab275`

## Baseline preservado

- Gate 7.9: cerrado y vigente.
- Gate 7.10: cerrado y vigente.
- Digest canónico: `19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b`.
- Propietario único de lectura: `Orbit.store`.
- Datos operativos: 430 clientes, 30 aseguradoras, 1,373 pólizas, 1,032 vehículos, 1,294 recibos esperados, 673 registros de cartera, 5 cobros y 7 asesores.
- Seeds excluidos: 5.
- Escrituras operativas durante los intentos: 0.

## Gate 7.11

Estado: `CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_STOP_RETRY`.

### Intentos y causa raíz

1. Run `30733245148`: `PIPELINE_MECHANISM_FAILURE` por lectura de `GITHUB_ENV` en el mismo paso que lo escribió.
2. Run `30755865296`: `VALIDATOR_STALE / LEGAL_GATE_DEFERRED_RENDER_RACE`; el modal Legal apareció después de la hidratación y el validador lo había clasificado prematuramente como aceptado.
3. Run `30756305124`: preflight bloqueado por `CANONICAL_LIFECYCLE_REVISION_MISMATCH`, sin secretos ni runtime.
4. Run `30756380638`: preflight bloqueado por autorización histórica hardcodeada, sin secretos ni runtime.

La misma etapa de preflight falló dos veces; se activó `STOP_RETRY`.

## Correctivos incorporados

- Propagación determinística de token/config entre pasos.
- Legal resuelto después de hidratación y antes del write guard.
- Validador estático del orden Legal.
- Vínculo exacto entre `authorizationRef` de lifecycle y request.
- Validador estático del vínculo de autorización.
- Workflow actualizado para ejecutar ambos controles antes de secretos.
- Lifecycle y request consumidos; replay bloqueado.

## Seguridad

- Request consumido: sí.
- Ejecuciones adicionales: 0.
- Secretos habilitados: no.
- Firestore read habilitado: no.
- Firestore writes: 0.
- Browser/runtime habilitado: no.
- Deploy/preview/producción: no.
- Main/merge: no.

## Aprobación humana

- Clientes: aprobado previamente.
- Pólizas: pendiente.
- Vehículos: pendiente.
- Recibos: pendiente.
- Cartera: pendiente.
- Resto CRM: pendiente.

## Siguiente acción exacta permitida

Auditoría estática read-only del paquete final de preflight. Deben probarse, sin secretos ni runtime:

1. `GATE711_AUTHORIZATION_BINDING_STATIC_PASS`;
2. `GATE711_LEGAL_DEFERRED_ORDER_STATIC_PASS`;
3. `GO_GATE_CONTRACT`.

Solo después de esos tres resultados podrá existir una nueva autorización explícita y un nuevo request inmutable para una única ejecución read-only. No se permite reusar ni modificar el request consumido.
