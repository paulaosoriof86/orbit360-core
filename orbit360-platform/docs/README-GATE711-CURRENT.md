# Gate 7.11 — referencia vigente

Fecha: 2026-08-03  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado rector

```text
GATE711_SECURITY_ROOT_FIX_CLOSED
GATE711_POST_ROOTFIX_MANIFEST_CLOSED
GATE711_POST_ROOTFIX_PACKAGE_SEALED
GATE711_POST_ROOTFIX_READINESS_49_OF_49_PASS
GATE711_RUNTIME_30814564387_CONSUMED_STOP_RETRY
GATE711_SNAPSHOT_VALIDATOR_STALE_ROOT_CAUSE_CLOSED
GATE711_VISUAL_SEAL_CORRECTIVE_PASS
CRM_OPS_LEADS_RUNTIME_PENDING_NEW_AUTHORIZATION
CLOUD_CLAUDE_PACKAGE_DOCUMENTED_NOT_SENT
HOSTING_DEPLOY_NOT_EXECUTED
PRODUCTION_NOT_EXECUTED
```

## Candidata acumulativa vigente

```text
productHead: 267f7231b46d65b80c167f54567a67503b6a6793
canonicalSnapshotDigest esperado: 19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b
trackedFileCount: 309
pathDigest: 517056dee1200503b2e7295a333cb804bc71271bbaa87847fa762da025f276f1
contentDigest: 3dc0b2c699bde118d944e9304c725748b49c56619da8acf8040a36fdab37b06e
indexDigest: aa40982bffd5a453c56dd07e2aa75745128890cb81fa940c2dac6e051fa2e9d6
singleReadOwner: Orbit.store
```

No hubo cambios de producto después del root fix de seguridad.

## Ejecución autorizada del 3 de agosto

```text
run: 30814564387
job: 91689019904
requestCommit: 394673affdf51f0367bf6b92a7c6ca7559522e18
artifact: 8856180726
artifactDigest: sha256:c3384a1375eb8b311c6c47055020f2ca4d9666f8be87a554439c8f2fe9533d1f
conclusion: FAILURE / STOP_RETRY
```

Etapas:

```text
autorización inmutable y product freeze: PASS
preflight contractual antes de secrets: 18/18 PASS
release-critical static: 38/38 PASS
dependencias: PASS
cuenta de servicio LAB: PASS
identidad existente read-only: PASS
snapshot canónico inicial: FAIL
servidor local: NOT_EXECUTED
browser CRM/Ops/Leads: NOT_EXECUTED
snapshot final: NOT_EXECUTED
limpieza de temporales: PASS
```

Seguridad:

```text
Auth writes: 0
Firestore writes: 0
operational writes: 0
reimportación: no
deploy: no
producción/main/merge: no/no/no
```

## Causa raíz obligatoria del STOP

```text
classification: VALIDATOR_STALE
code: VISUAL_SEAL_PRE_ROOTFIX
failedStage: Snapshot canónico inicial
staleOwner: tools/orbit360-policies-dual-path-provenance-constants-v20260801.mjs
consumer: tools/orbit360-revalidar-policies-full-canonical-readonly-v20260801.mjs
```

El revalidador calculaba el manifest actual, pero lo comparaba contra un `VISUAL_SEAL` anterior al root fix:

```text
sello obsoleto contentDigest: 3d25a83218a4373513e1fff24ea9b12817d4c47be0fad08777e7f94867b3f676
sello obsoleto indexDigest: b57b6581ee02d2dde42a8a2c1272d57f19b7ad6809d13a1d25111f3d71a96074
revisión obsoleta: academia-bootstrap-rootfix-20260802.2
```

La candidata autorizada ya tenía:

```text
contentDigest: 3dc0b2c699bde118d944e9304c725748b49c56619da8acf8040a36fdab37b06e
indexDigest: aa40982bffd5a453c56dd07e2aa75745128890cb81fa940c2dac6e051fa2e9d6
```

