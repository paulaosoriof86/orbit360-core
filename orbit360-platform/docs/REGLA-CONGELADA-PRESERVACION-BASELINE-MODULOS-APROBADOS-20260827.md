# REGLA CONGELADA — PRESERVACIÓN DE BASELINE Y VALIDACIÓN VISUAL POR MÓDULO

Fecha: 2026-08-27  
Proyecto: Orbit 360 / A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Regla vinculante

La referencia de producto para la validación post-go-live es la candidata certificada y desplegada:

- artifactId `9504702901`;
- sourceHead `8c9668d6d423e82826b0295431ec699390d79b4b`;
- manifest SHA-256 `b1c98c1faf644b5d83cfe6e6bb1a602927c438cd85b7855cb0b1a6b98c08053c`;
- ZIP SHA-256 `4a3660a18229a923412aa5a1bffc0817b1d5666c83ba96c81c92cea0fce9491c`;
- 194 archivos certificados, 189 públicos y 53 scripts bajo `modules/`.

> **Módulo trabajado/aprobado + misma baseline certificada = preservar, no reconstruir.**

Una anomalía visual no autoriza a:

- rediseñar o reconstruir el módulo;
- reimportar sus datos;
- volver a investigar desde cero su proceso funcional;
- sustituir owners o contratos ya cerrados;
- reabrir un gate histórico.

Primero se diagnostica el delta contemporáneo entre la baseline aprobada y lo que se visualiza: acceso, rol/scope, wiring, owner, store/readiness, proyección, cache/service worker, contrato de datos o validador.

## Protección mecánica

Autoridad de preservación:

- registry: `orbit360-platform/docs/orbit360-certified-product-preservation-registry-v20260827.json`;
- guard: `tools/orbit360-certified-product-preservation-v20260827.mjs`;
- workflow canónico: `.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml`;
- invariant: `tools/orbit360-single-state-invariant-v20260827.mjs`.

El guard falla cerrado si detecta un cambio no aprobado desde `8c9668d6...` en:

- `orbit360-platform/modules/`;
- `orbit360-platform/core/`;
- `orbit360-platform/data/`;
- `orbit360-platform/styles/`;
- `orbit360-platform/index.html`;
- `orbit360-platform/product-runtime-config.js`;
- `orbit360-platform/sw.js`.

Un cambio funcional intencional solo puede continuar cuando se convierta explícitamente en una nueva baseline aceptada; no se absorbe silenciosamente.

## Qué significa “aprobado” en esta regla

Todos los módulos y bridges presentes en la candidata certificada se consideran **baseline aprobada para preservación y regresión visual**. Esta regla no reescribe retrospectivamente la madurez histórica de integraciones/backend que la documentación haya marcado como posterior; evita que un módulo trabajado sea tratado como vacío o vuelva a diseñarse por una falla de visualización.

## Método de validación post-go-live

Para cada módulo:

1. probar identidad de baseline source-only;
2. probar owner/wiring/contrato semántico vigente cuando exista owner específico;
3. abrir el módulo en la sesión humana productiva;
4. comparar lo visible contra el aprobado, no contra una reconstrucción nueva;
5. si coincide, conservar `PASS_PRESERVED` y avanzar;
6. si no coincide, clasificar la primera divergencia;
7. corregir únicamente la capa causal;
8. volver a visualizar ese módulo antes de avanzar.

No se acumulan módulos invisibles para revisarlos todos al final. La validación es incremental y visible.

## Secuencia inicial

`Aseguradoras → Cliente 360 → Pólizas → Vehículos → Recibos/cartera → Cobros → Ops → Leads → resto de superficies`.

Aseguradoras ya cuenta además con guard semántico específico del owner `20260723.2`.

## Regla sobre gates y falsos PASS

Un PASS histórico conserva valor, pero si se demuestra que el validador no comprobaba el comportamiento exigido se clasifica `VALIDATOR_STALE` y se corrige el mecanismo antes de tocar producto. El PASS técnico previo no se usa para negar una anomalía visual reproducible ni la anomalía visual se usa para reconstruir el módulo.

## Estado operativo

Este documento no replica fase, revisión, autorización ni siguiente acción. El estado vivo continúa exclusivamente en `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`.

No autoriza runtime, browser, secrets, Firestore, writes, deploy, producción, `main` ni merge.
