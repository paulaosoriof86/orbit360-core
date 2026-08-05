# ESTADO ACTIVO — AUTH v7 SUSPENDIDO + BLOQUE 4 CONTINÚA

Fecha local: 2026-08-05 11:51 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Auth

```text
Runtime v7: SUSPENDIDO
Request v7: AUSENTE
Secretos abiertos: no
Firebase ejecutado: no
Firestore/Auth writes: 0/0
Function deploy: 0
```

La autorización runtime v7 no se consume porque la usuaria ordenó detener el ciclo antes de crear el request y solicitó auditoría forense.

## Causa raíz sistémica

```text
FUNCTIONAL_DEFECT
AUTH_BOOTSTRAP_CIRCULAR_DEPENDENCY_AND_SPLIT_BRAIN_USER_STATE
```

Equipo puede guardar un registro operativo antes de que existan Auth y membership. El onboarding normal exige un actor ya autenticado con membership administrativa. No puede utilizarse como bootstrap de la primera administración real.

## Solución definitiva

```text
Bootstrap inicial directo por Admin SDK y roster sellado
→ 3 identidades + 3 memberships + 3 correos
→ login real y scopes verificados
→ deploy/readiness de onboarding normal
→ Equipo autoadministrable
→ recuperación visible de contraseña
→ retiro de demo y cierre de Rules antes de producción
```

No se crearán gates separados por persona ni nuevas cadenas de recovery basadas en la callable inicial.

Fuente:

`orbit360-platform/docs/AUDITORIA-FORENSE-AUTH-SOLUCION-DEFINITIVA-20260805.md`

## Bloque 4

```text
PASS_COBROS_FULL_REPLAY
ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

Continúan sin pausa:

- clasificación de 365 pagos;
- recepción de planillas, facturas y estados de cuenta;
- importador inteligente;
- contrato planilla de comisiones → CxC/CxP → factura posterior;
- flujo durable de pagos reportados por cliente.

## Próxima acción

Preparar source-only un único macrobloque Fundación Auth completo. No crear request runtime hasta aprobar una suite acumulativa de bootstrap, onboarding normal, recuperación de contraseña, readiness, rollback, integridad CRM y seguridad LAB.
