# REGISTRO P0 — RECIBOS, CARTERA Y CONCILIACION DE PRIMAS

Fecha: 2026-07-09
Carril: B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: motor y wire aditivos implementados; pendiente validacion CI/smoke.

## Que parte del plan se avanzo

P0 recibos/cartera/conciliacion.

Se agrego una capa P0 para separar correctamente:

```txt
recibosEsperados
recibosFuenteExterna
recibosAseguradora
carteraPrimas
conciliacionesPrimas
```

## Archivos agregados/modificados

```txt
orbit360-platform/core/importa-cartera-p0.js
orbit360-platform/core/importa-cartera-p0-wire.js
orbit360-platform/modules/importar.js
tools/orbit360-test-importa-cartera-p0.mjs
```

## Por que se hizo asi

`core/importa.js` actualmente puede usar `cobros` como destino de algunas fuentes de conciliacion. Para no reescribirlo ni romper el importador transversal, se agrego un wire runtime que redirige estados de cuenta de aseguradora a entidades separadas.

## Reglas cubiertas

- Estado de cuenta de aseguradora no queda como `cobros`.
- Estado de cuenta crea `estadosCuentaAseguradora`.
- Cada item crea `recibosAseguradora`.
- Cada pendiente crea `carteraPrimas`.
- Cada cruce crea `conciliacionesPrimas`.
- Prima pendiente no es CxC financiera.
- Estado de cuenta no marca pago confirmado.
- Estado de cuenta no crea finmov.

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
2. Si pasa, continuar con P0 planillas/facturas/comisiones/CxC/CxP.
3. Si falla, corregir esta capa antes de abrir comisiones.
