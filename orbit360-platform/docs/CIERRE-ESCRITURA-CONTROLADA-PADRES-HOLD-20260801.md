# Cierre — Escritura controlada de padres HOLD 7.8

Fecha: 2026-08-01  
Gate: `block7-policies-held-parents-controlled-write-lab-v20260801`  
Contrato: `7.8.0`

## Resultado

```text
run: 30730683228
job: 91450453030
artifact: 8827868101
artifact digest: sha256:933d4f2d54173460b3d34ec92c49262c97d07ff6e424353a230d15f166a47bf6
HEAD ejecutado: 6cd5e9f9dfcaf7f156b5d733236b3db4eea6368e
preflight: 17/17
status: POLICIES_HELD_PARENTS_CONTROLLED_WRITE_PASS
classification: GO_LAB_HELD_PARENTS_CONTROLLED_WRITE_CLOSED
```

El lifecycle quedó cerrado como `POLICIES_HELD_PARENTS_CONTROLLED_WRITE_CLOSED`. La autorización fue consumida y el replay está bloqueado.

## Escritura realizada

| Colección | Antes | Creados | Después |
|---|---:|---:|---:|
| Clientes | 414 | 16 | 430 |
| Aseguradoras | 26 | 4 | 30 |
| Pólizas | 1,375 | 0 | 1,375 |
| Vehículos | 1,033 | 0 | 1,033 |
| Recibos | 1,294 | 0 | 1,294 |
| Cartera | 673 | 0 | 673 |
| Cobros | 7 | 0 | 7 |
| **Total** | **4,822** | **20** | **4,842** |

```text
CREATE: 20
UPDATE: 0
sobrescrituras: 0
intentos de sobrescritura: 0
lotes atómicos: 1/1
```

Los veinte documentos fueron copiados desde la autoridad heredada mediante `batch.create()`. La operación no podía reemplazar un documento existente.

## Estado de validación

```text
REQUIERE_VALIDACION conservado: 20/20
registros marcados como validados por el gate: 0
referencias de import batch no resueltas escritas: 0
```

La presencia en la ruta canónica no convierte estos padres en registros validados. Continúan sujetos a las restricciones operativas y de calidad vigentes.

## Integridad referencial

La post-verificación confirmó:

```text
Pólizas directamente afectadas: 75/75
Descendientes afectados: 162/162
Relaciones de las 1,373 Pólizas operativas resueltas: sí
Payloads de las 1,373 Pólizas sin cambios: sí
```

Desglose de los descendientes previamente trazados:

```text
Vehículos: 47
Recibos: 76
Cartera: 38
Cobros: 1
```

## Snapshot, idempotencia y rollback

Antes de escribir se generó un snapshot privado de los 4,822 documentos canónicos existentes.

```text
snapshot privado: sí
entradas: 4,822
incluido en artefacto: no
lote único atómico: sí
create-only: sí
rollback disponible: sí
rollback ejecutado: no requerido
```

El replay queda bloqueado por tres controles:

1. el digest del destino ya cambió;
2. los veinte IDs ya existen y `batch.create()` rechazará su reemplazo;
3. el lifecycle está cerrado y la autorización consumida.

## Digests

```text
sourceSnapshotDigest:
88b8e16b0d4531b2f5c0ce2b1a21068837853080943f7584f6f3fab0cc2ff18d

targetSnapshotBeforeDigest:
724e1efbbc29f60791350ea180ef54230ecf888f9914b98fc70fda62ca6ac305

dryRunPlanDigest:
de72758f0f2097471bb9183879b8039154b0c063d79e7678393575a5a97f97c8

targetSnapshotAfterDigest:
19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b
```

## Correctivos estáticos previos

Antes de la ejecución se corrigieron dos inconsistencias del ejecutor:

- el acumulador debía aceptar correctamente estructuras `Map`;
- la post-verificación debía conservar el conjunto de padres sellado antes de escribir, porque después de crearlos ya no son `source-only`.

Clasificación: `VALIDATOR_STALE` detectado antes de secrets y Firestore. No produjo corridas fallidas ni datos modificados.

## Seguridad

```text
Firestore writes: 20
operational writes: 20
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

El gate 7.6 permanece congelado y no fue reabierto.

## Candidata acumulativa

```text
archivos rastreados: 308
pathDigest: 0c3dbf222646ea46b57e838359ac56fff3994268a97e0d682508bd747a29f3c4
contentDigest: 5b32b90815929acc341cfd4ae7c1e5f76d819e1a6a1b4091d13800508ab9b647
indexDigest: 54df4a1977573ccc6a0702bd0012f2835fcef4cb529e327d16918c4b420382a4
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

La escritura y la integridad técnica no constituyen aprobación visual.

## Siguiente gate

Corresponde un nuevo gate read-only de revalidación canónica completa. Debe comparar los 4,837 documentos de la autoridad heredada con los 4,842 documentos canónicos, verificar que los 4,837 IDs operativos estén presentes, que los cinco seeds permanezcan como únicos target-only, que las relaciones y estados de validación sean correctos y que no exista deriva de contenido. No puede reabrir el gate 7.6 ni adaptar el frontend.
