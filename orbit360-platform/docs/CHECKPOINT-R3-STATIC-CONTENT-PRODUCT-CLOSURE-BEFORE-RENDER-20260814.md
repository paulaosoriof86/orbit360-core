# Orbit 360 A&S — Checkpoint previo R3 static-content product closure

Fecha: 2026-08-14
Estado: PRE_BROWSER_SOURCE_ONLY
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Estado preservado

- R1 cerrado.
- R2 cerrado: store productivo `ready-read-only`, 7/7 required, clientes=430, aseguradoras=30, writes=0.
- R3 dynamic graph cerrado.
- R3 tenant-context cerrado en run `31830646641`: Product App started, router started, tenant-context ready, active tenant insurer config ready, ruta `inicio` renderizada, 0 HTTP failures locales, 0 writes, 0 deploy, producción intacta.
- No tercer intento tenant-context.

## Nueva familia aislada

`PIPELINE_MECHANISM_FAILURE / PRODUCT_BOOTSTRAP_INCLUDES_LAB_ONLY_ACADEMIA_STATIC_CONTENT`

Evidencia: `data/academia-v1230-operational-directory-v20260722.js` declara `staticContentPersistence:'transient_session_only_in_lab'` y su `apply()` ejecuta `Orbit.store.insert/update` sobre contenido estático. En product read-only el store bloquea correctamente esas escrituras y produce `pageError: lecciones`.

## Única modificación autorizada en esta frontera

1. retirar `data/academia-v1230-operational-directory-v20260722.js` del `router-tenant-config-product-bootstrap-p0.js`;
2. no modificar Academia base, store productivo, Auth, membership, tenant-context, router, datos ni reglas;
3. reforzar el gate de composición para exigir que ese inyector LAB-only no aparezca ni en el bootstrap productivo ni en el artefacto final;
4. conservar las referencias críticas de Fase A (`inicio`, `cliente360`, `aseguradoras`, `ops`, `leads`) en el entrypoint;
5. ejecutar primero gate source-only y solo con PASS permitir secrets + una única prueba de navegador para esta nueva familia;
6. solo con cero pageErrors/local failures, tenant-context PASS, 7/7 required, 430/30 y render real crear manifest + SHA256 verificado + ZIP durable en el mismo run.

Si esta nueva familia falla otra vez, `STOP_RETRY`: no tercer intento de la misma familia.

HostDime, deploy y producción continúan bloqueados hasta ZIP durable certificado.
