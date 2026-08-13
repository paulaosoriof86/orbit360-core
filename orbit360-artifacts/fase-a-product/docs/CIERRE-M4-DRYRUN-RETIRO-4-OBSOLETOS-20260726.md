# Cierre M4 4.2.8-r1 — Dry-run de retiro de cuatro registros obsoletos

Fecha: 2026-07-26  
Gate: `block4-target-only-retirement-dryrun-v20260725`  
Contrato: `4.2.8`  
Validador: `4.2.8-r1`

## Resultado

La única ejecución read-only autorizada terminó en `success`.

```text
Package: 866e0c49f4333a400dec32746e5cd930b62e7e0c
Repair: 8def3f94ee3ec5900f4fc952a0086ac411e1e231
Request: fe182aee838ac383da0ccde95e916de4a290f635
Run: 30204564753
Job: 89800280468
Artifact: 8632667827
```

## Evidencia contractual

```text
Preflight canónico: GO_GATE_CONTRACT 24/24
Activation mode: immutable_request_present
Contrato de fixtures: PASS 38/38
Fixtures positivos: 8
Fixtures negativos: 30
Inspección literal: false
```

## Selección y proyección

```text
Origen clientes: 414
Origen aseguradoras: 26
Overlay target-only clientes: 2
Overlay target-only aseguradoras: 2
Seleccionados obsoletos: 4
Orden: collection_then_document_id_asc
Target-only restante hipotético: 0
```

Los cuatro registros cumplen simultáneamente: solo-destino, marcador técnico, ausencia de coincidencia por ID y ausencia de huella equivalente en origen. No se exportaron IDs ni valores individuales.

## Reversibilidad

```text
Snapshots previos planificados: 4
Rutas de restauración planificadas: 4
Orden de restauración: inverso a la selección determinística
Eventos de auditoría append-only planificados: 4
```

## Seguridad

```text
Client writes: 0
Insurer writes: 0
Audit writes: 0
Deletes: 0
Merges: 0
Rules/deploy/production: false
PII o secretos en evidencia: false
```

## Estado

El dry-run habilita únicamente la evaluación de una autorización independiente para retirar exactamente los cuatro registros obsoletos. No autoriza el retiro real, los 61 cambios `GT/GTQ`, producción, deploy, merge ni avance a Pólizas.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.  
Academia: `ACADEMIA_ACTUALIZAR`.
