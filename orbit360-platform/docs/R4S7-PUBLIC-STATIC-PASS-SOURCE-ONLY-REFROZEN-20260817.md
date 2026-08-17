# Orbit 360 A&S — R4S7 pública exacta · static PASS · source-only refrozen

Fecha: 2026-08-17  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open · sin merge a main

## 1. Identidad pública cerrada

R4S7 durable certificada:
- artifact `9287314053`;
- ZIP `orbit360-fase-a-product-r4s7-ce9792e3e4e3.zip`;
- ZIP SHA256 `4c249faa4ccf05d0bb0bc8fa4b8bb5dca07de17838cd9fb4816c5eb15b66944a`;
- source `ce9792e3e4e37b298d2eda6f65983c683d66a3a3`;
- manifest `FASE_A_PRODUCT_R4S7_MINIMAL_SUCCESSOR_CERTIFIED`;
- manifest SHA256 `8f74f310ae8b56aa005ac7388c38db717960f0fe70c5ae4e0ef3347c72c03de4`;
- 194 archivos · 1 delta de producto · 193 archivos byte-idénticos a R4S6 · 0 deltas inesperados.

Publicación HostDime confirmada por extracción manual indispensable en `/home/ayssegur/public_html/app.aysseguros.com`.

Verificación pública estática:
- run `32046719733`;
- job `95436222939`;
- resultado **SUCCESS**;
- evidence artifact `9293141915`;
- digest `a3b52e12db151a0260e217549d8200cc5a85639c0c55f75893bb6eaab566915d`.

PASS byte a byte para manifest/source, `index.html`, access scope, Auth product, `core/queries.js`, `core/client-insurer-visual-contract-v20260720.js`, `modules/cliente360.js` y policy owner. Canonical gate PASS antes y después.

## 2. Rebind/refreeze source-only R4S7

La identidad del smoke se movió de R4S6 a la R4S7 pública exacta en **un solo commit atómico**:

`28a3192b53240b7f471caa8a0bacf3cad85d6d2a`

Archivos del commit:
1. `.github/workflows/orbit360-r4-certified-product-readonly-smoke-v20260815.yml`;
2. `tools/orbit360-r4-certified-product-contract-v20260815.json`;
3. `tools/orbit360-r4-certified-product-smoke-wrapper-v20260815.mjs`.

Binding final:
- source `ce9792e3e4e37b298d2eda6f65983c683d66a3a3`;
- artifact `9287314053`;
- ZIP SHA256 `4c249faa4ccf05d0bb0bc8fa4b8bb5dca07de17838cd9fb4816c5eb15b66944a`;
- manifest R4S7 exacto;
- client visual SHA `573a45da2f7dae3803e8dff86ff651ba58f5be507cf85b04a80863ac15bb4390`;
- `ORBIT360_R4_CERTIFIED_SOURCE_ONLY='true'` conservado.

Smoke source-only:
- run `32047574521`;
- job `95438907063`;
- resultado **SUCCESS**;
- evidence artifact `9293434989`;
- digest `d6193abe5a14e4d7f954e80c4ce5a15943e060292d7df1f9cd757a19752a25cd`.

PASS:
- canonical product-contract gate;
- role-route attribution;
- team/own scoped relational regression;
- bounded corrected harness/watchdog.

SKIPPED por source-only:
- instalación de browser;
- binding de secretos;
- resolución de identidad protegida;
- ejecución runtime/browser frontier.

Firestore/Auth/operational writes: `0/0/0`.

## 3. Incidentes de mecanismo durante el refreeze

No afectaron producto ni producción:

1. Run `32046837035`: `PIPELINE_MECHANISM_FAILURE / TRACKED_PREFLIGHT_EVIDENCE_COUNTED_AS_REBIND_DELTA`. El gate canónico modificó `preflight-sanitizado.json`; la guardia lo contó como cuarto delta. No hubo commit/push del rebind.
2. Run `32046900850`: la guardia corregida produjo localmente el commit exacto de 3 archivos, pero GitHub Actions rechazó el push porque su token no tenía permiso `workflows`. Clasificación: `PIPELINE_MECHANISM_FAILURE / ACTIONS_TOKEN_WORKFLOW_WRITE_FORBIDDEN`. No hubo cambio de rama.
3. La salida se cerró sin reintentar ese transporte: se renderizaron los tres archivos source-only y el conector GitHub construyó tree+commit+fast-forward atómico `28a3192b...`.

No se modificó ningún archivo de producto durante estos incidentes.

## 4. Estado actual

- R4S7: **pública exacta y static PASS**;
- rootfix Cliente 360: incluido en R4S7 pública;
- smoke: **R4S7-bound / SOURCE_ONLY=true / PASS**;
- browser/runtime: congelados;
- Auth, datos, Rules, store: sin cambios;
- main/merge: sin cambios;
- Gate 3 runtime: **abierto**.

Progreso:
- implementación funcional: 100%;
- iteración técnica: 99%;
- gates go-live: 2/3 = 67%.

## 5. Siguiente frontera

Requiere autorización separada: **una única matriz runtime read-only sobre la R4S7 pública exacta**. Debe validar primero el binding R4S7, luego Dirección desktop → Cliente 360 → Aseguradoras, Operativo tablet y Asesor móvil; exigir 430 clientes, 30 aseguradoras, roles/scopes correctos, cero copy técnico, cero errores browser/HTTP y cero escrituras. Ante cualquier STOP, no segundo intento: clasificar causa raíz y refreeze inmediato source-only.
