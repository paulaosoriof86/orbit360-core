# Bitácora — Readiness plan de persistencia LAB

**Fecha:** 2026-07-05  
**Bloque:** CERRADO-BE-104-24 — Readiness plan de persistencia LAB  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy.

---

## 1. Necesidad

El plan vivo indicaba como siguiente paso revisar que el plan de persistencia no incluyera writes y preparar readiness para adapter Firestore LAB, todavía sin datos reales ni aplicación controlada.

---

## 2. Cambio aplicado

Se agregaron:

```txt
tools/orbit360-validar-readiness-plan-persistencia-lab-ays.mjs
tools/orbit360-test-validar-readiness-plan-persistencia-lab-ays.mjs
orbit360-platform/docs/CONTRATO-READINESS-PLAN-PERSISTENCIA-LAB-AYS-20260705.md
```

La herramienta valida un `PLAN-PERSISTENCIA-CONCILIACIONES-AYS` antes de cualquier adapter LAB.

---

## 3. Validaciones incorporadas

- Bloqueo por filas reales o payload crudo.
- Bloqueo por secretos, tokens, API keys, webhooks, contraseñas o credenciales.
- Bloqueo por banderas de escritura/aplicación (`write_enabled`, `apply_payment`, `execute`, `commit`, `deploy`, `merge`).
- Validación de operación `upsert_conciliacion_propuesta`.
- Validación de colección exclusiva `conciliaciones`.
- Validación tenant-safe.
- Validación de `path_hint` con `tenantId/{tenant}/conciliaciones/{id}`.
- Validación de país/moneda GT→GTQ y CO→COP.
- Validación de score, decisión, acción propuesta y estados.
- Bloqueo de estado `APLICADA` en readiness plan-only.
- Advertencia si falta `audit_event` de preparación.

---

## 4. Restricciones preservadas

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

## 5. Pruebas sintéticas agregadas

`tools/orbit360-test-validar-readiness-plan-persistencia-lab-ays.mjs` cubre:

1. readiness listo con dos operaciones válidas;
2. readiness con advertencia por falta de `audit_event`;
3. bloqueo por `APLICADA`;
4. bloqueo por `rawRows`;
5. bloqueo por tenant distinto.

Las pruebas quedan listas para ejecución local porque requieren el repo completo y Node.

---

## 6. Estado

**Cerrado como tooling/documentación en rama.**

Pendiente: ejecución local de tests, revisión de reportes `_orbit360_reports`, smoke visual/operativo real de Conciliaciones y adapter Firestore LAB con aprobación explícita antes de cualquier write.