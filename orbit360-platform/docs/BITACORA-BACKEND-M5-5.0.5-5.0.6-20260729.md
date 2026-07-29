# Bitácora backend — M5 5.0.5 y 5.0.6

Fecha: 2026-07-29 UTC / 2026-07-28 Guatemala

## Bloque

M5 · release candidate, entrega LAB, runtime smoke y visualización A&S.

## Carriles

- A — frontend/UX/Academia: contenido estático de Academia separado de progreso y mutaciones reales.
- B — backend/seguridad/Orbit.store: preservados loader y store LAB protegidos; smoke con guardas de cero escritura.
- C — datos reales: sin cambios; baseline 414 clientes, 26 aseguradoras, 7 asesores y destino canónico 1/1/414/26 preservado.

## Avance visible

1. Hosting 5.0.4 entregó RC `d90ec601…` y cerró 24/24.
2. Runtime smoke 5.0.5 ejecutó una vez y entró en stop-line.
3. Snapshots antes/después probaron cero cambios y cero escrituras.
4. Se aislaron dos causas raíces independientes.
5. Se implementó y probó la política reusable de contenido estático de Academia.
6. Se restauró el loader LAB protegido a su baseline.
7. Se separó runtime backend `20260717-2` de revisión visual `20260723-10`.
8. Gate estático 5.0.6 cerró verde y calculó RC `b25bf275…`.

## Fuente/base

- Cierre Hosting 5.0.4.
- Run runtime 5.0.5 `30413481948` y artifact `8709301142`.
- Cierre stop-line `m5-runtime-smoke-505-closure.json`.
- Package check 5.0.6 `30415573496`.
- Request inmutable 5.0.6 `30415732795`.
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

## Pruebas/evidencia

- Preflight 5.0.6: 24/24.
- Contrato estático: 26/26.
- Fixtures Academia: 18/18.
- Activos críticos: 42/42.
- LAB: 22/25; tres diferencias exactas y explicadas.
- Secrets: 0.
- Firestore read/write: 0/0.
- Runtime/browser/deploy: 0/0/0.
- Protected loader: restaurado.
- Protected store: sin cambios.

## Estado

`M5_RUNTIME_SMOKE_REMEDIATION_STATIC_CLOSED_NEW_RC_READY_FOR_LAB_DELIVERY`.

## Pendiente

Una sola entrega Hosting LAB de RC `b25bf275…`, sujeta a autorización explícita separada. Después: paridad pública 25/25. Runtime smoke, revisión visual y Pólizas siguen bloqueados.

## Siguiente acción exacta

Crear autorización y gate Hosting únicamente después de la autorización de Paula. No reutilizar autorizaciones consumidas ni desplegar en este cierre estático.
