# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence` en el live-state;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CIERRE-PARCIAL-R3-TENANT-CONTEXT-PASS-ACADEMIA-STATIC-CONTENT-BLOCKER-20260814.md`;
6. `orbit360-platform/CHANGELOG-R3B-GOLIVE-20260814.md`;
7. fuentes históricas solo para reglas no sustituidas por evidencia posterior.

No usar este README, CHANGELOG histórico, PENDIENTES o memoria de otra conversación como sustituto del live-state.

## Estado vivo · R3 parcial · 2026-08-14

```text
stateVersion: 20260814.r3-tenant-context-pass-academia-static-content-blocked.1
previousStateVersion: 20260814.r3-dynamic-pass-tenant-context-blocked.1
fase: PRE_GOLIVE_R3_PRODUCT_READONLY_STATIC_CONTENT_CLOSURE
RC: RC-AYS-LAB-CANONICA-01
baseline funcional preservado: 4ede3e785cb2cc889a7c11c2d9e2030c7af20b64
HEAD segunda frontera R3: 40f184fa0b0758f271701a9d18c93e3d6843b3e2
PR #5: draft/open
main/merge: no
HostDime blocker actual: no
paquete durable definitivo: todavía no
producción tocada: no
```

## Cerrado y NO se reabre

- R1 observabilidad / policy mismatch.
- R2 required/optional: 7/7 required, 430 clientes, 30 aseguradoras, store `ready-read-only`.
- R3 dynamic graph: cierre completo, cero missing y cero LAB runtime en artifact source-gated.
- R3 tenant-context: **PASS** en run `31830646641`.

Tenant-context certificado en ese run:

```text
Product App started: true
routerStarted: true
tenantContextReady: true
tenant source: authenticated-product-membership
backend mode: product-readonly
active tenant insurer config: ready
active tenant config src: data/tenant-alianzas-soluciones-insurers-p10.js
route: inicio
hostChildCount: 1
requiredMissing: 0
requiredFailed: 0
clientes: 430
aseguradoras: 30
local HTTP failures: 0
writes: 0
deploy: 0
productionTouched: false
```

`FUNCTIONAL_DEFECT / PRODUCT_TENANT_RUNTIME_CONTEXT_BRIDGE_MISSING` queda **CERRADO**. No hay tercer intento de esa familia.

## Bloqueo vigente

El único error bloqueante del run `31830646641` fue:

```text
pageError: lecciones
store frame: data/store-firestore-product-readonly-p0.js:73
owner: data/academia-v1230-operational-directory-v20260722.js
```

El owner de Academia declara `staticContentPersistence:'transient_session_only_in_lab'` pero su `apply()` ejecuta `Orbit.store.insert/update` de `lecciones`, `evaluaciones` y `config`. El product-safe router bootstrap todavía lo carga; el store productivo read-only bloquea correctamente esas escrituras y produce el error.

Clasificación vigente:

`PIPELINE_MECHANISM_FAILURE / PRODUCT_BOOTSTRAP_INCLUDES_LAB_ONLY_ACADEMIA_STATIC_CONTENT`

No corregir esto habilitando escrituras ni modificando el store productivo.

## Siguiente acción exacta

- congelar tenant-context/Auth/membership/store/router/dynamic graph como cerrados;
- modificar únicamente la composición del bootstrap productivo para no cargar `data/academia-v1230-operational-directory-v20260722.js` en runtime productivo read-only;
- source-gate antes de secrets y comprobar que ninguna ruta crítica de Fase A depende de ese inyector estático LAB-only;
- ejecutar una sola prueba render para esta **nueva familia**;
- solo con cero pageErrors/local failures, tenant-context aún PASS, 7/7 required, 430/30 y render real, crear manifest + SHA256 verificado + ZIP durable en la misma ejecución;
- si esta misma nueva familia falla por segunda vez: `STOP_RETRY`.

HostDime y `app.aysseguros.com` continúan únicamente después del ZIP durable.

## Porcentajes vigentes

```text
readiness funcional: 100%
avance técnico global: 50% (R1+R2 cerrados; R3 parcial)
gates finales: 0% (0/3)
R3 interno: dynamic graph PASS / no-LAB PASS / tenant-context PASS / router inicio render PASS / pageError FAIL / ZIP pendiente
R3 PASS -> 75% técnico / 67% gates
R4 PASS -> 100% / 100%
```

Los porcentajes globales no suben hasta cerrar R3 con render limpio + paquete durable.

## Reglas anti-bucle

- una sola frontera larga por iteración;
- checkpoint durable antes de runtime/browser/deploy;
- al terminar la frontera: detener, leer, clasificar y sincronizar;
- misma familia dos fallos = `STOP_RETRY`;
- no buscar paquetes antiguos;
- HostDime no es diagnóstico antes de R4;
- no reabrir módulos/familias cerradas sin evidencia nueva reproducible;
- producción no se usa para depurar validators ni composición de paquete;
- cada cambio de estado sincroniza live-state + PR #5 + README + checkpoint + bitácora.
