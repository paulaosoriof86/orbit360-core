# MANIFIESTO DE ARCHIVOS FÍSICOS — PAQUETE CLAUDE v1.205

Fecha: 2026-07-11  
Origen: rama `ays/backend-tenant-lab-v99-20260703`  
Uso: referencia dirigida para Claude; no reemplazo directo de su candidata visual v1.198.

## A. Contratos/motores — SOLO LECTURA

```txt
orbit360-platform/core/access-scope.js
orbit360-platform/core/access-ceilings-v1199.js
orbit360-platform/core/policy-receipts-engine.js
orbit360-platform/core/policy-receipts-v1199-refinements.js
orbit360-platform/core/issuance-workflow-v1201.js
orbit360-platform/core/issuance-workflow-v1201-refinements.js
orbit360-platform/core/endorsement-workflow-v1201.js
orbit360-platform/core/importa-dryrun-p0.js
orbit360-platform/core/insurer-directory-import-v1202.js
orbit360-platform/core/insurer-directory-import-v1202-security.js
orbit360-platform/core/secure-resource-fields-v1202.js
orbit360-platform/core/backend-resource-contracts.js
orbit360-platform/core/document-viewer.js
orbit360-platform/core/credential-vault.js
orbit360-platform/core/quote-comparison-contracts-v1203.js
orbit360-platform/core/quote-comparison-contracts-v1203-refinements.js
```

Objetivo: leer firmas, estados, IDs, colecciones y resultados. No reimplementar ni modificar.

## B. Bridges de compatibilidad — SOLO LECTURA / PATRÓN VISUAL

```txt
orbit360-platform/modules/crm-v1198-operational-bridge.js
orbit360-platform/modules/portal-v1198-scope-viewer-bridge.js
orbit360-platform/modules/policy-receipts-v1199-bridge.js
orbit360-platform/modules/policy-receipts-v1199-detail-guard.js
orbit360-platform/modules/renewals-v1200-operational-bridge.js
orbit360-platform/modules/renewals-v1200-permission-guard.js
orbit360-platform/modules/issuance-endosos-v1201-bridge.js
orbit360-platform/modules/issuance-endosos-v1201-refinements.js
orbit360-platform/modules/ops-workflows-v1201-bridge.js
orbit360-platform/modules/renewals-v1201-issued-filter.js
orbit360-platform/modules/aseguradoras-v1197-ux-bridge.js
orbit360-platform/modules/aseguradoras-v1202-import-bridge.js
orbit360-platform/modules/aseguradoras-v1202-resources-bridge.js
orbit360-platform/modules/cotizador-v1203-source-gate.js
orbit360-platform/modules/comparativo-v1203-operational-bridge.js
```

Objetivo: identificar eventos, hooks y comportamiento esperado. Claude adapta su UX v1.198 a estos contratos; no copia el bridge como sustituto de su módulo.

## C. Academia existente — CONservar y ampliar

```txt
orbit360-platform/data/academia-v1197-bridge.js
orbit360-platform/data/academia-v1199-policy-receipts.js
orbit360-platform/data/academia-v1200-renewals.js
orbit360-platform/data/academia-v1201-emision-endosos.js
orbit360-platform/data/academia-v1202-directorios-aseguradoras.js
orbit360-platform/data/academia-v1203-cotizador-comparativo.js
```

Objetivo: conservar rutas/progreso/certificados y ampliar contenido en la Academia de la candidata.

## D. Snapshot de integración — REFERENCIA, NO SOBRESCRIBIR v1.198

```txt
orbit360-platform/index.html
orbit360-platform/modules/aseguradoras.js
orbit360-platform/modules/cotizador.js
orbit360-platform/modules/comparativo.js
orbit360-platform/modules/cliente360.js
orbit360-platform/modules/polizas.js
orbit360-platform/modules/academia.js
orbit360-platform/styles/base.css
orbit360-platform/styles/infra.css
orbit360-platform/styles/v1197-empalme.css
```

Objetivo: comparar load order, API y regresiones. La v1.198 visual de Claude tiene prioridad para UX; debe conservar sus fixes de banners, cache-bust y Registrar cotización recibida.

## E. Pruebas/validadores — REFERENCIA DE ACEPTACIÓN

```txt
orbit360-platform/tools/orbit360-test-access-scope-v1198.mjs
orbit360-platform/tools/orbit360-validar-cierre-crm-v1198.mjs
orbit360-platform/tools/orbit360-test-policy-receipts-v1199b.mjs
orbit360-platform/tools/orbit360-validar-policy-receipts-v1199b.mjs
orbit360-platform/tools/orbit360-validar-renovaciones-v1200b.mjs
orbit360-platform/tools/orbit360-test-issuance-endosos-v1201.mjs
orbit360-platform/tools/orbit360-validar-emision-endosos-v1201.mjs
orbit360-platform/tools/orbit360-test-directorio-aseguradoras-v1202.mjs
orbit360-platform/tools/orbit360-validar-directorio-aseguradoras-v1202.mjs
orbit360-platform/tools/orbit360-test-cotizador-comparativo-v1203.mjs
orbit360-platform/tools/orbit360-validar-cotizador-comparativo-v1203.mjs
```

Claude no necesita ejecutar todos los tests backend. Debe usar sus criterios para no contradecir contratos y ejecutar `node --check` de su candidata.

## F. Documentación acumulada incluida

```txt
ACTUALIZACION-DELTA-CLAUDE-CRM-V1198-20260711.md
ACTUALIZACION-DELTA-CLAUDE-POLIZA-RECIBOS-V1199-20260711.md
ACTUALIZACION-DELTA-CLAUDE-RENOVACIONES-V1200-20260711.md
ACTUALIZACION-DELTA-CLAUDE-CRM-V1201-20260711.md
ACTUALIZACION-DELTA-CLAUDE-ASEGURADORAS-V1202-20260711.md
ACTUALIZACION-DELTA-CLAUDE-COTIZADOR-COMPARATIVO-V1203-20260711.md
AUDITORIA-CIERRE-CRM-TRANSVERSAL-V1198-20260711.md
AUDITORIA-CIERRE-POLIZA-RECIBOS-COBROS-V1199-20260711.md
AUDITORIA-Y-CORRECCION-RENOVACIONES-V1200-20260711.md
AUDITORIA-CIERRE-RENOVACION-EMISION-ENDOSOS-V1201-20260711.md
AUDITORIA-OPERATIVA-DIRECTORIOS-ASEGURADORAS-GT-CO-V1202-20260711.md
AUDITORIA-OPERATIVA-COTIZADOR-COMPARATIVO-V1203-20260711.md
AUDITORIA-VISUAL-REAPERTURA-ASEGURADORAS-COTIZADOR-COMPARATIVO-V1203-20260711.md
CONTROL-CONTINUIDAD-OPERATIVA-HASTA-V1203-20260711.md
```

## G. Protegidos no incluidos como base editable

Los siguientes pueden aparecer solo para verificar composición, pero están prohibidos para Claude:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-*
core/auth.js
core/importa.js
firestore.rules
tools backend/pipeline
```

## H. Regla final

```txt
Archivo presente en este paquete ≠ archivo que Claude debe copiar.
```

La clasificación A/B/D indica referencia de solo lectura. Claude modifica su propia candidata v1.198 y entrega un ZIP completo para auditoría/empalme selectivo posterior.
