# Runbook — empalme seguro última candidata 183042 v1330

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Trabajar sobre la última candidata, porque las versiones son incrementales, sin empalmar ZIP completo ni pisar backend protegido.

## Última candidata

```txt
Prototype Development Request - 2026-07-08T183042.881.zip
SHA256: 94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add
```

## Script

```txt
orbit360-platform/docs/scripts/APLICAR-EMPALME-SEGURO-ULTIMA-CANDIDATA-183042-V1330.ps1
```

## Qué aplica

Copia desde la última candidata:

```txt
orbit360-platform/modules/cliente360.js
orbit360-platform/modules/cobros.js
orbit360-platform/modules/configuracion.js
orbit360-platform/modules/portal.js
orbit360-platform/docs/BITACORA-CAMBIOS.md
orbit360-platform/docs/REPORTE-SMOKE.md
```

Luego aplica correcciones controladas:

```txt
Cliente360:
- acepta estado pendiente y pendiente_revision;
- cambia aclaracion_solicitada por requiere_aclaracion;
- separa aprobar de aplicar con confirmación APLICAR.

Cobros:
- factura metadata-only no concilia automáticamente;
- elimina comentario con readAsDataURL/base64.

Portal:
- reporte queda en revisión;
- comentario metadata-only limpio.

Configuración:
- ci-key pasa a ci-ref;
- copy de API key/token/backend se limpia;
- no persiste secretos.
```

## No aplica por defecto

```txt
index.html
```

Motivo: `index.html` es protegido. El script puede actualizar solo cache-bust de forma controlada si se ejecuta con:

```powershell
-UpdateIndexCacheBust
```

## Comando recomendado

Desde la raíz del repo:

```powershell
powershell -ExecutionPolicy Bypass -File orbit360-platform/docs/scripts/APLICAR-EMPALME-SEGURO-ULTIMA-CANDIDATA-183042-V1330.ps1 -ZipPath "C:\Users\paula\Downloads\Prototype Development Request - 2026-07-08T183042.881.zip"
```

Con cache-bust controlado:

```powershell
powershell -ExecutionPolicy Bypass -File orbit360-platform/docs/scripts/APLICAR-EMPALME-SEGURO-ULTIMA-CANDIDATA-183042-V1330.ps1 -ZipPath "C:\Users\paula\Downloads\Prototype Development Request - 2026-07-08T183042.881.zip" -UpdateIndexCacheBust
```

## Validaciones que ejecuta

```txt
node --check cliente360.js
node --check cobros.js
node --check configuracion.js
node --check portal.js
node tools/orbit360-validar-backend-lab-contrato.mjs si existe
scan patrones prohibidos principales
```

## Si sale OK

No hacer deploy. Copiar salida/reporte a ChatGPT para revisar `git status` y decidir commit controlado.

## Si falla

No commit. No push. Copiar salida completa a ChatGPT.

## Estado

Runbook creado. Pendiente ejecución local.