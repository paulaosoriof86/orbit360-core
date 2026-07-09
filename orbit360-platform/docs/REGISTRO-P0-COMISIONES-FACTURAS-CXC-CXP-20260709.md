# REGISTRO P0 — COMISIONES, FACTURAS, CxC Y CxP

Fecha: 2026-07-09
Carril: B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: motor y wire aditivos implementados; pendiente validacion CI/smoke.

## Que parte del plan se avanzo

P0 comisiones/facturas/CxC/CxP.

Se agrego una capa P0 para separar correctamente:

```txt
planillasComisiones
comisionesDevengadas
facturasComisiones
cxcComisiones
conciliacionesComisiones
liquidacionesAsesores
cxpAsesores
```

## Archivos agregados/modificados

```txt
orbit360-platform/core/importa-comisiones-p0.js
orbit360-platform/core/importa-comisiones-p0-wire.js
orbit360-platform/modules/importar.js
tools/orbit360-test-importa-comisiones-p0.mjs
```

## Por que se hizo asi

`core/importa.js` actualmente importa planillas de comision hacia `comisiones` y facturas hacia `facturas`. Para no reescribir el importador transversal, se agrego un wire runtime que redirige importaciones P0 hacia entidades separadas.

## Reglas cubiertas

- Planilla de comision no crea prima pendiente.
- Planilla crea `planillasComisiones`.
- Planilla crea `comisionesDevengadas`.
- Planilla crea `conciliacionesComisiones`.
- Factura de comision crea `facturasComisiones`.
- Factura de comision crea `cxcComisiones`.
- Factura de prima o factura no identificada como comision no crea CxC de comision.
- CxC financiera queda separada de cartera de primas.
- Pago de asesor no se marca automaticamente.

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
2. Si pasa, revisar flujo banco/finmovs para confirmar cobro de CxC comision y pago de CxP asesor.
3. Luego cerrar P0 con tablero de estado y lista de pendientes para P1/Claude.
