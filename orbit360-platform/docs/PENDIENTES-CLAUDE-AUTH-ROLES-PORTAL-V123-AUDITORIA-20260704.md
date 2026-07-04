# Pendientes Claude — Auth, roles y Portal tras auditoría v1.123

Fecha: 2026-07-04
Base auditada: `Prototype Development Request - 2026-07-04T152321.882.zip`
Estado: pendientes frontend/prototipo. No tocar backend protegido.

## Regla general

Claude debe corregir UX/copy y preparar estructuras visuales, sin afirmar Auth real ni tocar backend protegido.

No tocar:

- `data/store.js`
- `data/store-firestore-lab.local.js`
- `core/backend-lab-*`
- `firestore.rules`
- `tools/orbit360-*`

## P0-AUTH-01 — Login demo no debe parecer Auth productivo

Si el login sigue siendo prototipo/localStorage, no debe afirmarse como Auth real.

UI cliente no debe mostrar textos técnicos como Firebase/Auth/LAB/backend/localStorage.

## P0-PORTAL-01 — Portal interno vs portal cliente real

La vista actual de Portal con selector de cliente debe rotularse claramente como:

```txt
Vista previa interna del Portal de Cliente
```

En experiencia final de cliente no debe existir selector de cliente ni botón admin.

## P0-PORTAL-02 — Estado de portal en Cliente360

Agregar tarjeta/sección:

- no habilitado;
- pendiente de datos;
- listo para invitar;
- invitado;
- activado;
- último acceso;
- reenviar invitación;
- suspender/reactivar si el rol tiene permiso.

## P1-EQUIPO-01 — Usuarios/roles como configuración preparada

Equipo/Usuarios debe preparar visualmente:

- usuario;
- rol/multi-rol;
- módulos visibles;
- estado;
- invitación;
- último acceso;
- portal si es cliente;
- permisos resumidos.

## P1-PERMISOS-01 — Permisos por acción

Además de ver/editar, preparar permisos por acción:

- `cobros.aprobar_pago`;
- `documentos.validar`;
- `portal.reportar_pago`;
- `academia.asignar`;
- `roles.gestionar`.

## P1-ROUTER-01 — Acceso denegado amable

Preparar pantalla visual:

```txt
No tienes acceso a esta sección
```

para rutas o acciones restringidas, sin mostrar datos sensibles.

## P1-PWA-01 — PWA por experiencia

Distinguir copy de PWA interna vs Portal Cliente:

- app interna Orbit 360;
- portal cliente instalable.

No afirmar instalación real si el usuario no la hizo.

## P1-ACADEMIA-01 — Manuales y rutas

Actualizar o registrar pendiente en:

- manual Seguridad/Auth;
- manual Equipo/Usuarios;
- manual Portal Cliente;
- manual Cliente360;
- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo;
- ruta Superadmin/IT;
- evaluación de roles y permisos.

## Criterio de aceptación

- login no parece producción real si no lo es;
- portal cliente final no tiene selector de cliente;
- vista admin sí puede previsualizar clientes, pero rotulada;
- Cliente360 muestra estado portal;
- permisos se preparan por acción;
- copy de PWA y acceso es claro;
- backend protegido intacto.
