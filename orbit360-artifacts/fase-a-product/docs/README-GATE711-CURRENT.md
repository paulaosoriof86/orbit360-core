# Gate 7.11 — referencia vigente

Fecha: 2026-08-03  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado rector

```text
GATE711_SECURITY_ROOT_FIX_CLOSED
GATE711_SNAPSHOT_VALIDATOR_CORRECTIVE_CLOSED
GATE711_RUNTIME_CUMULATIVE_CRM_OPS_LEADS_PASS
GATE711_SNAPSHOTS_BEFORE_AFTER_IDENTICAL
GATE711_VISUAL_EVIDENCE_13_SCREENSHOTS_REVIEWED
GATE711_AUTHORIZATION_CONSUMED_NO_REPLAY
VISUAL_REVIEW_10_PASS_3_SHARED_SHELL_DEFECT
SHELL_MOBILE_CANONICAL_FIX_IMPLEMENTED
SHELL_MOBILE_FOCUSED_LOCAL_VISUAL_PASS
GRAVICENTRA_INSURANCE_RC1_SOURCE_SEALED
PREDEPLOY_RC1_NO_GO_VALIDATOR_STALE
PREDEPLOY_RC1_STOPPED_BEFORE_SECRETS
CANONICAL_CONTRACT_ROOT_FIX_PENDING
CLOUD_CLAUDE_REUSABLE_DELTA_DOCUMENTED_NOT_SENT
ACADEMIA_IMPACT_DOCUMENTED
HOSTING_DEPLOY_NOT_EXECUTED
PRODUCTION_NOT_EXECUTED
```

## Candidata base validada

```text
productHead: 267f7231b46d65b80c167f54567a67503b6a6793
trackedFileCount: 309
pathDigest: 517056dee1200503b2e7295a333cb804bc71271bbaa87847fa762da025f276f1
contentDigest: 3dc0b2c699bde118d944e9304c725748b49c56619da8acf8040a36fdab37b06e
indexDigest: aa40982bffd5a453c56dd07e2aa75745128890cb81fa940c2dac6e051fa2e9d6
singleReadOwner: Orbit.store
```

## Gravicentra Insurance RC1

```text
releaseBranch: release/gravicentra-insurance-rc1-20260803
releaseCommit: 27cb7dfcda8568280ebef15993a953364304f29b
mobileShellFixCommit: 12a52de72f541cf39aae3556fd52a2d444d57b17
status: SOURCE_SEALED / NOT_DEPLOYED / NOT_PRODUCTION
```

La candidata agrega únicamente el correctivo compartido de `styles/base.css` sobre la base Gate 7.11 validada. No contiene parches por módulo ni hardcode A&S.

## Cierre runtime Gate 7.11

```text
run: 30816576914
job: 91695714377
requestCommit: 2ed9cc1c10139e4a413421999d52d0b1aaf45271
artifact: 8857032288
artifactDigest: sha256:c985c315cf140c187abe0126791261c06f2d5e6c38b8f885f6b444c6bb804de5
status: GATE711_RELEASE_CRITICAL_RUNTIME_PASS
classification: GO_LAB_RELEASE_CRITICAL_CRM_OPS_LEADS
```

## Datos preservados por la última evidencia aceptada

```text
clientes: 430
aseguradoras: 30
pólizas: 1,373
vehículos: 1,032
recibos esperados: 1,294
cartera: 673
cobros: 5
asesores: 7
```

No corresponde reimportar ni modificar estos módulos para resolver el STOP contractual.

## Predeploy RC1 — NO_GO

```text
run: 30868524436
job: 91865447742
requestCommit: 4bbc75b5b1f95179628bb784be59cede6b26d58b
artifact: 8877002560
artifactDigest: sha256:d61c81d34fb9b69aee0eca9c232064aad94ebc28012c6df2985a8c7c4153da47
decision: NO_GO
classification: VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE
```

Etapa:

```text
autorización inmutable: PASS
contrato vigente antes de secrets: FAIL
checks: 12/18 PASS
failed: LIFECYCLE, AUTHORIZATION, REQUEST, CUMULATIVE, DIGESTS, NO_WRITES
```

No se accedió a credenciales, Firestore, Hosting, versión pública, colecciones o feature flags. No hubo escrituras, deploy, Rules, Functions, producción, main o merge.

## Causa raíz

El entrypoint canónico continúa consumiendo:

```text
.github/orbit360-requests/canonical-runtime-cumulative-visual-lab-v20260801.json
tools/orbit360-validator-lifecycle-contract-canonical-runtime-cumulative-visual-lab-v20260801.json
```

Esos archivos permanecen en `STOP_RETRY`, con autorización histórica consumida y manifest anterior. No fueron promovidos al cierre posterior PASS de:

```text
tools/orbit360-validator-lifecycle-contract-gate711-release-critical-runtime-v20260802.json
run 30816576914
status CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_PASS_CLOSED
```

Owner:

```text
tools/orbit360-validar-gate-contracts-v20260717.mjs
tools/orbit360-validar-gate-contracts-engine-canonical-runtime-cumulative-visual-lab-v20260801.mjs
```

El defecto no pertenece al producto, los módulos ni los datos.

## Cloud / Claude / Academia

```text
CL-094 a CL-097: shell móvil y release sellada
CL-098 a CL-100: promoción contractual después de PASS
paquete reusable documentado: sí
paquete enviado: no
recepción/incorporación: no/no
```

Documentos:

- `GRAVICENTRA-INSURANCE-RC1-SEALED-20260803.md`
- `CIERRE-PREDEPLOY-GRAVICENTRA-RC1-NO-GO-VALIDATOR-STALE-20260803.md`
- `ADDENDUM-PREDEPLOY-RC1-VALIDATOR-STALE-CLOUD-ACADEMIA-20260803.md`

## Siguiente acción exacta

```text
root fix source-only del registro/contrato canónico de predeploy
→ PASS estático antes de secrets
→ evidencia del correctivo
→ una sola autorización de reanudación del predeploy
```

No repetir Gate 7.11, no abrir otra auditoría general y no tocar RC1, datos o módulos.
