# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence` en el live-state;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CORTE-FORENSE-ANTIBUCLE-GO-LIVE-20260814.md`;
6. fuentes maestras/addenda históricos solo para reglas no sustituidas por evidencia posterior.

No usar este README, CHANGELOG, PENDIENTES o memoria de otra conversación como sustituto del live-state.

## Estado vivo · 2026-08-14

```text
stateVersion: 20260814.forensic-continuity.1
fase: PRE_GOLIVE_RECOVERY
RC: RC-AYS-LAB-CANONICA-01
producto fuente certificado/auditado: 4ede3e785cb2cc889a7c11c2d9e2030c7af20b64
PR #5: draft/open
main/merge: no
HostDime blocker actual: no
paquete durable definitivo: todavía no
producción tocada por último synthetic: no
```

Última evidencia relevante:

```text
workflow: Orbit360 Fase A Product Local Synthetic 20260814
run: 31773511066
resultado: FAIL seguro fuera de producción
etapa: login
error visible: PRODUCT_APP_NOT_STARTED:PRODUCT_READONLY_BOOTSTRAP_NOT_READY
clasificación inmediata: PIPELINE_MECHANISM_FAILURE / OBSERVABILITY_GAP
writes: 0
deploy: 0
```

## Siguiente acción exacta

Modificar únicamente:

`tools/orbit360-fase-a-product-local-synthetic-smoke-v20260814.mjs`

para conservar el último evento sanitizado `orbit:product-readonly-bootstrap` con `phase/ready/errors` y rutas fallidas/404 sanitizadas. Después ejecutar UNA sola vez el mismo synthetic local.

No tocar en esta frontera:

- producto funcional;
- datos;
- Auth/membership/store;
- Rules/Functions;
- HostDime;
- producción;
- main/merge.

## Ruta de salida vigente

```text
R1 observabilidad + un synthetic
→ R2 un único rootfix solo si R1 demuestra owner
→ R3 paquete durable + manifest + hashes
→ R4 HostDime + app.aysseguros.com + smoke E2E productivo
→ R5 habilitación operativa + delta controlado
→ R6 módulos postproducción incrementales
→ R7 gate de reutilización para siguiente tenant
```

Presupuesto:

```text
mejor caso: 3 iteraciones técnicas hasta go-live validado
caso con un rootfix demostrado: 4 iteraciones técnicas
quinta iteración de la misma familia: prohibida
```

## Reglas anti-bucle

- una sola frontera larga por iteración;
- checkpoint durable antes de runtime/browser/deploy;
- al terminar la frontera: detener, leer, clasificar y sincronizar;
- si una familia falla dos veces: `STOP_RETRY`;
- no buscar paquetes antiguos: el durable se construye desde el source certificado;
- HostDime no vuelve a ser diagnóstico previo a R3;
- no reabrir módulos cerrados sin evidencia nueva reproducible;
- producción no se usa para depurar validators;
- cada cambio de estado sincroniza `live-state` + PR #5 + README + checkpoint y, cuando corresponda, CHANGELOG/bitácora/Plan/E2E.

## Fuentes rectoras de negocio/arquitectura

Continúan vigentes, en su orden de precedencia histórica, el Documento Maestro Consolidado, los addenda de Academia, patrones reutilizables, continuidad/importadores, Plan Maestro Productivo, control de causa raíz/gates y aceleración productiva. Para el estado operativo actual prevalecen live-state + PR/HEAD + evidencia reciente conforme al addendum del 14 de agosto de 2026.
