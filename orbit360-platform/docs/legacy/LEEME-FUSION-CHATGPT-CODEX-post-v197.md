# Orbit 360 · estado fusionado ChatGPT/Codex post v1.97

Este ZIP contiene la base `orbit360-platform/` v1.97 con el código real adelantado por ChatGPT/Codex para Integraciones + Marketing.

## Archivos incluidos

- `core/integraciones.js`
- `core/integraciones-panel.js`
- `core/integraciones-lab-mock.js`
- `modules/marketing.js` conectado a eventos
- `tools/orbit360-validate-marketing-integraciones.mjs`
- `index.html` con carga de `core/integraciones.js`

## Contratos disponibles

- `Orbit.integraciones.emit(...)`
- `Orbit.integraciones.configurar(...)`
- `Orbit.integraciones.status()`
- `Orbit.integraciones.list(...)`
- `Orbit.integraciones.resumen()`
- `Orbit.integraciones.diagnostico(...)`
- `Orbit.integraciones.openPanel(...)`
- `Orbit.integraciones.ensureLabMock(...)`
- `Orbit.integraciones.labMock(...)`
- `Orbit.integraciones.mark(...)`

## Eventos Marketing conectados

- `marketing_sync_sheets`
- `marketing_generar_pieza`
- `marketing_programar_publicacion`
- `marketing_contenido_creado`

## Uso para Claude

Usar esta carpeta como base fusionada y rebasar encima las mejoras visuales de Claude v1.92-v1.99 sin borrar estos contratos.
