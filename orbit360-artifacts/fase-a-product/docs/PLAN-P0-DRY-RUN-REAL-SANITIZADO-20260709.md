# PLAN P0.3 — DRY-RUN REAL SANITIZADO POR FUENTE SEPARADA

Fecha: 2026-07-09
Carril: C con soporte B
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: preparacion implementada; no ejecutado con datos reales.

## Objetivo

Preparar el dry-run real sanitizado antes de cualquier escritura operativa.

El dry-run debe confirmar, por fuente separada:

- que entidad se crearia;
- que entidad se actualizaria;
- que fila se omitiria;
- que registro requiere validacion;
- que alertas se generan;
- que trazabilidad queda disponible;
- que nunca se mezclan fuentes ni capas.

## Herramienta agregada

```txt
tools/orbit360-p0-dryrun-manifest-20260709.mjs
```

Define manifest de fuentes, destinos, bloqueos y salidas esperadas.

Smoke:

```txt
tools/orbit360-test-p0-dryrun-manifest.mjs
```

## Fuentes P0 previstas

| Orden | Fuente | Destinos permitidos | Nunca crea |
|---:|---|---|---|
| 1 | clientes | clientes, contactos, calidadDatos, gestionesValidacion | polizas, cobros, carteraPrimas, finmovs, CxC/CxP |
| 2 | polizas | polizas, vigenciasPoliza, recibosEsperados, gestionesValidacion | cobros, carteraPrimas, finmovs, CxC/CxP |
| 3 | vehiculos | bienesAsegurados, vinculosPolizaBien, gestionesValidacion | clientes, polizas, cobros, finmovs |
| 4 | recibos/cobros fuente externa | recibosFuenteExterna, cobrosFuenteExterna, conciliacionesPrimas, brechasHistoricas | clientes, polizas, finmovs, CxC/CxP |
| 5 | estados de cuenta aseguradora | estadosCuentaAseguradora, recibosAseguradora, carteraPrimas, conciliacionesPrimas | cobros, finmovs, CxC/CxP |
| 6 | planillas comisiones | planillasComisiones, comisionesDevengadas, conciliacionesComisiones | carteraPrimas, finmovs, CxC/CxP |
| 7 | facturas comisiones | facturasComisiones, cxcComisiones, conciliacionesComisiones | carteraPrimas, cobros, finmovs, CxP |
| 8 | estado cuenta bancario | movimientosBanco, conciliacionBancaria | clientes, polizas, cobros, carteraPrimas, finmovs |

## Bloqueos de escritura

La escritura real queda bloqueada si falta:

- pais;
- moneda;
- llave compuesta;
- forma de pago;
- prima neta;
- monto;
- fecha;
- aseguradora;
- periodo;
- numero de factura;
- poliza o recibo resoluble;
- confirmacion humana cuando aplica.

## Reporte esperado por dry-run

Cada dry-run debe producir resumen sanitizado:

```txt
archivoFuente
hojaFuente
filasProcesadas
crear
actualizar
omitir
requiereValidacion
alertasPorTipo
entidadesDestino
bloqueos
muestrasAnonimizadas
hashFuente
fechaEjecucion
usuarioEjecutor
```

No debe guardar payload real en el repo.

## Secuencia recomendada

1. Clientes: ya existe dry-run sanitizado inicial.
2. Polizas: ejecutar dry-run para validar llave compuesta, vigencias y recibos esperados.
3. Vehiculos: ejecutar despues de polizas para vincular bienes.
4. Recibos/cobros fuente externa: ejecutar para comparar con recibos esperados.
5. Estados de cuenta aseguradora: ejecutar para cartera real.
6. Planillas de comisiones: ejecutar para comision devengada.
7. Facturas de comision: ejecutar para CxC.
8. Banco: ejecutar al final para propuestas de conciliacion, sin crear finmovs.

## Criterio de avance a escritura controlada

Solo avanzar cuando:

- dry-run pasa por fuente;
- bloqueos criticos bajan a nivel aceptable;
- Paula confirma excepciones de negocio;
- no hay mezcla de entidades;
- no hay escritura directa desde banco;
- no hay pagos/cobros marcados sin conciliacion;
- se documenta archivo/hoja/fila/bloque/pais/moneda/periodo.

## Accion manual

No requerida para esta preparacion.

Sera indispensable solo cuando se ejecute dry-run con archivos reales desde el entorno local o una herramienta autorizada, porque los archivos reales no deben subirse como payload al repo.
