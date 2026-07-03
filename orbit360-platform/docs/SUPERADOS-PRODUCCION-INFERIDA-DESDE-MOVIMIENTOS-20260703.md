# Documentos superados — producción inferida desde archivo de movimientos

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Estado:** control de documentos superados.

## Motivo

Paula aclaró que el archivo `Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx` debe usarse únicamente para movimientos históricos financieros GT/CO hasta antes de finalizar mayo.

La hoja `Listado producción 2025-2026` debe ignorarse para migración operativa.

Por lo tanto, cualquier documento creado desde inferencias de producción/pólizas queda superado y no debe usarse para carga, dry-run, seed, cartera, clientes, pólizas ni cobros.

## Documentos marcados como superados/no usar

```txt
orbit360-platform/docs/NORMALIZACION-PRODUCCION-POLIZAS-AYS-GT-CO-CHATGPT-20260703.md
orbit360-platform/docs/CIERRE-NORMALIZACION-PRODUCCION-POLIZAS-AYS-GT-CO-20260703.md
orbit360-platform/docs/CRUCE-CALIDAD-PRODUCCION-POLIZAS-ASEGURADORAS-AYS-GT-CO-20260703.md
```

## Documento corregido al alcance financiero

```txt
orbit360-platform/docs/NORMALIZACION-MOVIMIENTOS-PRODUCCION-AYS-GT-CO-CHATGPT-20260703.md
```

Ahora debe leerse como normalización de movimientos financieros históricos, no como normalización de movimientos y producción.

## Documentos vigentes

```txt
orbit360-platform/docs/ALCANCE-DEFINITIVO-MOVIMIENTOS-HISTORICOS-GT-CO-20260703.md
orbit360-platform/docs/CIERRE-MOVIMIENTOS-HISTORICOS-FINANCIEROS-GT-CO-20260703.md
orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260703-MOVIMIENTOS-HISTORICOS.md
```

## Regla de continuidad

Para futuras conversaciones o revisiones:

- No usar producción inferida desde el archivo de movimientos.
- No pedir a Paula descargar archivos salvo paquete Claude/entrega solicitado.
- Pedir archivos uno a uno solo cuando el siguiente bloque real lo requiera.
- Migrar clientes, pólizas y cobros únicamente desde fuentes separadas y actualizadas.
- Mantener `finmovs` históricos separados de clientes, pólizas, cobros y cartera.

## Estado

**Control de documentos superados registrado.**
