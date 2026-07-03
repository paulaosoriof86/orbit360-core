# Avance Validador Marketing + Integraciones · Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Base:** Claude v1.97

---

## 1. Objetivo

Crear un runner/validador versionado para verificar que el frente Marketing + Integraciones no pierda contratos críticos antes de una validación visual.

---

## 2. Decisión de seguridad

Se intentó crear un runner completo que levantara servidor local, abriera navegador y copiara reporte. La herramienta lo bloqueó por controles de seguridad.

No se insistió con ese enfoque para evitar nuevos bloqueos o pasos manuales innecesarios.

Se creó primero un validador mínimo y seguro:

- sin `git`,
- sin `git clean`,
- sin Python,
- sin servidor,
- sin navegador,
- sin deploy,
- sin producción,
- sin escrituras reales,
- sin secretos.

---

## 3. Archivo creado

- `tools/orbit360-validate-marketing-integraciones.mjs`

Commit:

- `36c871186d058146383a48c6e6350a8a7dd110e1` · `tools: agregar validador marketing integraciones`

---

## 4. Qué valida

Archivos requeridos:

- `index.html`
- `core/integraciones.js`
- `core/integraciones-panel.js`
- `modules/marketing.js`
- `data/store.js`
- `data/seed.js`

Contratos requeridos:

- `index.html` carga `core/integraciones.js`
- `core/integraciones.js` contiene:
  - `Orbit.integraciones`
  - `emit`
  - `diagnostico`
  - `openPanel`
  - `extendSeed`
- `core/integraciones-panel.js` contiene:
  - `Orbit.integracionesPanel`
- `modules/marketing.js` contiene eventos:
  - `marketing_sync_sheets`
  - `marketing_generar_pieza`
  - `marketing_programar_publicacion`
  - `marketing_contenido_creado`
  - `Orbit.integraciones.emit`

---

## 5. Cómo se ejecutará cuando toque validar local

Desde la raíz del repo:

```bash
node orbit360-platform/tools/orbit360-validate-marketing-integraciones.mjs
```

Genera reporte en:

- `_orbit360_reports/validate_marketing_integraciones_<fecha>.txt`

---

## 6. Pendiente

Crear, en una segunda fase, runner visual/local preview más amplio cuando sea necesario, pero separando responsabilidades:

1. Validador técnico de contratos: ya creado.
2. Runner servidor/preview local: pendiente, solo si Paula autoriza validación visual.

---

## 7. Estado

**RESUELTO PARCIAL / SEGURO.**

El validador técnico ya existe. Falta validación visual local posterior.
