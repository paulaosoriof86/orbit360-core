# REGISTRO P0 — TABLERO OPERATIVO MINIMO DE IMPORTADORES

Fecha: 2026-07-09
Carril: A/B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: tablero operativo minimo implementado en hub Importar; pendiente validacion visual/CI.

## Que parte del plan se avanzo

P0.2 — Tablero operativo minimo.

Se agrego una vista de control en el modulo Importar para monitorear capas creadas por los importadores P0 antes de operar con datos reales.

## Archivos agregados/modificados

```txt
orbit360-platform/modules/importar-p0-dashboard.js
orbit360-platform/modules/importar.js
tools/orbit360-test-importar-p0-dashboard.mjs
.github/workflows/orbit360-p0-smoke.yml
```

## Que muestra

- `polizas`
- `recibosEsperados`
- `recibosAseguradora`
- `carteraPrimas`
- `conciliacionesPrimas`
- `comisionesDevengadas`
- `facturasComisiones`
- `cxcComisiones`
- `movimientosBanco`
- `conciliacionBancaria`
- `cxpAsesores`

## Reglas cubiertas

- Vista de conteos por capa.
- Alertas de registros que requieren validacion.
- Montos por capa cuando exista moneda/monto.
- Tabla de control con estado, fuente, poliza/factura, cliente/asesor, moneda, monto y validacion.
- No escribe datos.
- No confirma pagos.
- No crea finmovs definitivos.
- No reemplaza validacion humana.

## Por que se hizo asi

La implementacion P0 ya agrego motores y wires para polizas, cartera, comisiones y banco. Antes de pasar a dry-run real sanitizado, se necesitaba una vista minima para ver si las capas se estan llenando correctamente.

## Seguridad

- No toca backend protegido.
- No toca `store.js`.
- No toca adapter Firestore LAB.
- No toca reglas Firebase.
- No usa datos reales.
- No hace deploy.
- No requiere accion manual en este paso.

## Siguiente paso

1. Validar CI/smoke.
2. Si pasa, preparar dry-run real sanitizado por fuente separada.
3. Si falla, corregir tablero o wires antes de cargar fuentes reales.
