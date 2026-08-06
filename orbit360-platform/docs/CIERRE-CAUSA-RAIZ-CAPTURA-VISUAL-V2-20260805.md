# CIERRE DE CAUSA RAÍZ — CAPTURA VISUAL V2 — 2026-08-05

## Resultado gobernante

```text
run: 31067506016
clasificación: PIPELINE_MECHANISM_FAILURE
último checkpoint exitoso: DIRECCION_ROUTE_INICIO_PASS
checkpoint exacto de fallo: DIRECCION_SCREENSHOT_FULLPAGE_TIMEOUT
GO_GATE_CONTRACT: 26/26 PASS
backup Hosting: PASS
Hosting LAB deploys: 1
precheck: PASS · INICIO_READY_PASS
Dirección / Inicio: PASS
matriz completa: NO
rollback Hosting: PASS
snapshot: VERIFIED_UNCHANGED
Firestore/Auth/operational writes: 0
Functions/Rules/reimport/production/main/merge: 0
```

## Causa raíz

La plataforma había cargado Dirección/Inicio correctamente. El fallo ocurrió después, cuando el capturador intentó producir una imagen `fullPage`. Playwright agotó 30 segundos en `page.screenshot` y el owner trató una evidencia auxiliar como condición bloqueante de toda la matriz.

Owner exacto:

```text
tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs
capture(page, name)
page.screenshot({ fullPage: true })
```

No se atribuye a Auth, membresía, tenant, hidratación, datos, Rules ni Inicio.

## Correctivo source-only

```text
PASS_VISUAL_CAPTURE_SOURCEFIX
20/20 controles PASS
captura: viewport acotado
límite: 12000 ms
animaciones: deshabilitadas
fallo de captura: advertencia no bloqueante
runtime/deploy/secrets/Firestore: 0
```

La autorización del run fue consumida. No existe autorización para otro navegador o deploy. `PASS_VISUAL_POST_AUTH` continúa pendiente.
