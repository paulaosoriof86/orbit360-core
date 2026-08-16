# Orbit 360 · Plataforma

Estado rector: `docs/orbit360-live-state-v1.json`. Checkpoint: `docs/CIERRE-R4S3-CERTIFICACION-PENDIENTE-PUBLICACION-HOSTDIME-20260816.md`. Changelog: `CHANGELOG-R4S3-GOLIVE-20260816.md`.

R4S2 continúa **publicada y verificada** en `app.aysseguros.com`; Auth/runtime/tenant/430 clientes/30 aseguradoras y cero writes permanecen PASS. No se ha mutado todavía la publicación mientras se prepara R4S3.

La causa de `Operativo → cliente360` quedó cerrada como `FUNCTIONAL_DEFECT / ACCESS_SCOPED_RELATIONAL_NX_CLONE_TEAM_OWN`. El rootfix exclusivo de `core/access-scope.js` fue aplicado exactamente en commit `294ed22bdb564585b71fc59cefa1d04cdfa6b120`, después de gate + regresión, y volvió a pasar gate posterior. SHA256 del archivo R4S3: `624f7538809dbea59294a2c94a4acce58f326b0812625754891fb7b0fa4d3e1f`.

R4S3 quedó **certificada e inmutable** en run `31959607956`:

- ZIP `orbit360-fase-a-product-r4s3-294ed22bdb56.zip`
- SHA256 `1ab5f3ea7f59cd0c2eb2bb1f5c0596a4bf3ca241f42016f74bf095ccbaf0f78e`
- 194 archivos de producto
- exactamente 1 delta: `core/access-scope.js`
- exactamente 193 archivos byte-idénticos a R4S2
- durable artifact `9266877667`
- evidence artifact `9266877528`
- gate antes/después PASS
- browser/secrets/data/production: no ejecutados.

El ejecutor no dispone de transporte autenticado HostDime/cPanel/WHM/SFTP/SSH ni de workflow de despliegue ya configurado. La siguiente frontera es exclusivamente externa: publicar el ZIP R4S3 exacto en `/home/ayssegur/public_html/app.aysseguros.com`, preservando R4S2 como rollback. Solo después de confirmación real se permite una nueva identidad pública R4S3; únicamente con PASS se consume la única matriz productiva read-only autorizada y se refreezea inmediatamente.

No reimportación, cambios Auth/datos, main ni merge. Avance: **100% funcional / 75% técnico / 67% gates (2/3)** hasta `POST_GO_LIVE_SMOKE_PASS`.
