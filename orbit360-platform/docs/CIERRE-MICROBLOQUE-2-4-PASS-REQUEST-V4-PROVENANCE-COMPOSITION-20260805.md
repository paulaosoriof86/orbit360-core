# CIERRE MICROBLOQUE 2.4 — PASS REQUEST V4 + PROVENANCE + COMPOSICIÓN

Fecha local: 2026-08-04 23:54 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate único: `PASS_REQUEST_V4_PROVENANCE_COMPOSITION`  
Estado: `PASS`

## Resultado

```text
run: 30979519198
job: 92220738761
request commit: 5a770e7604a6b2a02839c48980f9e69c39428c7e
checks continuidad/provenance: 33/33 PASS
inner preflight: 32/32 PASS
outer router exit: 0
inner engine reached: true
```

## Provenance demostrada

```text
baseline presente: sí
baseline ancestro del parent HEAD: sí
producto idéntico al baseline: sí
request v3 blob inmutable: sí
blob v3: 82461e6a9699f1d8469d201be90bc40688e50613
```

El error de checkout superficial observado en el Microbloque 2.3 quedó resuelto mediante:

```text
fetch-depth: 0
git cat-file -e "$ORBIT360_SOURCE_BASELINE^{commit}"
```

## Topología segura de requests

```text
source-only consumido e inmutable:
.github/orbit360-requests/block12-go-lab-candidate-visible-v4-source-only.json

runtime futuro ausente:
.github/orbit360-requests/block12-go-lab-candidate-visible-v4.json

runtime anterior consumido e inmutable:
.github/orbit360-requests/block12-go-lab-candidate-visible-v3.json
```

El workflow runtime existente escucha únicamente el path v4 ausente. No se creó workflow visual paralelo.

## Frontera observada

```text
runtime autorizado: no
secretos: no
Firebase: no
Firestore read: no
Firestore writes: 0
Auth writes: 0
Functions deploy: no intentado
Hosting deploy: no intentado
navegador: no
deploy: no
Rules: no
reimportación: no
producción/main/merge: no
repetición 18/18: no
```

## Artefacto

```text
artifactId: 8919572096
digest: sha256:4116f7948253df6ee04f85d4dba3732bd176e5873db8631a199318e2bdc6b5f2
expira: 2026-08-19T05:53:49Z
```

## Causa raíz resuelta

Clasificación original: `PIPELINE_MECHANISM_FAILURE`.

Owner: `.github/workflows/orbit360-block12-visual-layoutfree-reactivation-lab-v20260804.yml`, etapa checkout/provenance.

La validación 2.4 demuestra que el baseline congelado ya está disponible y puede compararse contra el parent HEAD antes del preflight canónico.

## Siguiente acción exacta

Microbloque 2.5: recibir una autorización LAB nueva para crear únicamente el request runtime v4 vinculado al HEAD vigente y ejecutar una sola vez el workflow existente. El alcance podrá incluir preflight antes de secretos, cuatro Functions allowlisted, un Hosting preview retenido, ocho rutas aisladas y snapshots idénticos; no incluirá Rules, reimportación, producción, main, merge ni repetición funcional 18/18.
