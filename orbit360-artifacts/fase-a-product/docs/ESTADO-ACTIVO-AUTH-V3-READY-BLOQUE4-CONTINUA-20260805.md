# ESTADO ACTIVO — AUTH v3 PREPARADO, BLOQUE 4 CONTINÚA

Fecha local: 2026-08-05 09:16 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Carril AUTH

### Ejecución v2 consumida

```text
Gate: block-auth-access-recovery-lab-v2-20260805
Preflight: 13/13 PASS
Correo oficial de Paula configurado: PASS
Escrituras de configuración: 1 campo email
Decisión final: STOP_RETRY_CENSUS
Código observado: ADVISOR_PAULA_ACCESS_CONFIG_INCOMPLETE
```

No se desplegó la Function de onboarding, no se escribieron Auth ni memberships y no se enviaron correos.

### Causa raíz

```text
VALIDATOR_STALE
```

El resolver v2 exigía que el registro legacy duplicara identidad, roles, rol predeterminado, países y scopes. Las fuentes aprobadas los distribuyen entre roster sellado, configuración del asesor, configuración/membership del tenant y contrato del perfil.

### Root fix v3 source-only preparado

```text
Gate futuro: block-auth-access-recovery-lab-v3-20260805
Lifecycle: READY_AWAITING_EXPLICIT_AUTHORIZATION
Request v3: AUSENTE
Workflow v3: INERTE
Secrets/Firebase/runtime v3 ejecutados: no
```

El v3 está preparado para:

1. componer los tres accesos desde fuentes aprobadas;
2. generar diff read-only;
3. actualizar como máximo tres registros de asesor;
4. limitar cambios a `email`, `roles`, `defaultRole`, `activeRole`, `countries`, `dataScopes`;
5. ejecutar censo;
6. desplegar exclusivamente `orbit360ProvisionTeamAccess` si falta;
7. crear o vincular identidades y memberships;
8. enviar establecimiento/recuperación de contraseña;
9. verificar roles, países, scopes e integridad CRM.

No puede ejecutarse hasta recibir autorización explícita nueva.

## Carril Cobros y datos

Continúa sin pausa:

```text
Gate: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

Universo vigente:

```text
pagos reportados: 365
secuencia de cartera: 128
posteriores al corte: 2
pendientes de overlay: 235
cobros existentes preservados: 5
HOLD conocidos: 44
```

Continúan:

- clasificación de pagos;
- ingesta de planillas, facturas y estados de cuenta;
- propuesta G&T sin aplicar;
- root fix del importador inteligente;
- contrato planilla de comisión → CxC/CxP → factura posterior.

## Fuentes de cierre

- `orbit360-platform/docs/CIERRE-AUTH-ACCESS-RECOVERY-LAB-V2-20260805.md`
- `orbit360-platform/runtime-gate-crm-v20260716/auth-access-recovery-final-sanitized-v2-20260805.json`
- `orbit360-platform/runtime-gate-crm-v20260716/auth-access-v2-rootcause-sanitized-v20260805.json`
- `orbit360-platform/docs/CIERRE-STOP-RETRY-AUTH-ACCESS-V2-ROOTCAUSE-V3-20260805.md`
- `tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v3-20260805.json`
- `.github/workflows/orbit360-auth-access-recovery-lab-v3-20260805.yml`

## Prohibiciones

- no reutilizar requests v1/v2;
- no crear request v3 sin autorización;
- no usuarios sintéticos;
- no hardcode;
- no contraseñas temporales;
- no otras Functions, Hosting, Rules o reimportación;
- no CRM, producción, main o merge.
