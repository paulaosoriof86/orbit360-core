# Gate 7.11 — referencia vigente

Fecha: 2026-08-02  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado rector

```text
GATE711_RELEASE_CRITICAL_STATIC_PASS_CLOSED
GATE711_RUNTIME_ROUTER_COMPAT_PASS_CLOSED
GATE711_RUNTIME_PACKAGE_READINESS_PATH_CONTRACT_PASS_CLOSED
GATE711_RUNTIME_AUTHORIZATION_1815_CONSUMED_STOP_RETRY
CRM_OPS_LEADS_RUNTIME_READONLY_PENDING_NEW_AUTHORIZATION
ACADEMIA_CONTENT_RUNTIME_NONBLOCKING
CLOUD_CLAUDE_PACKAGE_DOCUMENTED_NOT_SENT
HOSTING_DEPLOY_NOT_EXECUTED
PRODUCTION_NOT_EXECUTED
```

## Producto canónico acumulativo

```text
productHead: 997fca628f95dd397dba347700a6bc644fe840f0
canonicalSnapshotDigest: 19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b
cumulativeManifestDigest: 3d25a83218a4373513e1fff24ea9b12817d4c47be0fad08777e7f94867b3f676
trackedFileCount: 309
singleReadOwner: Orbit.store
```

Conteos operativos esperados:

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

## Alcance release-critical

Una sola candidata acumulativa:

- shell, router, auth, legal, multirol, scopes y `Orbit.store`;
- Cliente 360 y Aseguradoras;
- Pólizas y Vehículos;
- Recibos esperados, Cartera y Cobros;
- Ops y Leads;
- Dirección desktop, Operativo tablet y Asesor móvil;
- estados honestos, cero copy técnico y cero escrituras.

Academia conserva integridad estática, pero la completitud de sus lecciones y su focused runtime no bloquean este release.

## Evidencia estática cerrada

```text
release-critical static:
run 30771933766 · 38/38 PASS
artifact 8840787308

lifecycle-router compatibility:
run 30772843811 · 12/12 PASS
artifact 8841072752

package readiness inicial:
run 30772261072 · 38/38 PASS
artifact 8840893567

package readiness con rutas efímeras:
run 30774296503 · 38/38 PASS
artifact 8841489287
sha256:ec4a75a9ec951306279c31b5d09d1545b11dae76b578c0dcd3d69bd11c26cc03
```

Todos estos cierres preservaron el product freeze y no utilizaron deploy ni producción.

## Ejecución runtime autorizada a las 18:15

```text
run: 30774123443
job: 91566222407
requestCommit: 5e9fce8c9d681b6a7eec9145d725107df9848b5e
artifact: 8841443031
artifactDigest: sha256:ce6ec1619c7b5e87dbc583c23e806a139ca823ca6ec25740c5867f6f42fc69a1
conclusion: FAILURE / STOP_RETRY
```

Etapas verificadas:

```text
autorización inmutable y product freeze: PASS
preflight contractual: 18/18 PASS
release-critical static: 38/38 PASS
dependencias: PASS
cuenta de servicio LAB: PASS
helper de identidad existente: PASS
postcheck de ruta efímera: FAIL
snapshot inicial: NOT_EXECUTED
servidor local: NOT_EXECUTED
runtime CRM/Ops/Leads: NOT_EXECUTED
snapshot final: NOT_EXECUTED
```

Evidencia de identidad:

```text
status: CANONICAL_BROWSER_EXISTING_IDENTITY_READY
classification: GO_LAB_EXISTING_IDENTITY_READONLY
eligibleExistingIdentityCount: 1
uidMatched: true
emailMatched: true
customTokenCreatedEphemeral: true
authWrites: 0
firestoreWrites: 0
operationalWrites: 0
```

## Clasificación y causa raíz

```text
classification: PIPELINE_MECHANISM_FAILURE
failedStage: PREPARE_EXISTING_IDENTITY_READONLY_POSTCHECK
error: EPHEMERAL_TOKEN_PATH_POSTCHECK_MISMATCH
```

