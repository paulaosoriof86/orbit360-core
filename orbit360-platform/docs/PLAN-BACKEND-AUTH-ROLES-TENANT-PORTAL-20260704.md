# Plan backend — Auth, roles, tenant y portal usuarios

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: plan backend. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Preparar la fase de Auth/usuarios/roles/tenant como base para operación real.

Este bloque habilita después:

- Portal de Clientes real;
- invitaciones y activaciones;
- PWA segura;
- notificaciones por usuario;
- documentos privados;
- gestiones trazables;
- Academia por usuario/rol;
- Firestore con tenant isolation.

## 2. Contratos creados

- `CONTRATO-AUTH-USUARIOS-ROLES-TENANT-LAB-AYS-20260704.md`
- `MATRIZ-ROLES-PERMISOS-MODULOS-AYS-20260704.md`
- `CONTRATO-PORTALUSUARIOS-CLIENTES-ACTIVACION-AYS-20260704.md`

## 3. Dependencias existentes

- Backend LAB v1.104;
- `data/store.js` protegido;
- `store-firestore-lab.local.js` protegido;
- `backend-lab-loader/init/guard` protegidos;
- contratos de Portal, invitaciones, notificaciones, gestiones, documentos y conciliación;
- candidata frontend activa v1.123.

## 4. Fases recomendadas

### Fase A — Auditoría de frontend actual

Auditar:

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
- login actual:
- usuarios actuales:
- roles actuales:
- módulos visibles:
- portal cliente actual:
- brechas:
- riesgos:
- pendientes Claude:
- pendientes backend:
- impacto Academia/manuales:
```

### Fase B — Contrato de autorización

Definir permisos por módulo y relación.

No basta rol nominal; debe haber permiso por acción:

```txt
modulo.accion
```

### Fase C — Portal usuarios

Preparar entidad `portalUsuarios`, estados e invitación segura.

### Fase D — Backend LAB

Cuando se autorice, implementar sin romper `Orbit.store`:

- tenant isolation;
- usuario LAB esperado;
- roles/permisos ficticios;
- smoke de acceso por rol;
- smoke de portal cliente ve solo lo propio;
- smoke asesor ve clientes asignados;
- smoke admin ve configuración.

### Fase E — Auth real

Solo después:

- proveedor Auth real;
- reglas Firestore;
- claims/roles;
- invitaciones reales;
- recuperación de acceso;
- auditoría de sesiones.

## 5. Smokes futuros mínimos

1. Cliente portal:
   - entra al portal;
   - ve solo sus pólizas/cobros/documentos/gestiones;
   - reporta pago;
   - recibe estado.

2. Asesor:
   - ve solo clientes asignados;
   - recibe notificaciones de sus clientes;
   - crea seguimiento/gestión.

3. Cobros:
   - ve pagos reportados;
   - revisa soporte;
   - aprueba/rechaza;
   - genera trazabilidad.

4. Operativo:
   - ve gestiones clasificadas;
   - asigna/resuelve;
   - notifica cliente/asesor.

5. Admin:
   - gestiona usuarios;
   - asigna roles;
   - configura módulos;
   - revisa auditoría.

## 6. Anti-regresiones

No permitir:

- usuario sin tenant;
- cliente portal con datos globales;
- asesor viendo cartera de otro asesor;
- módulo visible sin permiso;
- cambio de rol sin auditoría;
- invitación con contraseña plana;
- notificación sin destinatario;
- documento privado visible por link público;
- datos reales en seed;
- textos backend/LAB/Auth visibles para cliente.

## 7. Manuales y Academia

Actualizar:

- manual Equipo/Usuarios;
- manual Configuración;
- manual Seguridad;
- manual Portal;
- manual Cliente360;
- manual Notificaciones;
- ruta Superadmin/IT;
- ruta Administrativo/Operativo;
- ruta Asesor nuevo;
- ruta Cliente nuevo.

## 8. Estado

Plan creado. No implementa Auth real ni modifica backend protegido.
