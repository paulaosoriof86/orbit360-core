# ESTADO ACTIVO — AUTH RUNTIME v5 + BLOQUE 4

Fecha local: 2026-08-05 10:48 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## AUTH runtime v5 autorizado una vez

```text
Gate: block-auth-access-recovery-lab-v5-20260805
Contract: 13.4.0
Estado: AUTH_ACCESS_RECOVERY_V5_AUTHORIZED_ONCE
```

Prerequisito cerrado:

```text
Source-only v4: 26/26 PASS
Root fix: READ_ALL → VALIDATE_ALL → WRITE_ALL
```

Frontera autorizada:

- máximo tres registros de Equipo;
- campos `email`, `roles`, `defaultRole`, `activeRole`, `countries`, `dataScopes`;
- censo Auth/memberships;
- despliegue exclusivo de `orbit360ProvisionTeamAccess` solo si está ausente;
- creación o vinculación de Paula, Carlos y Samuel;
- tres correos de establecimiento o recuperación;
- verificación de roles, países, scopes e integridad CRM;
- rollback ante fallo posterior al onboarding.

Prohibido: usuarios sintéticos, hardcode, contraseñas temporales, otras Functions, Hosting, Rules, reimportación, escrituras CRM, producción, main y merge.

## Bloque 4 continúa

```text
Gate: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

El carril Auth no detiene la clasificación de pagos, la recepción de fuentes mensuales ni la preparación del importador inteligente y del contrato financiero de comisiones.
