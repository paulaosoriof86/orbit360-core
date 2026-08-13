# Bitácora backend — Generador de propuestas conciliación A&S

**Fecha:** 2026-07-04  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** herramienta segura agregada y documentada.

---

## 2026-07-04 — Generador dryRunReport → propuestas conciliaciones

- **Módulo/área:** Backend importador / dry-run / conciliación / bandeja.
- **Necesidad:** convertir la salida validada del dry-run y score en propuestas estructuradas para la bandeja `conciliaciones`, sin tocar cobros ni aplicar pagos.
- **Esperado:** cada candidato de conciliación debe producir una propuesta con tenant, fuente, manifest, dry-run, archivo, hoja, fila/hash, país, moneda, score, decisión, acción propuesta, estado de bandeja, estado de revisión y vínculos a póliza/cobro/comisión cuando existan.
- **Causa raíz:** ya existían validador de score, validador de dryRunReport y contrato de bandeja, pero faltaba el puente que transformara candidatos de dry-run en propuestas concretas.
- **Archivos agregados:**
  - `tools/orbit360-generar-propuestas-conciliacion-ays.mjs`
  - `tools/orbit360-test-generar-propuestas-conciliacion-ays.mjs`
  - `orbit360-platform/docs/CONTRATO-GENERACION-PROPUESTAS-CONCILIACION-AYS-20260704.md`
- **Fix/mejora aplicada:** generador metadata-only que bloquea fuentes no autorizadas, `write_enabled=true`, payload/filas reales y país/moneda incoherente. Genera IDs estables y estados derivados de `score_decision`.
- **Impacto comercializable:** convierte planillas/estados en propuestas auditables, reduciendo reproceso y evitando aplicar pagos por coincidencias débiles.
- **Estado:** LISTO EN RAMA / pendiente integración con parser real y persistencia Firestore LAB.

---

## Pruebas locales sintéticas

Ejecutado localmente en entorno aislado:

```txt
node tools/orbit360-test-generar-propuestas-conciliacion-ays.mjs
```

Resultado:

```txt
Casos: 5
FAIL: 0
RESULTADO: OK
```

Casos cubiertos:

1. generación de 3 propuestas desde planilla de comisiones;
2. bloqueo de `financiero_historico`;
3. bloqueo de `write_enabled=true`;
4. bloqueo de `rawRows`;
5. bloqueo por moneda incoherente.

---

## Pendiente siguiente

Implementar persistencia LAB controlada para guardar estas propuestas en colección `conciliaciones`, sin aplicación automática.
