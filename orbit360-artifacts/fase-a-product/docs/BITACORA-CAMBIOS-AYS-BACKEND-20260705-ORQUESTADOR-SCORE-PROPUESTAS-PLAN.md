# Bitácora — Orquestador score/propuestas plan-only

**Fecha:** 2026-07-05  
**Bloque:** CERRADO-BE-104-23 — Orquestador score/propuestas plan-only  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy.

---

## 1. Necesidad

Después del bloque `CERRADO-BE-104-22 — Orquestador de pipeline metadata-only`, faltaba encadenar el tramo siguiente del plan:

```txt
dryRun validado -> score -> propuestas conciliaciones -> plan de persistencia
```

El avance debía mantenerse plan-only, metadata-only y sin datos reales.

---

## 2. Cambio aplicado

Se agregaron:

```txt
tools/orbit360-orquestar-score-propuestas-plan-ays.mjs
tools/orbit360-test-orquestar-score-propuestas-plan-ays.mjs
orbit360-platform/docs/CONTRATO-ORQUESTADOR-SCORE-PROPUESTAS-PLAN-AYS-20260705.md
```

La herramienta encadena:

1. `orbit360-orquestar-pipeline-metadata-ays.mjs`;
2. `score_gate` interno sobre el `dryRunReport` final;
3. `orbit360-generar-propuestas-conciliacion-ays.mjs`;
4. `orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs`.

---

## 3. Restricciones preservadas

- No usa datos reales.
- No lee filas reales.
- No escribe `Orbit.store`.
- No escribe Firestore.
- No aplica pagos.
- No modifica `cobros`, `polizas`, `comisiones`, `finmovs`, cartera ni producción.
- No toca backend protegido.
- No deploy.
- No merge.

---

## 4. Resultado esperado

El orquestador produce reportes locales en `_orbit360_reports` y clasifica el bloque en:

```txt
ORQUESTADOR_PLAN_LISTO
ORQUESTADOR_PLAN_LISTO_CON_ADVERTENCIAS
ORQUESTADOR_PLAN_BLOQUEADO
```

Aun cuando el resultado sea listo, el plan resultante no autoriza writes. Solo prepara readiness para futura persistencia LAB aprobada.

---

## 5. Pruebas sintéticas agregadas

`tools/orbit360-test-orquestar-score-propuestas-plan-ays.mjs` cubre:

1. score/propuestas/plan listo;
2. advertencia por `MATCH_EXACTO` con acción no confirmatoria;
3. bloqueo por país/moneda incoherente;
4. bloqueo por payload/filas prohibidas.

Las pruebas quedan listas para ejecución local porque requieren el repo completo y las herramientas encadenadas.

---

## 6. Estado

**Cerrado como tooling/documentación en rama.**

Pendiente: ejecución local de tests, smoke visual/operativo real de Conciliaciones y posterior validación del plan de persistencia antes de cualquier adapter Firestore LAB o aplicación controlada.