# Cierre de salida productiva — Gravicentra Insurance RC1.1 con datos reales

Fecha operativa: 2026-08-03  
Resultado final: `RC11_REAL_DATA_GO_LIVE_PASS`  
Clasificación: `PRODUCTION_SMOKE_PASS`

## 1. Candidata publicada

```text
releaseBranch: release/gravicentra-insurance-rc1-1-real-data-runtime-20260803
releaseCommit: 1eb7daea580c0807d867a663086defc021435993
baseReleaseCommit: 27cb7dfcda8568280ebef15993a953364304f29b
productDelta: orbit360-platform/core/backend-lab-loader.js
```

RC1 histórica se preservó. RC1.1 incorpora únicamente el root fix del propietario compartido del runtime para impedir que el host canónico caiga al modo demo.

## 2. Causa raíz cerrada

El host canónico `ays-orbit-360-lab.web.app` no era reconocido por `core/backend-lab-loader.js`. La navegación directa sin parámetros no activaba Firebase ni el adaptador Firestore; `auth.js` y `seed.js` quedaban como fallback visible.

Cadena del defecto:

```text
host canónico no reconocido
→ URL no normalizada
→ backend Firestore no activado
→ store real no instalado
→ auth demo
→ seed ficticio renderizado
```

No existió pérdida de información ni necesidad de reimportar. Los datos reales permanecieron intactos en Firestore.

## 3. Root fix aplicado

El loader v1.112:

- reconoce `ays-orbit-360-lab.web.app`;
- reconoce `ays-orbit-360-lab.firebaseapp.com`;
- conserva los previews autorizados;
- normaliza cualquier acceso directo a `orbitBackend=firestore-lab`, tenant `alianzas-soluciones` y runtime sellado;
- declara `noFallback:true` y `noSeedAsSource:true`;
- conserva localhost como prototipo local separado;
- no contiene credenciales ni datos reales.

## 4. Reanudación de pipeline sin nueva autorización

La primera ejecución correctiva se detuvo antes de riesgo:

```text
run: 30873677207
job: 91880620599
classification: PIPELINE_MECHANISM_FAILURE
rootCause: guard resolvió la rama release como referencia local en vez de origin/remoto
secretsRead: false
firestoreRead: false
deployExecuted: false
productionTouched: false
```

El owner fue corregido en:

```text
tools/orbit360-gravicentra-rc11-real-data-go-live-guard-v20260803.mjs
rootFixCommit: f443ddef27d83e29ddc7d55edc57c80cb084daf1
```

La misma autorización fue reanudada mediante prueba pre-risk; no se solicitó ni consumió una segunda autorización.

## 5. Ejecución productiva aprobada

```text
run: 30873857404
job: 91881167859
artifact: 8878818773
artifactDigest: sha256:f9298ccf0bb40cd84fbf5712569a6279896994fd9388e0b2ca9c9f769c254c18
```

Todas las etapas cerraron `success`:

1. contrato canónico antes de credenciales;
2. reanudación pre-risk de la misma autorización;
3. guard RC1.1 12/12;
4. candidata exacta y delta único;
5. snapshot inicial y ancla de rollback;
6. deploy exclusivo de Firebase Hosting;
7. navegador real desde URL sin parámetros;
8. autenticación existente;
9. store Firestore, snapshots y conteo renderizado;
10. snapshot final y paridad de datos;
11. evidencia sanitizada y cierre.

El rollback quedó `skipped` porque el navegador y los datos obtuvieron PASS.

## 6. Evidencia de navegador real

```text
directUrlNormalized: true
publicLoaderExactlyRc11: true
publicLoaderDeclaresCanonicalHost: true
publicLoaderBlocksSeedFallback: true
backendModeReal: true
tenantReal: true
noFallback: true
firebaseRequested: true
storeFirestore: true
canonicalReadModel: true
singleReadOwner: true
snapshotsAttached: true
realClientCount: true
realCountRendered: true
demoLoginAbsent: true
forbiddenDemoVisibleAbsent: true
forbiddenSeedRowsAbsent: true
authenticatedViewVisible: true
consoleErrorCount: 0
```

Observación sanitizada:

```text
backendStatus: ready
clientCount: 430
expectedClientCount: 430
forbiddenVisibleCount: 0
forbiddenStoreRows: 0
```

No se guardaron nombres, documentos, correos reales ni capturas con PII en el artifact.

## 7. Datos preservados

Conteos operativos:

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

Conteos canónicos:

```text
clientes: 430
aseguradoras: 30
pólizas: 1,375
vehículos: 1,033
recibos esperados: 1,294
cartera: 673
cobros: 7
```

Los conteos y digests before/after fueron idénticos.

## 8. Hosting y rollback

```text
release nueva: sites/ays-orbit-360-lab/releases/1785812942407000
version nueva: sites/ays-orbit-360-lab/versions/76b51c33f65c6cf9
ancla anterior: sites/ays-orbit-360-lab/versions/5fcc5758b2004b03
rollbackExecuted: false
```

## 9. Seguridad y exclusiones

```text
Firestore writes: 0
Auth writes: 0
Operational writes: 0
reimportación: no
Functions: no
Rules: no
main: no
merge: no
```

La autorización quedó consumida y no puede reutilizarse:

`tools/orbit360-gravicentra-insurance-rc11-real-data-go-live-consumption-v20260803.json`

## 10. Regla metodológica nueva

Un smoke productivo no puede aprobarse únicamente por:

- hashes de archivos;
- presencia textual de módulos;
- conteos Admin SDK;
- releases de Hosting.

Debe abrir la URL pública canónica sin parámetros, autenticar una identidad existente y probar la fuente realmente renderizada:

```text
host canónico
→ runtime esperado
→ auth real
→ store real
→ snapshots attached
→ conteo real renderizado
→ ausencia de seeds y usuarios demo
```

## 11. Estado final

```text
GRAVICENTRA_INSURANCE_RC11_REAL_DATA_LIVE
RC11_REAL_DATA_GO_LIVE_PASS
PRODUCTION_SMOKE_PASS
ROLLBACK_NOT_REQUIRED
```
