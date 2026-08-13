# Bitácora — Guía de ejecución y revisión del runner local Conciliaciones

**Fecha:** 2026-07-05  
**Bloque:** CERRADO-BE-104-26 — Guía runner local y criterios de bloqueo  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy.

---

## 1. Necesidad

Después de agregar el runner agrupado, faltaba documentar cómo ejecutarlo con mínima carga manual y qué criterios usar para decidir si se puede pasar a smoke visual/operativo.

---

## 2. Cambio aplicado

Se agregaron:

```txt
tools/orbit360-run-validaciones-locales-conciliaciones-ays.ps1
orbit360-platform/docs/GUIA-EJECUCION-REVISION-RUNNER-CONCILIACIONES-AYS-20260705.md
```

---

## 3. Wrapper PowerShell

El wrapper:

- valida raíz del repo;
- valida Node;
- ejecuta el runner Node;
- ubica reporte TXT/JSON más reciente;
- genera resumen PowerShell;
- intenta copiar el resumen al portapapeles;
- bloquea si el runner devuelve exit distinto de 0.

---

## 4. Criterios documentados

Se documentaron criterios para:

- continuar a smoke visual/operativo;
- bloquear avance;
- revisar advertencias;
- qué compartir de vuelta a ChatGPT/Codex;
- qué no hacer aunque el runner salga OK;
- siguiente paso si falla.

---

## 5. Restricciones preservadas

- No usa datos reales.
- No escribe `Orbit.store`.
- No escribe Firestore.
- No aplica pagos.
- No modifica `cobros`, `polizas`, `comisiones`, `finmovs`, cartera ni producción.
- No deploy.
- No merge.

---

## 6. Estado

**Cerrado como documentación/tooling en rama.**

Pendiente: ejecutar wrapper/runner localmente, revisar `_orbit360_reports` y luego hacer smoke visual/operativo si corresponde.