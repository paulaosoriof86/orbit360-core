# ESTADO ACTIVO — AUTH v5 CERRADO + BLOQUE 4 CONTINÚA

Fecha local: 2026-08-05 10:58 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## AUTH runtime v5 cerrado

```text
Gate: block-auth-access-recovery-lab-v5-20260805
Contract: 13.4.0
Estado: AUTH_ACCESS_RECOVERY_V5_CONSUMED_STOP_RETRY
Stage: STOP_RETRY_AUTH_ACCESS_RECOVERY
Clasificación primaria: FUNCTIONAL_DEFECT
```

El request v5 queda consumido e inmutable. No se permite rerun.

## Alcance alcanzado

```text
preflight: PASS
plan configuración: PASS
apply configuración: PASS
censo Auth/memberships: PASS
disponibilidad Function onboarding: PASS
llamada onboarding: STOP_RETRY
scope postverify: no alcanzado
correos enviados: 0
```

No existe evidencia confirmada de identidades o memberships persistidas. El recovery owner intentó rollback, pero su readback no llegó al repositorio.

La integridad CRM quedó `NOT_POSTVERIFIED`. No se observó una modificación CRM; tampoco se afirma PASS de integridad posterior porque esa etapa no se alcanzó.

## Causa primaria

```text
FUNCTIONAL_DEFECT
ONBOARDING_CALL_FAILED_STATUS_UNAVAILABLE
```

Owner:

- `tools/orbit360-auth-access-recovery-lab-v20260805.mjs::callOnboarding`
- `functions/user-onboarding.js::executeProvision`

El status remoto exacto no quedó persistido.

## Causa secundaria

```text
PIPELINE_MECHANISM_FAILURE
MISSING_OPTIONAL_SCOPE_EVIDENCE_BREAKS_RESULT_PERSISTENCE
```

El workflow exigía la evidencia de scopes aunque la etapa hubiera sido omitida después del fallo de onboarding.

## Solución source-only preparada

- `tools/orbit360-auth-access-actor-parity-precheck-v6-20260805.mjs`;
- `tools/orbit360-auth-access-evidence-safe-persist-v6-20260805.mjs`;
- workflow existente congelado y movido al futuro path source-only v6;
- evidencia dual y cierre v5 persistidos;
- futuro request source-only v6: ausente.

El siguiente gate debe demostrar primero:

1. paridad entre el actor elegido por el censo y el contrato de autorización de la callable;
2. propagación del status/errorCode sanitizado;
3. persistencia condicional de config, auth, scopes y rollback;
4. cero capacidades runtime durante ese diagnóstico.

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
- pagos reportados por clientes y su flujo durable pendiente.
