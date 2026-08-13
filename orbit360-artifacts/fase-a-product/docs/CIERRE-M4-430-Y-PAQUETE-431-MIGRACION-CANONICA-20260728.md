# M4 — cierre 4.3.0 y paquete 4.3.1 de migración canónica

Fecha: 2026-07-28  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Por qué se reabrió M4

Clasificación: `VALIDATOR_STALE` + `DATA_CONTRACT_FAILURE`.

El cierre previo confirmó correctamente el saneamiento del origen (414 clientes, 26 aseguradoras, 0 moneda faltante y 0 target-only), pero omitió comprobar que el destino canónico del store productivo tuviera esos mismos datos. La lectura durable 4.2.10 había dejado evidencia de destino 0 clientes / 0 aseguradoras.

No se revierte 4.2.11: las 61 correcciones GT/GTQ permanecen válidas.

## 4.3.0 — dry-run final canónico

```text
Run: 30401002929
Job: 90415507507
Artifact: 8704692107
Digest: sha256:cf55e4d3b7d2145c2563e37582d426a974e5b0a735ec45dfa01f73e2ffe56d44
Preflight: GO_GATE_CONTRACT 24/24
Contrato: PASS 21/21
Escrituras: 0
```

Diff real demostrado:

```text
configuración canónica: create 1
membership: omit 1
clientes: create 414
aseguradoras: create 26
quality/audit: create 2 planificados
requires_validation: 0
target-only: 0
secretos: 0
```

Binding inmutable del input:

```text
idempotencyKey: ed2f0adc554700556d80c2625913b34256a043b5226629b125d6e0203a076573
config digest: 94d7419b528df7b93a929aec956dd9fa2345ae5e71c9bcc66071e036809a40b8
membership digest: a3a4533b35066a3ddaabdfea99ec75e6388e28704ad3072b3b1dc35a0191fcbb
clientes digest: a766afb91bf2bfdd0d5e21b1838fee2bba114a805655091da8f13a1ada5b70db
aseguradoras digest: a0ad55a3cfc82b8820206024d911818a50bbfd77cdd4fa58c8a7d0877b8cfa3d
```

## 4.3.1 — paquete preparado, NO autorizado

Gate: `block4-final-canonical-migration-write-v20260728`  
Contrato: `4.3.1`

El paquete quedó preparado pero sin request de ejecución.

Validación estática:

```text
Run: 30401935910
Job: 90418567002
Artifact: 8705035965
Digest: sha256:60f246f3081113fefa54825d73a9971a71f4553ddbca5cb83f1da6737dc7d71b
Preflight canónico: 25/25
Activation mode: package_without_request
Execution authorized: false
Fixtures: 30/30
Runtime syntax: PASS
Secret access: false
Firestore read: false
Operational writes: 0
```

## Diseño de escritura

La operación no usa una transacción monolítica. Se ejecuta en chunks de 100 targets, manteniendo cada chunk por debajo del límite transaccional y con idempotencia determinística.

Por cada uno de los 441 destinos:

1. comprobar que el target siga ausente;
2. crear snapshot durable de `beforeExists:false`;
3. crear el target canónico;
4. crear evento append-only con hash del resultado y referencia al snapshot.

La operación completa también crea un `importBatch`, lo finaliza solo después del readback y genera un evento resumen append-only.

## Presupuesto exacto de éxito

```text
1 configuración canónica
414 clientes canónicos
26 aseguradoras canónicas
= 441 target creates

441 snapshots
442 auditorías append-only
2 escrituras de importBatch
0 escrituras de membership

máximo éxito: 1,326 escrituras operativas
```

## Rollback de emergencia

Solo se habilita junto con la autorización de 4.3.1. No borra por nombre ni por conteo: antes de eliminar cada target comprueba que su hash actual coincide exactamente con el hash creado por esta operación.

```text
máximo target deletes: 441
máximo rollback audits: 442
máximo batch updates: 1
máximo rollback: 884 escrituras
snapshots: no se eliminan
```

Si un target cambió después de ser creado, el rollback se bloquea y no lo elimina.

## Alcance prohibido

```text
membership writes: 0
Pólizas: no
Vehículos: no
Recibos/cartera: no
Cobros: no
Comisiones: no
Financiero histórico: no
Rules: no
Hosting: no
Functions: no
producción: no
main/merge: no
```

## M5

M5 permanece congelado. La evidencia técnica de RC hash/paridad LAB 22/22 se conserva, pero el readiness se repite únicamente después de que M4 demuestre destino canónico 1 config / 414 clientes / 26 aseguradoras.

## Siguiente acción exacta

Solicitar autorización explícita nueva e independiente para una única ejecución 4.3.1 con el presupuesto anterior y rollback de emergencia autorizado.
