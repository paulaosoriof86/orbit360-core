# ESTADO ACTIVO — AUTH source-only v6 + Bloque 4

Fecha local: 2026-08-05 11:33 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Diagnóstico Auth source-only v6

```text
Gate: block-auth-access-recovery-source-only-v6-20260805
Contract: 13.5.0
Estado: READY_AWAITING_SINGLE_FILE_REQUEST
Capacidades operativas: 0
```

Validaciones autorizadas:

- request y provenance;
- preflight canónico;
- paridad exacta del actor con la callable;
- propagación sanitizada de `httpStatus`, `callableStatus` y `errorCode`;
- persistencia condicional de config, actor, Auth, scopes y rollback;
- integridad trivalente sin falsos negativos;
- fixtures contractuales source-only.

Requests Auth v1, v2, v3, source-only v4 y runtime v5 permanecen consumidos e inmutables. El futuro request runtime v7 está ausente.

Prohibido: secretos, Firebase, Firestore, Auth, Functions, Hosting, navegador, deploy, Rules, reimportación, CRM, producción, main y merge.

## Bloque 4 continúa

```text
Gate: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

El diagnóstico Auth no detiene la clasificación de pagos, la recepción de fuentes mensuales ni la preparación del importador inteligente y del contrato financiero de comisiones.
