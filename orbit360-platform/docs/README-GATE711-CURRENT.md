# Gate 7.11 — referencia vigente

Fecha: 2026-08-02  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado rector

```text
GATE711_SECURITY_ROOT_FIX_CLOSED
GATE711_POST_ROOTFIX_MANIFEST_CLOSED
GATE711_POST_ROOTFIX_PACKAGE_SEALED
GATE711_POST_ROOTFIX_READINESS_49_OF_49_PASS
GATE711_PRIOR_RUNTIME_AUTHORIZATION_CONSUMED_STOP_RETRY
CRM_OPS_LEADS_RUNTIME_POST_ROOTFIX_PENDING_ONE_NEW_AUTHORIZATION
ACADEMIA_CONTENT_RUNTIME_NONBLOCKING
CLOUD_CLAUDE_PACKAGE_DOCUMENTED_NOT_SENT
HOSTING_DEPLOY_NOT_EXECUTED
PRODUCTION_NOT_EXECUTED
```

## Candidata acumulativa vigente

```text
productHead: 267f7231b46d65b80c167f54567a67503b6a6793
canonicalSnapshotDigest: 19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b
trackedFileCount: 309
pathDigest: 517056dee1200503b2e7295a333cb804bc71271bbaa87847fa762da025f276f1
contentDigest: 3dc0b2c699bde118d944e9304c725748b49c56619da8acf8040a36fdab37b06e
indexDigest: aa40982bffd5a453c56dd07e2aa75745128890cb81fa940c2dac6e051fa2e9d6
singleReadOwner: Orbit.store
```

Conteos esperados:

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

## Runtime que reveló el defecto real

```text
run: 30774888921
job: 91568393456
artifact: 8841696348
digest: sha256:f1ad7dc910b8047ff8f9dce8fb132ca953b91dcc048807576f00490fa3da3e1c
conclusion: FAILURE / STOP_RETRY
```

Este run avanzó más allá de los bloqueos anteriores:

```text
preflight contractual: PASS
identidad existente: PASS
rutas efímeras: PASS
snapshot inicial: PASS
servidor local: PASS
Firebase/Auth/Orbit.store: PASS
conteos operativos: PASS
legal: PASS
Dirección desktop: recorrida
Operativo tablet: recorrido
Asesor móvil: recorrido
CRM/Ops/Leads: recorridos
capturas sanitizadas: 13
write guard calls: 0
Firestore writes: 0
operational writes: 0
snapshot final: NOT_EXECUTED
```

Error:

```text
Cannot read properties of undefined (reading 'accion')
```

## Causa raíz cerrada

```text
classification: SECURITY_FAILURE
code: FROZEN_MODULE_INTERNAL_GUARD_REGISTRY
owner: modules/crm-v1198-operational-bridge.js
protected owner: modules/conciliaciones.js
```

Conciliaciones publica un owner `Object.freeze`. El bridge intentaba crear `__guardV1198` dentro del objeto congelado; la escritura fallaba y la lectura posterior de `[accion]` se ejecutaba sobre `undefined`, interrumpiendo la instalación de guards posteriores.

No fue un defecto de datos, identidad, membresías, Firestore, Academia ni del navegador.

## Root fix

El registro de guards se movió a un `WeakMap` externo:

```text
mutable owners: wrapped
Conciliaciones frozen/read-only: self_guarded_readonly
otro owner inmutable no reconocido: immutable_unwrapped (prohibido por gate)
```

Conciliaciones permanece congelado y read-only.

Evidencia:

```text
run: 30775623141
job: 91570495651
artifact: 8841926663
digest: sha256:ce683b51b0b0ff05bf11b5028d04e6ef8727cfc23c2ba797a8e9718e837d3904
commit: 267f7231b46d65b80c167f54567a67503b6a6793
```

Cambios de producto exactos:

1. `orbit360-platform/modules/crm-v1198-operational-bridge.js`
2. `orbit360-platform/index.html`

## Paquete post-rootfix

```text
package commit: ef0664335bd3085dc7b21b4988f408fed1ac4145
```

Actualizaciones:

- nueva candidata y digests;
- 13 capturas calculadas desde la matriz real;
- diagnóstico de `pageerror` con etapa, rol, ruta y stack;
- verificación de `Orbit.__crmV1198GuardDiagnostics`;
- cero `immutable_unwrapped`;
- Conciliaciones obligatorio en `self_guarded_readonly`;
- una sesión, un legal, un write guard y snapshots antes/después.

## Cierre estable post-rootfix

```text
run: 30776380035
job: 91572556496
artifact: 8842172646
digest: sha256:5b8fd7acfcafabf25538f34288a241472065855dacf69c18b8bb4748a30147cb
status: GATE711_POST_ROOTFIX_READINESS_PASS
classification: GO_STATIC_POST_ROOTFIX_RUNTIME_READY
checks: 49/49
```

Cierres contenidos:

```text
release-critical static: 38/38
runtime package readiness: 38/38
runtime chain: 56/56
router compatibility: 12/12
```

El cierre fue source-only: cero secretos, Firestore, navegador, deploy y producción.

## Seguridad y autorización

La autorización que produjo el run `30774888921` quedó consumida y no puede reutilizarse.

```text
replayAllowed: false
additionalExecutionsAllowed: false
STOP_RETRY: closed after root fix
```

El próximo runtime debe materializar un request y lifecycle nuevos sobre `267f7231b46d65b80c167f54567a67503b6a6793` y la evidencia 49/49.

## Cloud / Claude / Academia

```text
Hosting: NO EJECUTADO
paquete Cloud/Claude: DOCUMENTADO / NO ENVIADO
datos reales: NO ENVIADOS
secretos: NO ENVIADOS
Academia focused runtime: NO BLOQUEANTE
```

Patrón reusable nuevo: un bridge no debe almacenar metadata dentro de owners congelados; debe usar registro externo y contrato explícito para owners self-guarded read-only.

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

## Próxima frontera única

No corresponde otra auditoría, readiness, retorno a Academia ni apertura de otro módulo.

La única acción siguiente es una ejecución read-only post-rootfix del Gate 7.11 sobre `267f7231b46d65b80c167f54567a67503b6a6793`. Después de un PASS corresponde una sola revisión visual humana acumulativa. Producción continúa separada y requiere autorización explícita.

Documento de causa raíz: `CIERRE-ROOT-FIX-SEGURIDAD-GATE711-GUARDS-INMUTABLES-20260802.md`.
