# Registro para Claude — avances backend de prevalidación fuentes 2026-07-04

**Estado:** documento acumulativo. No generar paquete Claude hasta que Paula lo pida.

## Qué debe conservar Claude cuando retome

1. No mezclar el directorio de aseguradoras con clientes, pólizas, cobros, cartera ni financiero histórico.
2. Mantener `aseguradoras` como fuente separada y catálogo/directorio por país.
3. No mezclar Guatemala y Colombia en totales ni catálogos sin país/moneda explícitos.
4. No procesar `Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx` como una sola fuente pura: contiene financiero histórico y hojas que deben excluirse.
5. No usar la hoja `Listado producción 2025-2026` como financiero histórico. Debe tratarse como fuente separada tipo `polizas`.
6. Mantener `financiero_historico` limitado a `finmovs`; nunca crear desde ahí clientes, pólizas, cobros, cartera, producción ni comisiones.
7. Conservar el aprendizaje de dry-run canónico v2 para `aseguradoras` y `estado_cuenta_bancario`.

## Archivos backend nuevos o actualizados

```txt
tools/orbit360-dryrun-fuente-separada-ays-v2.mjs
tools/orbit360-prevalidar-fuente-ays.mjs
orbit360-platform/docs/REPORTE-PREVALIDACION-FUENTES-AYS-20260704.md
orbit360-platform/docs/REGISTRO-BACKEND-PREVALIDACION-FUENTES-AYS-20260704.md
```

## Nota para prototipo/importador

En UI y documentación visible al cliente, presentar estados honestos: `LISTO`, `REQUIERE_VALIDACION`, `BLOQUEADO`, `OMITIDO` y `DUPLICADO_PROBABLE`. No presentar como productiva una carga que aún está en preview/dry-run.
