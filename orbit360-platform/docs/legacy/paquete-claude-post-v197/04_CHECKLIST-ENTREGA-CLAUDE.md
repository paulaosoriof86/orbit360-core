# Checklist de entrega para Claude

## Estructura

- ZIP completo de `orbit360-platform/`.
- Raíz única.
- Sin ZIPs anidados.
- Sin carpetas duplicadas.
- Sin archivos temporales/copias.
- Sin datos reales.

## Contratos

- `Orbit.store` conserva API.
- `Orbit.tenant` sigue siendo fuente de configuración.
- `Orbit.ia.complete(...)` centraliza IA.
- `Orbit.integraciones.emit(...)` existe.
- `Orbit.integraciones.configurar(...)` existe.
- Marketing conserva eventos trazables.
- Panel de integraciones existe.
- Mock LAB no aparece como producción.

## UI

- Sin notas técnicas visibles.
- Sin botones sin acción real.
- Sin mojibake.
- Sin hardcodeo A&S.
- Integraciones muestran estados claros.
- Marketing tiene historial/eventos por contenido.
- Automatizaciones muestra panel/salud de flujos.

## Documentación

- `CHANGELOG.md` actualizado.
- `docs/BITACORA-CAMBIOS.md` actualizado.
- Resumen final incluido.
