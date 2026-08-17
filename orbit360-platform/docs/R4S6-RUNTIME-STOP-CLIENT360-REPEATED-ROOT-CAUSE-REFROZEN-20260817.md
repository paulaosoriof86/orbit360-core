# Orbit 360 A&S — R4S6 runtime STOP repetido Cliente 360 · checkpoint supersedido

Fecha: 2026-08-17  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

Este checkpoint registró el STOP repetido de R4S6 en `Dirección → Cliente 360` y el refreeze source-only posterior. Su diagnóstico inicial quedó **supersedido y ampliado** por nueva evidencia source-only.

La familia causal completa confirmada es:

`CLIENT_PROJECTION_FULL_CLIENT_NATIVE_CLONE_REPEATS_ACROSS_ROLE_SCOPE_CLIENTE360_BATCH_AND_VISUAL_ENHANCER`.

El cierre vigente está en:

`orbit360-platform/docs/R4S6-CLIENT-PROJECTION-CONSECUTIVE-READ-ROOTFIX-SOURCE-PASS-20260817.md`.

Estado vigente:
- root cause source-only confirmado;
- rootfix source-only PASS en commit `ce9792e3e4e37b298d2eda6f65983c683d66a3a3`;
- owner nuevo SHA256 `573a45da2f7dae3803e8dff86ff651ba58f5be507cf85b04a80863ac15bb4390`;
- R4S6 pública permanece sin cambios y todavía no contiene este rootfix;
- browser/runtime continúan congelados;
- siguiente frontera: construir/certificar una sucesora mínima de R4S6 antes de cualquier publicación o nueva matriz runtime.
