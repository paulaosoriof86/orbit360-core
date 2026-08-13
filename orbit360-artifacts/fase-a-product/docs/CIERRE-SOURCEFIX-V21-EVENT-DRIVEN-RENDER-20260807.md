# Cierre sourcefix v21 — Event-driven render observability — 2026-08-07

## Bloque

Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`.
Base autorizada: `68667075e00654a4df216f0ce6e7417f041fe837`.
Carril: B — control-plane/validator/observabilidad.
Cliente 360 y backend protegido: congelados, sin cambios funcionales.

## Causas raíz tratadas

1. `VALIDATOR_STALE / RENDER_READY_POLLING_BLOCKED_BY_TARGET_LONG_TASK`.
2. `PIPELINE_MECHANISM_FAILURE / OUTER_MATRIX_CATCH_OVERWRITES_VALIDATOR_STALE_AS_FUNCTIONAL_DEFECT`.

v20 demostró que Cliente 360 tenía hidratación requerida lista antes de navegar y que la pantalla estaba renderizada al recuperar ejecución, pero `page.waitForFunction()` no pudo observar el estado mientras el hilo principal estuvo ocupado. Además, el catch exterior heredado sobrescribía `VALIDATOR_STALE` con `FUNCTIONAL_DEFECT` por la presencia del token `_TIMEOUT`.

## Implementación source-only v21

- Nuevo owner de artefacto exacto: `tools/orbit360-build-v21-event-driven-matrix-artifact-v20260807.mjs`.
- El observer de render se arma antes de `NAVIGATE` y antes de cambiar `location.hash`.
- La finalización se detecta mediante `MutationObserver` + evento `orbit360:v21-render-complete`; no existe polling post-navegación de render-ready.
- La hidratación requerida conserva su validación antes de navegación.
- En PASS y en STOP se persiste el diagnóstico disponible de la ruta: `renderMs`, `afterRenderMs`, `totalWithAfterRenderMs`, `summaryCacheMs`, `summaryAggregateMs`, `rowsBuildMs`, `innerHtmlMs`, `bindingsMs`, `totalMs`, `renderedRows`, `pageSize` y `writes`.
- Timeout con estado posteriormente listo => `VALIDATOR_STALE / VALIDATOR_STALE_RENDER_SIGNAL_POST_READY`.
- Timeout con estado realmente no listo => `FUNCTIONAL_DEFECT / FUNCTIONAL_RENDER_EVENT_TIMEOUT_NOT_READY`.
- El catch exterior solo clasifica cuando no existe una clasificación especializada previa.
- El wrapper compila e importa exactamente el artefacto que usará runtime antes de ejecutarlo.

## Evidencia source

Run inicial v21: `31210077978`, job `92970537484`.
Resultado: `PASS_V21_EVENT_DRIVEN_RENDER_SOURCE_ONLY`, 39/39.
Artefacto: `orbit360-visual-observable-rootfix-matrix-v21-event-driven-render-gated`.
SHA-256: `e3c8d6dec7c102aea7c69db253c1f3fdda59ad8348b796b4f62f76ea4fded189`.

Fixture long-task:
- required hydration antes de navegación: PASS;
- observer armado antes de navegación: PASS;
- polling calls: 0;
- completion por mutation: PASS;
- tiempo de render medido: PASS;
- bounded rows: 40;
- writes: 0;
- post-ready timeout => VALIDATOR_STALE: PASS;
- realmente no-ready => FUNCTIONAL_DEFECT: PASS;
- outer catch no sobrescribe clasificación especializada: PASS.

Suites rectoras del run inicial:
- request/lifecycle: 17/17 PASS;
- watchdog: 19/19 PASS antes de actualizar owner;
- Windows signal: 7/7 PASS;
- signal-safe: 48/48 PASS;
- cross-runner: 24/24 PASS;
- preflight: 37/37 PASS;
- transport base SHA: 12/12 PASS.

Se detectó un `VALIDATOR_STALE` no bloqueante de producto: el watchdog aún declaraba al builder v20 como owner. Producto quedó congelado y se actualizó exclusivamente el validator para que el owner vigente sea v21. El relay v20 fue retirado y el sourcecheck v20 quedó marcado como histórico, sin evaluar el wrapper vigente.

## Fronteras

Source-only: sin secretos, Firebase, Hosting, navegador real, Firestore/Auth/operational writes, Functions, Rules, reimportación, producción, main o merge.

`PASS_VISUAL_POST_AUTH` permanece NO hasta ejecutar y aprobar la matriz runtime de los tres roles.
