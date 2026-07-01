# Decision raiz - separar preview visual y Backend LAB

- Fecha local: 2026-07-01 03:32:10
- Rama: feat/ays-auth-lab-correction-20260630
- HEAD inicial: a25ef1a test(lab): preparar smoke automatico Firestore
- Restricciones: sin push, sin deploy, sin produccion, sin datos reales, sin secretos.

## Problema repetitivo

Se estaba abriendo index-dev-firestore.html para revisar avances visuales del prototipo. Esa entrada exige Firebase Auth LAB real y por eso bloquea con login.

## Causa raiz

Habia una mezcla operativa entre dos objetivos distintos: revision visual del prototipo y validacion backend LAB con Firebase Auth y Firestore.

## Decision

- index.html es la entrada para preview visual y revision de prototipo.
- index-dev-firestore.html es la entrada exclusiva para Backend LAB.
- Si index-dev-firestore.html muestra login, no se considera bug visual.
- No se vuelve a parchar login salvo que cambie Firebase Auth real.
- El smoke Firestore queda en espera hasta que exista Auth LAB.

## Cambio aplicado

- Se agrego core/auth-lab-preview-router.local.js.
- En Backend LAB se muestra una salida explicita hacia el preview visual.
- Se crearon launchers separados en tools.
