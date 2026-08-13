# Delta Claude/Academia — catálogo del smoke read-only

Fecha: 2026-07-13

## ¿Aplica a Claude/prototipo?

Sí, solo como patrón UX y contenido de Academia. No debe copiar rutas, nombres de índices ni lógica interna de Firestore.

## Patrones que debe reflejar

1. Módulo visible y permiso sobre información sensible son controles distintos.
2. Operativo puede usar el directorio y plataformas si el tenant lo habilita, pero las cuentas bancarias requieren permiso separado.
3. Asesor puede consultar aseguradoras y contactos generales; no puede ver plataformas, usuarios, referencias de credencial ni cuentas bancarias.
4. Scope propio, equipo, todos y ninguno debe producir estados visuales honestos.
5. Una colección denegada no debe aparecer como “sin datos”; debe mostrarse como acceso restringido cuando corresponda.
6. Lectura verificada no significa escritura habilitada.

## Academia

Actualizar las lecciones existentes de multirol, Aseguradoras y seguridad sin crear cursos duplicados. Incluir un caso aplicado donde dos usuarios ven el mismo módulo, pero diferentes pestañas y diferentes datos por rol/scope.
