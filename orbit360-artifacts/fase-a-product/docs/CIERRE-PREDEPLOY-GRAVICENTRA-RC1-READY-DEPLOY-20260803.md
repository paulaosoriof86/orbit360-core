# Cierre predeploy — Gravicentra Insurance RC1 lista para autorización de deploy

Fecha: 2026-08-03  
Rama de trabajo: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Candidata sellada: `release/gravicentra-insurance-rc1-20260803`  
Release commit: `27cb7dfcda8568280ebef15993a953364304f29b`

## Decisión ejecutiva

```text
PREDEPLOY_READY_FOR_DEPLOY_AUTHORIZATION
```

La ejecución read-only formal emitió `GO_LIMITED_SCOPE`, pero la única condición limitante fue un defecto del probe: el método `projects.sites.get` se invocó con un nombre de recurso incompleto. No existió fallo de producto, datos, módulos, Hosting público ni rollback.

Después del análisis de causa raíz y del correctivo source-only en el owner real, la conclusión operativa es que RC1 puede pasar a una única autorización de deploy con smoke y rollback incluidos. No corresponde repetir el predeploy, Gate 7.11, migraciones ni auditorías generales.

## Ejecución read-only

```text
run: 30870375543
job: 91870978676
requestCommit: 087ab13e51cd8babfe0be703f7bc4d28428c24ce
artifact: 8877668933
artifactDigest: sha256:f1a4d93b803c28b004612788631395e34b571064329a8428a6e24f595901274d
workflowConclusion: success
formalDecision: GO_LIMITED_SCOPE
```

## Evidencia confirmada

### Candidata

```text
releaseFilesPresent: true
hostingPublicIsPlatform: true
candidateComplete: true
releaseCommit: 27cb7dfcda8568280ebef15993a953364304f29b
único delta frente al baseline: orbit360-platform/styles/base.css
```

### Módulos y feature flags

Todos los módulos requeridos están presentes tanto en RC1 como en la versión pública vigente:

```text
Cliente 360: true
Aseguradoras: true
Pólizas: true
Cobros: true
Ops: true
Leads: true
```

### Datos operativos reales

```text
clientes: 430 / 430
aseguradoras: 30 / 30
pólizas: 1,373 / 1,373
vehículos: 1,032 / 1,032
recibos esperados: 1,294 / 1,294
cartera: 673 / 673
cobros: 5 / 5
asesores: 7 / 7
sourceCountsMatch: true
```

### Datos canónicos

```text
clientes: 430 / 430
aseguradoras: 30 / 30
pólizas: 1,375 / 1,375
vehículos: 1,033 / 1,033
recibos esperados: 1,294 / 1,294
cartera: 673 / 673
cobros: 7 / 7
canonicalCountsMatch: true
dataComplete: true
```

Las diferencias canónicas corresponden a los cinco seeds técnicos ya identificados y excluidos de la vista operativa; no son pérdida ni duplicación de datos reales.

### Hosting público y rollback

```text
publicReachable: true
releaseCountObserved: 5
releasesReadStatus: 200
currentRelease: sites/ays-orbit-360-lab/versions/1e827fa406538a21
previousRelease: sites/ays-orbit-360-lab/versions/a4af7ab2f3156e5b
rollbackConfigPresent: true
exactRollbackAnchorAvailable: true
```

La versión pública todavía no coincide completamente con RC1, lo cual es el delta esperado antes del deploy. Los módulos y flags requeridos sí están presentes; los activos diferentes incluyen `index.html`, `styles/base.css`, `modules/polizas.js` y el adaptador público actual.

## Causa raíz del falso límite

Clasificación correcta:

```text
VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE
```

Owner:

```text
tools/orbit360-gravicentra-rc1-predeploy-probe-v20260803.mjs
```

El probe utilizaba:

```text
GET https://firebasehosting.googleapis.com/v1beta1/sites/{SITE_ID}
```

El recurso oficial de `projects.sites.get` exige:

```text
GET https://firebasehosting.googleapis.com/v1beta1/projects/{PROJECT_ID}/sites/{SITE_ID}
```

La consulta `sites/{SITE_ID}/releases` sí era correcta, por eso recuperó cinco releases y las anclas exactas de rollback. El error 404 no demostraba ausencia de sitio ni fallo de entorno.

## Correctivo

```text
probe fix commit: 534cd25038b15cd9cc73875183c9aa66f8a5a4d5
static validation run: 30870532357
static validation job: 91871440371
static artifact: 8877714836
static artifact digest: sha256:5b9e038cc7faaacd0e95a128ce63e2a81bef37b779c12cd4430305d34793ff13
static status: success
```

El correctivo cambió únicamente el nombre del recurso REST en el probe. No modificó RC1, datos, Firestore, Hosting, Rules, Functions, producción, main ni merge.

## Por qué no se repite el predeploy

La ejecución ya confirmó todos los hechos necesarios para decidir el deploy:

- candidata completa;
- módulos y flags presentes;
- conteos operativos y canónicos exactos;
- sitio público accesible;
- releases disponibles;
- versión actual y anterior identificadas;
- rollback exacto disponible;
- cero escrituras y cero deploy.

El único valor fallido provenía de una URL inválida construida por el validador. Repetir toda la lectura no aportaría evidencia nueva de producto y reabriría el mismo patrón de bucle.

## Seguridad

```text
Firestore read: true
Firestore writes: 0
operational writes: 0
auth writes: 0
reimportación: false
deploy: false
Functions: false
Rules: false
production writes: false
main/merge: false/false
containsPII: false
containsSecrets: false
```

## Cloud / Claude / Academia

Clasificación:

```text
probe operativo y credenciales: BACKEND_PROTEGIDO_NO_CLAUDE
patrón de resource names completos: REPLICABLE_CLAUDE_ACUMULADO
caso de falso ENVIRONMENT_FAILURE: ACADEMIA_ACTUALIZAR
información real y anclas internas: SECRETO_DATO_REAL / no enviar
```

El patrón queda documentado para el prototipo comercializable y futuros tenants, pero no se declara enviado a Cloud/Claude hasta contar con evidencia real de recepción.

## Siguiente acción única

```text
una autorización macro de deploy de RC1
→ backup y anclas ya fijadas
→ deploy Hosting de la candidata sellada
→ smoke productivo focalizado sobre Cliente 360, Aseguradoras, Pólizas, Cobros, Ops y Leads
→ verificar conteos y cero escrituras inesperadas
→ mantener deploy si PASS
→ rollback exacto a la versión 1e827fa406538a21 únicamente si el smoke falla
```

No se requieren más autorizaciones de predeploy, Gate 7.11, reimportación o auditoría general.
