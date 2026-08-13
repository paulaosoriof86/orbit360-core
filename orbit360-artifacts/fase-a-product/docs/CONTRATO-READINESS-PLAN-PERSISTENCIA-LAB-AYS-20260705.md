# Contrato backend — Readiness plan de persistencia LAB para conciliaciones

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** herramienta segura readiness-only agregada.

---

## 1. Objetivo

Validar el plan de persistencia de `conciliaciones` antes de cualquier adapter Firestore LAB real.

Este bloque no persiste datos. Su función es revisar que el plan generado por el orquestador score/propuestas siga siendo seguro, tenant-safe y plan-only.

---

## 2. Archivos agregados

```txt
tools/orbit360-validar-readiness-plan-persistencia-lab-ays.mjs
tools/orbit360-test-validar-readiness-plan-persistencia-lab-ays.mjs
```

---

## 3. Entrada esperada

```txt
node tools/orbit360-validar-readiness-plan-persistencia-lab-ays.mjs \
  --plan ruta/PLAN-PERSISTENCIA-CONCILIACIONES-AYS.local.json \
  --tenant alianzas-soluciones
```

El `plan` debe venir del preparador/orquestador plan-only, no de un proceso manual con payload real.

---

## 4. Validaciones principales

El validador revisa:

- que el plan no contenga filas reales, payload crudo ni muestras (`rows`, `rawRows`, `normalizedRows`, `payload`, etc.);
- que no existan secretos, tokens, API keys, webhooks, contraseñas o credenciales;
- que no haya banderas de escritura o aplicación habilitadas (`write_enabled`, `apply_payment`, `execute`, `commit`, `deploy`, `merge`);
- que cada operación sea `upsert_conciliacion_propuesta`;
- que la colección sea exclusivamente `conciliaciones`;
- que el tenant sea único y coincida con `alianzas-soluciones`;
- que `path_hint` respete aislamiento tenant: `tenantId/{tenant}/conciliaciones/{id}`;
- que país/moneda cumpla GT→GTQ y CO→COP;
- que `score`, `score_decision`, `proposed_action`, `queue_state`, `review_state` y `validation.status` sean válidos;
- que ninguna propuesta venga como `APLICADA`;
- que exista trazabilidad de fuente (`source_ref.file` y `source_ref.row_ref`);
- que exista `audit_event` de preparación o se emita advertencia.

---

## 5. Decisiones posibles

```txt
READINESS_LISTO
READINESS_LISTO_CON_ADVERTENCIAS
READINESS_BLOQUEADO
```

`READINESS_LISTO` no significa autorización de escritura. Solo indica que el plan puede pasar a revisión para adapter Firestore LAB, siempre con aprobación y smoke local.

---

## 6. Salida

Genera reportes en:

```txt
_orbit360_reports/READINESS-PLAN-PERSISTENCIA-LAB-AYS-*.json
_orbit360_reports/READINESS-PLAN-PERSISTENCIA-LAB-AYS-*.txt
```

La salida incluye:

```txt
decision
summary.total/ready/warnings/blocked
readiness[] por operación
errors
warnings
next_allowed_step
can_write_now=false
can_apply_payments=false
restrictions
```

---

## 7. Restricciones fijas

- Readiness-only.
- Plan-only.
- No `Orbit.store` writes.
- No Firestore writes.
- No aplicación de pagos.
- No mutación de `cobros`, `polizas`, `comisiones`, `finmovs`, cartera ni producción.
- No deploy.
- No merge.

---

## 8. Pruebas sintéticas

`tools/orbit360-test-validar-readiness-plan-persistencia-lab-ays.mjs` cubre:

1. readiness listo con dos operaciones válidas;
2. readiness con advertencia por falta de `audit_event`;
3. bloqueo por estado `APLICADA`;
4. bloqueo por `rawRows`/payload prohibido;
5. bloqueo por tenant distinto.

Las pruebas son sintéticas y no contienen datos reales.

---

## 9. Relación con el plan vivo

Este bloque agrega un nuevo puente entre:

```txt
orquestador score/propuestas plan-only
-> readiness de plan de persistencia
-> adapter Firestore LAB futuro
```

El adapter Firestore LAB real sigue pendiente y no debe ejecutarse sin entorno local, smoke y autorización.