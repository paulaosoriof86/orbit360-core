# CHECKPOINT — CONTROL PLANE HARDENING / PRODUCTION REOPENING PACKAGE

Fecha: 2026-08-20  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: `OPEN_FAIL_CLOSED`

## Regla de reanudación obligatoria

Mientras `orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json` no esté en `CLOSED_PASS`, **este checkpoint y el package prevalecen sobre cualquier checkpoint anterior, proyección live-state antigua, lifecycle con nextAction antiguo o cuerpo del PR que todavía diga que corresponde pedir autorización runtime**.

Una conversación nueva debe:

1. leer reglas maestras/addenda vigentes;
2. leer `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`;
3. leer `orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json`;
4. verificar HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
5. continuar **exactamente desde `firstIncompleteStep`**;
6. no reconstruir roadmap, no reabrir pasos PASS sin evidencia nueva y no materializar runtime/request/autorización mientras el package siga abierto.

## Estado congelado

- Candidata F2 sucesora certificada: artifact `9395391426`.
- Candidate source HEAD: `6af0c029aebb1bfecd05569452c814584110ae4c`.
- Artifact digest: `c089ea81672225876f643399b970d1e50e7d9cdc084dfc75973e00ed8581c53c`.
- Producto y datos: congelados.
- Ruta inmediata a producción: 50%.
- Programa integral: 25%.
- Estos porcentajes no aumentan por hardening documental/control-plane.

## Causa raíz sistémica activa

`PIPELINE_MECHANISM_FAILURE:CONTROL_PLANE_NOT_FULLY_ATOMIC`

con componente:

`VALIDATOR_STALE:CONTRACT_VERSION_DRIFT`

Evidencia vigente al crear el lock:

- lifecycle runtime F2: `2.2.0`;
- lifecycle/source y preflight obligatorio F2: `2.1.0`;
- el workflow canónico de continuidad calculaba proyecciones y después hacía `git pull --rebase`, permitiendo teóricamente publicar una proyección calculada sobre una revisión anterior del ledger;
- el invariant existente no cubría toda la equivalencia registry + lifecycle + preflight + workflow;
- Request14 volvió a observar la misma familia `F2_ACTIVE_PIPELINE_HISTORICAL_CANDIDATE_LITERAL` antes del gate.

## Request14 — historial observado, no reutilizable

HEAD previo al lock: `19811090a5df38c248e62a90e701f5b8f362d662`.

La evidencia terminal persistida muestra:

- run `32344210222`;
- `VALIDATOR_STALE:F2_ACTIVE_PIPELINE_HISTORICAL_CANDIDATE_LITERAL`;
- pre-gate fail;
- browser/runtime efectivo: no;
- secrets/Firestore: no;
- writes: 0;
- deploy/publicación/producción: no.

El request JSON de ordinal 14 todavía declaraba `AUTHORIZED_ONCE / consumed:false`, mientras la evidencia terminal ya registraba failure. Esa contradicción queda clasificada como **metadata drift del control plane** y debe reconciliarse en CP-01 sin replay.

## Secuencia obligatoria

- CP-00 — PASS: persistir lock y congelar candidata.
- CP-01 — PENDING: unificar autoridad del contrato F2 y reconciliar Request14 sin replay.
- CP-02 — PENDING: eliminar duplicación de versiones/bindings en preflight.
- CP-03 — PENDING: writer único del ledger con `expectedRevision`.
- CP-04 — PENDING: proyección atómica; eliminar publicación posterior a rebase silencioso.
- CP-05 — PENDING: composite invariant del control plane completo.
- CP-06 — PENDING: synthetic transversal de amplificación `Orbit.store`.
- CP-07 — PENDING: aislar superficie legacy de workflows.
- CP-08 — PENDING: una auditoría integral source-only/sintética.
- CP-09 — PENDING: readback independiente de todo el control plane.
- CP-10 — PENDING: cerrar package solo con todos los PASS.
- CP-11 — BLOCKED: preparar frontera para autorización runtime fresca únicamente después de CP-10.

## Siguiente acción exacta

`CP-01_UNIFY_F2_GATE_CONTRACT_AUTHORITY`

No corresponde pedir autorización runtime ni crear Request15.

## Límites durante el hardening

`runtime=false` · `browser=false` · `secrets=false` · `firestoreRead=false` · `writes=0` · `deploy=false` · `publication=false` · `production=false` · `main=false` · `merge=false`.

## Presupuesto de iteraciones persistido

Objetivo: 3 macro-iteraciones para hardening; techo: 4. Camino limpio posterior hasta go-live: 3 macro-iteraciones. Techo metodológico total desde este lock: 8. Una macro-iteración solo cuenta si deja commit, evidencia PASS/FAIL, transición del package, gate consumido o cierre de milestone.
