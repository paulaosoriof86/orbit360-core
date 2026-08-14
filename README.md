# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence`;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CIERRE-PARCIAL-R4-HOSTDIME-DEPLOYMENT-CHANNEL-BLOCKER-20260814.md`;
6. `orbit360-platform/CHANGELOG-R4-GOLIVE-20260814.md`.

No usar memoria, README histórico ni paquetes antiguos como sustituto del live-state.

## Estado vivo · R4 PREPUBLISH BLOQUEADO POR ENTORNO · 2026-08-14

```text
stateVersion: 20260814.r4-environment-blocked-hostdime-deployment-channel.1
fase: R4_ENVIRONMENT_BLOCKED_HOSTDIME_DEPLOYMENT_CHANNEL
R1/R2/R3: CERRADOS
ZIP: orbit360-fase-a-product-r3-4f70f0dd6e87.zip
SHA256: 4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69
app.aysseguros.com: creado en cPanel
document root: /home/ayssegur/public_html/app.aysseguros.com
deploy: 0
producción tocada: no
```

## R4 preflight

La autorización R4 está vigente y el hash del paquete se verificó nuevamente con coincidencia exacta. No se reconstruyó ni sustituyó el ZIP.

Las capturas HostDime recuperadas establecen:

- usuario cPanel `ayssegur`;
- servidor `mjo.aysseguros.com`;
- IP compartida `107.161.178.166`;
- `app.aysseguros.com` creado;
- document root `/home/ayssegur/public_html/app.aysseguros.com`;
- AutoSSL válido de Let's Encrypt;
- clave pública SSH `orbit360_hostdime_prod_20260812` autorizada.

El bloqueo actual no es hostname ni producto. La ejecución no dispone de la clave privada correspondiente, de un conector cPanel/SFTP/SSH autenticado ni de un workflow/tool de despliegue HostDime en el repositorio. El inventario de Actions secrets tampoco es accesible por la integración GitHub actual.

Clasificación:

`ENVIRONMENT_FAILURE / HOSTDIME_DEPLOYMENT_CHANNEL_UNAVAILABLE`

## Regla aplicada

No se publica sin backup remoto verificable y rollback previo. Por tanto:

- backup remoto: no ejecutado;
- publicación: no ejecutada;
- E2E productivo: no ejecutado;
- producción: intacta;
- R1/R2/R3: no reabiertos;
- paquete: intacto.

## Avance

```text
readiness funcional: 100%
avance técnico: 75%
gates finales: 67% (2/3)
R4: bloqueado antes de backup/publicación
```

## Siguiente acción exacta

Habilitar únicamente el transporte autenticado HostDime para esta ejecución, preferentemente la credencial privada correspondiente a la clave pública SSH ya autorizada o un conector cPanel/SFTP autenticado. No pegar secretos en el chat.

Con el canal disponible:

1. volver a verificar el SHA256 exacto;
2. ejecutar el gate canónico antes de operaciones remotas;
3. crear backup timestamped de `/home/ayssegur/public_html/app.aysseguros.com` y ruta de rollback;
4. publicar exclusivamente el contenido del ZIP certificado;
5. ejecutar inmediatamente el E2E productivo final;
6. mantener main/merge, reimportaciones y reconstrucción fuera de alcance.

## Reglas anti-bucle

- R1/R2/R3 permanecen cerrados;
- HostDime no provoca cambios de producto;
- no se inventan credenciales, puertos o rutas;
- no se publica sin backup/rollback;
- dos fallos del mismo transporte implican `STOP_RETRY`;
- cada cambio de estado sincroniza live-state + PR #5 + README + checkpoint + bitácora.
