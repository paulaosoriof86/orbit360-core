# Bitácora de errores — Orbit 360

Registro vivo de errores, reprocesos y aprendizajes para evitar repetirlos.

## 2026-07-03 — Auditoría inicial demasiado dura del ZIP Claude

- **Módulo/área:** Auditoría de prototipo / documentación.
- **Síntoma/necesidad:** Se interpretó que el ZIP venía incompleto tomando `CHANGELOG.md` como indicador principal.
- **Esperado:** Auditar código, bitácoras, docs internos, módulos y core antes de concluir.
- **Causa raíz:** `CHANGELOG.md` abre en v1.55, mientras `docs/BITACORA-CAMBIOS.md` llega a v1.85. La documentación está desfasada.
- **Archivo/función:** `CHANGELOG.md`, `docs/BITACORA-CAMBIOS.md`, docs de auditoría.
- **Fix o mejora aplicada:** Se creó `docs/AUDITORIA-REVISADA-ZIP-CLAUDE-20260703.md` corrigiendo el criterio.
- **Impacto en prototipo comercializable:** Evita descartar avances reales de Claude por una fuente documental incompleta.
- **Estado:** RESUELTO DOCUMENTALMENTE / pendiente que Claude consolide changelog.

## 2026-07-03 — Reauditar cada prototipo como si fuera empezar de cero

- **Módulo/área:** Metodología de empalme.
- **Síntoma/necesidad:** Cada ZIP nuevo consumía demasiado tiempo y frenaba backend.
- **Esperado:** Tratar cada ZIP como mini-release: comparar, clasificar, documentar y empalmar solo si pasa compuerta.
- **Causa raíz:** No existía una regla documental única suficientemente visible en GitHub.
- **Archivo/función:** proceso de trabajo / docs.
- **Fix o mejora aplicada:** Se creó `docs/PLAN-TRABAJO-ACTUALIZADO-BACKEND-20260703.md` y `docs/ESTADO-AVANCE-REAL-BACKEND-20260703.md`.
- **Impacto en prototipo comercializable:** Reduce reprocesos y protege backend al incorporar nuevas versiones de Claude.
- **Estado:** RESUELTO DOCUMENTALMENTE / aplicar en siguientes ZIPs.

## 2026-07-03 — Backend frenado por auditorías de frontend

- **Módulo/área:** Backend ChatGPT/Codex.
- **Síntoma/necesidad:** Sensación de poco avance después de varios días de backend.
- **Esperado:** Backend debe avanzar por contrato estable aunque Claude siga generando prototipos.
- **Causa raíz:** Falta de carriles separados y compuerta de empalme.
- **Archivo/función:** metodología.
- **Fix o mejora aplicada:** Se separaron carriles: Claude/prototipo, ChatGPT-Codex/backend, A&S/lógica específica, Core/multi-tenant.
- **Impacto en prototipo comercializable:** Evita que frontend bloquee store/Auth/migración de datos.
- **Estado:** EN PROGRESO.

## 2026-07-03 — Contradicción documental recaudo vs `finmovs`

- **Módulo/área:** Cobros / Finanzas / Comisiones / documentación.
- **Síntoma/necesidad:** Documento de sincronías conserva afirmación antigua de que aplicar pago crea `finmov`.
- **Esperado:** Pago aplicado debe ser recaudo comercial y no movimiento financiero real.
- **Causa raíz:** Documentación antigua no fue actualizada después de definir la regla contable correcta.
- **Archivo/función:** `docs/AUDITORIA-SINCRONIAS.md`, `core/queries.js`, módulos Cobros/Cliente360/Finanzas.
- **Fix o mejora aplicada:** Regla documentada en auditoría revisada y plan de backend; pendiente corrección en ZIP Claude.
- **Impacto en prototipo comercializable:** Evita duplicar ingresos y protege analítica/finanzas A&S.
- **Estado:** ABIERTO para Claude / PROTEGIDO para backend.

## 2026-07-03 — Cambios locales no documentados de inmediato en GitHub

- **Módulo/área:** Gestión de conocimiento.
- **Síntoma/necesidad:** Parte del contexto quedaba en conversaciones largas y se perdía al abrir nuevas sesiones.
- **Esperado:** Toda decisión, hallazgo, pendiente o cambio local debe quedar en GitHub.
- **Causa raíz:** Documentación descargable no siempre se subía de inmediato al repo.
- **Archivo/función:** docs del repo.
- **Fix o mejora aplicada:** Se inició actualización directa de GitHub con auditoría, plan, estado y bitácoras.
- **Impacto en prototipo comercializable:** Reduce repeticiones y pérdida de contexto.
- **Estado:** EN PROGRESO.
