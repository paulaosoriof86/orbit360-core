# Mejoras detectadas · Orbit 360 (para trasladar al backend LAB)

> Mejoras del **prototipo** que deben reflejarse en el backend (ChatGPT/Codex). La usuaria YA migró; esto es la lista viva de lo que el LAB debe incorporar. Marcar cuando el backend las adopte.

## Contrato de datos (crítico para el backend)
- **`Orbit.store` API estable**: `all(c)`, `get(c,id)`, `where(c,fn)`, `find(c,fn)`, `insert(c,row)`, `update(c,id,patch)`, `remove(c,id)`, `on(fn)→off`, **`_emit(c)`** (público desde v1.49), `init(seed)`, `reseed(seed)`, `raw()`. El backend debe implementar EXACTAMENTE esta firma para que los módulos no cambien.
- **Eventos**: cada mutación (`insert/update/remove`) dispara `_emit(colección)`; los módulos se re-renderizan escuchando `on()`. El backend real debe emitir el mismo evento tras confirmar la escritura remota.
- **Versión de datos**: `seed.__v` controla la re-siembra. En LAB validar por **IDs exactos `lab_`**, no por conteos demo.

## Colecciones que el backend debe soportar
clientes, polizas, recibos/cobros, vehiculos, siniestros, negocios(leads), gestiones(ops), aseguradoras, contactosAseg, comisiones, finmovs, presupuesto, metas, cursos, lecciones, recursos, plantillas, automatizaciones, notificaciones, correos, usuarios, roles, paises, catalogos, integraciones, clausulas, documentos.

## Mejoras funcionales recientes a preservar en backend
- **Finanzas**: CxC/CxP arrastran mes a mes (partidas pendientes se listan hasta saldarse); cambio de estado impacta movimientos sin duplicar; presupuesto en colección `presupuesto`.
- **Metas**: colección `metas` con `{mes, tipo, valor, asesorId?}`; sugeridor por tendencia. Unificar aquí las 3 fuentes de metas (campo `asesor.metaPrima`, colección `metas`, `cat.metas`) → **fuente única = colección `metas`**.
- **Cobros**: conciliación por recibo (fecha de envío a gestión + factura → fecha real).
- **Calidad**: score de completitud por cliente; al completar, sale de la cola.
- **Cotizador/Comparativo**: catálogo vehículo marca→línea→modelo; propuestas PDF editables antes de comparar.

## Pendientes de profundización (prototipo, no bloquean migración)
1. Cotizador: guardar cotización en historial; upload real de PDF de propuestas; plantilla de impresión por aseguradora.
2. Finanzas: conciliación bancaria con estado de cuenta real (cruce recibos↔depósitos).
3. Academia: 14 cursos profundos + videos.
4. Módulos delgados a profundizar: plantillas, reportes, comisiones (detalle), historial/cronograma (filtros).
5. Demo interactivo + handoff HTML regenerados con módulos v1.4x.

## Reglas no negociables (recordatorio)
- No hardcodear A&S ni datos reales · Marca Orbit 360 en chrome, logo cliente solo en slot white-label · Módulos solo usan `Orbit.store` · Sin notas técnicas en UI cliente · Moneda por país sin mezclar · Producción/comisiones sobre prima neta recaudada.
