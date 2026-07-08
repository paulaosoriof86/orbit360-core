# Registro — empalme/hotfix P0 Academia post v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

La candidata Claude v1330 cumplió la base de Academia para Portal/Cobros/Cliente360/Documentos/M5/Admin, pero quedó pendiente incorporar los bloques backend/documentales que se generaron mientras Claude trabajaba:

```txt
- matriz roles/permisos/acciones sensibles;
- auditoría unificada;
- hotfixes locales post-Claude;
- continuidad para futuras candidatas.
```

## Bloque trabajado

Se creó script de hotfix seguro para aplicar sobre:

```txt
orbit360-platform/data/academia-plus.js
```

sin tocar backend protegido ni `index.html`.

## Archivos agregados

```txt
orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-ACADEMIA-POST-V1330.mjs
orbit360-platform/docs/RUNBOOK-APLICAR-HOTFIX-P0-ACADEMIA-POST-V1330-20260708.md
orbit360-platform/docs/REGISTRO-EMPALME-HOTFIX-P0-ACADEMIA-POST-V1330-20260708.md
```

## Qué corrige

### Curso nuevo — Roles, permisos y auditoría segura Orbit 360

Agrega contenido sobre:

- roles base reutilizables;
- permisos por módulo;
- ClientePortal/Asesor/AuditorSoloLectura;
- último administrador protegido;
- acciones sensibles;
- motivo obligatorio;
- confirmación reforzada;
- bloqueos sanos;
- auditLog/auditoría;
- datos prohibidos;
- historial cliente vs historial interno;
- casos prácticos Cobros/M5/Integraciones.

### Curso nuevo — Cambios locales post-Claude y continuidad del prototipo

Agrega contenido sobre:

- hotfix Cobros + Conciliaciones;
- hotfix Portal;
- hotfix Config/Equipo;
- cómo auditar candidatas futuras;
- validaciones agrupadas;
- registro obligatorio de modificaciones locales para Claude.

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

- Conservar rutas profundas por rol.
- Materializar estas rutas con progreso, evaluaciones y certificados.
- Mantener contenido de acciones sensibles y auditoría.
- Reflejar historial cliente vs interno.
- Conservar cambios locales post-Claude en el siguiente prototipo.

## Pendientes derivados

- Ejecutar script en worktree local o aplicar `academia-plus.js` corregido.
- Validar `node --check`.
- Documentar cierre con reporte/commit.
- Preparar paquete acumulado para Claude cuando vuelva a tener capacidad.