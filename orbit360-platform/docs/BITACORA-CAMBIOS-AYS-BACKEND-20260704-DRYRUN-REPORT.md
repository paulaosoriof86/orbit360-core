# Bitácora backend — dryRunReport importador A&S

**Fecha:** 2026-07-04  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** documentado y herramienta segura agregada.

---

## 2026-07-04 — Validador dryRunReport para importador

- **Módulo/área:** Backend importador / parser / conciliación / QA.
- **Necesidad:** conectar score de conciliación con el flujo de manifest/dry-run para que cada importación pueda revisarse sin escribir datos reales ni aplicar pagos automáticamente.
- **Esperado:** todo dry-run debe tener resumen consistente, fuente, trazabilidad, país/moneda, estados por fila/candidato, score/decisión/acción propuesta si aplica, y bloqueo de payload real embebido.
- **Causa raíz:** el prototipo ya tiene flujo visual de importación, pero backend real necesita una salida validable antes de impactar `clientes`, `polizas`, `cobros`, `comisiones`, `conciliacionBanco`, `parchesPendientes` o `finmovs`.
- **Archivos agregados:**
  - `tools/orbit360-validar-dryrun-report-ays.mjs`
  - `tools/orbit360-test-validar-dryrun-report-ays.mjs`
  - `orbit360-platform/docs/CONTRATO-DRYRUN-REPORT-IMPORTADOR-AYS-20260704.md`
- **Fix/mejora aplicada:** se agregó validador metadata-only para reportes dry-run, con bloqueo de `write_enabled=true`, payload/filas reales, conteos inconsistentes y país/moneda incoherente.
- **Impacto comercializable:** permite importar por fuentes separadas con revisión segura, trazabilidad y bandeja de conciliación antes de afectar producción, cartera, comisiones o Portal.
- **Estado:** LISTO EN RAMA / pendiente integración al parser/importador real y ejecución local en repo completo.

---

## Reglas agregadas

- `dryRunReport` debe incluir `tenant_id`, `source_type`, `manifest_id`, `source_ref`, país/moneda y `summary`.
- Para fuentes de conciliación, debe incluir candidatos con score, decisión y acción propuesta.
- No se permiten filas reales ni payloads dentro del reporte versionado.
- `MATCH_EXACTO` no aplica automáticamente; propone aplicación con confirmación.
- `BLOQUEADO` solo permite `NO_APLICAR`.
- `writeToStore` sigue deshabilitado hasta fase LAB real aprobada.

---

## Pendiente siguiente

Crear el bloque de integración del parser/importador real:

```txt
manifest validado -> dryRunReport validado -> bandeja de conciliación trazable
```

sin escritura automática.
