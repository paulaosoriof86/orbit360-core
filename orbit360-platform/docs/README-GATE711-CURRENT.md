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
SHELL_MOBILE_CANONICAL_CI_EVIDENCE_PENDING
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

No hubo cambios de producto durante el runtime Gate 7.11. Después de la revisión visual se autorizó un único correctivo frontend compartido.

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

## Secuencia cerrada

```text
autorización y product freeze: PASS
preflight contractual antes de credenciales: 18/18 PASS
release-critical static: 38/38 PASS
identidad existente read-only: PASS
snapshot canónico inicial: PASS
checkout exacto servido localmente: PASS
una sesión CRM/Ops/Leads: PASS
snapshot canónico final: PASS
comparación exacta before/after: PASS
evidencia sanitizada: PASS
limpieza de temporales: PASS
```

## Datos verificados

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

## Seguridad y runtime preservados

```text
auth mode: existing_custom_token_readonly
single browser session: true
legal once: true
write guard: PASS
guards registrados: 11
immutable_unwrapped: 0
Conciliaciones: self_guarded_readonly
page errors: 0
console errors: 0
failed requests: 0
Auth writes: 0
Firestore writes: 0
operational writes: 0
```

No se ejecutaron reimportación, deploy, producción, main ni merge.

## Snapshot before / after

```text
before file digest: 0f64a9a1f81b79bbca0dfaae2277bf47d01f3f3347a23b8dd54b2133c9041e94
after file digest:  0f64a9a1f81b79bbca0dfaae2277bf47d01f3f3347a23b8dd54b2133c9041e94
byte identical: true
canonicalDigestSealed: 19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b
```

## Revisión visual humana

```text
capturas revisadas: 13
PASS visual directo: 10
defecto compartido: 3 capturas móviles
rutas afectadas: Cliente 360, Pólizas, Leads
clasificación: FUNCTIONAL_DEFECT
owner: Shell/Topbar responsive
datos/backend afectados: no/no
```

Causa raíz: el chrome móvil utilizaba dos filas, pero `#shell`, `#sidebar` y `.sb-overlay` conservaban el offset de `--topbar-h:56px`.

## Correctivo canónico de shell móvil

```text
commit de producto: 12a52de72f541cf39aae3556fd52a2d444d57b17
archivo propietario: orbit360-platform/styles/base.css
patrón: una sola altura móvil compartida por topbar, shell, sidebar y overlay
hardcode A&S: no
bridge por módulo: no
backend/data writes: 0/0
```

El fix es tenant-neutral, reutilizable y aplicable al prototipo comercializable. No modifica Cliente 360, Pólizas, Leads ni Ops de forma individual.

Validadores y workflow focalizado:

```text
tools/orbit360-validar-shell-mobile-rc1-v20260803.mjs
tools/orbit360-validar-shell-mobile-visual-v20260803.mjs
.github/workflows/orbit360-shell-mobile-rc1-static-v20260803.yml
```

La comprobación local focalizada del layout resultó PASS para las tres rutas a 390×844. Esa evidencia es de apoyo; la promoción a RC1 requiere todavía recuperar el PASS y artefacto del workflow canónico del repositorio.

## Cloud / Claude / Academia

```text
ledger actualizado: sí
ítems nuevos: CL-094 a CL-097
clasificación: REPLICABLE_CLAUDE_INMEDIATO + ACADEMIA_ACTUALIZAR
implementado en core: sí
documentado en GitHub: sí
enviado externamente a Cloud/Claude: no
deploy Cloud/Hosting: no
```

Documento de cierre:

`CIERRE-FIX-SHELL-MOVIL-RC1-CLOUD-ACADEMIA-20260803.md`

Ledger:

`ADDENDUM-SINCRONIZACION-CLOUD-CLAUDE-RUNTIME-UNIFICADO-20260802.md`

No se declarará sincronización Cloud/Claude sin evidencia efectiva de recepción e incorporación. El envío del delta reusable no debe bloquear la salida productiva de A&S.

## Autorización Gate 7.11

```text
autorización: CONSUMIDA
consumedByRun: 30816576914
replayAllowed: false
additionalExecutionsAllowed: false
```

No corresponde otro Gate 7.11, otra auditoría general ni reimportación.

## Próxima frontera única

```text
obtener PASS y artefacto del workflow focalizado de shell móvil
→ sellar nueva candidata acumulativa
→ declarar GRAVICENTRA_INSURANCE_RC1
→ preparar predeploy, backup y rollback
→ solicitar una sola autorización explícita de deploy
```

Producción, Hosting, main y merge continúan sin autorización.
