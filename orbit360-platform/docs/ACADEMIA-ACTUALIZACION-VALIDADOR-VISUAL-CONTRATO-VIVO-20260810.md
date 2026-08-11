# ACADEMIA — VALIDADOR VISUAL VS CONTRATO VIVO

Fecha: 2026-08-10
Clasificación: `ACADEMIA_ACTUALIZAR`

## Diferencias que debe enseñar

### Defecto funcional
El producto incumple su contrato real: ruta no carga, acceso permitido se niega, acceso prohibido se abre, datos visibles violan scope o una acción autorizada falla.

### Validador obsoleto
La prueba usa una representación distinta a la del producto vivo. Ejemplos cerrados en Block 1:

- consultar `Orbit.session.canSee` cuando el router gobierna con `Orbit.access.can`;
- elegir targets desde el store raw cuando la UI usa `Orbit.access.filter/withScope`;
- considerar ready un deep-link solo porque la ruta base ya estaba ready;
- sumar hidratación previa a la navegación al tiempo del render;
- tratar un modal obligatorio de seguridad como error del módulo probado.

### Fallo de pipeline
El harness no puede completar la prueba aunque el producto conserve el estado esperado. Debe detenerse, hacer rollback y corregir el harness source-only antes de otro runtime.

## Regla por rol

- Dirección: validar módulos y datos que realmente tiene autorizados.
- Operativo: validar `Orbit.access.can` y el scope efectivo; módulos extra/restringidos pueden cambiar el resultado respecto al rol base.
- Asesor: validar solo sus clientes/relacionados y la consulta read-only de Aseguradoras cuando el contrato lo permite; acciones críticas permanecen bloqueadas.

## Regla de seguridad

La normalización de un overlay de primera contraseña ocurre solo dentro del test automatizado después de autenticación. El producto mantiene intacta la obligación de cambio de contraseña para el usuario real.
