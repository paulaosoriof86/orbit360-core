# Gravicentra Insurance Fase A — Matriz Canónica de Validación Módulo por Módulo v1

**Estado:** Iteración 1 lineage `PASS 15/15`; Preview/Live aún pendientes. Esta matriz no sustituye `orbit360-recovery-state-v1.json`.  
**Plan rector:** `GRAVICENTRA-INSURANCE-FASE-A-RECOVERY-MASTER-PLAN-v1.3-20260831.md`.  
**Evidencia Iteración 1:** `GRAVICENTRA-FASE-A-ITER1-LINEAGE-EVIDENCE-v1-20260831.md`.  
**Marca visible:** `Gravicentra Insurance`. Identificadores técnicos `orbit360-*` se conservan cuando corresponda por compatibilidad.

## Regla

Cada capability Fase A debe tener lineage aprobado y alcanzar después dos estados: `LATEST_APPROVED_VERSION_PREVIEW_PASS` y `LATEST_APPROVED_VERSION_LIVE_PASS`. El PASS de lineage no sustituye build, Preview, E2E ni Live.

| Capability / superficie | Lineage | Source/blob SHA principal | Owner final | Roles | Read/Write | Build esperado | Preview individual | Live individual | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| LOGIN_AND_ACCESS | PASS_UNIQUE | `auth-product-runtime-p0.js` `8fb5586…` | `Orbit.auth` product owner | membership activa; scopes por access | Auth session; sin write operacional propio | ITER3 | PENDING | PENDING | I1 §2.1 + F2 `33029077881` |
| INICIO_PRIMARY_RUNTIME | PASS_UNIQUE | `inicio.js` `b1bfb0c…` | `modules.inicio` | por membership/access | READ projection | ITER3 | PENDING | PENDING | I1 §2.2 + `842f762…` + F2 |
| CLIENTE360_PRIMARY_RUNTIME | PASS_UNIQUE | `cliente360.js` `fa50bae…` | `modules.cliente360` + canonical projection | all/team/own por access | CRUD aprobado; transporte write limpio a cerrar I2 | ITER3 | PENDING | PENDING | I1 §2.3 + run `33116493744` |
| ASEGURADORAS_PRIMARY_RUNTIME | PASS_UNIQUE | `aseguradoras.js` `9c0ea8d…` | módulo canónico; edit owner delega CRUD | Admin-family + Operativo; restricciones/extras | CRUD/audit; credencial segura separada | ITER3 | PENDING | PENDING | I1 §2.4 + `842f762…` |
| ASEGURADORAS_OPERATIONAL_DIRECTORY | PASS_UNIQUE | owner `9a3578a…`; bootstrap `41c4a7c…` | operational-directory owner `20260829.1` | Operativo/Admin/AdminTenant/SuperAdmin/Dirección; Asesor NO | READ/reveal; `writesStore:false` | ITER3 | PENDING | PENDING | I1 §2.5 + run `33284848913` |
| OPS_PRIMARY_RUNTIME | PASS_UNIQUE | `ops.js` `c7fc791…`; `ciclo.js` `1809ff7…` | Ops projection + shared cycle owner | Admin-family/Operativo; Asesor own-scope | business/management commands | ITER3 | PENDING | PENDING | I1 §2.6 + F2 |
| LEADS_PRIMARY_RUNTIME | PASS_UNIQUE | `leads.js` `e25b6ea…`; `ciclo.js` `1809ff7…` | Leads projection + shared cycle owner | scoped membership; Asesor own pipeline | lead/business transitions | ITER3 | PENDING | PENDING | I1 §2.7 + F2 |
| POLIZAS_PRIMARY_RUNTIME | PASS_UNIQUE | `polizas.js` `46b197a…`; engine `1309383…` | Policy UI + `Orbit.policyReceipts` | Dirección/SuperAdmin/AdminTenant/Admin/Operativo + explicit extra | idempotent policy + receipt sync | ITER3 | PENDING | PENDING | I1 §2.8 + F2 |
| VEHICULOS_PRIMARY_RUNTIME | PASS_UNIQUE | detail guard `3f4f935…`; engine `1309383…` | canonical policy/vehicle read model | inherited policy/client scope | subordinate to policy workflow | ITER3 | PENDING | PENDING | I1 §2.9 + F2 integrated |
| RECIBOS_CARTERA_PRIMARY_RUNTIME | PASS_UNIQUE | engine `1309383…`; detail `3f4f935…` | `Orbit.policyReceipts` | policy/payment permissions | idempotent non-destructive sync | ITER3 | PENDING | PENDING | I1 §2.10 + F2 integrated |
| COBROS_PRIMARY_RUNTIME | PASS_UNIQUE | `cobros.js` `4c2daaf…`; engine `1309383…` | Cobros UI + payment/reconciliation owner | Dirección/SuperAdmin/AdminTenant/Admin/Operativo/Finanzas + explicit extra | payment apply; reconciliation separate | ITER3 | PENDING | PENDING | I1 §2.11 + F2 |
| ROLE_SCOPE_RUNTIME | PASS_UNIQUE | `access-scope.js` `ea36eb1…` | `Orbit.access` | ALL/team/own ceilings + matrix/extras/restrictions | permission owner; no business write | ITER3 | PENDING | PENDING | I1 §2.12 + F2 cross-tenant deny |
| CROSS_MODULE_RELATIONSHIPS | PASS_UNIQUE | `ciclo.js` `1809ff7…`; policy engine/detail; queries | domain owners, no duplicate store | inherited per domain | delegated idempotent writes | ITER3 | PENDING | PENDING | I1 §2.13 + F2 integrated |
| SINGLE_PRODUCT_ENTRYPOINT | PASS_REFERENCE_IDENTIFIED_RECONSTITUTE_I2 | certified artifact index SHA-256 `125b24a3…` | single clean `index.html` to materialize I2 | N/A | N/A | ITER3 | PENDING | PENDING | I1 §2.14; source index explicitly rejected |
| STARTUP_PERFORMANCE | PASS_REFERENCE_IDENTIFIED_RECONSTITUTE_I2 | hydration `15825fb…`, PWA `c7fd770…`, router `480f408…`, store `98b75ec…`, SW `195b690…` | auth→membership→hydration→router/app; PWA non-blocking | membership after auth | no business write owner | ITER3 | PENDING | PENDING | I1 §2.15 + run `33315372521` |

## Test individual obligatorio — gates posteriores

Para cada fila:
1. ruta/carga;
2. build/version exacta;
3. última UI aprobada;
4. datos sin `undefined/NaN`;
5. acción principal;
6. persistencia/recarga si aplica;
7. permisos por rol;
8. relaciones/dependencias;
9. 404/page/console errors;
10. responsive aplicable.

## Frontera actual

Iteración 1 queda cerrada con lineage unívoco `15/15`. Iteración 2 debe materializar clean source, owner reachability, index único, startup/performance y contratos de escritura; no se ha ejecutado todavía.

## Gate preview

Ninguna capability permite avanzar desde Preview mientras no alcance `LATEST_APPROVED_VERSION_PREVIEW_PASS`.

## Gate live previo a datos

Después de promover el mismo artifact a producción, repetir el test individual sobre producción. Ningún refresh de datos agosto puede iniciar mientras exista una fila Fase A sin `LATEST_APPROVED_VERSION_LIVE_PASS`.
