# REGISTRO P0 — PATCH IMPORTADOR DE POLIZAS

Fecha: 2026-07-09
Carril: B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: helper agregado; ejecucion local pendiente.

## Objetivo

Ajustar el importador de polizas existente sin reconstruirlo desde cero.

## Helper agregado

`tools/orbit360-p0-polizas-importador-safe-patch-20260709.mjs`

## Alcance

El helper modifica solamente `orbit360-platform/core/importa.js` y genera backup/reporte local.

Cambios previstos:

- deduplicacion por llave compuesta;
- estado original de fuente separado del estado operativo Orbit;
- estado operativo por vigencia y fuente;
- forma de pago sin asumir contado cuando falta;
- separacion de recibos esperados respecto de cobros/cartera;
- validacion cuando falten pais, moneda, prima, forma de pago o llave confiable.

## Seguridad

- No toca backend protegido.
- No toca store.
- No toca reglas Firebase.
- No inserta datos reales.
- No hace deploy.
- No hace commit automatico.

## Ejecucion local

Desde la raiz del repo:

```bash
node tools/orbit360-p0-polizas-importador-safe-patch-20260709.mjs
```

Luego revisar:

```txt
_orbit360_reports/p0-polizas-importador-*.json
_backups/p0_polizas_importador_*/
```

## Cierre

Cerrar este P0 solo si el helper corre sin errores, el diff toca solamente `core/importa.js`, la sintaxis valida y el smoke ficticio confirma que no se mezcla recibo esperado con cobro confirmado.
