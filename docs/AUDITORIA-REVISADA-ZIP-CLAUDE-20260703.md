# Auditoría revisada ZIP Claude — Orbit 360

**Fecha de registro:** 2026-07-03  
**Proyecto:** Orbit 360 — Migración Alianzas y Soluciones  
**Origen:** ZIP Claude `Prototype Development Request - 2026-07-02T201909.489.zip`  
**Tipo:** auditoría corregida / mini-release documental  
**Estado:** DOCUMENTADO — NO EMPALMADO — NO BACKEND MODIFICADO

## 1. Corrección de criterio frente a la primera auditoría

La primera lectura fue demasiado estricta al tomar `CHANGELOG.md` como indicador principal de versión. En la reauditoría se confirma que el ZIP sí trae estructura completa y avances relevantes. El problema principal no es ausencia general del prototipo, sino **contradicción documental, trazabilidad de versiones y pendientes de empalme controlado**.

## 2. Inventario confirmado del ZIP

- Total aproximado: 83 archivos.
- Módulos JS: 30.
- Core JS: 17.
- Documentos: 26.
- `seed.__v`: 34.
- `index.html` con cache-busting `?v1284`.
- PWA presente: `core/pwa.js` + `sw.js`.
- Documentos nuevos/frente a referencias anteriores:
  - `docs/AUDITORIA-SINCRONIAS.md`.
  - `docs/REQ-FINANZAS-PROFUNDO.md`.
- Core nuevo/relevante:
  - `core/notify.js`.

## 3. Avances reales detectados

### 3.1 Core

- `core/queries.js` conserva regla crítica: recaudo aplicado por cliente/póliza/recibo no debe generar `finmov` automático.
- `core/notify.js` introduce utilidades de notificación transversal.
- `core/pwa.js` y `sw.js` existen como base de PWA.
- `core/importa.js` mantiene scaffold de importador inteligente.
- `core/comisiones-eng.js` existe como motor de comisión técnica; debe ser fuente única para liquidaciones.

### 3.2 Módulos

Render esperado/estructura presente para 30 módulos:

1. Inicio
2. Cronograma
3. Ops
4. Leads
5. Aseguradoras
6. Cotizador
7. Comparativo
8. Cliente 360
9. Pólizas
10. Cobros
11. Renovaciones
12. Cancelaciones
13. Siniestros
14. Historial
15. Comisiones
16. Importar
17. Calidad
18. Plantillas
19. Reportes
20. Orbit IA
21. Academia
22. Insights
23. Correo
24. Automatizaciones
25. Notificaciones
26. Marketing
27. Portal
28. Finanzas
29. Equipo
30. Configuración

## 4. Hallazgos críticos

### H1 — `CHANGELOG.md` no refleja el estado real

`CHANGELOG.md` abre en v1.55, pero `docs/BITACORA-CAMBIOS.md` llega a v1.85. Esto puede provocar falsas conclusiones al abrir nuevas conversaciones o pasar contexto a Claude/Codex.

**Clasificación:** documentación / trazabilidad.  
**Responsable:** Claude debe consolidar el changelog; ChatGPT/Codex debe conservar errata en backend.  
**Estado:** ABIERTO.

### H2 — Contradicción sobre recaudo comercial vs `finmovs`

La regla vigente de negocio es:

> Pago aplicado a póliza/recibo = recaudo comercial, afecta cartera, producción recaudada, recibos, comisión estimada y analítica. No crea `finmov` real.

`finmovs` queda reservado para caja/banco real: comisión recibida, factura cobrada, liquidación pagada, egreso real, ajuste financiero real.

Sin embargo, `docs/AUDITORIA-SINCRONIAS.md` conserva una afirmación antigua indicando que aplicar pago crea `finmov`. Esa frase debe corregirse.

**Clasificación:** lógica core + documentación.  
**Responsable:** Claude corrige docs/front; ChatGPT/Codex protege backend.  
**Estado:** ABIERTO.

### H3 — Finanzas debe usar motor único de comisiones

Finanzas no puede calcular liquidaciones de asesores con campos distintos al motor central (`core/comisiones-eng.js`). Debe usar la misma lógica que Comisiones, Equipo y pólizas.

**Impacto:** riesgo de liquidaciones inconsistentes para asesores.  
**Responsable:** Claude en frontend/prototipo; ChatGPT/Codex en contratos/backend.  
**Estado:** ABIERTO.

### H4 — Persisten usos de `localStorage` en módulos

Regla fija: módulos no deben tocar almacenamiento directo. Solo `Orbit.store` o helpers core. Se detectaron usos puntuales en módulos como Configuración/Plantillas que deben moverse a core/store/tenant.

**Responsable:** Claude.  
**Estado:** ABIERTO.

### H5 — Importador/IA debe desacoplarse de `window.claude`

La IA debe pasar por `Orbit.ia` o backend configurable por proveedor. No debe quedar acoplada a un proveedor específico en el prototipo comercializable.

**Responsable:** Claude para interfaz/prototipo; ChatGPT/Codex para backend real.  
**Estado:** ABIERTO.

### H6 — PWA existe, pero no está completa como instalación inteligente

Existe base PWA, pero falta estado/cooldown/medición y configuración desde tenant/plan.

**Responsable:** Claude.  
**Estado:** ABIERTO.

### H7 — Documentación acumulada está dispersa

Conviven documentos v1.21, v1.34, v1.41, v1.55 y v1.85. Hace falta un índice vivo que indique fuente de verdad por tema.

**Responsable:** ChatGPT/Codex documenta metodología; Claude debe incluirla en siguiente ZIP.  
**Estado:** ABIERTO.

## 5. Qué NO se hizo

- No se empalmó el ZIP sobre backend.
- No se modificó `data/store.js` backend LAB.
- No se tocó Auth/Fase 9.
- No se hizo deploy ni Hosting.
- No se subió data real ni seed real.
- No se hicieron cambios funcionales en módulos.

## 6. Decisión de continuidad

El ZIP debe tratarse como **candidato válido de frontend**, no como entrega descartada. Antes de empalmar:

1. Consolidar errata documental.
2. Separar backlog Claude / backend / lógica A&S / lógica core.
3. Mantener backend propio protegido.
4. Empalmar solo `modules/`, `core/`, `styles/` cuando se confirme compatibilidad con `Orbit.store` real.
5. Documentar cualquier fix local que hagamos para que Claude lo replique en prototipo.

## 7. Estado

**Estado general:** EN PROGRESO.  
**Siguiente paso recomendado:** actualizar bitácoras y backlogs vivos; continuar backend por contrato sin empalme funcional todavía.
