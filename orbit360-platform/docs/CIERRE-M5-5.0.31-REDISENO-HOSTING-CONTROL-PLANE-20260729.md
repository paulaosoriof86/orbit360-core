# Cierre M5 5.0.31 — rediseño estático del control plane Hosting

Fecha: 2026-07-29  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block5-release-candidate-visualization-v20260728`

## Resultado

**PASS en el primer intento.**

5.0.31 corrige la causa raíz estructural que detuvo 5.0.30: el package input deja de compartir estado mutable con el ledger de evidencia.

## Arquitectura nueva

- input inmutable: `tools/orbit360-m5-hosting-package-input-531-v20260729.json`;
- ledger append-only separado: `tools/orbit360-m5-hosting-evidence-ledger-531-v20260729.json`;
- contrato puro: `tools/orbit360-m5-hosting-control-plane-contract-531-v20260729.mjs`;
- fixture: `tools/orbit360-m5-hosting-control-plane-fixture-531-v20260729.mjs`;
- descriptor de candidata preservado: `tools/orbit360-m5-release-candidate-descriptor-530-v20260729.json`.

El validador del package no recibe ni consulta el ledger de evidencia.

## Fixture vinculante

La prueba ejecuta:

1. validar el package input;
2. enriquecer una copia del ledger con evidencia sintética;
3. verificar que el package input no cambió;
4. volver a validar el mismo package;
5. exigir resultado exactamente idéntico;
6. rechazar casos negativos con hash, conteos, capacidades o binding de ledger alterados.

Resultado requerido y obtenido:

- `packageInputImmutable:true`;
- `evidenceLedgerSeparate:true`;
- `packageResultStableAfterEvidence:true`;
- candidata `4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b`;
- 43 assets críticos;
- 26 remotos esperados;
- cero secretos/Firestore/writes/runtime/browser/deploy.

## Evidencia

- commit: `91fba108c73863a4c45eae1307a9b645fa0e7ce8`;
- run: `30491707657`;
- job: `90710889778`;
- artifact: `8739935980`;
- digest: `sha256:33d1b605db9e4ae66397aca340965ca116a86173e96bf6bffaf05509933cf979`;
- conclusión: SUCCESS.

El workflow 5.0.31 quedó congelado después del PASS.

## Candidata y LAB

La candidata de producto no cambió durante 5.0.31:

`4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b`

Última paridad pública válida conocida:

- 24/26 coinciden;
- faltan `sw.js` y `core/session-multirol-visibility-v20260716.js`;
- por tanto la entrega Hosting LAB sigue siendo necesaria.

## Seguridad

Durante 5.0.31:

- secretos: false;
- Firestore read/write: false / 0;
- operational writes: 0;
- browser/runtime: false;
- deploy: false;
- Functions/Rules/producción/main/merge: false.

## Estado vigente

Fuente autoritativa:

`tools/orbit360-m5-release-candidate-control-overlay-531-v20260729.json`

Estado:

`M5_HOSTING_CONTROL_PLANE_531_STATIC_PASS_READY_FOR_NEW_HOSTING_AUTHORIZATION`

## Claude / Academia

Reusable:

- package input inmutable;
- evidence ledger append-only separado;
- contrato puro sin dependencia del ledger;
- fixture de estabilidad package → evidence → package;
- descriptor único 43/26;
- autorización, request y consumo como estados separados.

Academia debe enseñar por qué una evidencia válida nunca debe alterar las precondiciones con las que fue generada.

## Siguiente acción exacta

Solicitar **una nueva autorización explícita one-shot para Hosting LAB**. La autorización anterior fue invalidada por la stop-line de 5.0.30 y no debe reutilizarse.

Después de esa autorización, un wrapper nuevo post-5.0.31 deberá:

1. ejecutar preflight canónico;
2. consumir únicamente el package input inmutable;
3. medir paridad previa;
4. crear request inmutable ligado a HEAD/hash;
5. desplegar exclusivamente Hosting LAB una sola vez;
6. escribir evidencia solo en el ledger separado;
7. exigir paridad pública 26/26;
8. dejar runtime, producción y Pólizas bloqueados hasta autorización independiente.
