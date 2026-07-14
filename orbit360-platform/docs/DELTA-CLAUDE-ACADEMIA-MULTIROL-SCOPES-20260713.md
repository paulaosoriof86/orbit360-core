# Delta para Claude y Academia — multirol, vista activa y scopes

Fecha: 2026-07-13  
Carril: A  
Estado: documentado para el siguiente empalme incremental

## Regla de continuidad

No crear una candidata paralela mientras Claude trabaja sobre la candidata vigente. Este delta debe incorporarse después de recibir y auditar la nueva candidata, sin retroceder.

No contiene usuarios reales, correos reales, datos de A&S ni secretos.

## Patrón comercializable

Todo usuario puede tener:

- varios roles asignados;
- un rol predeterminado;
- un rol activo;
- cambio de vista entre roles asignados;
- módulos extra;
- módulos restringidos;
- scope predeterminado;
- scopes específicos por módulo;
- países habilitados;
- estado activo, invitado, suspendido o inactivo.

La plataforma debe explicar claramente que:

```txt
rol = forma de trabajar y módulos visibles
scope = qué datos puede ver dentro de esos módulos
```

## Regla de visibilidad

```txt
módulos base del rol activo
+ extras
- restringidos
```

No unir automáticamente todos los módulos de todos los roles asignados. El usuario elige su vista activa entre los roles que tiene autorizados.

## Cambio de vista activa

Agregar un selector claro de vista/rol activo cuando el usuario tenga más de un rol.

Debe mostrar:

- rol activo actual;
- roles disponibles;
- descripción breve de la vista;
- aviso de que cambiar de vista no cambia permisos asignados;
- persistencia de la selección mediante backend cuando esté disponible.

No mostrar nombres técnicos de sesión, claims o colecciones.

## Administración de usuarios

Equipo/Configuración debe permitir:

- seleccionar varios roles;
- elegir rol predeterminado explícitamente;
- configurar módulos extra y restringidos;
- configurar scope default y por módulo;
- elegir países habilitados;
- vincular asesor cuando corresponda;
- activar, suspender o desactivar;
- ver resumen antes/después;
- escribir motivo obligatorio;
- confirmar de forma reforzada cuando se amplía acceso.

El primer rol marcado no debe convertirse silenciosamente en rol predeterminado.

## Ampliación de acceso

Mostrar confirmación reforzada cuando:

- se agrega Dirección, SuperAdmin o AdminTenant;
- se amplía de propios a equipo o todos;
- se agrega acceso global a un módulo;
- se agrega un módulo extra;
- se quita una restricción;
- se habilita un país adicional;
- se reactiva una membresía.

La UI debe presentar:

- antes;
- después;
- qué acceso se amplía;
- motivo;
- actor;
- fecha;
- confirmación reforzada.

## Restricciones del Asesor

La vista Asesor debe mantener límites duros:

- solo sus clientes y lo relacionado según scope;
- puede completar datos faltantes permitidos;
- no puede borrar, fusionar o reasignar;
- no puede modificar pólizas, cobros, finanzas o documentos validados;
- no puede ver auditoría interna, secretos ni credenciales;
- si un cliente no aparece, crea una gestión de corrección.

## Estados honestos

Usar términos de negocio:

- Invitación preparada
- Pendiente de confirmación
- Usuario activo
- Usuario suspendido
- Usuario inactivo
- Vista activa
- Acceso propio
- Acceso de equipo
- Acceso total
- Sin acceso

No declarar credenciales enviadas ni acceso activo antes de confirmación real.

## Academia

Actualizar el curso existente de Roles, permisos y seguridad. No crear curso duplicado.

Debe enseñar:

1. diferencia entre rol asignado, rol default y rol activo;
2. cómo cambiar de vista;
3. módulos base, extras y restringidos;
4. scopes own/team/all/none;
5. visibilidad de módulo vs alcance de datos;
6. permisos duros del Asesor;
7. configuración por país;
8. ampliación y reducción de acceso;
9. motivo, antes/después y confirmación reforzada;
10. suspensión e inactivación;
11. auditoría y rollback;
12. por qué nunca se guardan contraseñas o tokens en la membresía.

Agregar evaluación práctica por roles y conservar progreso/certificado.

## Criterios de aceptación

- multi-tenant y configurable;
- sin usuarios reales ni A&S hardcodeado;
- rol default explícito;
- selector de rol activo solo si hay varios roles;
- scope separado de módulos;
- confirmación reforzada para ampliación;
- responsive desktop/tablet/móvil;
- estados honestos;
- sin copy técnico visible;
- Academia actualizada sin duplicados;
- manifiesto incremental actualizado.

## Pendiente

Incorporar este delta únicamente después de auditar la candidata actualmente en elaboración por Claude.
