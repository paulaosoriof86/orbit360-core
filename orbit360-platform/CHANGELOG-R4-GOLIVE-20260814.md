# CHANGELOG R4 GO-LIVE · 2026-08-14

## R4 prepublish

Autorización recibida para backup/rollback, publicación en `app.aysseguros.com` y E2E productivo usando únicamente el paquete R3 certificado.

### Package integrity

- ZIP: `orbit360-fase-a-product-r3-4f70f0dd6e87.zip`;
- SHA256 certificado: `4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69`;
- SHA256 recalculado: MATCH;
- rebuild: no.

### HostDime evidence

Recuperado de capturas:

- cPanel user `ayssegur`;
- server `mjo.aysseguros.com`;
- shared IP `107.161.178.166`;
- `app.aysseguros.com` creado;
- document root `/home/ayssegur/public_html/app.aysseguros.com`;
- AutoSSL Let's Encrypt válido;
- public SSH key `orbit360_hostdime_prod_20260812` autorizada.

### Blocker

No existe un transporte autenticado accesible a esta ejecución: no private key, no cPanel/SFTP/SSH connector y no workflow/tool de deploy en el repo. La integración GitHub no puede listar Actions secrets.

Clasificación:

`ENVIRONMENT_FAILURE / HOSTDIME_DEPLOYMENT_CHANNEL_UNAVAILABLE`

### Safety result

- backup=0;
- rollback artifact=0;
- publish=0;
- production E2E=0;
- productionTouched=false;
- R1/R2/R3 intactos.

Avance permanece 100% funcional / 75% técnico / 67% gates.

Siguiente acción: habilitar solo el transporte autenticado HostDime; después ejecutar hash → gate → backup/rollback → publish exact package → production E2E.
