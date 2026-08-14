# CIERRE PARCIAL R4 · HOSTDIME DEPLOYMENT CHANNEL BLOCKER · 2026-08-14

Estado: **R4 BLOQUEADO ANTES DE BACKUP/PUBLICACIÓN**.

Rama: `ays/backend-tenant-lab-v99-20260703`.
PR #5: draft/open, sin merge.

## Autorización R4

Se autorizó usar exclusivamente:

- ZIP `orbit360-fase-a-product-r3-4f70f0dd6e87.zip`;
- SHA256 `4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69`;
- destino `app.aysseguros.com`;
- secuencia obligatoria: hash → backup/rollback → publicación → E2E productivo.

Quedaron fuera de alcance reconstrucción, sustitución del paquete, reimportación, main y merge.

## Verificación del paquete

El SHA256 fue recalculado durante R4 y coincide exactamente con el certificado R3.

Resultado: **PASS_PACKAGE_INTEGRITY**.

No se modificó el ZIP.

## Evidencia HostDime recuperada

Las capturas de cPanel del 13 de agosto de 2026 establecen:

- usuario cPanel: `ayssegur`;
- servidor: `mjo.aysseguros.com`;
- IP compartida: `107.161.178.166`;
- subdominio: `app.aysseguros.com`;
- document root: `/home/ayssegur/public_html/app.aysseguros.com`;
- AutoSSL: Domain Validated, Let's Encrypt;
- una captura posterior de Domains mostró redirección HTTPS activa;
- clave pública SSH `orbit360_hostdime_prod_20260812`: autorizada/active.

La captura no expuso contraseña ni la clave privada.

## Búsqueda de canal automatizado

Se revisó la rama canónica y no se encontró:

- workflow HostDime/cPanel;
- tool FTP/SFTP/SSH/SCP/rsync para publicación;
- referencia al nombre de la clave SSH;
- integración HostDime/cPanel conectada.

La integración GitHub disponible no tiene permiso para listar los nombres de Actions secrets (`403 Resource not accessible by integration`), por lo que no se inventó un nombre de secreto.

El entorno actual tampoco tiene una credencial privada HostDime disponible.

## Clasificación de causa raíz

`ENVIRONMENT_FAILURE / HOSTDIME_DEPLOYMENT_CHANNEL_UNAVAILABLE`

No es:

- defecto funcional;
- regresión de R1/R2/R3;
- problema de datos;
- problema de hostname que justifique modificar producto.

El hostname/subdominio y document root ya están documentados. Falta exclusivamente un transporte autenticado utilizable por esta ejecución.

## Gate de seguridad aplicado

No es seguro ejecutar backup, publicación o rollback sin autenticación remota verificable. Por eso:

```text
remoteBackupExecuted: false
rollbackArtifactCreated: false
publishExecuted: false
productionE2EExecuted: false
productionTouched: false
packageRebuilt: false
```

## Avance

- readiness funcional: 100%;
- avance técnico: 75%;
- gates finales: 67% (2/3);
- R4 no suma avance parcial hasta publicación + E2E PASS.

## Siguiente acción exacta

Habilitar para la ejecución la credencial privada correspondiente a la clave pública SSH ya autorizada `orbit360_hostdime_prod_20260812`, o un conector cPanel/SFTP autenticado equivalente, sin pegar secretos en el chat.

Una vez disponible el transporte:

1. verificar nuevamente SHA256;
2. ejecutar gate canónico;
3. tomar backup timestamped del document root y registrar rollback;
4. publicar solo el ZIP certificado;
5. verificar `https://app.aysseguros.com`;
6. ejecutar E2E productivo final acordado;
7. cerrar R4 solo con PASS integral.

Si el mismo transporte falla dos veces, `STOP_RETRY` y clasificación de causa raíz antes de cualquier otra acción.
