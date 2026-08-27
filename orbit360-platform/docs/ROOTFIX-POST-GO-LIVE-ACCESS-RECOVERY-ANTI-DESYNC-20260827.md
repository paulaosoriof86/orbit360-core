# ROOTFIX — POST-GO-LIVE ACCESS RECOVERY + ANTI-DESYNC

Fecha: 2026-08-27  
Proyecto: Orbit 360 / A&S  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Clasificación

`PIPELINE_MECHANISM_FAILURE`

No es un defecto funcional ni una caída de producción. El go-live ya cerrado permanece terminalmente PASS. El hallazgo fue doble:

1. el smoke productivo demostró sesión automatizada por `custom_token`, pero no la ruta humana correo + contraseña;
2. el owner del ledger aceptaba `PRODUCTION_SMOKE_PASS / PRODUCTION_GO_LIVE_PASS`, mientras el invariante estático no aceptaba ese mismo estado terminal, creando riesgo de falsa desincronización futura.

## 2. Causa raíz

El control plane tenía una sola fuente mutable de estado, pero todavía duplicaba parte de la semántica de estados entre owner e invariante y no modelaba seguimientos post-go-live independientes del hito de release.

## 3. Corrección sistémica

- Nuevo contrato compartido de estados: `tools/orbit360-single-state-contract-v20260827.mjs`.
- Owner e invariante consumen el mismo contrato; se elimina la duplicación de la lista de estados admisibles.
- Se introduce un `releaseMilestone` inmutable para impedir que una recuperación de acceso reabra o degrade el go-live ya PASS.
- Se separa evidencia de autenticación automatizada de prueba humana:
  - `automatedSmokeAuthMethod = custom_token`;
  - `automatedSessionAuthProven = true`;
  - `humanEmailPasswordProven = false` hasta evidencia humana real;
  - `humanInteractiveNavigationProven = false` hasta navegación real.
- Se incorporan dos transiciones al Canonical Single-State Runner:
  1. `POST_GO_LIVE_ACCESS_RECOVERY_SOURCE_PREP` — sin secretos, Auth, Firestore, navegador, deploy ni producción.
  2. `POST_GO_LIVE_ACCESS_RECOVERY_RESET_LINK` — solo después de autorización humana nueva y específica.
- La autorización histórica del gate `block-auth-paula-reset-link-handoff-lab-v20260817` se trata como consumida y no reutilizable.
- El target queda cerrado por contrato a un solo hash de email, un solo tenant, un solo advisor y un solo enlace. El hash de la identidad demo queda explícitamente prohibido.
- El handler reutiliza el patrón histórico seguro: identidad existente, membership existente, `generatePasswordResetLink`, verificación del OOB code, integridad before/after, cero set directo de contraseña, cero mutación de UID/membership/roles/scopes, cero deploy y handoff privado efímero.
- El enlace nunca entra al ledger, evidencia sanitizada, comentario o artifact de 14 días; únicamente a artifact privado de 1 día y se elimina del workspace.

## 4. Invariantes anti-bucle

1. Owner y validator deben resolver los estados desde el mismo archivo compartido.
2. Toda transición registrada se prueba contra el contrato compartido; si owner/registry/invariant divergen, el selftest falla antes de runtime.
3. Un follow-up abierto no puede coexistir con un `nextAction` terminal obsoleto.
4. `POST_GO_LIVE_ACCESS_RECOVERY_*` nunca puede cambiar `releaseMilestone.closed=true`, `immutable=true`, progreso 100 o estado `PRODUCTION_GO_LIVE_PASS` al finalizar.
5. `custom_token` nunca satisface `humanEmailPasswordProven`.
6. La identidad `orbit.lab@demo.com` no puede convertirse en target de recuperación.
7. La autorización consumida de go-live ni la autorización histórica del reset pueden reutilizarse.
8. Un segundo claim o replay queda bloqueado por `STOP_RETRY`.
9. Source prep no recibe secretos en el environment del step.
10. El runtime de recuperación no puede autorizar `authWrites`, `firestoreWrites`, `operationalWrites`, deploy, producción, main o merge.

## 5. Claude / prototipo reusable

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrones a conservar:
- estados post-go-live honestos separados de release;
- “sesión automatizada probada” no equivale a “acceso humano probado”;
- no mostrar copy técnico ni credenciales;
- estados de recuperación de acceso sin reabrir módulos funcionales.

No se comparte con Claude: implementación Firebase Admin, hashes de identidad, service accounts, OOB links, workflow interno ni datos reales.

## 6. Academia

Clasificación: `ACADEMIA_ACTUALIZAR`.

Agregar a Dirección/Superadmin/IT:
- diferencia entre go-live PASS y follow-up post-go-live;
- diferencia entre custom-token smoke y login humano;
- recuperación de acceso single-use;
- por qué una falla de validator/runner no se corrige tocando producto ni datos;
- STOP_RETRY y no reutilización de autorizaciones consumidas.

## 7. Seguridad y datos

Este rootfix source-only no autoriza ni ejecuta:
- reset link real;
- secretos;
- Firebase/Auth;
- Firestore;
- escrituras de datos;
- deploy;
- producción;
- main;
- merge.

La recuperación real requiere una autorización nueva, específica e inmutable después del PASS source-only.
