# Cierre — procedencia y recomendación arquitectónica dual-path

Fecha: 2026-08-01  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 `draft/open`  
Owner: Pólizas  
Gate: `block7-policies-dual-path-provenance-recommendation-readonly-v20260801`  
Contrato: `7.3.0`

## Veredicto

```text
POLICIES_DUAL_PATH_PROVENANCE_RECOMMENDATION_READONLY_PASS
```

Clasificación:

```text
GO_LAB_DUAL_PATH_PROVENANCE_RECOMMENDATION_READONLY
```

La ejecución produjo una recomendación arquitectónica no vinculante para las siete colecciones. No declaró una ruta autoritativa y no autorizó migración, adaptación del frontend ni visualización.

## Evidencia de ejecución

```text
run: 30725611682
job: 91436616116
artifact: 8826213716
artifact digest: sha256:b2501961cb362cbaf84114cd511627cb6e0a7530ee662ed6d756b5c707b6ea78
HEAD auditado: fee83234c4850f37769fd15590de25689037ef20
preflight: 15/15
```

## Hallazgo principal

Los 440 IDs compartidos entre las dos rutas corresponden únicamente a Clientes y Aseguradoras:

```text
Clientes compartidos: 414
Aseguradoras compartidas: 26
```

Aunque los digests físicos de cada documento eran diferentes, el análisis semántico encontró:

```text
proyección de negocio equivalente: 440/440
conflictos críticos de negocio: 0
validación alineada: 440/440
```

La divergencia detectada anteriormente corresponde a metadatos técnicos, procedencia, representación o envolvente; no a diferencias de negocio en los registros compartidos.

## Registros exclusivos de la ruta canónica

```text
Pólizas: 2
Vehículos: 1
Cobros: 2
Total: 5
```

Los cinco fueron clasificados como:

```text
SEED_BOOTSTRAP_NON_OPERATIONAL
```

No tienen trazabilidad de fuente operativa y no deben competir con el universo heredado. La clasificación no autoriza borrarlos; cualquier retiro o cuarentena requiere dry-run y autorización separados.

## Registros exclusivos de Clientes y Aseguradoras en la ruta heredada

```text
Clientes: 16
Aseguradoras: 4
Total: 20
```

Los veinte están respaldados por señales de fuente y trazabilidad, pero continúan en:

```text
REQUIRES_VALIDATION
```

No deben omitirse de una migración futura. Deben trasladarse como `REQUIERE_VALIDACION` o quedar en HOLD explícito, nunca descartarse silenciosamente.

## Universo heredado y estado de validación

| Colección | Total heredado | Validado o claro | Requiere validación |
|---|---:|---:|---:|
| Clientes | 430 | 414 | 16 |
| Aseguradoras | 30 | 18 | 12 |
| Pólizas | 1,373 | 0 | 1,373 |
| Vehículos | 1,032 | 972 | 60 |
| Recibos esperados | 1,294 | 987 | 307 |
| Cartera de primas | 673 | 410 | 263 |
| Cobros | 5 | 5 | 0 |

El estado `REQUIRES_VALIDATION` no significa que los documentos deban eliminarse. Significa que la futura migración o proyección deberá preservar el estado honesto y sus motivos.

## Evidencia de import batches

```text
Documentos importBatch en ruta canónica: 1
Documentos importBatch en ruta heredada: 1
```

Se hallaron referencias de batch que no resuelven contra esos documentos:

```text
Clientes: 414 referencias no resueltas
Aseguradoras: 26 referencias resueltas en ruta heredada
Aseguradoras: 26 referencias adicionales no resueltas
```

La procedencia por `sourceTrace` y `sourceRefs` existe. Sin embargo, las referencias de batch deberán normalizarse, reconstruirse de forma trazable o mantenerse en HOLD durante el dry-run. No se puede inventar un batch ni sustituirlo con una referencia genérica.

## Recomendación arquitectónica por colección

La recomendación es **no vinculante** y no constituye una declaración de autoridad.

| Colección | Ruta recomendada | Confianza | Rol futuro de la ruta canónica |
|---|---|---|---|
| Clientes | Heredada | Media | Read model derivado después de reconciliación |
| Aseguradoras | Heredada | Media | Read model derivado después de reconciliación |
| Pólizas | Heredada | Alta | Vacía o en cuarentena hasta migración controlada |
| Vehículos | Heredada | Alta | Vacía o en cuarentena hasta migración controlada |
| Recibos esperados | Heredada | Alta | Vacía hasta migración controlada |
| Cartera de primas | Heredada | Alta | Vacía hasta migración controlada |
| Cobros | Heredada | Alta | Vacía o en cuarentena hasta migración controlada |

### Fundamento

Clientes y Aseguradoras tienen una proyección canónica semánticamente equivalente para los registros compartidos, pero la ruta heredada posee mayor cobertura y conserva los veinte registros adicionales con trazabilidad.

Pólizas, Vehículos y Cobros presentan registros canónicos de seed sin coincidencia de IDs con el universo heredado real.

Recibos y Cartera están vacíos en la ruta canónica y completos en la heredada.

## Candidata visual acumulativa

El manifiesto acumulativo fue recalculado y coincide exactamente con el sello anterior:

```text
archivos rastreados: 308
pathDigest: 0c3dbf222646ea46b57e838359ac56fff3994268a97e0d682508bd747a29f3c4
contentDigest: 5b32b90815929acc341cfd4ae7c1e5f76d819e1a6a1b4091d13800508ab9b647
indexDigest: 54df4a1977573ccc6a0702bd0012f2835fcef4cb529e327d16918c4b420382a4
```

La próxima candidata visual sigue obligada a utilizar la plataforma completa, el mismo HEAD o un descendiente auditado, y la mejor versión acreditada de cada módulo. No se permite un shell parcial para Pólizas.

## Seguridad e integridad

```text
Firestore reads: sí
Firestore writes: 0
operational writes: 0
reimportación: no
frontend adaptado: no
navegador: no
preview: no
deploy: no
Rules: no
Functions: no
producción: no
main: no
merge: no
```

## Aprobación humana

```text
Clientes: aprobado previamente
Pólizas: pendiente
Vehículos: pendiente
Recibos: pendiente
Cartera: pendiente
Resto CRM: pendiente
```

## Estado contractual

```text
POLICIES_DUAL_PATH_PROVENANCE_RECOMMENDATION_READONLY_CLOSED
```

La autorización quedó consumida. El gate no puede declarar autoridad ni ejecutar otra lectura mediante el mismo request.

## Siguiente acción exacta

Se necesita autorización separada para un único gate sin escritura que:

```text
declare la ruta heredada como autoridad operativa por las siete colecciones
→ declare la ruta canónica como destino/read model, no como fuente actual
→ preserve los 20 registros adicionales en REQUIERE_VALIDACION
→ mantenga los 5 seeds canónicos en cuarentena propuesta
→ prepare un dry-run exacto de reconciliación/migración hacia la ruta canónica
→ normalice o deje en HOLD las referencias de import batch no resueltas
→ calcule crear/actualizar/omitir/HOLD por colección
→ verifique la candidata acumulativa completa
→ cero escrituras
→ sin navegador, preview, deploy ni producción
```

La ejecución del dry-run y la declaración documental no autorizarán la escritura. Cualquier migración real requerirá snapshot, idempotencia, operación controlada, post-verificación y rollback con autorización posterior.
