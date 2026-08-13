# REGISTRO P0 — BANCO, COMISIONES, CxC Y CxP

Fecha: 2026-07-09
Carril: B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: motor y wire aditivos implementados; pendiente validacion CI/smoke.

## Que parte del plan se avanzo

P0 banco/finmovs aplicado a CxC/CxP de comisiones.

Se agrego una capa P0 para que estados de cuenta bancarios puedan proponer conciliacion contra:

```txt
cxcComisiones
cxpAsesores
```

sin crear `finmovs` definitivos ni marcar pagos automaticamente.

## Archivos agregados/modificados

```txt
orbit360-platform/core/importa-banco-comisiones-p0.js
orbit360-platform/core/importa-banco-comisiones-p0-wire.js
orbit360-platform/modules/importar.js
tools/orbit360-test-importa-banco-comisiones-p0.mjs
```

## Por que se hizo asi

`core/importa.js` ya tiene `estados-banco` hacia `conciliacionBanco` y marca pendiente de conciliacion. Esta capa no reescribe ese importador; solo redirige registros importados a entidades especificas de conciliacion bancaria para comisiones.

## Reglas cubiertas

- Estado de cuenta bancario no crea `finmov` definitivo.
- Banco crea `movimientosBanco` pendiente.
- Banco crea `conciliacionBancaria` pendiente.
- Abono bancario puede proponer match contra `cxcComisiones`.
- Cargo bancario puede proponer match contra `cxpAsesores`.
- CxC comision queda como recaudo probable pendiente de confirmacion, no cobrada definitiva.
- CxP asesor queda como pago probable pendiente de confirmacion, no pagada definitiva.
- La confirmacion humana sigue siendo obligatoria.

## Seguridad

- No toca backend protegido.
- No toca `store.js`.
- No toca adapter Firestore LAB.
- No toca reglas Firebase.
- No usa datos reales.
- No hace deploy.
- No requiere accion manual.

## Siguiente paso

1. Validar smoke/CI cuando este disponible.
2. Preparar tablero de cierre P0 con estado por capa.
3. Documentar pendientes P1 para Aseguradoras Hub, Cotizador/Comparativo y Academia.
