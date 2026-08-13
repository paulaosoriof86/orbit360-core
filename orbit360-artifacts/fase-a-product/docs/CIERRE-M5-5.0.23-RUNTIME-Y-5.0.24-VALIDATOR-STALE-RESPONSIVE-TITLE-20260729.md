# Orbit 360 A&S — Cierre M5 5.0.23 runtime y 5.0.24 remediación responsive-title

Fecha: 2026-07-29

## Estado

- Rama: `ays/backend-tenant-lab-v99-20260703`
- PR #5: draft/open
- RC preservada: `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`
- Producción/main/merge/Functions/Rules/Pólizas: no ejecutados.
- Revisión visual: bloqueada hasta runtime sanitizado `ok:true`.

## Runtime one-shot 5.0.23 / candidata 5.0.22

Package PASS:
- commit `d81aacb48305e32699047cdaa07ca8e5152eae7d`
- run `30478173184`
- job `90665049424`
- artifact `8734473232`
- digest `sha256:642354242c6008fd106789e484ed8a71b912b1fb0f008956a5399a74fe149fab`

Request:
- parent autorizado `85bdb6b2cd1cd9193e1421924f1ad7035a1829fd`
- request commit `30b90e017b126a6924fd649880916cb59ae75e3d`

Runtime:
- run `30478442538`
- job `90665957818`
- artifact `8734620508`
- digest `sha256:3cf7ebbafcb910306d1eb092dfc11ca168d6434976812db79edbd1dc47c97524`
- primer fallo: `RESPONSIVE_TITLE_INVALID:desktopDirectionInsurers`
- snapshots: 11/11 antes + 11/11 después
- counts stable: true
- digests stable: true
- Firestore writes: 0
- operational writes: 0
- network write candidates: 0
- semantic technical-copy predicate ready: true
- policy owner ready: true

La autorización fue consumida. No hubo rerun.

## Causa raíz

Clasificación: `VALIDATOR_STALE`.

El validador 5.0.22 buscaba el título solo mediante:

`.mod-band .mb-tt h2,.fichahdr h2,.m1-asg-hero h2`

La ficha vigente de Aseguradoras renderiza el nombre visible dentro de `#asg-ficha` como un `div` con `font-size:20px` y `font-weight:800`. El selector devolvía `null`, por lo que `titleVisible=false` y se disparaba `RESPONSIVE_TITLE_INVALID` sin demostrar overflow ni salida de viewport.

No se modificó producto ni CSS.

## Remediación estática 5.0.24

Se creó contrato reusable:
- `tools/orbit360-responsive-title-resolver-contract-v20260729.json`
- versión `20260729.1`

Regla:
1. resolver primero encabezados semánticos estándar;
2. cuando una ficha tenga título semántico sin tag heading, usar scope explícito + texto exacto esperado;
3. exigir elemento visible, tamaño >=18px y peso >=600;
4. solo entonces validar viewport y overflow.

Candidata runtime nueva:
- `tools/orbit360-m5-runtime-smoke-525-browser-v20260729.mjs`
- `tools/orbit360-m5-runtime-smoke-525-close-v20260729.mjs`
- contrato futuro `5.0.25`
- no ejecutada.

Evidencia 5.0.24:
- commit `c5f47810af0a93b7ffff6948fa4b130bde8ca254`
- run `30479419241`
- job `90669279075`
- artifact `8734965129`
- digest `sha256:4d828c04083765fe669c38aed1dbc90cc07a860fc6d7183c4a8ce56eb7e1e960`
- checks `28/28`
- failed `0`
- historical 5.0.22 untouched: true
- product protected unchanged: true
- product defect demonstrated: false
- runtime/browser/Firestore/secrets/deploy: false/0

Workflow 5.0.24 quedó congelado después del PASS.

## Carriles

- A frontend/UX/Academia: no se modificó UI; se corrigió únicamente cómo el gate identifica semánticamente un título visible.
- B backend/seguridad/store: sin cambios; cero escrituras.
- C datos reales/migración: baseline preservado 414 clientes, 26 aseguradoras, 7 asesores; no hubo migración ni reimportación.

## Claude

`REPLICABLE_CLAUDE_ACUMULADO`:
- validar significado visual y no un tag HTML específico;
- resolver títulos por scope + texto exacto cuando el componente no usa heading semántico;
- no convertir ausencia de selector en evidencia de overflow;
- mantener fixtures y evidencia de producto protegido intacto.

Backend, secretos y datos reales: no Claude.

## Academia

Actualizar diferencia entre `FUNCTIONAL_DEFECT` y `VALIDATOR_STALE`, incluyendo:
- selector obsoleto vs defecto visual real;
- título semántico vs tag HTML;
- validación de viewport solo después de resolver el elemento correcto;
- autorización one-shot, snapshots y stop-line sin rerun.

## Siguiente acción exacta

Solicitar nueva autorización explícita e independiente para una sola ejecución runtime LAB de candidata `5.0.25`, read-only con snapshots antes/después y cero escrituras. Solo un `ok:true` habilita la revisión visual única de M5.
