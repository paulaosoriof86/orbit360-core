# ESTADO ACTIVO — AUTH source-only v6 PASS + Bloque 4

Fecha local: 2026-08-05 11:43 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Diagnóstico Auth source-only v6 cerrado

```text
Gate: block-auth-access-recovery-source-only-v6-20260805
Contract: 13.5.0
Request: 205506c6d924cd236e6b090fc7a41f3f8ab276b1
Resultado: AUTH_ACCESS_SOURCE_ONLY_V6_PASS
Checks: 32/32
Autorización: CONSUMED_PASS
Capacidades operativas utilizadas: 0
```

Validado:

- requests Auth v1, v2, v3, source-only v4 y runtime v5 inmutables y consumidos;
- request v6 como único archivo del commit disparador;
- preflight canónico 13.5.0;
- paridad exacta del actor con las dos rutas válidas de la callable: rol privilegiado o permiso explícito;
- rechazo contractual cuando el rol activo no está asignado;
- propagación sanitizada de `httpStatus`, `callableStatus` y `errorCode`;
- persistencia condicional de configuración, actor, Auth, scopes y rollback;
- integridad trivalente `VERIFIED_UNCHANGED`, `VERIFIED_CHANGED` y `NOT_POSTVERIFIED`;
- ausencia de falsos negativos cuando una etapa posterior no genera archivo;
- root fix persistido en el recovery owner.

No se utilizaron secretos, Firebase, Firestore, Auth, Functions, Hosting, navegador, deploy, Rules, reimportación, CRM, producción, main ni merge.

## Estado real de acceso

El source-only v6 no crea identidades, memberships ni correos. El acceso real de Paula, Carlos y Samuel continúa pendiente de un runtime nuevo y expresamente autorizado.

## Próxima frontera Auth

El futuro request runtime `auth-access-recovery-lab-v7-20260805.json` permanece ausente. Antes de crearlo se requiere autorización explícita nueva. Ese runtime deberá ejecutar el precheck de paridad antes de llamar onboarding y usar el sellador condicional en cualquier PASS o STOP.

## Bloque 4 continúa

```text
Gate: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

Continúan la clasificación de pagos, la recepción gradual de planillas, facturas y estados de cuenta, el importador inteligente y el contrato financiero de comisiones.
