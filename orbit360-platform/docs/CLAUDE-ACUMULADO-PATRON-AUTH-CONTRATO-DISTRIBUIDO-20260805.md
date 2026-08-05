# CLAUDE ACUMULADO — PATRÓN REUSABLE DE AUTH CON CONTRATO DISTRIBUIDO

Fecha: 2026-08-05  
Clasificación principal: `REPLICABLE_CLAUDE_ACUMULADO`  
Backend: `BACKEND_PROTEGIDO_NO_CLAUDE`

## Alcance reusable permitido

Diseñar una experiencia de Equipo y Accesos que represente un contrato compuesto, autoadministrable y multirol, sin exponer detalles técnicos del proveedor de autenticación.

## Patrón de producto

Cada persona debe mostrar de forma clara:

- estado de acceso: pendiente, invitado, activo, bloqueado o requiere corrección;
- roles asignados;
- rol predeterminado;
- países;
- scopes por dominio;
- fecha de última invitación o recuperación;
- acciones disponibles según permiso.

## Acciones UI reusables

```text
Crear acceso
Vincular identidad existente
Reenviar invitación
Recuperar contraseña
Bloquear/reactivar
Cambiar rol predeterminado
Editar países y scopes
Ver auditoría
```

La interfaz no debe mostrar Firebase, Function, membership, LAB, secretos, UID ni nombres de colecciones.

## Flujo visible esperado

```text
1. Administración completa la ficha de la persona.
2. El sistema muestra un resumen antes de confirmar.
3. Si se abre alcance “todos”, exige motivo y confirmación reforzada.
4. El sistema crea o vincula el acceso.
5. La persona recibe un correo para establecer o recuperar contraseña.
6. La UI confirma identidad, roles, países y alcance sin mostrar datos técnicos.
```

## Estados honestos

- `Configuración incompleta`: faltan datos operativos obligatorios.
- `Acceso pendiente`: la persona está configurada, pero aún no tiene identidad activa.
- `Invitación enviada`: el correo fue emitido y espera acción de la persona.
- `Acceso activo`: identidad y permisos están vinculados.
- `Requiere corrección`: existe una contradicción o ambigüedad.
- `Bloqueado`: acceso suspendido con motivo y auditoría.

No usar “todo listo” si solo existe la ficha de Equipo.

## Multirol y scopes

Visibilidad efectiva:

```text
base del rol activo
+ extras autorizados
- módulos restringidos
+ scope por dominio
```

El cambio de rol activo no debe alterar permanentemente los roles asignados. El rol predeterminado se usa al iniciar una nueva sesión.

## Responsive

### Dirección · escritorio

Tabla completa, estado de acceso, roles, alcance y auditoría.

### Operativo · tablet

Acciones rápidas, invitaciones pendientes y correcciones.

### Asesor · móvil

Perfil propio, rol activo y alcance visible, sin controles administrativos.

## No replicar en Claude

- lógica de creación Auth;
- Functions y allowlists;
- credenciales o secretos;
- correos reales o digests;
- rutas Firestore;
- herramientas de gate o rollback;
- datos reales del tenant.

## Criterio de aceptación UX

La experiencia debe permitir entender visualmente la diferencia entre:

```text
persona registrada
acceso creado
invitación enviada
membership activa
rol actual
alcance efectivo
```

sin términos técnicos y sin ocultar estados incompletos.
