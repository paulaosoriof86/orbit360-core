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

### CERRADO-BE-105-03 — Corrección de alcance: ignorar `Listado producción 2025-2026`

Paula ya había indicado en sesiones previas que la hoja `Listado producción 2025-2026` debe ignorarse para esta migración. La fuente real de pólizas será entregada por Paula después, como archivo separado, cuando corresponda dentro del proceso.

Decisión corregida:

- No crear manifest para `Listado producción 2025-2026`.
- No usar esa hoja como fuente de pólizas.
- No usar esa hoja como financiero histórico.
- No pedir archivo de pólizas todavía por este hallazgo.
- Mantener la migración por fuentes separadas: la fuente de pólizas se trabajará solo cuando Paula la entregue explícitamente.

## Hallazgo relevante corregido

El archivo de movimientos no es una sola fuente pura: contiene hojas financieras mensuales y hojas de soporte/análisis/presupuesto. La hoja `Listado producción 2025-2026` existe dentro del archivo, pero queda ignorada por instrucción previa de Paula.

Decisión segura vigente:

- Las hojas financieras mensuales pueden seguir como `financiero_historico` → `finmovs`.
- `Listado producción 2025-2026` queda ignorada.
- Las hojas de análisis, dashboard, presupuesto y salarios quedan excluidas de escritura operativa.

## Pendientes abiertos

### ABIERTO-BE-105-01 — Preview normalizado previo a LAB

Implementar preview normalizado por fuente antes de cualquier `writeToStore`, con estados `LISTO`, `REQUIERE_VALIDACION`, `BLOQUEADO`, `OMITIDO` y `DUPLICADO_PROBABLE`.

### ABIERTO-BE-105-02 — Fuente real de pólizas pendiente por recibir en fase posterior

La fuente de pólizas no se toma del archivo de movimientos. Paula la entregará más adelante, como archivo separado, cuando corresponda en el proceso. Hasta ese momento no se crea manifest de pólizas ni cartera.

## Documento asociado

```txt
orbit360-platform/docs/REPORTE-PREVALIDACION-FUENTES-AYS-20260704.md
```
