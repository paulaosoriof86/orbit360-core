# Registro — empalme/hotfix P0 Config + Equipo v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Después de Portal, Cobros y Conciliaciones, el siguiente P0 de empalme seguro es Config/Equipo:

```txt
- no guardar key/token en frontend/store;
- usar credentialRef/backend_required;
- cerrar gates de usuarios, roles, permisos, plan, módulos e integraciones;
- no dejar tenant sin administrador activo;
- auditoría por tenant.
```

## Bloque trabajado

Se creó script de hotfix seguro para aplicar sobre:

```txt
orbit360-platform/modules/configuracion.js
orbit360-platform/modules/equipo.js
```

sin tocar backend protegido ni `index.html`.

## Archivos agregados

```txt
orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-CONFIG-EQUIPO-V1330.mjs
orbit360-platform/docs/RUNBOOK-APLICAR-HOTFIX-P0-CONFIG-EQUIPO-V1330-20260708.md
orbit360-platform/docs/REGISTRO-EMPALME-HOTFIX-P0-CONFIG-EQUIPO-V1330-20260708.md
```

## Qué corrige

### Configuración

- Integraciones ya no piden ni guardan key/token.
- Se usa `credentialRef` y `backend_required`.
- Estado honesto `pendiente_conexion`.
- Guardar integración exige motivo.
- Cambiar plan exige motivo.
- Guardar módulos activos exige motivo.
- Auditoría en `auditoria`.

### Equipo

- Crear usuario exige motivo.
- Editar usuario exige motivo.
- Cambiar roles/permisos exige motivo.
- Inactivar usuario exige motivo.
- Inactivar último administrador activo queda bloqueado.
- Reset permisos exige confirmación `RESTABLECER`.
- Reset permisos exige motivo.
- Auditoría en `auditoria`.

## Restricciones cumplidas

- No merge.
- No deploy.
- No main.
- No producción.
- No datos reales.
- No secretos.
- No Firestore writes.
- No backend protegido.
- No `index.html`.

## ¿Aplica a Claude/prototipo?

Sí.

Instrucción futura para Claude:

- Conservar Config/Equipo como administración segura.
- No mostrar ni guardar secretos en frontend.
- Integración configurada/preparada no equivale a integración activa.
- Usar `credentialRef` conceptual.
- Mantener gates con motivo/confirmación/auditoría.
- Bloquear último administrador activo.

## Pendientes derivados

- Ejecutar script en worktree local o aplicar módulo corregido.
- Ejecutar `node --check`.
- Documentar cierre con reporte/commit.
- Continuar Academia post roles/auditoría y paquete acumulado para Claude.