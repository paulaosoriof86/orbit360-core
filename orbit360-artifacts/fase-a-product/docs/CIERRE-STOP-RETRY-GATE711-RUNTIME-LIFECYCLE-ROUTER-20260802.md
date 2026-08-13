# Cierre STOP_RETRY — Gate 7.11 runtime · lifecycle vs router

Fecha: 2026-08-02  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producto: `997fca628f95dd397dba347700a6bc644fe840f0`

## 1. Autorización consumida

La autorización de Paula Osorio de las 17:38 -06:00 cubría una única ejecución read-only del macro release-critical CRM/Ops/Leads, sin focused runtime de Academia, sin microautorizaciones y con STOP_RETRY ante cualquier fallo.

La ejecución fue:

```text
run: 30772737476
job: 91562610825
requestCommit: 9a0b4fbf062aa7731065a36c363858024cfec4d2
artifact: 8841039787
artifactDigest: sha256:faedbb562500ed403746818bfb0e77ff13adb15000fe38c545e4ee59be3e6664
```

## 2. Primer fallo real

```text
stage: CANONICAL_PREFLIGHT_ENTRYPOINT
status: VALIDATOR_STALE
classification: PIPELINE_MECHANISM_FAILURE
error: CANONICAL_LIFECYCLE_REVISION_MISMATCH
```

El freeze del producto, la inmutabilidad del request y la vinculación lifecycle-request pasaron antes del fallo.

La ejecución se detuvo antes de:

- instalar dependencias runtime;
- leer secrets;
- leer Firestore;
- preparar identidad;
- tomar snapshot inicial;
- iniciar servidor local;
- abrir navegador;
- ejecutar CRM/Ops/Leads.

Resultado de seguridad:

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

## 3. Causa raíz

El lifecycle materializado no era compatible con el contrato exacto del router canónico:

1. omitía `validatorLifecycleRevision: phase-capability-contract-v1`;
2. incluía `credentialRead` dentro de `executionProfile.capabilities`;
3. el router usa igualdad exacta de claves y valores para el perfil `LAB_RUNTIME_GATE`.

La readiness anterior validaba el template, el workflow, la sesión única y las guardas, pero no comparaba el lifecycle contra la composición y el conjunto exacto de capacidades exigidos por `tools/orbit360-validar-gate-contracts-v20260717.mjs`.

Clasificación definitiva: `VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`. No fue defecto funcional del producto, datos, identidad, CRM, Ops, Leads ni Academia.

## 4. Correctivo

Se corrigió:

- `tools/orbit360-gate711-release-critical-runtime-lifecycle-template-v20260802.json`;
- revisión canónica explícita;
- perfil `LAB_RUNTIME_GATE` con exactamente nueve capacidades;
- retiro del alias `credentialRead` del objeto canónico;
- nuevo validador `tools/orbit360-validar-gate711-runtime-router-compat-v20260802.mjs`.

Commits principales:

```text
templateFix: 6609b161a4c4cef5dbf5879b568354bdc0e4670f
compatValidator: a869875861abe10eb20f7a6fcc363657f59b3fd7
lifecycleClosure: d47b6431ba75a352e720f5ec6441eb76798a2125
```

## 5. Evidencia correctiva source-only

```text
run: 30772843811
job: 91562895150
artifact: 8841072752
artifactDigest: sha256:770f3127b280fbf6b95725df38b1bf65c7c444825fa631dc00d0b3e9dd454537
routerCompatibility: 12/12 PASS
packageReadiness: 38/38 PASS
productFreeze: PASS
```

Capacidades utilizadas:

```text
secrets: no
Firestore read/write: 0/0
runtime/browser: no/no
deploy/production: no/no
```

## 6. Estado

```text
runtimeAuthorization: CONSUMED
runtimeReplay: BLOCKED
STOP_RETRY: ACTIVE
productHead: UNCHANGED
AcademiaRuntimePrerequisite: false
CloudPackage: DOCUMENTED_NOT_SENT
Hosting: NOT_EXECUTED
Production: NOT_EXECUTED
```

No corresponde reintentar el run `30772737476`. Cualquier nueva ejecución runtime requiere una nueva autorización explícita y un request/lifecycle nuevos derivados del template corregido y validados contra el router.
