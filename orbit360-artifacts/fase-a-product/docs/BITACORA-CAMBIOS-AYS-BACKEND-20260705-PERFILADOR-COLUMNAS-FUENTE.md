# Bitácora backend — Perfilador de columnas por fuente A&S

**Fecha:** 2026-07-05  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** tooling agregado. Sin datos reales, sin lectura de filas, sin writes.

---

## 2026-07-05 — Perfilador de columnas por fuente

- **Módulo/área:** Backend / importador / parser / fuentes separadas.
- **Necesidad:** después del manifest por fuente, faltaba un paso intermedio para perfilar columnas declaradas antes del `dryRunReport`.
- **Esperado:** identificar campos obligatorios, campos opcionales, matches probables, columnas no mapeadas y bloqueos antes de cualquier lectura operativa.
- **Causa raíz:** el parser real no debe improvisar mapeos ni mezclar fuentes. Debe partir de manifest + perfil de columnas.
- **Archivos agregados:**
  - `tools/orbit360-perfilar-columnas-fuente-ays.mjs`.
  - `tools/orbit360-test-perfilar-columnas-fuente-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-PERFILADOR-COLUMNAS-FUENTE-AYS-20260705.md`.
- **Fix/mejora aplicada:** perfilador metadata-only por fuente autorizada.
- **Impacto comercializable:** reduce errores de migración, mantiene separación de fuentes y prepara importadores reales sin exponer datos ni generar cambios operativos prematuros.
- **Estado:** LISTO COMO TOOLING EN RAMA / pendiente ejecución local e integración con constructor de dryRunReport.

---

## Intermedio agregado al plan

Este bloque es un intermedio explícito entre:

```txt
manifest validado
```

y:

```txt
dryRunReport
```

No cambia el orden del plan; lo vuelve más seguro.

---

## Próximo bloque recomendado

Constructor de `dryRunReport` sin payload real a partir de:

```txt
manifest validado + perfil columnas + fuente separada
```

Debe seguir sin datos reales, sin escrituras y sin aplicación operativa.