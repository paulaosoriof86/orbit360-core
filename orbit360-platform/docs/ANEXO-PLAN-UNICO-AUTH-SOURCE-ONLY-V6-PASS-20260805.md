# ANEXO AL PLAN ÚNICO — AUTH SOURCE-ONLY v6 PASS

Fecha: 2026-08-05 11:43 GT  
RC: `RC-AYS-LAB-CANONICA-01`

## Resultado

```text
Gate: block-auth-access-recovery-source-only-v6-20260805
Contract: 13.5.0
Request commit: 205506c6d924cd236e6b090fc7a41f3f8ab276b1
Result commit: 8732f217cf45918d4c23bda3c41095b159aac2e0
Decision: GO_AUTH_DIAGNOSTIC_CONTROL_PLANE
Checks: 32/32 PASS
```

## Root fixes validados y persistidos

1. Paridad del actor antes de onboarding:
   - tenant exacto;
   - membership activa;
   - rol activo asignado;
   - rol privilegiado o permiso explícito;
   - identidad disponible.
2. Propagación sanitizada de `httpStatus`, `callableStatus` y `errorCode`.
3. Persistencia condicional de evidencias de configuración, actor, Auth, scopes y rollback.
4. Integridad trivalente:
   - `VERIFIED_UNCHANGED`;
   - `VERIFIED_CHANGED`;
   - `NOT_POSTVERIFIED`.

## Frontera cumplida

```text
Secretos: no
Firebase/Firestore/Auth: 0
Functions/Hosting/navegador/deploy: 0
Rules/reimportación/CRM: 0
producción/main/merge: 0
```

## Estado de autorización

El request source-only v6 quedó consumido e inmutable. El futuro request runtime v7 permanece ausente y requiere autorización explícita nueva.

## Continuidad

El Bloque 4 continúa read-only y no queda bloqueado por Auth.
