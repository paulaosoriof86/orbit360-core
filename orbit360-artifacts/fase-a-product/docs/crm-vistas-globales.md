# Módulos · CRM vistas globales (Pólizas · Cobros · Renovaciones · Cancelaciones · Comisiones · Historial)

> Estado: **NÚCLEO**. Complementan a Cliente 360: donde la ficha es la vista *por cliente*, estas son las vistas *por cartera*. Comparten capa de datos y `core/crmkit.js`.

## Pólizas — `modules/polizas.js` · `#/polizas`
Cartera completa de pólizas de todas las aseguradoras.
- **KPIs**: vigentes/total, prima vigente, por renovar ≤45 d, canceladas.
- **Filtros**: búsqueda en vivo, ramo, aseguradora, asesor, estado.
- **Tabla**: número, cliente (enlaza a 360), ramo/producto, aseguradora, asesor, prima, vencimiento, estado.

## Cobros y cartera — `modules/cobros.js` · `#/cobros`
Salud de la cartera y conciliación.
- **KPIs**: al día, pendiente, vencido, por conciliar.
- **Aging**: barra de antigüedad de saldos vencidos en tramos 1–30 / 31–60 / 61–90 / 90+ días.
- **Tabla**: cliente, póliza, cuota, monto, vence, pago, estado, **conciliación** (✓ / ◷).
- La doble conciliación final (pago↔póliza) se procesa en Orbit Finanzas.

## Renovaciones — `modules/renovaciones.js` · `#/renovaciones`
Pipeline de pólizas por vencer a 90 días, en tablero kanban por urgencia:
**Vencidas · ≤15 d · 16–45 d · 46–90 d**. Cada tarjeta enlaza a su Cliente 360 y muestra ramo, aseguradora, prima y días restantes. KPI de "prima en juego".

## Cancelaciones — `modules/cancelaciones.js` · `#/cancelaciones`
Fuga de cartera: motivos, valor perdido y tasa de fuga.
- **KPIs**: canceladas, valor perdido, motivo principal, tasa de fuga.
- **Gráfico** de motivos (ranking con barras).
- **Tabla**: fecha, cliente, póliza, ramo, motivo, valor perdido.

## Comisiones — `modules/comisiones.js` · `#/comisiones`
Comisiones generadas, devengadas vs liquidadas, con tres cortes: **por asesor · por aseguradora · por periodo**. KPIs de generada / liquidada / por liquidar. Las liquidaciones se ejecutan en Orbit Finanzas.

## Historial y actividades — `modules/historial.js` · `#/historial`
Feed cronológico de toda la cartera (llamadas, WhatsApp, correos, reuniones, eventos del sistema), agrupado por día.
- **KPIs** por tipo de interacción.
- **Filtros**: búsqueda en vivo, tipo, asesor.
- Cada interacción enlaza a su Cliente 360.

## CRM Kit — `core/crmkit.js`
Piezas compartidas: `head()`, `kpis()`, `clienteCell()`, `asesorCell()`, `aseguradoraCell()`, `filterBar()` + `wireFilters()` y catálogos de opciones (`ramoOptions`, `asesorOptions`, `aseguradoraOptions`). Mantiene los módulos de vista delgados y consistentes.
