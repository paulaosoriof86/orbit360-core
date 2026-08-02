# Cierre — Autoridad operativa y dry-run hacia ruta canónica

Fecha: 2026-08-01  
Gate: `block7-policies-authority-canonical-dryrun-readonly-v20260801`  
Contrato: `7.4.0`

## Resultado

```text
run: 30726233391
job: 91438371555
artifact: 8826436742
artifact digest: sha256:96a31790713ffc1ffa71db23bfdc34134e4ddb23555c1ce67ca3870eb17dd48a
HEAD auditado: 8f4b077421dec382cfb3665d93add5f559c8656a
preflight: 17/17
status: POLICIES_AUTHORITY_CANONICAL_DRYRUN_READONLY_PASS
classification: GO_LAB_CANONICAL_DRYRUN_READY
```

## Autoridad declarada

- Ruta heredada `tenantId/{tenantId}/{collection}`: fuente operativa autoritativa vigente.
- Ruta canónica `tenants/{tenantId}/data/{collection}/items`: destino multi-tenant y read model futuro.

La declaración es documental. No hubo cambios de datos, store o frontend.

## Plan sellado

| Colección | Crear | Actualizar | Omitir | HOLD |
|---|---:|---:|---:|---:|
| Clientes | 0 | 0 | 414 | 16 |
| Aseguradoras | 0 | 0 | 26 | 4 |
| Pólizas | 1,373 | 0 | 0 | 2 |
| Vehículos | 1,032 | 0 | 0 | 1 |
| Recibos | 1,294 | 0 | 0 | 0 |
| Cartera | 673 | 0 | 0 | 0 |
| Cobros | 5 | 0 | 0 | 2 |
| **Total** | **4,377** | **0** | **440** | **25** |

Los 440 registros compartidos se omiten porque su proyección de negocio ya es equivalente. Los veinte HOLD de Clientes/Aseguradoras conservan `REQUIERE_VALIDACION`. Los cinco HOLD restantes corresponden a seeds canónicos propuestos para cuarentena sin borrado.

## Validación y relaciones

```text
crear preservando REQUIERE_VALIDACION: 2,003
crear source-backed: 2,374
relaciones bloqueadas: 0
cliente resuelto: 1,373
aseguradora resuelta: 1,373
póliza resuelta: 3,004
recibo resuelto: 678
```

Cartera y Cobros quedaron validados con dos relaciones independientes y exactas: Póliza y Recibo.

## Corrección del validador

La primera ejecución había reportado 678 HOLD falsos porque agrupaba Póliza y Recibo como alternativas. Se clasificó `VALIDATOR_STALE`, se congeló el resultado y se corrigió el contrato antes de reanudar. No existía un defecto de datos.

```text
primera ejecución: 30726085370
primer artefacto: 8826383629
hallazgo invalidado: 678 relationship holds
regla corregida: POLIZA_AND_RECIBO_INDEPENDENT_EXACT_GROUPS
```

## Referencias de importación

```text
normalizar con evidencia: 26
mantener en HOLD: 440
sin referencia: 4,402
referencias inferidas: 0
```

Los HOLD de batch no cambian por sí solos la acción documental; impiden escribir una referencia inventada y deberán resolverse o conservarse explícitamente en una futura escritura.

## Sellos

```text
sourceSnapshotDigest:
88b8e16b0d4531b2f5c0ce2b1a21068837853080943f7584f6f3fab0cc2ff18d

targetSnapshotDigest:
9ec5e02509d6fa3cfc1450de8db42e0fd71c0d52e612bd6d9c0119186fc5f3d8

planSetDigest:
bd1852e73c21c61d98baed4bda129b027cd1a3ec2a265b6749dbc7c0eb25df47
```

Cualquier cambio en fuente, destino, relaciones o plan invalida este dry-run y obliga a recalcularlo.

## Candidata visual acumulativa

El manifiesto completo volvió a coincidir:

```text
archivos: 308
pathDigest: 0c3dbf222646ea46b57e838359ac56fff3994268a97e0d682508bd747a29f3c4
contentDigest: 5b32b90815929acc341cfd4ae7c1e5f76d819e1a6a1b4091d13800508ab9b647
indexDigest: 54df4a1977573ccc6a0702bd0012f2835fcef4cb529e327d16918c4b420382a4
```

La futura visualización seguirá utilizando la plataforma completa, no un shell parcial.

## Controles preservados

```text
Firestore writes: 0
operational writes: 0
reimportación: no
borrado de seeds: no
frontend: sin adaptación
navegador/preview: no
deploy/Rules/Functions: no
producción/main/merge: no
```

## Estado humano

Clientes continúa aprobado previamente. Pólizas, Vehículos, Recibos, Cartera y resto del CRM siguen pendientes de visualización y aprobación humana.

## Condición del siguiente gate

La migración real no está autorizada. Requerirá autorización independiente, coincidencia exacta de los tres digests, snapshot previo, idempotencia, ejecución controlada, post-verificación y rollback exacto.
