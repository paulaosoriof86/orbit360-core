# Addendum Evergreen al Plan de Trabajo Congelado V2 — 2026-09-09

**Estado:** PREVALENTE SOBRE LA INTERPRETACIÓN OPERATIVA DEL PLAN V2  
**No crea una iteración nueva. No cambia I0–I6.**

## 1. Propósito

El Plan de Trabajo Congelado V2 permanece FROZEN como estructura de ejecución. Este addendum corrige únicamente una ambigüedad documental: el Plan V2 contiene secciones que registran el estado y release observados **al momento de su congelamiento**.

## 2. Clasificación de las secciones históricas

Las secciones:

- `5. Estado de avance al congelar V2`
- `6. Release certificado que Transición G debe sellar`

son `HISTORICAL_FREEZE_SNAPSHOT_NON_OPERATIONAL`.

No deben actualizarse cada vez que cambie el recovery y no pueden usarse para responder “dónde vamos”.

## 3. Autoridad vigente

El estado operativo vigente vive exclusivamente en:

`artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json`

El detalle por capability vive en:

`artifacts/orbit360-recovery/release-control/CAPABILITY_STATUS_LEDGER.json`

La última versión aprobada por capability vive en:

`artifacts/orbit360-recovery/release-control/CAPABILITY_LINEAGE_LOCK.json`

## 4. Porcentaje

Se conserva el método de 7 gates de producción I0, I1, I2, I3, I4A, I4B e I5 con peso igual. El porcentaje actual se calcula desde los estados de Control Plane; no desde la sección histórica 5.

## 5. Fuentes del Proyecto ChatGPT

El paquete `project-sources-v2/v3` materializa el paquete V3 activo y sustituye V2 como conjunto activo recomendado para el Proyecto ChatGPT. Los paquetes anteriores permanecen en GitHub como trazabilidad, no como fuentes activas.

## 6. Regla de cambio

Este addendum es el mecanismo explícito requerido por la sección 9 del Plan V2. No modifica la secuencia ni los contratos del plan; elimina el riesgo de interpretar snapshots históricos como estado vivo.
