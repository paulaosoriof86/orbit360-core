# Contrato backend — Runner agrupado de validaciones locales Conciliaciones

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** runner local agregado; pendiente ejecución en entorno local.

---

## 1. Objetivo

Agregar un comando único para ejecutar validaciones locales sintéticas/estáticas relacionadas con Conciliaciones antes de cualquier adapter Firestore LAB real.

Este runner no habilita persistencia, no aplica pagos y no reemplaza smoke visual en navegador.

---

## 2. Archivo agregado

```txt
tools/orbit360-run-validaciones-locales-conciliaciones-ays.mjs
```

---

## 3. Comando previsto

```txt
node tools/orbit360-run-validaciones-locales-conciliaciones-ays.mjs
```

Opcional, solo si se desea no bloquear por advertencias de entorno local:

```txt
node tools/orbit360-run-validaciones-locales-conciliaciones-ays.mjs --allow-warnings
```

---

## 4. Validaciones agrupadas

El runner ejecuta:

```txt
node --check tools/orbit360-validar-empalme-conciliaciones-062855-ays.mjs
node --check tools/orbit360-test-orquestar-score-propuestas-plan-ays.mjs
node --check tools/orbit360-test-validar-readiness-plan-persistencia-lab-ays.mjs
node tools/orbit360-validar-empalme-conciliaciones-062855-ays.mjs
node tools/orbit360-test-orquestar-score-propuestas-plan-ays.mjs
node tools/orbit360-test-validar-readiness-plan-persistencia-lab-ays.mjs
```

---

## 5. Archivos protegidos verificados

Antes y después de ejecutar las validaciones, calcula SHA-256 de:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
```

Si alguno cambia, el runner bloquea el resultado.

---

## 6. Salida

Genera reportes en:

```txt
_orbit360_reports/RUN-VALIDACIONES-LOCALES-CONCILIACIONES-AYS-*.json
_orbit360_reports/RUN-VALIDACIONES-LOCALES-CONCILIACIONES-AYS-*.txt
```

El reporte incluye:

```txt
decision
summary
steps
protected_files.before/after/changes
generated_reports
errors
warnings
can_write_now=false
can_apply_payments=false
restrictions
```

---

## 7. Decisiones posibles

```txt
VALIDACIONES_LOCALES_LISTAS
VALIDACIONES_LOCALES_LISTAS_CON_ADVERTENCIAS
VALIDACIONES_LOCALES_BLOQUEADAS
```

`VALIDACIONES_LOCALES_LISTAS` no autoriza adapter Firestore LAB, persistencia ni aplicación de pagos. Solo permite pasar a smoke visual/operativo y revisión manual de reportes.

---

## 8. Restricciones fijas

- Local-runner.
- Synthetic-only/static-only.
- No datos reales.
- No `Orbit.store` writes.
- No Firestore writes.
- No aplicación de pagos.
- No mutación de `cobros`, `polizas`, `comisiones`, `finmovs`, cartera ni producción.
- No deploy.
- No merge.

---

## 9. Relación con el plan vivo

Este bloque agrega un puente operativo entre:

```txt
smoke estático + orquestador score/propuestas + readiness plan persistencia
-> reporte local agrupado
-> smoke visual/operativo
-> revisión manual antes de adapter LAB futuro
```

El adapter Firestore LAB real sigue pendiente y requiere autorización explícita, entorno local y smoke previo.