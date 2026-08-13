# Registro backend continuidad — Auth, roles, tenant y portal

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft

## Bloque trabajado

Se continuó con el bloque crítico de Auth, usuarios, roles, permisos, tenant y portal usuarios.

## Motivo

Este bloque es prerequisito para:

- Portal de Clientes real;
- invitaciones y activaciones;
- PWA segura;
- notificaciones por usuario;
- documentos privados;
- gestiones trazables;
- Academia por rol/usuario;
- Firestore real con tenant isolation.

## Archivos creados

- `CONTRATO-AUTH-USUARIOS-ROLES-TENANT-LAB-AYS-20260704.md`
- `MATRIZ-ROLES-PERMISOS-MODULOS-AYS-20260704.md`
- `CONTRATO-PORTALUSUARIOS-CLIENTES-ACTIVACION-AYS-20260704.md`
- `PLAN-BACKEND-AUTH-ROLES-TENANT-PORTAL-20260704.md`
- `PENDIENTES-CLAUDE-AUTH-USUARIOS-ROLES-PORTAL-V123-20260704.md`

## Decisiones

1. Todo usuario debe tener tenant.
2. El acceso se decide por tenant + rol + permiso + relación con entidad.
3. Cliente portal ve solo datos propios.
4. Asesor ve solo cartera/asignación, salvo permiso explícito.
5. Roles deben permitir multi-rol.
6. Portal usuario no es igual a cliente: debe activarse/invitarse.
7. No enviar contraseñas planas.
8. Cambios críticos deben registrarse en auditoría.
9. Academia debe mapear rutas por rol.

## Próximo paso recomendado

Auditar candidata activa v1.123 en:

- `core/auth.js`;
- `modules/equipo.js`;
- `modules/configuracion.js`;
- `modules/portal.js`;
- `modules/cliente360.js`;
- `modules/notificaciones.js`;
- `data/seed.js`;
- `index.html`.

Resultado esperado:

```txt
AUTH-ROLES-TENANT-DIAGNOSTICO
- login actual
- usuarios actuales
- roles actuales
- módulos visibles
- portal cliente actual
- brechas
- riesgos
- pendientes Claude
- pendientes backend
- impacto Academia/manuales
```

## Estado

Documentado. No se tocó `data/store.js`, Firestore, deploy, main ni datos reales.
