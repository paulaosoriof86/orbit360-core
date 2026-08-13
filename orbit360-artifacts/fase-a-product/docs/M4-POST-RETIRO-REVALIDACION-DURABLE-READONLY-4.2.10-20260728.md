# M4 4.2.10 — Revalidación durable post-retiro read-only

Fecha: 2026-07-28  
Gate: `block4-post-retirement-revalidation-readonly-v20260728`  
Contrato: `4.2.10`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: `CERRADO / SUCCESS`

## Objetivo cumplido

Después del cierre 4.2.9 se ejecutó una revalidación durable nueva e independiente antes de evaluar cualquier escritura de las 61 normalizaciones GT/GTQ.

Resultado final:

```text
source clientes: 414
source aseguradoras: 26
target-only clientes: 0
target-only aseguradoras: 0
snapshots legibles del retiro 4.2.9: 4
eventos append-only legibles del retiro 4.2.9: 4
escrituras operativas: 0
```

La evidencia exportada fue agregada y sanitizada, sin IDs, valores crudos, PII ni secretos.

## Ejecuciones

### Primer intento

Run: `30395156011`  
Job: `90396118824`  
Artifact: `8702484870`  
Resultado: `FAIL`

El preflight canónico pasó 25/25 y el contrato 17/17. El primer fallo real ocurrió en runtime porque una consulta `collectionGroup('records')` con dos filtros exigía un índice no necesario.

Clasificación: `PIPELINE_MECHANISM_FAILURE`.

No hubo escrituras.

### Corrección de causa raíz

Se corrigió únicamente el mecanismo de lectura:

1. leer los cuatro `auditEvents` del tenant vinculados al gate 4.2.9;
2. validar su binding y naturaleza append-only;
3. resolver los cuatro `snapshotRef` exactos;
4. leer directamente los cuatro snapshots.

No se creó índice, no se modificaron datos ni Rules y no hubo deploy.

El preflight quedó reforzado para bloquear la reaparición de `collectionGroup('records')` en este runner.

### Ejecución reparada

Request commit: `6f478987a66f34aefcfc0526d58d3089162a4ee7`  
Run: `30395639383`  
Job: `90397715932`  
Artifact: `8702669519`  
Digest: `sha256:dc3181a0256ccd1e26bf98fb1c9062f0aed01deef96ccd118858b2a028dcdb29`

Resultado:

```text
Preflight canónico: GO_GATE_CONTRACT 28/28
Validator revision: 4.2.10-r1
Activation mode: immutable_request_present
Contrato: PASS 17/17
Runtime read-only: PASS
Evidencia sanitizada: ok:true
```

## Autorización

La autorización read-only de 4.2.10 quedó consumida.

El cierre habilita únicamente la evaluación del siguiente paso:

```text
approvalReadyForClientCorrectionWrite: true
clientCorrectionWriteAuthorized: false
```

Por tanto, las 61 correcciones GT/GTQ continúan sin autorización de escritura.

## Regla vinculante de fuentes reales posteriores

Cada bloque de migración debe solicitar a Paula su fuente real vigente en el momento exacto en que se necesite. Si la fuente no se ha entregado, el bloque se detiene como `FUENTE_REAL_REQUERIDA`; no se sustituye con datos inferidos de otra fuente.

Aplicación mínima:

```text
Pólizas → pedir listado/base actual de pólizas.
Vehículos → pedir fuente actual de vehículos.
Recibos/cartera → pedir fuente vigente de recibos/cuotas/cartera.
Cobros → pedir fuente real de cobros/recaudos.
Planillas/comisiones → pedir sus planillas reales.
Financiero histórico → pedir su fuente específica.
Documentos/siniestros/configuración → pedir la fuente específica cuando llegue el bloque.
```

La hoja histórica `Listado producción 2025-2026` no es fuente de Pólizas y queda expresamente prohibida como sustituto para migrarlas.

## Claude y Academia

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.

Academia: `ACADEMIA_ACTUALIZAR`: enseñar separación entre revalidación read-only, autorización de escritura, fallo de mecanismo vs fallo de datos y fuente real por entidad.

## Siguiente acción exacta

Solicitar autorización nueva e independiente para aplicar las 61 correcciones GT/GTQ ya preparadas por el dry-run 4.2.6. La escritura debe tener gate propio, snapshots/rollback, auditoría append-only y verificación post-write. No avanzar a Pólizas antes de cerrar ese tramo de M4.
