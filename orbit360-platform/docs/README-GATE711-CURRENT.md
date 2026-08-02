# Gate 7.11 — referencia vigente

Fecha: 2026-08-02  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado rector

```text
GATE711_RELEASE_CRITICAL_STATIC_PASS_CLOSED
GATE711_RUNTIME_PACKAGE_READINESS_PASS_CLOSED
GATE711_RUNTIME_AUTHORIZATION_CONSUMED_STOP_RETRY
GATE711_RUNTIME_ROUTER_COMPAT_PASS_CLOSED
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

Release-critical:

```text
run: 30771933766
job: 91560447718
artifact: 8840787308
checks: 38/38 PASS
classification: GO_STATIC_RELEASE_CRITICAL_CRM_OPS_LEADS
productFreeze: PASS
```

Package readiness:

```text
run: 30772261072
job: 91561337917
artifact: 8840893567
checks: 38/38 PASS
classification: GO_STATIC_RUNTIME_PACKAGE_CRM_OPS_LEADS
packageInert: true
```

## Runtime autorizado consumido

```text
run: 30772737476
job: 91562610825
requestCommit: 9a0b4fbf062aa7731065a36c363858024cfec4d2
artifact: 8841039787
artifactDigest: sha256:faedbb562500ed403746818bfb0e77ff13adb15000fe38c545e4ee59be3e6664
```

Primer fallo:

```text
stage: CANONICAL_PREFLIGHT_ENTRYPOINT
status: VALIDATOR_STALE
classification: PIPELINE_MECHANISM_FAILURE
error: CANONICAL_LIFECYCLE_REVISION_MISMATCH
```

La ejecución terminó antes de secrets, Firestore, identidad, snapshot, servidor y navegador:

```text
secretsRead: false
firestoreRead: false
firestoreWrites: 0
operationalWrites: 0
runtimeExecuted: false
browserExecuted: false
deployExecuted: false
productionTouched: false
```

La autorización quedó consumida y el replay está bloqueado.

## Causa raíz y correctivo

El lifecycle materializado:

1. omitía `validatorLifecycleRevision: phase-capability-contract-v1`;
2. incluía el alias `credentialRead` dentro del objeto de capacidades;
3. no era compatible con la igualdad exacta exigida por el router canónico.

La readiness anterior no comparaba el template contra ese contrato real.

Correctivos:

- template con revisión canónica explícita;
- perfil `LAB_RUNTIME_GATE` con exactamente nueve capacidades;
- retiro del alias del objeto canónico;
- nuevo validador lifecycle-router.

Evidencia correctiva:

```text
run: 30772843811
job: 91562895150
artifact: 8841072752
artifactDigest: sha256:770f3127b280fbf6b95725df38b1bf65c7c444825fa631dc00d0b3e9dd454537
routerCompatibility: 12/12 PASS
packageReadiness: 38/38 PASS
productFreeze: PASS
```

No se utilizaron credenciales, Firestore, runtime, navegador, deploy ni producción en el correctivo.

## Cloud / Claude

```text
Hosting posterior al root fix: NO EJECUTADO
paquete Claude/Cloud reutilizable: DOCUMENTADO / NO ENVIADO
datos reales A&S: NO ENVIADOS
secretos/credenciales: NO ENVIADOS
```

Fuentes vigentes:

1. `SINCRONIZACION-CLOUD-CLAUDE-ACUMULADA-20260802.md`
2. `ADDENDUM-SINCRONIZACION-CLOUD-CLAUDE-RUNTIME-UNIFICADO-20260802.md`

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

1. `CIERRE-STOP-RETRY-GATE711-RUNTIME-LIFECYCLE-ROUTER-20260802.md`
2. `CIERRE-READINESS-MACRO-RUNTIME-GATE711-CRM-OPS-LEADS-20260802.md`
3. `CIERRE-STOP-RETRY-GATE711-ACADEMIA-OWNER-BOOTSTRAP-20260802.md`
4. `SINCRONIZACION-CLOUD-CLAUDE-ACUMULADA-20260802.md`

## Siguiente frontera exacta

No corresponde otra auditoría ni retorno a Academia.

Cualquier nueva ejecución runtime requiere una nueva autorización explícita porque la autorización de las 17:38 fue consumida por el run `30772737476` y STOP_RETRY impide reutilizarla.

La siguiente autorización deberá cubrir un único macro read-only nuevo, derivado del template ya compatible 12/12 con el router y conservando package readiness 38/38. Después del PASS corresponde una sola revisión visual humana acumulativa; el go-live permanece separado y requiere autorización productiva explícita.
