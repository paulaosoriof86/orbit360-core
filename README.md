# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence` en el live-state;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CIERRE-R2-REQUIRED-OPTIONAL-PASS-DYNAMIC-ASSET-GAP-20260814.md`;
6. `orbit360-platform/CHANGELOG-R2-GOLIVE-20260814.md`;
7. fuentes históricas solo para reglas no sustituidas por evidencia posterior.

No usar este README, CHANGELOG histórico, PENDIENTES o memoria de otra conversación como sustituto del live-state.

## Estado vivo · R2 cerrado · 2026-08-14

```text
stateVersion: 20260814.r2-required-optional-pass-dynamic-asset-gap.1
previousStateVersion: 20260814.r1-rootcause.1
fase: PRE_GOLIVE_R3_DURABLE_PACKAGE
RC: RC-AYS-LAB-CANONICA-01
candidata funcional canónica preservada: 4ede3e785cb2cc889a7c11c2d9e2030c7af20b64
HEAD R2 ejecutado: 8816f1e1119150f993a79fd56de33c104c29ecec
PR #5: draft/open
main/merge: no
HostDime blocker actual: no
paquete durable definitivo: todavía no
producción tocada por R2: no
```

## R2 · resultado certificado

Workflow: `Orbit360 Fase A Product Local Synthetic 20260814`  
Run: `31822262972`  
Job: `94838064587`

La causa de R1 quedó corregida:

```text
bootstrap: environment -> authentication -> membership -> planning -> attaching -> waiting-snapshots -> installing -> ready-read-only
productApp.started: true
routerStarted: true
required collections: 7/7
requiredMissing: 0
requiredFailed: 0
clientes: 430
aseguradoras: 30
writes: 0
deploy: 0
productionTouched: false
```

Required canónicas:

`clientes, polizas, cobros, aseguradoras, vehiculos, recibosEsperados, carteraPrimas`

Optional/legacy no bloqueantes:

`asesores, metas, negocios, gestiones, comisiones, cancelaciones`

CERRADO:

`DATA_CONTRACT_FAILURE / PRODUCT_RUNTIME_COLLECTION_POLICY_MISMATCH`

## Nuevo blocker vigente

El workflow global terminó FAIL **después** de que Product App y el store estaban listos. El harness venció esperando `#host` visible mientras `core/router.js` todavía resolvía contratos runtime mediante `import()` dinámico. La evidencia registró un 404 local de un JS bajo `/core/`.

Clasificación vigente:

`PIPELINE_MECHANISM_FAILURE / PRODUCT_DYNAMIC_RUNTIME_ASSET_GAP`

El builder debe incorporar de forma reproducible los assets dinámicos que el router necesita y el gate source-only debe detectar cualquier omisión antes de secrets/browser.

## Siguiente acción exacta · R3

R3 conserva su propósito de paquete durable e incorpora este cierre de ensamblaje:

- derivar assets dinámicos desde `core/router.js` y `data/tenant-runtime-config-index.js`;
- copiarlos source→artifact sin hardcodear secretos/datos;
- ampliar validación source-only para que un dynamic asset faltante bloquee antes del navegador;
- ejecutar una sola prueba local esperando una señal real de router/render;
- con PASS, materializar ZIP durable + manifest + hashes en la misma frontera;
- HostDime y `app.aysseguros.com` siguen después, en R4.

## Porcentajes vigentes

```text
readiness funcional de candidata: 100%
avance por iteraciones hacia producción: 50% (R1+R2, 2/4)
gates finales cerrados: 0% (0/3)
R3 PASS -> 75% iteraciones / 67% gates
R4 PASS -> 100% / 100%
```

R2 cuenta como iteración cerrada porque su rootfix objetivo quedó demostrado. Los gates no suben todavía porque el artifact no está certificado como paquete durable/renderizable.

## Reglas anti-bucle

- una sola frontera larga por iteración;
- checkpoint durable antes de runtime/browser/deploy;
- al terminar la frontera: detener, leer, clasificar y sincronizar;
- si la misma familia falla dos veces: `STOP_RETRY`;
- no buscar paquetes antiguos: el durable se construye desde source certificado;
- HostDime no vuelve a ser diagnóstico antes de R4;
- no reabrir módulos cerrados sin evidencia nueva reproducible;
- producción no se usa para depurar validators;
- cada cambio de estado sincroniza `live-state` + PR #5 + README + checkpoint y bitácora correspondiente.
