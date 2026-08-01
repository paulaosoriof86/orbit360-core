# Preflight estático — Gate único de escritura de Cobros

Fecha: 2026-08-01  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Gate: `block10.9-cobros-controlled-write-lab-v20260801`

## Estado

`COBROS_CONTROLLED_WRITE_GATE_PREFLIGHT_PASS`

```text
run: 30710608492
artifact: 8821741047
digest: sha256:6da1eb4d5fd39ce350ac31b4f9dd2a1ecb34b713346f14cc9d35f23a6e50ed00
contrato canónico: PASS
fase: PREPARED_STATIC
```

La Dirección aprobó cuatro casos directos y, de forma separada, un caso histórico reforzado. Esta aprobación permitió preparar el gate, pero todavía no autoriza su ejecución en LAB.

## Un solo gate por fases

```text
PREPARED_STATIC
→ ARMED_BY_EXPLICIT_LAB_AUTHORIZATION
→ EXECUTED_LAB
→ VERIFIED_OR_ROLLED_BACK
```

No se creará otro gate para la escritura. La próxima autorización armará este mismo gate 10.9.

## Plan sanitizado validado

```text
casos aprobados: 5
directos: 4
histórico reforzado: 1
grupos atómicos: 5
snapshots obligatorios: 11
operaciones planificadas: 10
pasos de rollback: 11
idempotencias duplicadas: 0
```

Los cuatro casos directos planifican insertar un cobro y actualizar el recibo canónico existente dentro del mismo grupo atómico.

El caso histórico planifica crear un recibo histórico exigible e insertar/aplicar el cobro dentro de un único grupo atómico. La póliza se toma como snapshot y debe permanecer sin cambios.

## Protección estructural

El writer genérico continúa bloqueando la colección `cobros`. El gate usa un owner especializado y limitado a las cinco referencias autorizadas. No se abrió una excepción global ni se modificó el writer transversal.

## Causa raíz del primer intento

```text
primer run: 30710503705
clasificación: VALIDATOR_STALE
producto afectado: no
owner afectado: no
```

El validador buscaba `cobros` en una ventana fija posterior a `ALLOWED_COLLECTIONS`; esa ventana alcanzaba la lista siguiente `HARD_BLOCKED_COLLECTIONS`, donde `cobros` debe estar. Se corrigió el parser para aislar ambas listas por sus límites sintácticos. La segunda y última ejecución pasó.

## Controles obligatorios

- snapshot completo antes de cada escritura;
- `ASSERT_ABSENT` para cada idempotencia;
- cinco llaves únicas;
- atomicidad por caso;
- rollback por caso;
- caso histórico separado y reforzado;
- no reactivar póliza;
- no crear `finmov`;
- detener o revertir ante fallo parcial;
- verificar después de escribir antes de avanzar.

## Estado de seguridad

```text
executionAuthorized: false
labWriteAuthorized: false
writeEligible: 0
cobros writes: 0
receipt writes: 0
policy writes: 0
finmovs writes: 0
Firestore writes: 0
browser: 0
deploy: 0
production: untouched
```

## Siguiente frontera

Dirección puede autorizar explícitamente armar y ejecutar el mismo gate 10.9 en LAB. Esa autorización permitirá snapshot y escritura limitada a cinco casos; no incluirá deploy ni producción.
