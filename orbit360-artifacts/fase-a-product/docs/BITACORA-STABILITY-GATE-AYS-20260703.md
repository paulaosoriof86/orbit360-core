# Bitácora — Stability Gate A&S

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** ajustes aplicados en rama.

## 1. Gate bloqueó por menciones no ejecutables

- **Módulo/área:** QA local / Stability Gate.
- **Síntoma:** El gate bloqueó por encontrar la palabra `localStorage` en un comentario de módulo y en una mención defensiva del store LAB.
- **Esperado:** Bloquear únicamente usos ejecutables reales, no comentarios ni documentación interna.
- **Causa raíz:** La validación buscaba texto literal sin distinguir comentarios o menciones defensivas.
- **Archivo/función:** `tools/orbit360-stability-gate-ays-v99.ps1`.
- **Fix aplicado:** Se ajustó el gate para buscar patrones ejecutables y omitir líneas de comentario en módulos.
- **Impacto:** Reduce falsos positivos y permite que el smoke avance si no hay bloqueos reales.
- **Estado:** RESUELTO EN RAMA.

## 2. API `_emit` no detectada claramente

- **Módulo/área:** QA local / contrato `Orbit.store`.
- **Síntoma:** El gate advertía que no detectaba `_emit`, aunque el store LAB lo expone como alias de `emit`.
- **Esperado:** Reconocer `_emit: emit` como API válida.
- **Archivo/función:** `tools/orbit360-stability-gate-ays-v99.ps1`, `orbit360-platform/data/store-firestore-lab.local.js`.
- **Fix aplicado:** Se agregó detección explícita de `_emit: emit`.
- **Impacto:** Mejora precisión del gate.
- **Estado:** RESUELTO EN RAMA.

## 3. Index sin loader/init permanente

- **Módulo/área:** Index central / backend LAB.
- **Síntoma:** El gate advierte que `index.html` no integra loader/init LAB permanente.
- **Esperado:** Mantenerlo como advertencia, no como bloqueo, porque el smoke usa inyección temporal controlada.
- **Archivo/función:** `tools/orbit360-stability-gate-ays-v99.ps1`, `tools/orbit360-smoke-ays-lab-v99.ps1`.
- **Fix aplicado:** La condición permanece como advertencia. El fix permanente del index queda para cierre controlado por el riesgo de codificación del HTML.
- **Impacto:** Permite validar backend LAB sin forzar edición permanente del index.
- **Estado:** ADVERTENCIA CONTROLADA.

## 4. Recaudo / finmov

- **Módulo/área:** Reglas de negocio / cartera vs caja.
- **Síntoma:** El gate advertía que no confirmaba `postRecaudo` como no-op cuando la función no existe en `core/queries.js`.
- **Esperado:** No bloquear ni advertir por ausencia de esa función; advertir solo si existe y tiene riesgo.
- **Archivo/función:** `tools/orbit360-stability-gate-ays-v99.ps1`.
- **Fix aplicado:** Si no existe `postRecaudo`, el gate reporta que no hay evidencia de creación automática desde esa función.
- **Impacto:** Reduce falsos positivos sin relajar la regla crítica de no crear `finmov` desde recaudo.
- **Estado:** RESUELTO EN RAMA.

## Regla futura

El stability gate debe bloquear riesgos reales, no comentarios ni documentación. Las advertencias se conservan cuando requieren revisión humana pero no impiden smoke.
