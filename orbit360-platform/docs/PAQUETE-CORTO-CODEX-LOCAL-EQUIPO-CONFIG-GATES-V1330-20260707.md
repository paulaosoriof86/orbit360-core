# Paquete corto Codex/local — Equipo + Configuración gates v1330

Fecha: 2026-07-07
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Cerrar funcionalmente los gates administrativos mínimos que quedaron pendientes porque el conector GitHub bloqueó o hizo riesgoso el reemplazo completo de archivos administrativos.

Este paquete es para Codex o entorno local controlado. No debe ejecutarse como bloque largo pegado en consola.

## Restricciones obligatorias

No tocar:

- `orbit360-platform/data/store.js`
- `orbit360-platform/data/store-firestore-lab.local.js`
- `orbit360-platform/core/backend-lab-loader.js`
- `orbit360-platform/core/backend-lab-init.js`
- `orbit360-platform/core/backend-lab-security-guard.js`
- `orbit360-platform/core/auth.js`
- `orbit360-platform/core/importa.js`
- `firestore.rules`
- `tools/orbit360-*`
- `index.html`

No hacer:

- merge a `main`;
- deploy;
- producción;
- carga de datos reales;
- secretos;
- cambios de Auth real;
- reemplazo de backend LAB.

## Archivos a modificar

Solo estos dos archivos funcionales:

- `orbit360-platform/modules/equipo.js`
- `orbit360-platform/modules/configuracion.js`

Y documentación de cierre:

- `orbit360-platform/docs/HOTFIX-EQUIPO-CONFIG-GATES-V1330-20260707.md`

## Bloque A — Equipo

### Problema actual

`equipo.js` ya tiene copy honesto: crear usuario en Equipo no equivale a invitación/Auth enviada.

Pendiente funcional:

- crear/editar usuario guarda directo;
- cambio de roles guarda directo;
- cambio de módulos visibles guarda directo;
- inactivación guarda directo;
- matriz de permisos guarda directo;
- reset de permisos no pide motivo fuerte;
- no hay bloqueo explícito de último Dirección/Admin activo.

### Cambios requeridos

1. Agregar helper de actividad administrativa local.
2. Detectar cambios sensibles en usuario:
   - nuevo usuario;
   - cambio de roles;
   - cambio de módulos visibles;
   - inactivación;
   - degradar/quitar rol Dirección/Admin.
3. Para cambios sensibles:
   - pedir motivo obligatorio;
   - pedir confirmación;
   - registrar actividad.
4. Bloquear dejar tenant sin Dirección/Admin activo.
5. Cambios en permisos:
   - pedir confirmación siempre;
   - pedir motivo si módulo es Configuración, Finanzas o Comisiones, o si el rol es Dirección/Admin;
   - revertir checkbox si se cancela;
   - registrar actividad.
6. Reset de permisos:
   - pedir motivo obligatorio;
   - pedir confirmación;
   - registrar actividad;
   - regenerar permisos por defecto.
7. Mantener copy honesto de Auth pendiente.

### Criterio de aceptación Equipo

Pasa si:

- no se puede dejar cero usuarios activos Dirección/Admin;
- cambiar rol/módulos/inactivo pide motivo;
- cambiar permisos sensibles pide motivo;
- cancelar revierte cambio visual;
- crear usuario no afirma invitación enviada;
- no toca Auth real;
- `node --check modules/equipo.js` OK.

## Bloque B — Configuración

### Problema actual

`configuracion.js` permite acciones sensibles con gates débiles:

- cambio de plan;
- módulos activos;
- reset;
- integraciones/estado operativo.

### Cambios requeridos

1. Cambio de plan:
   - pedir confirmación;
   - pedir motivo obligatorio;
   - registrar actividad;
   - revertir select si se cancela.
2. Módulos activos:
   - pedir confirmación;
   - pedir motivo obligatorio;
   - registrar actividad;
   - impedir apagar `configuracion`;
   - conservar `equipo` si ya estaba activo, para no bloquear administración.
3. Reset de configuración:
   - confirmación fuerte;
   - motivo obligatorio;
   - actividad/auditoría;
   - no borrar tenant ni backend;
   - no borrar datos reales fuera de alcance.
4. Integraciones:
   - mantener lenguaje honesto: preparada/configurada no equivale a conectada/activa;
   - no afirmar conexión real sin proveedor/canal confirmado.
5. Corregir texto residual visible si existe en fila de editar plan.

### Criterio de aceptación Configuración

Pasa si:

- cambiar plan pide motivo y confirmación;
- módulos activos no permiten apagar Configuración;
- reset pide motivo y confirmación fuerte;
- integración no se muestra activa sin conexión real;
- `node --check modules/configuracion.js` OK.

## Validación común

Ejecutar en local o Codex:

```bash
node --check orbit360-platform/modules/equipo.js
node --check orbit360-platform/modules/configuracion.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

Luego verificar:

- backend protegido intacto;
- `index.html` intacto;
- no secretos;
- no datos reales;
- no deploy;
- no merge.

## Smoke visual mínimo

### Equipo

- Crear usuario muestra Auth/invitación pendiente.
- Cambiar rol pide motivo.
- Quitar último Dirección/Admin se bloquea.
- Cambiar permiso sensible pide motivo.
- Cancelar permiso revierte checkbox.
- Reset permisos pide motivo.

### Configuración

- Cambiar plan pide motivo.
- Apagar módulos pide motivo.
- Configuración no puede apagarse.
- Reset pide motivo fuerte.
- Integraciones no dicen activas si solo están preparadas.

## Documentación final requerida

Crear o actualizar:

- `HOTFIX-EQUIPO-CONFIG-GATES-V1330-20260707.md`

Debe incluir:

- archivos tocados;
- problema;
- cambio aplicado;
- validación ejecutada;
- impacto Claude/prototipo;
- impacto Academia;
- pendientes;
- estado no deploy/no merge.

## Impacto Claude/prototipo

Claude debe conservar:

- usuario creado no equivale a invitación/Auth enviada;
- rol/permiso/módulo sensible requiere confirmación visible;
- no dejar tenant sin admin;
- Configuración no puede apagarse desde módulos activos;
- reset es acción crítica;
- integración configurada no equivale a integración activa.

## Impacto Academia

Academia debe incluir ruta Admin con:

- creación de usuarios;
- Auth pendiente;
- roles y módulos visibles;
- permisos sensibles;
- último administrador activo;
- cambio de plan;
- reset de configuración;
- integraciones preparadas vs conectadas.

## Estado

Paquete corto creado.
Pendiente ejecución por Codex/local.
No se tocó código funcional.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.
