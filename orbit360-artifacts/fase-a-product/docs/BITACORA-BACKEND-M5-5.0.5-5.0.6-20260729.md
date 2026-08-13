# Bitácora backend — M5 5.0.5 a 5.0.7

Fecha: 2026-07-29 UTC / 2026-07-28 Guatemala

## Bloque

M5 · release candidate, entrega LAB, runtime smoke y visualización A&S.

## Carriles

- A — frontend/UX/Academia: contenido estático de Academia separado de progreso y mutaciones reales; activos publicados en la RC.
- B — backend/seguridad/Orbit.store: loader y store LAB protegidos; preflight antes de identidad; Hosting-only; cero escrituras.
- C — datos reales: sin cambios; baseline 414 clientes, 26 aseguradoras, 7 asesores y destino canónico 1/1/414/26 preservado.

## Avance visible

1. Hosting 5.0.4 entregó RC `d90ec601…` y cerró 24/24.
2. Runtime smoke 5.0.5 ejecutó una vez y entró en stop-line con cero escrituras.
3. Se aislaron las causas raíces Academia/Orbit.store y runtime visual/backend.
4. Gate estático 5.0.6 cerró verde y calculó RC `b25bf275…`.
5. Package check 5.0.7 cerró verde sin secretos ni deploy.
6. La RC `b25bf275…` fue publicada una sola vez en Hosting LAB.
7. El cierre posterior falló por un archivo efímero ausente; se congeló cualquier redeploy.
8. Se corrigió el validador para usar evidencia durable.
9. La recuperación pública cerró 25/25, cero diferencias y cero redeploy.

## Fuente/base

- Cierre Hosting 5.0.4.
- Runtime 5.0.5: run `30413481948`, artifact `8709301142`.
- Remediación 5.0.6: run `30415732795`, artifact `8710079365`.
- Package Hosting 5.0.7: run `30417610407`, artifact `8710708337`.
- Entrega Hosting 5.0.7: run `30417743516`, artifact `8710762943`.
- Paridad final: run `30418258733`, artifact `8710924084`.
- Baseline protegido: commit `610229dcead42162f1e22b34894b4a3f8230684f`.

## Causa raíz y corrección

### Academia / Orbit.store

**Necesidad:** impedir que cursos, lecciones, evaluaciones y marcadores de contenido versionado escriban a Firestore durante cada bootstrap.

**Esperado:** contenido estático disponible en sesión; progreso y cambios reales del usuario durables.

**Causa raíz:** addenda de Academia reutilizaban `Orbit.store.insert/update`, cuya implementación LAB persiste mediante Firestore.

**Fix:** owner `academia-static-content-write-policy-v20260729.js` v`20260729.2`, limitado al store explícito LAB, con contenido estático transitorio y estado del usuario preservado.

**Impacto:** elimina escrituras automáticas de bootstrap sin romper edición, progreso ni certificaciones reales.

### PWA/Router/runtime

**Necesidad:** llegar al runtime backend canónico sin confundirlo con la revisión visual.

**Esperado:** query `runtime=20260717-2`; revisión visual y SW `20260723-10` como metadatos separados.

**Causa raíz:** preview enviaba `20260723-10` como runtime contractual.

**Fix:** `ays-lab-preview.html` separa ambos propietarios y el runner futuro exige `20260717-2`.

### Cierre de paridad posterior al deploy

**Necesidad:** verificar la entrega pública sin repetir el deploy.

**Esperado:** readiness 25/25 usando únicamente fuentes durables presentes en el checkout.

**Causa raíz:** el validador exigía `m5-academia-static-write-policy-test.json`, generado de forma efímera en otro workflow.

**Fix:** usa `m5-runtime-smoke-remediation-static-506-closure.json` como evidencia durable; el fixture efímero es opcional.

**Impacto:** recuperación de paridad sin secretos, identidad Firebase ni redeploy.

## Pruebas/evidencia

- Hosting preflight: 24/24.
- Contrato Hosting: 35/35.
- Hosting deploy executions: 1.
- Contrato recuperación: 20/20.
- Activos críticos: 42/42.
- Activos públicos: 25/25.
- Mismatches: 0.
- Secrets en recuperación: 0.
- Firestore read/write: 0/0.
- Operational writes: 0.
- Runtime/browser: no/no.
- Redeploy: no.
- Protected loader/store: sin cambios.

## Estado

`M5_LAB_HOSTING_DELIVERED_AND_25_OF_25_VERIFIED`.

## Acumulado Claude

- Política reusable de contenido estático: `REPLICABLE_CLAUDE_ACUMULADO`.
- Separación visual revision vs backend runtime: `REPLICABLE_CLAUDE_ACUMULADO`.
- Control-plane, Firebase, gates y artifacts: `BACKEND_PROTEGIDO_NO_CLAUDE`.

## Impacto Academia

La siguiente revisión acumulada debe enseñar contenido estático vs progreso durable, separación de gates, y que un status rojo posterior no demuestra por sí mismo una falla del producto. No se cambia el activo de Academia después de cerrar la RC.

## Pendiente

Runtime smoke LAB, revisión visual y Pólizas siguen bloqueados. Hosting y recuperación de paridad están consumidos.

## Siguiente acción exacta

Solicitar autorización explícita para un único runtime smoke LAB de RC `b25bf275…`, sin deploy y con cero escrituras. Solo tras `ok:true` se habilita la revisión visual única.
