# Orbit 360 A&S — Cierre sourcefix v23 · matriz nativa Block 1

Fecha: 2026-08-07  
Bloque: 1 — Cliente 360 + Aseguradoras  
Gate único: `block1-client360-insurers-lab-v20260717`  
Owner canónico candidato: `1.0.41`  
Owner histórico reemplazado: `1.0.40` CSS delivery, preservado como evidencia  
Base autorizada: `ef9e0e1e738ce407025ed159067d8b3cc4d2683b`  
Rama source: `ays/source-v23-native-block1-matrix-20260807`

## Causas raíz

v22 se detuvo source-only después de dos fallos en la misma etapa exact-artifact:

`PIPELINE_MECHANISM_FAILURE / CHAINED_TEXTUAL_TRANSFORM_ON_GENERATED_MATRIX_ARTIFACT`

v23 eliminó ese mecanismo. Su primer source run `31217970336` demostró **29/29 PASS** del package nativo, pero el preflight canónico obligatorio quedó en STOP porque todavía exigía el owner histórico de CSS delivery `1.0.40`, tokens de Service Worker de julio y `FREEZE_M1_OPEN`, aunque el freeze vivo ya registra M1 y M2 cerrados. Ese segundo diagnóstico es:

`VALIDATOR_STALE / CANONICAL_BLOCK1_PREFLIGHT_OWNER_VERSION_FREEZE_DRIFT`

La corrección no toca `sw.js`, PWA, Cliente 360, Aseguradoras, Pólizas, Cobros ni backend protegido para satisfacer el validador viejo. El mismo `gateId` Block1 cambia de owner activo a `1.0.41`; el owner CSS `1.0.40` queda histórico.

## Arquitectura v23

- entrypoint canónico exacto de runtime: `tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs`;
- implementación nativa: `tools/orbit360-block1-native-matrix-v23-v20260807.mjs`;
- observabilidad event-driven compartida por API: `tools/orbit360-event-driven-render-observer-v23.mjs`;
- engine canónico Block1: `tools/orbit360-validar-gate-contracts-engine-block1-v23-native-v20260807.mjs`;
- entrypoint obligatorio de gates: `tools/orbit360-validar-gate-contracts-v20260717.mjs`;
- adjudicador read-only: `tools/orbit360-adjudicate-block1-universe-readonly-v23-v20260807.mjs`;
- overlay del único gate Block1: `tools/orbit360-gate-contract-block1-v23-native-v20260807.json`;
- lifecycle v23: `tools/orbit360-validator-lifecycle-block1-v23-native-v20260807.json`;
- preflight v23: `tools/orbit360-preflight-block1-v23-native-v20260807.mjs`;
- transición source→runtime: `tools/orbit360-transition-block1-v23-source-to-runtime-v20260807.mjs`;
- browser precheck: `tools/orbit360-block1-v23-browser-precheck-v20260807.mjs`;
- runner signal-safe: `tools/orbit360-run-block1-v23-runtime-signal-safe-v20260807.sh`;
- cierre/consume/freeze: `tools/orbit360-close-block1-v23-runtime-v20260807.mjs`.

El entrypoint runtime `1.0.41` importa la implementación nativa y fija la identidad contractual final; no genera código, no transforma strings, no aplica regex/slices/replaces y no hace source surgery. El source gate compila e importa exactamente ese entrypoint.

## Scope bloqueante exacto

Únicamente:

1. Inicio/Auth/sesión/membership.
2. Legal real una vez e idempotencia del mismo scope.
3. Multirol/scopes y menú móvil.
4. Cliente 360: lista acotada, ficha, calidad, relaciones vacías honestas cuando exista caso visible en el scope efectivo.
5. Aseguradoras: directorio, ficha, conocimiento y solo lectura del Asesor.
6. Cero copy técnico visible.
7. Responsive.
8. Observabilidad event-driven.
9. Snapshot before/after idéntico y cero writes.

Fuera del gate bloqueante y preservado solamente en ledger posterior:
`polizas`, `cobros`, `ops`, `leads`, `conciliaciones`, `cancelaciones`, `vehicle-detail-button`, `receipt-detail-button`, `cobro-detail-button`.

## Universo contractual

Objetivo: 414 clientes / 26 aseguradoras / 7 asesores.

El adjudicador v23 no ajusta cifras artificialmente. Solo puede excluir del universo efectivo con evidencia objetiva:
- duplicado fuerte;
- histórico/inactivo explícito;
- fuera de universo efectivo.

`requiere_validación` se conserva dentro del conteo efectivo. Cualquier diferencia no reconciliada produce `VALIDATOR_STALE` o `DATA_CONTRACT_FAILURE` y detiene antes de Hosting.

## Seguridad y autorizaciones

Source-only mantiene:
- request v23 ausente;
- secretos 0;
- Firebase LAB 0;
- Hosting 0;
- browser real 0;
- Firestore/Auth/operational writes 0;
- reimportación 0;
- Functions/Rules 0;
- producción/main/merge 0.

Solo source PASS permite cambiar lifecycle a `SOURCE_VALIDATED_READY_FOR_RUNTIME_TRANSITION`, registrar evidencia terminal source y ejecutar la transición explícita. La transición falla si el request ya existe; después habilita runtime-pending y solo entonces puede crearse un único request v23 nuevo e inmutable.

Runtime debe obtener `GO_GATE_CONTRACT` antes de secretos. La adjudicación 414/26/7 ocurre después de GO y antes de instalar/usar Hosting o Playwright. Solo con PASS se restaura `visual-matrix-corrected-backup-31135532118`, se crea backup, se permite máximo un deploy Hosting LAB, precheck y matriz.

## Estado de evidencia

Primer source run `31217970336`:
- exact native package: 29/29 PASS;
- producto/backend protegido congelado: PASS;
- request ausente: PASS;
- runtime: no ejecutado;
- fallo: preflight canónico histórico `1.0.40`.

La evidencia source vigente se registra en:
`orbit360-platform/runtime-gate-crm-v20260716/v23-native-block1-source-sanitized-v20260807.json`.

Este documento no declara PASS terminal antes de que GitHub Actions valide el HEAD source final con owner canónico `1.0.41`.

## Clasificación

- mecanismo v22: `PIPELINE_MECHANISM_FAILURE`;
- preflight histórico: `VALIDATOR_STALE`;
- patrón reusable: `REPLICABLE_CLAUDE_ACUMULADO`;
- backend/control-plane: `BACKEND_PROTEGIDO_NO_CLAUDE`;
- adjudicación real A&S: `TENANT_AYS_ONLY`;
- Academia: `ACADEMIA_ACTUALIZAR`.

## Carriles

A — frontend/UX: producto congelado; solo se observa conducta ya existente.  
B — backend/control/seguridad: artefacto nativo + API event-driven + owner canónico 1.0.41 + lifecycle fail-closed.  
C — datos/migración: adjudicador 414/26/7 preparado read-only, sin payload real en repo.

## Siguiente acción

Ejecutar una sola validación source final del package 1.0.41. Si vuelve a fallar la misma familia `CANONICAL_BLOCK1_PREFLIGHT_OWNER_VERSION_FREEZE_DRIFT`, aplicar STOP_RETRY sin tercer ajuste. Si obtiene PASS, cerrar evidencia source, fast-forward canónico sin merge a main, transición runtime-pending y request v23 exclusivo.
