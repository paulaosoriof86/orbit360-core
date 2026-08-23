# Academia Orbit 360 — actualización Macro-2 · read-model seguro y performance

**Fecha:** 2026-08-21  
**Clasificación:** `ACADEMIA_ACTUALIZAR`  
**Aplica a:** Dirección, Operativo, Asesor, IT/Superadmin y equipo de implementación.

## Qué cambia en la forma de operar y validar

Orbit 360 no debe mostrar valores técnicos o inválidos cuando una fuente esté incompleta. Un dato ausente no equivale automáticamente a cero. La capa de lectura debe transformar el valor fuente en un read-model canónico antes de renderizarlo:

`valor fuente → normalización → validación finita/fecha/texto → fallback honesto → escape → interfaz`.

Ejemplos de fallback honesto: `—`, `Sin estado`, `País pendiente` o `Pendiente de completar`, según el significado del campo. Nunca deben aparecer `undefined`, `NaN`, `Infinity`, `Invalid Date` ni copy técnico al usuario.

## Por rol

- **Dirección:** los KPIs y montos deben permanecer finitos; la ausencia de un dato se identifica como ausencia, no como producción o recaudo cero inventado.
- **Operativo:** al completar o validar datos se conserva la fuente y la trazabilidad. Una relación no encontrada no se inventa; se muestra como pendiente o requiere validación.
- **Asesor:** la misma regla aplica dentro de su scope propio. El hardening de display no amplía permisos ni permite borrar, reasignar o modificar pólizas/cobros fuera de su alcance.
- **IT/Superadmin:** debe diferenciar `FUNCTIONAL_DEFECT` de `VALIDATOR_STALE`. Si un fixture descubre un valor realmente inseguro, se corrige el owner compartido. Si el validador busca una clase/ruta obsoleta pero la superficie canónica existe en otro owner, se corrige el validador sin mutar producto.

## Performance reusable

La proyección Cliente↔Póliza no debe hacer una búsqueda de colección completa por cada cliente. El patrón aprobado es cargar la colección una vez, construir un índice/set en memoria y resolver las relaciones desde ese read-model. Para el volumen de aceptación de Macro-2 se verifican 414 clientes y un volumen representativo de pólizas con una sola carga de pólizas y cero `where('polizas')` por cliente.

## Gate antes de runtime

Antes de pedir una autorización F2 deben pasar fixtures source-only de las siete rutas (`inicio`, `cliente360`, `aseguradoras`, `ops`, `leads`, `polizas`, `cobros`), las tres vistas de rol y las superficies integradas de póliza/vehículo/recibos. El mismo stage+code por segunda vez activa `STOP_RETRY`; no se crea otro workflow, request u owner para evadirlo.

Esta actualización no contiene datos reales, secretos ni credenciales.
