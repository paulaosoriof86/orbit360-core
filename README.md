# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence` en el live-state;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CIERRE-PARCIAL-R3-DYNAMIC-GRAPH-PASS-TENANT-CONTEXT-BLOCKER-20260814.md`;
6. `orbit360-platform/CHANGELOG-R3-GOLIVE-20260814.md`;
7. fuentes históricas solo para reglas no sustituidas por evidencia posterior.

No usar este README, CHANGELOG histórico, PENDIENTES o memoria de otra conversación como sustituto del live-state.

## Estado vivo · R3 parcial · 2026-08-14

```text
stateVersion: 20260814.r3-dynamic-pass-tenant-context-blocked.1
previousStateVersion: 20260814.r2-required-optional-pass-dynamic-asset-gap.1
fase: PRE_GOLIVE_R3_TENANT_CONTEXT_ROOTFIX
RC: RC-AYS-LAB-CANONICA-01
candidata funcional canónica preservada: 4ede3e785cb2cc889a7c11c2d9e2030c7af20b64
HEAD R3 ejecutado: 6d4f5b9142167d9c0cf2a36ccd8bf55f342b10b5
PR #5: draft/open
main/merge: no
HostDime blocker actual: no
paquete durable definitivo: todavía no
producción tocada por R3: no
```

## R1 y R2 · cerrados

- R1 cerró observabilidad y aisló `PRODUCT_RUNTIME_COLLECTION_POLICY_MISMATCH`.
- R2 cerró required/optional: Product App y store `ready-read-only`, 7/7 required, requiredMissing=0, requiredFailed=0, clientes=430, aseguradoras=30, writes=0.

No reabrir R1/R2 sin nueva evidencia reproducible.

## R3 · avance certificado

Workflow: `Orbit360 Fase A Product Local Synthetic 20260814`  
Run: `31823597463`  
Job: `94842408061`

### Cerrado en R3

El grafo de assets dinámicos quedó certificado antes de secrets/browser:

```text
static roots: 115
dependency closure: 199
dynamic dependencies: 84
missing: 0
dynamicMissing: 0
knownMissing: 0
tenantRefsMissing: 0
parityFailures: 0
local 404 during render proof: 0
writes: 0
deploy: 0
productionTouched: false
```

CERRADO:

`PIPELINE_MECHANISM_FAILURE / PRODUCT_DYNAMIC_RUNTIME_ASSET_GAP`

### Bloqueo vigente

El router carga correctamente multirol, proyección de cliente, core de aseguradoras e índice tenant. El contrato de configuración activa del tenant queda:

```text
src: ""
status: no-source
ready: false
```

El archivo del tenant sí existe dentro del paquete. `core/router.js` busca el tenant en `OrbitBackend` / `Orbit.tenant`, mientras el runtime productivo autenticado ya lo posee en `Orbit.auth.productUser.tenantId` y en el store productivo. Falta el bridge reusable que proyecte ese contexto autenticado hacia el hook del router.

Clasificación vigente:

`FUNCTIONAL_DEFECT / PRODUCT_TENANT_RUNTIME_CONTEXT_BRIDGE_MISSING`

Observación secundaria no clasificada: `pageErrors=["lecciones"]`. No modificar Academia sin obtener primero stack/source sanitizado.

## Siguiente acción exacta · segunda frontera R3

- preparar bridge productivo aditivo de tenant desde identidad/membership autenticada; sin hardcode A&S y sin usar tenantHint como autoridad;
- preparar observabilidad sanitizada de stack/source para `pageerror` sin disparar navegador durante la preparación;
- source-gate antes de secrets;
- ejecutar UNA sola segunda prueba R3;
- solo con router/render PASS y sin error bloqueante, crear manifest + SHA256 + ZIP durable en la misma ejecución;
- si vuelve a fallar `PRODUCT_TENANT_RUNTIME_CONTEXT_BRIDGE_MISSING`, `STOP_RETRY` sin tercer intento.

HostDime y `app.aysseguros.com` continúan en R4, únicamente después del ZIP durable.

## Porcentajes vigentes

```text
readiness funcional de candidata: 100%
avance por iteraciones hacia producción: 50% (R1+R2 cerrados; R3 parcial)
gates finales cerrados: 0% (0/3)
R3 interno: grafo dinámico PASS / render FAIL / ZIP pendiente
R3 PASS -> 75% iteraciones / 67% gates
R4 PASS -> 100% / 100%
```

Los porcentajes globales no suben por actividad parcial: R3 debe cerrar render y paquete durable.

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
