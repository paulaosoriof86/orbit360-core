# Delta Claude/Academia — verificación productiva en solo lectura

Fecha: 2026-07-13

## ¿Aplica a Claude/prototipo?

Sí, como patrón generalizable de UX y Academia. No incluye código backend, secretos ni datos reales.

## Estados honestos reutilizables

```txt
Pendiente de conexión
Verificación en solo lectura
Lectura verificada
Escritura bloqueada
Acceso restringido por rol
Acceso restringido por alcance
Requiere revisión antes de habilitar cambios
```

## Reglas UX

1. Un estado “Lectura verificada” no debe sugerir que las escrituras están habilitadas.
2. Las acciones de crear, editar, eliminar o confirmar deben permanecer deshabilitadas cuando el sistema esté en verificación de solo lectura.
3. Si un módulo no está disponible por rol o scope, la navegación directa también debe bloquearse; ocultar el menú no es suficiente.
4. No mostrar terminología técnica interna al cliente.
5. No mostrar UID, correo completo, secretos, tokens o detalles de infraestructura en estados o diagnósticos.

## Academia

Actualizar lecciones existentes —sin duplicarlas— para explicar:

- diferencia entre lectura verificada y operación habilitada;
- por qué un acceso puede estar restringido por rol o por alcance;
- que la habilitación de cambios requiere revisión y confirmación;
- que una prueba de lectura nunca debe modificar datos;
- cómo reportar un módulo esperado que no aparece sin intentar evadir permisos.
