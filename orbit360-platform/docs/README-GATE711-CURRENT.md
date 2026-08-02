# Gate 7.11 — referencia vigente

Fecha: 2026-08-02

Leer en este orden:

1. `CIERRE-CAUSA-RAIZ-ACADEMIA-SESSION-WRITES-GATE711-20260802.md`
2. `CIERRE-STOP-RETRY-GATE711-MACRO-LIFECYCLE-REGISTRY-20260802.md`
3. `CIERRE-STOP-RETRY-GATE711-RERUN-CANONICAL-LIFECYCLE-20260802.md`
4. `ACADEMIA-CAUSA-RAIZ-SESSION-WRITES-IDEMPOTENCIA-20260802.md`
5. `CLAUDE-ROOTFIX-IDEMPOTENT-STATIC-CONTENT-SESSION-20260802.md`

## Estado vigente

```text
CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_STOP_RETRY
PRODUCT_FROZEN
PIPELINE_ROOT_CAUSE_DIAGNOSED
CANONICAL_LIFECYCLE_STATIC_COMPOSITION_12_12_PASS
RUNTIME_VERIFICATION_PENDING
```

## Producto canónico preservado

```text
authorizedProductHead:
6ebcb7e82545a6a6810ecf55d2cc8b8ad2783979

canonicalSnapshotDigest:
19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b

cumulativeManifestDigest:
9e737a2e20ee868ec804a66d249957260164ea393ed4576d4a67b3508a00f762
```

No se modificaron módulos, backend protegido ni datos del producto durante la reejecución.

## Root fix funcional preservado

```text
Owner: orbit360-platform/data/academia-v1230-operational-directory-v20260722.js
Función: apply
Trigger inválido eliminado: orbit:session
Root fix: fd49e1b15e69d1f023727b4ff92190852bcae1e0
```

Evidencia previa:

```text
Academia idempotente: 16/16 PASS
Manifiesto acumulativo: 10/10 PASS
Identidad efímera: 14/14 PASS
Lifecycle registry: 12/12 PASS
```

## Reejecución autorizada

```text
run: 30767242588
job: 91548028728
executionHead: 41fbe5df341bf8aedad3a6e51257b97caef503d0
artifact: 8839335174
digest: sha256:2e291d07f0565e66ace64e670590963c68514e15d94088fdf957fe7ddaca0b48
```

Resultado:

```text
status: STOP_RETRY
classification: PIPELINE_MECHANISM_FAILURE
stage: preflight_before_secrets
failedCheck: CANONICAL_PREFLIGHT_ENTRYPOINT
error: CANONICAL_LIFECYCLE_REVISION_MISMATCH
```

El registry corrigió el fallo anterior y pasó 12/12. El router canónico detuvo la ejecución porque exige:

```text
validatorLifecycleRevision: phase-capability-contract-v1
```

La revisión descriptiva del macro no puede sustituir ese contrato canónico.

## Prueba sintética de causa raíz

Plantilla inerte:

```text
tools/orbit360-gate711-canonical-lifecycle-template-v20260802.json
validatorLifecycleRevision: phase-capability-contract-v1
macroLifecycleRevision: macro-rootfix-then-full-canonical-v3
```

Evidencia:

```text
run: 30767368027
job: 91548365047
artifact: 8839374033
digest: sha256:d07f7a8562876c16d92ccd427d988f806f6f837f87adf0da4edcd326851c2abf
status: GATE711_CANONICAL_LIFECYCLE_COMPOSITION_STATIC_PASS
checks: 12/12
```

La prueba no usó secrets, Firestore, runtime ni navegador y produjo cero escrituras.

## Impacto real

```text
secret access: false
firestore read: false
runtime executed: false
browser executed: false
root fix runtime executed: false
full Gate 7.11 executed: false
firestore writes: 0
operational writes: 0
reimport: false
deploy: false
production: false
main/merge: false
```

## Seguridad y replay

```text
macro request: consumido
macro workflow: cerrado
macro lifecycle: STOP_RETRY
static request: consumido
static workflow: cerrado
autorizaciones activas: 0
runtime retry/replay: bloqueado
producto/datos: congelados
```

## Aprobación humana

```text
Clientes: aprobado previamente
Pólizas: pendiente
Vehículos: pendiente
Recibos: pendiente
Cartera: pendiente
Cobros: pendiente
Resto CRM: pendiente
```

## Siguiente frontera

No repetir el macro bajo la autorización consumida.

La preparación siguiente debe ser exclusivamente estática y consolidar un lifecycle/request canónico que conserve `phase-capability-contract-v1`, use un campo separado para la variante macro y pase el router completo antes de solicitar cualquier nueva ejecución runtime.
