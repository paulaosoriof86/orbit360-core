# Cierre — Escritura canónica controlada 7.5

Fecha: 2026-08-01  
Gate: `block7-policies-canonical-controlled-write-lab-v20260801`  
Contrato: `7.5.0`

## Resultado

La ejecución terminó en `POLICIES_CANONICAL_CONTROLLED_WRITE_PASS` y el lifecycle quedó cerrado como `POLICIES_CANONICAL_CONTROLLED_WRITE_CLOSED`.

```text
run: 30726870258
job: 91440059984
artifact: 8826656778
artifact digest: sha256:170f450128cd228e3a8ce53c072fcd91cfb38ff4ad6a0dc5ae73116b84e8b945
HEAD ejecutado: 67b76a23419dea01c273f1524feda7b8f1578395
preflight: 17/17
lotes: 11/11
```

## Autoridad y destino

La ruta heredada continúa como fuente operativa autoritativa:

```text
tenantId/{tenantId}/{collection}
```

La ruta canónica recibió exclusivamente el conjunto CREATE aprobado:

```text
tenants/{tenantId}/data/{collection}/items
```

No se adaptó el frontend y no se modificó la declaración de aprobación visual.

## Plan ejecutado

| Colección | Antes canónica | CREATE | Después canónica | OMIT | HOLD |
|---|---:|---:|---:|---:|---:|
| Clientes | 414 | 0 | 414 | 414 | 16 |
| Aseguradoras | 26 | 0 | 26 | 26 | 4 |
| Pólizas | 2 | 1,373 | 1,375 | 0 | 2 |
| Vehículos | 1 | 1,032 | 1,033 | 0 | 1 |
| Recibos esperados | 0 | 1,294 | 1,294 | 0 | 0 |
| Cartera de primas | 0 | 673 | 673 | 0 | 0 |
| Cobros | 2 | 5 | 7 | 0 | 2 |
| **Total** | **445** | **4,377** | **4,822** | **440** | **25** |

Los 440 documentos equivalentes no se reescribieron. Los 20 registros adicionales en `REQUIERE_VALIDACION` y los 5 seeds canónicos permanecieron fuera de la escritura.

## Controles de escritura

La operación fue `create-only`. Cada destino debía no existir; no hubo actualizaciones ni sobrescrituras.

```text
CREATE: 4,377
UPDATE: 0
overwrite attempts: 0
Firestore writes: 4,377
operational writes: 4,377
```

Se creó un snapshot privado previo de 445 documentos canónicos, identificado por digest. El snapshot no se incluyó en el artefacto sanitizado.

La idempotencia quedó protegida por dos condiciones:

1. digest exacto del snapshot previo;
2. precondición de creación sobre documentos inexistentes.

Cualquier replay encuentra un destino diferente al snapshot autorizado y se detiene antes de escribir.

## Digests sellados

```text
sourceSnapshotDigest:
88b8e16b0d4531b2f5c0ce2b1a21068837853080943f7584f6f3fab0cc2ff18d

targetSnapshotBeforeDigest:
9ec5e02509d6fa3cfc1450de8db42e0fd71c0d52e612bd6d9c0119186fc5f3d8

planSetDigest:
bd1852e73c21c61d98baed4bda129b027cd1a3ec2a265b6749dbc7c0eb25df47

targetSnapshotAfterDigest:
724e1efbbc29f60791350ea180ef54230ecf888f9914b98fc70fda62ca6ac305
```

## Post-verificación

```text
conteos posteriores exactos: sí
contenido posterior exacto: sí
fuente heredada sin cambios: sí
payloads creados exactos: sí
referencias import batch no resueltas escritas: 0
HOLD escritos: 0
seeds eliminados: 0
```

El rollback estaba disponible y no fue ejecutado porque la escritura y la post-verificación terminaron correctamente.

## Candidata acumulativa

El manifiesto visual acumulativo continuó coincidiendo:

```text
archivos rastreados: 308
pathDigest: 0c3dbf222646ea46b57e838359ac56fff3994268a97e0d682508bd747a29f3c4
contentDigest: 5b32b90815929acc341cfd4ae7c1e5f76d819e1a6a1b4091d13800508ab9b647
indexDigest: 54df4a1977573ccc6a0702bd0012f2835fcef4cb529e327d16918c4b420382a4
```

La futura visualización deberá usar la plataforma completa y un descendiente auditado. Este gate no autorizó navegador, preview ni adaptación del frontend.

## Seguridad

```text
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

## Siguiente gate

Antes de adaptar el frontend o abrir una visualización corresponde un gate read-only de revalidación posterior que compruebe:

- paridad de negocio entre la autoridad heredada y el destino canónico;
- conteos e IDs esperados;
- relaciones exactas;
- preservación de estados `REQUIERE_VALIDACION`;
- permanencia de los 25 HOLD fuera del read model operativo;
- ausencia de referencias de import batch no resueltas en los documentos creados;
- continuidad de la candidata visual acumulativa.

Ese gate no deberá escribir, adaptar el frontend, abrir navegador, preview ni desplegar.
