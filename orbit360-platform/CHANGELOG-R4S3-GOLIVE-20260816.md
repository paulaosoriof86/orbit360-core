# CHANGELOG · R4S3 Go-Live · 2026-08-16

## Cambio funcional

`core/access-scope.js` elimina el patrón relacional N×clone para scopes `team/own` mediante índices locales de relación cliente/póliza construidos una vez por filtro. No cambia la API pública, permisos, países ni la semántica de visibilidad.

Causa raíz: `FUNCTIONAL_DEFECT / ACCESS_SCOPED_RELATIONAL_NX_CLONE_TEAM_OWN`.

Gap de validación histórico: `VALIDATOR_STALE / ACCESS_FASTPATH_REGRESSION_DID_NOT_EXERCISE_SCOPED_RELATIONAL_TEAM_OWN_PATH`.

## Evidencia source-only

- regresión versionada PASS: run `31958357674`
- apply exacto: run `31959413313`, job `95194990667`
- commit funcional: `294ed22bdb564585b71fc59cefa1d04cdfa6b120`
- SHA256 `core/access-scope.js`: `624f7538809dbea59294a2c94a4acce58f326b0812625754891fb7b0fa4d3e1f`
- gate antes/después PASS
- producto modificado: 1 archivo
- writes: 0
- browser/secrets/data/production: false.

## Paquete R4S3

Run `31959607956` SUCCESS.

- `orbit360-fase-a-product-r4s3-294ed22bdb56.zip`
- SHA256 `1ab5f3ea7f59cd0c2eb2bb1f5c0596a4bf3ca241f42016f74bf095ccbaf0f78e`
- 194 archivos
- 1 delta: `core/access-scope.js`
- 193 archivos byte-idénticos a R4S2
- durable artifact `9266877667`
- evidence artifact `9266877528`
- estado `R4S3_MINIMAL_SUCCESSOR_DURABLE_CERTIFIED`.

## Publicación

Pendiente únicamente por frontera autenticada HostDime. R4S2 sigue publicada y preservada como rollback. No se ejecutará identidad pública ni browser hasta confirmación real de extracción de R4S3.

## Próximo gate

Tras publicación: identidad pública exacta R4S3 → gate canónico → exactamente una matriz final productiva read-only → refreeze inmediato.