El workflow calculaba rutas para el token y la configuración, pero no las exportaba antes de invocar el helper. El helper creó correctamente la identidad y el token en su fallback canónico; el step posterior comprobó otra ruta y produjo un falso fallo.

No fue un defecto de:

- producto;
- Academia;
- Auth o membresías;
- datos;
- CRM, Ops o Leads.

## Correctivo cerrado

Archivos:

- `.github/workflows/orbit360-gate711-release-critical-runtime-v20260802.yml`
- `tools/orbit360-validar-gate711-runtime-package-readiness-v20260802.mjs`

Cambios:

```text
export ORBIT360_CUSTOM_TOKEN_FILE="$TOKEN_FILE"
export ORBIT360_LOCAL_FIREBASE_CONFIG_FILE="$CONFIG_FILE"
explicitTokenPathHonored: obligatorio
explicitConfigPathHonored: obligatorio
```

Commits:

```text
workflow fix: cbd04a88cb6b0d4c59b0cf927401f68a8ba6bbb9
readiness coverage: 7ddc43c5d745d5ce4ba9a5d26a1321101cfe22b1
```

La validación source-only `30774296503` confirmó nuevamente 38/38 PASS, cero secretos, cero Firestore, cero navegador y cero cambios de producto.

## Seguridad y replay

```text
autorización 18:15: consumida
replayAllowed: false
additionalExecutionsAllowed: false
STOP_RETRY: active
firestoreWrites: 0
operationalWrites: 0
reimportación: no
Hosting/deploy: no/no
producción/main/merge: no/no/no
```

Aunque la cuenta de servicio fue leída y el helper hizo lecturas de Auth/Firestore autorizadas, los archivos temporales se limpiaron y ningún secreto fue incorporado a la evidencia.

## Cloud / Claude / Academia

```text
Hosting posterior al root fix: NO EJECUTADO
paquete Claude/Cloud reutilizable: DOCUMENTADO / NO ENVIADO
datos reales A&S: NO ENVIADOS
secretos/credenciales: NO ENVIADOS
```

Fuentes vigentes:

1. `SINCRONIZACION-CLOUD-CLAUDE-ACUMULADA-20260802.md`
2. `ADDENDUM-SINCRONIZACION-CLOUD-CLAUDE-RUNTIME-UNIFICADO-20260802.md`

El addendum incluye ahora CL-081 a CL-083: exportación de rutas temporales, validación productor-consumidor y diferencia entre identidad válida y fallo posterior del pipeline. Solo viajarán como patrón sanitizado; no se enviarán rutas, UID, correos, tokens, secrets ni backend protegido.

## Aprobación humana

```text
Clientes: aprobado previamente
Aseguradoras: baseline acumulativo
Pólizas: pendiente
Vehículos: pendiente
Recibos: pendiente
Cartera: pendiente
Cobros: pendiente
Ops: pendiente
Leads: pendiente
```

## Documentación vigente

1. `CIERRE-STOP-RETRY-GATE711-IDENTIDAD-RUTAS-EFIMERAS-20260802.md`
2. `CIERRE-STOP-RETRY-GATE711-RUNTIME-LIFECYCLE-ROUTER-20260802.md`
3. `CIERRE-READINESS-MACRO-RUNTIME-GATE711-CRM-OPS-LEADS-20260802.md`
4. `CIERRE-STOP-RETRY-GATE711-ACADEMIA-OWNER-BOOTSTRAP-20260802.md`
5. `SINCRONIZACION-CLOUD-CLAUDE-ACUMULADA-20260802.md`
6. `ADDENDUM-SINCRONIZACION-CLOUD-CLAUDE-RUNTIME-UNIFICADO-20260802.md`

## Siguiente frontera exacta

No corresponde otra auditoría, otro readiness ni retorno a Academia.

Cualquier nueva ejecución runtime requiere una nueva autorización explícita porque la autorización de las 18:15 fue consumida por el run `30774123443`. El nuevo request y lifecycle deberán derivarse del workflow corregido y del package readiness 38/38 del run `30774296503`.

Después de un PASS corresponde una sola revisión visual humana acumulativa. El go-live permanece separado y requiere autorización productiva explícita.
