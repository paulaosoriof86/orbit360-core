# Plan de empalme seguro — candidata Claude v1330 `2026-07-08T135740`

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Decisión

No empalmar ZIP completo. Empalmar de forma selectiva y corregida.

## Razón

La candidata contiene mejoras reales de frontend, pero también:

- protegidos dentro del ZIP completo;
- `index.html` modificado por cache-bust/login;
- Cobros con `readAsDataURL` en factura;
- aplicación de pago sin motivo/país-moneda;
- Config/Equipo gates incompletos;
- integración con key/token en store;
- Conciliaciones sin motivo al validar y sin confirmación reforzada al anular.

## Archivos que NO se deben empalmar desde ZIP

```txt
orbit360-platform/data/store.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
orbit360-platform/index.html
orbit360-platform/tools/orbit360-validate-marketing-integraciones.mjs
docs/BITACORA-CAMBIOS.md como reemplazo completo
```

## Archivos candidatos a empalme selectivo

### Aceptar como base con revisión

```txt
modules/cliente360.js
modules/portal.js
modules/conciliaciones.js
data/academia-plus.js
styles/infra.css
```

### No aceptar sin hotfix

```txt
modules/cobros.js
modules/configuracion.js
modules/equipo.js si se interviene como complemento de gates
```

## Hotfix P0 antes de declarar baseline corregido

1. Portal:
   - documento/adjunto metadata-only al reportar pago;
   - fecha dinámica en gestión;
   - estado canonical claro.
2. Cobros:
   - eliminar base64/readAsDataURL;
   - motivo obligatorio al validar/aplicar;
   - guard país/moneda;
   - copy de factura no debe decir conciliado automático.
3. Conciliaciones:
   - motivo obligatorio para validar;
   - confirmación reforzada al anular;
   - guard país/moneda al validar;
   - copy validada no aplicada.
4. Config/Equipo:
   - motivo y auditoría en crear/editar/inactivar usuario;
   - no último admin;
   - reset permisos/configuración con motivo/confirmación;
   - no guardar key/token en store.
5. Academia:
   - incorporar roles/permisos y auditoría unificada.

## Pipeline de empalme

```txt
auditoría forense
plan de aceptación por archivo
hotfix P0
node --check módulos tocados
runner agrupado cuando sea indispensable
documentar cierre
no merge
no deploy
no main
```

## Estado

Plan creado. Siguiente bloque recomendado: hotfix P0 de Cobros/Conciliaciones/Portal o crear script de empalme selectivo corregido.