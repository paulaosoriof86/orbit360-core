# Incidente M4 4.2.8 — semántica del target overlay

- **Fecha:** 2026-07-25
- **Módulo:** M4 · reconciliación y retiro de registros solo-destino
- **Clasificación:** `VALIDATOR_STALE`
- **Run:** `30177314623`
- **Etapa:** runtime contract validation

## Resultado real

El preflight pasó 24/24 y el contrato de fixtures 37/37. El runtime leyó 414 clientes y 26 aseguradoras en la fuente, y 2 clientes + 2 aseguradoras en el target técnico. Seleccionó determinísticamente exactamente cuatro registros obsoletos, con cero escrituras y cero borrados.

## Causa raíz

El contrato trató el target técnico como una réplica completa y esperaba 416 clientes y 28 aseguradoras. La colección consultada es en realidad un **overlay solo-destino** que contiene únicamente los cuatro registros extra. Por eso el baseline correcto es `2/2`, y la proyección hipotética después del retiro es `0/0`.

## Corrección 4.2.8-r1

- declara `targetCollectionSemantic: target_only_overlay`;
- valida `2 clientes + 2 aseguradoras`;
- proyecta `0/0` después del retiro hipotético;
- mantiene selección determinística, cuatro snapshots, auditoría y rollback exacto;
- conserva cero escrituras, borrados y fusiones;
- consume la autorización fallida y exige un request nuevo ligado al commit reparado.

## Estado

Reparación estática lista. No se reejecutó el workflow. El retiro real y la escritura GT/GTQ continúan bloqueados.
