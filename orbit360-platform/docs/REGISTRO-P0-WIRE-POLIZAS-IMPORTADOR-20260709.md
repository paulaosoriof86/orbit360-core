# REGISTRO P0 — WIRE POLIZAS / IMPORTADOR

Fecha: 2026-07-09
Carril: B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: wire runtime aditivo implementado; pendiente resultado CI/smoke.

## Que se avanzo

Se conecto el motor P0 de polizas al flujo de importacion sin modificar directamente `core/importa.js`.

Archivos agregados/modificados:

```txt
orbit360-platform/core/importa-polizas-p0-wire.js
orbit360-platform/modules/importar.js
tools/orbit360-test-importa-polizas-p0-wire.mjs
```

## Por que se hizo asi

`core/importa.js` es transversal y ya tiene mucha logica operativa. En lugar de reescribirlo, se agrego un wire runtime que:

- carga el motor P0 desde el hub de importacion;
- normaliza polizas al insertar/actualizar;
- evita pisar vigencias distintas cuando el importador usa numero como dedup inicial;
- redirige recibos generados por importacion desde `cobros` hacia `recibosEsperados`;
- genera `recibosEsperados` para renovadas vigentes.

## Reglas cubiertas por el wire

- Poliza importada queda normalizada por `Orbit.importaPolizasP0.normalizePolicy`.
- Si la misma poliza tiene distinta vigencia/llave compuesta, no debe pisar la vigencia previa.
- Recibos generados por importacion no quedan como cobros confirmados.
- Renovada vigente puede generar recibos esperados aunque el importador original no la trate como vigente.

## Seguridad

- No toca backend protegido.
- No toca `store.js`.
- No toca Firestore adapter.
- No toca reglas Firebase.
- No usa datos reales.
- No hace deploy.
- No requiere accion manual en este paso.

## Siguiente paso

1. Validar CI/smoke.
2. Si pasa, continuar con P0 recibos/cartera/conciliacion.
3. Si falla, corregir el wire antes de tocar mas modulos.
