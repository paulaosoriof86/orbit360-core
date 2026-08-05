# ESTADO ACTIVO — AUTH SOURCE-ONLY v4 + BLOQUE 4

Fecha local: 2026-08-05 09:46 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## AUTH

El gate runtime v3 quedó consumido con `STOP_RETRY_ACCESS_CONFIG_APPLY`. No se reutiliza.

Causa raíz cerrada:

```text
FIRESTORE_TRANSACTION_READ_AFTER_WRITE
```

Root fix source-only vigente:

```text
READ_ALL → VALIDATE_ALL → WRITE_ALL
commit 38aae846477a35025950869a207bf10be9337cc1
```

Gate activo autorizado:

```text
block-auth-access-recovery-source-only-v4-20260805
contractVersion 13.3.0
AUTH_ACCESS_RECOVERY_SOURCE_ONLY_V4
```

Alcance:

- request y provenance;
- preflight canónico;
- requests v1/v2/v3 inmutables y consumidos;
- allowlist de campos y Function;
- atomicidad e idempotencia;
- root fix transaccional;
- futuro request runtime ausente.

Capacidades operativas: todas deshabilitadas. El request v4 source-only será único e inmutable.

## Bloque 4

```text
Gate: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

Continúan sin pausa:

- clasificación de 365 pagos;
- recepción gradual de planillas, facturas y estados de cuenta;
- propuesta G&T sin aplicar;
- importador inteligente;
- contrato planilla de comisiones → CxC/CxP → factura posterior;
- flujo durable de pagos reportados por cliente.

## Próxima frontera

Solo después de PASS source-only v4 se podrá preparar un nuevo gate/request runtime, bajo autorización explícita distinta. El futuro request runtime permanece ausente.
