# Cierre sourcefix v19 — Cliente 360 bounded render — 2026-08-07

## Bloque
Bloque visual post-Auth · Cliente 360 · source-only v19.

## Fuente / baseline
- HEAD autorizado: `a0de0846c1d42e77ff3b5d132ddd7545945161ef`.
- v18: consumido/frozen, sin replay.
- Evidencia v18: Cliente 360 terminaba renderizado con fuentes required listas, pero el probe required estaba bloqueado detrás del render síncrono.

## Clasificación de causa raíz
- `FUNCTIONAL_DEFECT / CLIENTE360_SYNCHRONOUS_RENDER_MAIN_THREAD_STALL`.
- `VALIDATOR_STALE / REQUIRED_HYDRATION_PROBE_COUPLED_TO_TARGET_RENDER`.

## Implementación v19
1. Cliente 360 limita la primera ventana a 40 filas y conserva total, filtros, KPIs y deep-links.
2. La lista usa el índice `clientesResumenIndex` para los resúmenes y no reconstruye cada resumen durante el primer frame.
3. Diagnóstico separa `summaryCacheMs`, `summaryAggregateMs`, `rowsBuildMs`, `innerHtmlMs`, `bindingsMs`, `totalMs`, además de `afterRenderMs`.
4. La matriz verifica `OrbitHydrationContractDiagnostics.status(target).ready` antes de cambiar el hash.
5. Después de navegar valida únicamente `RENDER_READY` y persiste métricas por ruta.
6. Si el probe de render expira pero al recuperar control la ruta está lista y renderizada, clasifica `VALIDATOR_STALE_RENDER_PROBE_BLOCKED`.
7. No se aumentaron timeouts para ocultar la causa raíz.

## Evidencia source-only
Fixture equivalente a 430 clientes y 1,375 pólizas:
- primera ventana: 40 filas;
- páginas: 11;
- `summaryIndexCalls`: 1;
- `fallbackSummaryCalls`: 0;
- deep-links preservados;
- filtros preservados;
- cero writes.

Resultado: `PASS_V19_CLIENTE360_BOUNDED_RENDER_SOURCE_ONLY` · 16/16.

Suites rectoras:
- request/lifecycle: 17/17 PASS;
- capture watchdog: 17/17 PASS;
- Windows: 7/7 PASS;
- signal-safe: 48/48 PASS;
- cross-runner: 24/24 PASS;
- preflight: 37/37 PASS;
- transport base SHA: 12/12 PASS.

## Carriles
- A frontend/UX: avance visible — Cliente 360 ya no exige construir 430 filas para mostrar la primera vista.
- B backend/control-plane: readiness required desacoplado del render y evidencia route-aware; no se modificó backend durable.
- C datos/migración: sin cambios, reimportación ni escrituras.

## Seguridad
Source-only: secretos 0, Firebase 0, Hosting 0, navegador 0, deploy 0, Firestore/Auth/operational writes 0.

## Estado
Sourcefix v19: PASS source-only. Runtime v19 todavía requiere transición explícita a runtime-pending, request fresco exclusivo y `GO_GATE_CONTRACT` observable antes de secretos.

`PASS_VISUAL_POST_AUTH: NO` hasta cerrar runtime.
