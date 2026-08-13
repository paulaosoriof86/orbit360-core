# Bitácora backend — Adaptador candidatos metadata-only dryRunReport A&S

**Fecha:** 2026-07-05  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** tooling agregado. Sin datos reales, sin lectura de filas, sin writes.

---

## 2026-07-05 — Adaptador de candidatos metadata-only

- **Módulo/área:** Backend / importador / parser / dryRunReport / conciliaciones.
- **Necesidad:** después del constructor de dryRunReport sin filas, faltaba un paso para añadir candidatos metadata-only compatibles con el validador existente.
- **Esperado:** recibir envelope dryRun y candidatos metadata-only, recalcular summary, validar trazabilidad/país/moneda/score/acción y producir un dryRun listo para validación final.
- **Causa raíz:** no se debe pasar a score/propuestas sin candidatos estructurados, pero tampoco se deben usar filas reales en esta fase.
- **Archivos agregados:**
  - `tools/orbit360-adaptar-candidatos-dryrun-metadata-ays.mjs`.
  - `tools/orbit360-test-adaptar-candidatos-dryrun-metadata-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-ADAPTADOR-CANDIDATOS-DRYRUN-METADATA-AYS-20260705.md`.
- **Fix/mejora aplicada:** adaptador metadata-only compatible con `tools/orbit360-validar-dryrun-report-ays.mjs`.
- **Decisión clave:** candidatos pueden preparar readiness para score/propuestas, pero siguen sin writes, sin aplicación de pagos y sin generación de conciliaciones reales.
- **Impacto comercializable:** permite probar pipeline de migración con estructura auditable antes de usar datos reales.
- **Estado:** LISTO COMO TOOLING EN RAMA / pendiente orquestador metadata-only.

---

## Intermedio agregado al plan

Este bloque agrega un intermedio entre:

```txt
constructor dryRunReport sin filas
```

y:

```txt
validar dryRunReport -> score -> propuestas conciliaciones
```

No cambia el plan; lo hace más verificable y evita saltos inseguros.

---

## Próximo bloque recomendado

Orquestador de pipeline metadata-only:

```txt
manifest -> perfil -> dryRun envelope -> candidates metadata-only -> validar dryRun -> score -> propuestas conciliaciones
```

Debe seguir sin datos reales y sin writes.