Por ello, incluso con datos sin cambios, `visualManifest()` necesariamente devolvía `manifestMatches=false` y el revalidador cerraba con `DATA_CONTRACT_FAILURE:CUMULATIVE_VISUAL_DRIFT`.

Esto **no prueba drift de datos** y no corresponde corregir clientes, aseguradoras, pólizas, recibos, cartera o cobros. Tampoco fue un defecto de identidad, navegador ni del producto acumulativo.

## Solución aplicada

```text
run: 30814915626
job: 91690157955
artifact: 8856299679
digest: sha256:3bbeb8af22f0b2ca1d8630735b4169f267249cf92d8b2d3a989308d754751641
commit: a9549f3487522a3e450742de2649b5ad41f3b1e9
status: PASS
```

Cambios exactos:

1. `tools/orbit360-policies-dual-path-provenance-constants-v20260801.mjs`
   - `VISUAL_SEAL` sincronizado con el manifest autorizado;
   - nueva revisión `security-frozen-guard-rootfix-20260803.1`;
   - fuente actualizada al manifest run `30775729377`.
2. `tools/orbit360-revalidar-policies-full-canonical-readonly-v20260801.mjs`
   - imprime siempre el resultado JSON sanitizado antes de terminar;
   - cualquier STOP futuro del snapshot mostrará su causa exacta en logs.

El correctivo fue source-only:

```text
product files changed: 0
secrets: no
Firestore reads/writes: 0/0
runtime/browser: no/no
deploy/production: no/no
```

## Limitación de evidencia corregida

El workflow fallido no incluyó en el artefacto el archivo interno `policies-full-canonical-revalidation-readonly-v20260801.json`, y la copia `before` no llegó a crearse porque el validador terminó con código 41. La causa del sello obsoleto es determinística por inspección del productor y consumidor, pero el detalle interno del error no quedó en aquel artefacto.

La solución incorpora observabilidad obligatoria para que esa omisión no vuelva a ocurrir.

## Autorización y replay

```text
autorización del 3 de agosto: CONSUMIDA
consumedByRun: 30814564387
replayAllowed: false
additionalExecutionsAllowed: false
```

No se reejecutará ese run. El lifecycle quedó cerrado con la causa raíz y la solución asociadas.

## Estado previo preservado

El root fix de seguridad del bridge CRM continúa vigente:

```text
productHead: 267f7231b46d65b80c167f54567a67503b6a6793
external guard registry: WeakMap
Conciliaciones: self_guarded_readonly
immutable_unwrapped: prohibido
```

Readiness anterior preservado:

```text
run 30776380035 · 49/49 PASS
release-critical static: 38/38
runtime package readiness: 38/38
runtime chain: 56/56
router compatibility: 12/12
```

## Cloud / Claude / Academia

```text
Hosting: NO EJECUTADO
paquete Cloud/Claude: DOCUMENTADO / NO ENVIADO
datos reales: NO ENVIADOS
secretos: NO ENVIADOS
Academia focused runtime: NO BLOQUEANTE
```

Patrón nuevo: cada cambio autorizado del manifest debe actualizar conjuntamente el sello consumido por snapshots; los validadores deben producir evidencia sanitizada incluso cuando fallan.

## Próxima frontera única

No corresponde reimportar datos, modificar producto, retornar a Academia ni repetir el run fallido.

La única acción siguiente es una nueva ejecución read-only del mismo macro, sobre la misma candidata `267f7231b46d65b80c167f54567a67503b6a6793`, usando el validador de snapshot corregido en `a9549f3487522a3e450742de2649b5ad41f3b1e9`.

Esa ejecución requiere autorización explícita nueva porque la anterior fue consumida. Si vuelve a ocurrir un STOP, deberá informarse de inmediato la causa raíz soportada por la evidencia JSON ahora observable, el owner exacto y la solución, sin iniciar una nueva ronda de reintentos.
