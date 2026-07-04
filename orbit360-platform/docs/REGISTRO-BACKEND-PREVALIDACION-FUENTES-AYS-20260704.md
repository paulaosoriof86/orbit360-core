# Registro backend — prevalidación fuentes A&S 2026-07-04

**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** sin merge, sin deploy, sin main, sin carga Firestore.

## Cerrado en este bloque

### CERRADO-BE-105-01 — Manifests estructurales iniciales

Se generaron manifests estructurales locales, sin filas reales ni payload operativo, para:

- `Directorio Aseguradoras Guatemala 2026.xlsx` → tipo `aseguradoras`, país/moneda `GT/GTQ`, destino `aseguradoras`.
- `Directorio - Aseguradoras Colombia 2024.xlsx` → tipo `aseguradoras`, país/moneda `CO/COP`, destino `aseguradoras`.
- `Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx` → tipo `financiero_historico`, país/moneda mixtos a nivel libro y validados por hoja, destino `finmovs`.

Resultado dry-run estructural local:

- Directorio GT: `listo_dryrun`, 0 bloqueos.
- Directorio CO: `listo_dryrun`, 0 bloqueos.
- Movimientos GT/CO: `requiere_validacion`, 0 bloqueos, advertencia esperada por libro mixto.

### CERRADO-BE-105-02 — Dry-run canónico v2

Se agregó soporte de dry-run v2 para cubrir tipos del contrato canónico que el dry-run anterior no cubría de forma completa, especialmente `aseguradoras` y `estado_cuenta_bancario`.

Archivos:

```txt
tools/orbit360-dryrun-fuente-separada-ays-v2.mjs
tools/orbit360-prevalidar-fuente-ays.mjs
```

## Hallazgo relevante

El archivo de movimientos no es una sola fuente pura: contiene hojas financieras mensuales, hojas de soporte/análisis/presupuesto y una hoja `Listado producción 2025-2026`.

Decisión segura:

- Las hojas financieras mensuales pueden seguir como `financiero_historico` → `finmovs`.
- `Listado producción 2025-2026` queda excluida de financiero histórico y debe tener manifest separado tipo `polizas`.
- Las hojas de análisis, dashboard, presupuesto y salarios quedan excluidas de escritura operativa.

## Pendientes abiertos

### ABIERTO-BE-105-01 — Manifest separado de producción/pólizas

Crear manifest separado para `Listado producción 2025-2026` como fuente `polizas`, con validación de país, moneda, vigencia, estado, prima neta y prima total.

### ABIERTO-BE-105-02 — Preview normalizado previo a LAB

Implementar preview normalizado por fuente antes de cualquier `writeToStore`, con estados `LISTO`, `REQUIERE_VALIDACION`, `BLOQUEADO`, `OMITIDO` y `DUPLICADO_PROBABLE`.

## Documento asociado

```txt
orbit360-platform/docs/REPORTE-PREVALIDACION-FUENTES-AYS-20260704.md
```
