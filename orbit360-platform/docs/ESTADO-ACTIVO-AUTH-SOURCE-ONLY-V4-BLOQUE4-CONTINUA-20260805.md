# ESTADO ACTIVO — AUTH SOURCE-ONLY v4 PASS + BLOQUE 4

Fecha local: 2026-08-05 10:07 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## AUTH source-only v4 cerrado

```text
Gate: block-auth-access-recovery-source-only-v4-20260805
Contract: 13.3.0
Estado: AUTH_ACCESS_RECOVERY_SOURCE_ONLY_V4_CONSUMED_PASS
Resultado: AUTH_ACCESS_SOURCE_ONLY_V4_PASS
Checks: 26/26
```

El request v4 quedó consumido e inmutable. Los requests v1, v2 y v3 conservan sus blobs auditados y sus autorizaciones consumidas.

## Causa raíz y root fix verificados

```text
Causa v3: FIRESTORE_TRANSACTION_READ_AFTER_WRITE
Root fix: READ_ALL → VALIDATE_ALL → WRITE_ALL
Commit: 38aae846477a35025950869a207bf10be9337cc1
Blob: dda248ff0df08f69d95ac117d8a7262c055b1af6
```

El gate verificó:

- request único y parent HEAD correcto;
- provenance del root fix;
- workflow existente reutilizado con path v4;
- historia Git completa;
- allowlist exacta de `email`, `roles`, `defaultRole`, `activeRole`, `countries` y `dataScopes`;
- Function allowlisted `orbit360ProvisionTeamAccess`;
- todas las lecturas antes de todas las escrituras;
- una sola transacción propietaria;
- ausencia de lecturas posteriores a la primera escritura;
- diff por campos, guard de concurrencia y postverificación;
- futuro request runtime ausente.

## Frontera source-only

```text
Secretos: no
Firebase: 0 comandos
Firestore reads/writes: 0/0
Auth reads/writes: 0/0
Functions/Hosting/navegador/deploy: 0
Rules/reimportación/CRM: 0
producción/main/merge: 0
```

## Estado real de acceso

- correo oficial de Paula: configurado desde v2;
- identidades reales de Paula, Carlos y Samuel: todavía no provisionadas por el v4, porque v4 fue exclusivamente source-only;
- memberships: todavía pendientes del próximo gate runtime;
- correos de establecimiento o recuperación de contraseña: todavía no enviados;
- Function onboarding: no desplegada por v4.

## Próxima frontera AUTH

```text
Futuro request: .github/orbit360-requests/auth-access-recovery-lab-v5-20260805.json
Estado: AUSENTE
Nueva autorización explícita requerida: sí
```

El runtime siguiente deberá reutilizar el root fix ya validado y no repetir la preparación source-only.

## Bloque 4 continúa

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
