# SUPERADO — Cruce de calidad producción/pólizas vs aseguradoras A&S GT/CO

> **Estado actualizado 2026-07-03:** este documento queda **SUPERADO / NO USAR PARA MIGRACIÓN OPERATIVA**.
>
> Paula confirmó que el archivo `Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx` debe usarse únicamente para movimientos históricos financieros de Guatemala y Colombia hasta antes de finalizar mayo.
>
> La hoja `Listado producción 2025-2026` debe ignorarse para migración de clientes, pólizas, cobros o cartera. Cualquier conteo o cruce de aseguradoras derivado de esa hoja queda solo como ejercicio exploratorio/heurístico y no debe alimentar Firestore LAB, seed demo ni reportes de producción real.
>
> Alcance vigente: `orbit360-platform/docs/ALCANCE-DEFINITIVO-MOVIMIENTOS-HISTORICOS-GT-CO-20260703.md` y `orbit360-platform/docs/CIERRE-MOVIMIENTOS-HISTORICOS-FINANCIEROS-GT-CO-20260703.md`.

---

# Cruce de calidad producción/pólizas vs aseguradoras A&S GT/CO

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Estado original:** cruce exploratorio; ahora superado por alcance definitivo financiero.

## Nota de lectura

El contenido histórico que seguía en este documento no debe usarse para carga, dry-run, cartera, clientes, pólizas, cobros ni producción real.

Se conserva únicamente como trazabilidad del error de alcance y del aprendizaje aplicado al importador: el sistema debe pedir/permitir seleccionar alcance del archivo antes de inferir entidades.
