# Delta Claude/Academia — acceso productivo fail-closed

Fecha: 2026-07-13  
Aplicación: sobre la próxima candidata incremental aceptada; no generar candidata paralela

## ¿Aplica a Claude/prototipo?

Sí, como comportamiento de producto y Academia. No aplica la implementación interna del bootstrap.

## UX

- Nunca abrir la aplicación con datos demo cuando la conexión real falla.
- Mostrar un estado bloqueado, claro y no técnico.
- No presentar acciones que aparenten guardar si la sesión/membresía no está verificada.
- No prometer que una operación quedó registrada hasta confirmación del backend.
- Mantener separado `Acceso pendiente`, `Sin permiso`, `Conexión pendiente` y `Error temporal`.

## Academia

Actualizar rutas existentes, sin cursos duplicados:

- por qué una sesión puede estar bloqueada aunque el usuario tenga contraseña;
- diferencia entre identidad, membresía, rol activo y alcance;
- qué hacer si el usuario no ve un módulo o sus datos;
- por qué no debe intentar recrear registros para evitar una restricción;
- canal correcto para solicitar activación o corrección de acceso.

## Copia permitida

```txt
Estamos verificando tu acceso.
Tu membresía requiere activación.
Esta vista no está disponible para el rol activo.
No pudimos confirmar la conexión segura.
La acción no fue registrada; vuelve a intentar cuando el servicio esté disponible.
```

No mostrar términos técnicos ni credenciales.
