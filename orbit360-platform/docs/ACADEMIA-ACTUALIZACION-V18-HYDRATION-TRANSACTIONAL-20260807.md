# Academia · actualización v18 · hidratación y owner del store

## Qué debe aprender cada rol técnico/operativo

Un módulo puede estar autenticado y con membresía válida y aun así no estar listo si el contrato de hidratación perdió el owner real del store. Esto no significa automáticamente que falten clientes, pólizas, cobros o aseguradoras en la base.

### Diferencia clave
- `DATA_CONTRACT_FAILURE`: la fuente real está conectada pero una colección requerida falta/falla según el owner canónico.
- `PIPELINE_MECHANISM_FAILURE`: el pipeline de composición perdió o no pudo demostrar el owner canónico; no se debe reimportar ni modificar datos para resolverlo.

## Patrón v18
1. El owner de `Orbit.store` se enlaza una vez por identidad de store.
2. La carga progresiva de módulos puede reintentar sin borrar `originalStore`/`originalStatus`.
3. `mounted()` solo es verdadero con owner original válido + markers + wrappers completos.
4. `HYDRATION_OWNER_VALID` antecede a la hidratación requerida de Inicio.
5. Evidencias de runs anteriores se eliminan/ignoran para no contaminar el diagnóstico actual.

## Regla de seguridad
Ante shell autenticado + membresía lista + owner inválido, clasificar mecanismo/pipeline y detener. No tocar Rules, Auth, importadores ni datos reales.

## Aplicación por rol
- Dirección: entiende que un STOP visual no implica pérdida de cartera/datos.
- Operativo: distingue datos faltantes de composición todavía no lista.
- Asesor: una vista en preparación nunca habilita acciones fuera de su scope.
- Equipo técnico: debe probar instalación progresiva y owner estable, no únicamente el estado final feliz.

Clasificación Academia: `ACADEMIA_ACTUALIZAR`.