# Pendientes Claude — Auth, usuarios, roles y Portal v1.123

Fecha: 2026-07-04
Base: `Prototype Development Request - 2026-07-04T152321.882.zip`
Estado: pendientes frontend/prototipo. No tocar backend protegido.

## Regla general

Claude debe mejorar la UX de usuarios, roles, permisos y portal sin afirmar Auth real si no está conectado.

No tocar:

- `data/store.js`
- `data/store-firestore-lab.local.js`
- `core/backend-lab-*`
- `firestore.rules`
- `tools/orbit360-*`

## P0-AUTH-01 — Estado honesto de Auth

Si el login/usuarios son prototipo o LAB, no mostrarlo como producción real.

La UI cliente no debe mostrar textos técnicos como Auth, Firebase, backend, LAB o credenciales.

## P0-PORTAL-01 — Cliente portal debe ver solo lo propio

Preparar UX para que el portal sea una interfaz separada/simplificada:

- datos propios;
- pólizas propias;
- recibos propios;
- pagos reportados propios;
- documentos visibles propios;
- gestiones propias;
- notificaciones propias;
- ruta Academia cliente si aplica.

No mostrar menú interno de Orbit al cliente portal.

## P0-PORTAL-02 — Estado de acceso en Cliente360

Cliente360 debe mostrar:

- portal no habilitado;
- pendiente de datos;
- listo para invitar;
- invitado;
- activado;
- último acceso;
- reenviar invitación;
- suspender/reactivar si el rol tiene permiso.

## P1-USUARIOS-01 — Equipo/Usuarios debe mostrar roles y módulos visibles

Debe prepararse vista para:

- usuario;
- rol o multi-rol;
- módulos visibles;
- estado;
- último acceso;
- invitación;
- país;
- permisos resumidos.

## P1-ROLES-01 — Permisos por módulo

Preparar UX de configuración para roles/permisos por módulo, sin necesidad de implementar backend real todavía.

Ejemplos:

- cliente360.ver;
- cobros.aprobar_pago;
- documentos.validar;
- academia.asignar;
- configuracion.editar.

## P1-ASESOR-01 — Asesor ve solo cartera/asignación

Preparar la lógica visual para que asesor vea clientes/leads/gestiones/notificaciones relacionadas con su asignación.

## P1-ACADEMIA-01 — Rutas por rol

Academia debe asignar o mostrar rutas según rol:

- Cliente nuevo;
- Asesor nuevo;
- Administrativo/Operativo;
- Cobros;
- Superadmin/IT.

## P1-SEGURIDAD-01 — No exponer secretos ni credenciales

No mostrar ni simular credenciales reales. No incluir contraseñas planas en seed ni UI.

## Criterio de aceptación

- cliente portal no ve datos globales;
- asesor no ve cartera de otros;
- roles/módulos aparecen configurables;
- estado de portal visible en Cliente360;
- invitación portal es clara y segura;
- no se afirma Auth real si no existe;
- backend protegido intacto;
- manuales/Academia actualizados o pendientes registrados.
