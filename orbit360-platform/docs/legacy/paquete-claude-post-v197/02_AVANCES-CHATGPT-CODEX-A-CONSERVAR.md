# Avances ChatGPT/Codex que Claude no debe perder

## Integraciones core

Se creó/amplió `Orbit.integraciones` para centralizar eventos, diagnóstico, mock LAB y contrato de configuración por tenant.

Contratos protegidos:

- `emit(...)`
- `configurar(...)`
- `status()`
- `list(...)`
- `resumen()`
- `diagnostico(...)`
- `openPanel(...)`
- `ensureLabMock(...)`
- `labMock(...)`
- `mark(...)`

## Panel diagnóstico

`core/integraciones-panel.js` permite visualizar eventos de integración, estados, errores, pendientes y filtros.

## Mock LAB

`core/integraciones-lab-mock.js` simula enviado/confirmado/error sin llamadas reales. Debe aparecer solo en demo/desarrollo.

## Marketing

`modules/marketing.js` fue conectado a eventos trazables. No volver a dejar botones como simples `toast`.

Eventos protegidos:

- `marketing_sync_sheets`
- `marketing_generar_pieza`
- `marketing_programar_publicacion`
- `marketing_contenido_creado`

## Validador

`tools/orbit360-validate-marketing-integraciones.mjs` protege contratos, reglas seguras y sintaxis JS. No eliminar.
