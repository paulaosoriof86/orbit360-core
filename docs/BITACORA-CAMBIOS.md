# Bitácora de cambios — Orbit 360

Registro vivo de mejoras, ajustes UX, cambios de módulo, cambios de esquema y pendientes del prototipo base.

## 2026-07-03 — Documentación de reauditoría corregida del ZIP Claude

- **Módulo/área:** Documentación / Auditoría / Metodología.
- **Necesidad:** Corregir conclusión inicial sobre el ZIP Claude y dejar hallazgos en GitHub.
- **Esperado:** Separar qué avanzó Claude, qué queda para Claude, qué corresponde a backend, qué es lógica A&S y qué es core multi-tenant.
- **Archivo/función:** `docs/AUDITORIA-REVISADA-ZIP-CLAUDE-20260703.md`.
- **Mejora aplicada:** Se documentó que el ZIP sí trae estructura completa y avances, pero requiere corrección de trazabilidad documental y compuerta de empalme.
- **Impacto en prototipo comercializable:** Evita reinicios y conserva avance de frontend.
- **Estado:** RESUELTO DOCUMENTALMENTE.

## 2026-07-03 — Plan actualizado backend y empalme ágil

- **Módulo/área:** Backend / Metodología / Empalme.
- **Necesidad:** Evitar que cada nuevo prototipo reinicie backend.
- **Esperado:** Backend avanza por contrato estable y cada prototipo entra como mini-release.
- **Archivo/función:** `docs/PLAN-TRABAJO-ACTUALIZADO-BACKEND-20260703.md`.
- **Mejora aplicada:** Se definieron carriles Claude, ChatGPT/Codex, lógica A&S y core multi-tenant; se creó compuerta de empalme.
- **Impacto en prototipo comercializable:** Permite incorporar mejoras de Claude sin perder `data/store.js`, Auth, tenant ni reglas backend.
- **Estado:** RESUELTO DOCUMENTALMENTE / aplicar en ejecución.

## 2026-07-03 — Estado de avance real y tiempos estimados

- **Módulo/área:** Gestión de proyecto / Backend.
- **Necesidad:** Paula reporta preocupación por poco avance tras varios días.
- **Esperado:** Determinar qué avanzó, qué no avanzó, errores cometidos y tiempos realistas.
- **Archivo/función:** `docs/ESTADO-AVANCE-REAL-BACKEND-20260703.md`.
- **Mejora aplicada:** Se documentó avance real, deuda pendiente, errores y nueva priorización hacia migración de datos A&S.
- **Impacto en prototipo comercializable:** Mayor control de avance y menos pérdida de contexto.
- **Estado:** RESUELTO DOCUMENTALMENTE.

## 2026-07-03 — Creación de bitácora de errores viva

- **Módulo/área:** Documentación / Calidad.
- **Necesidad:** Registrar reprocesos para no repetirlos.
- **Esperado:** Toda falla metodológica, bug o contradicción debe quedar documentada.
- **Archivo/función:** `docs/BITACORA-ERRORES.md`.
- **Mejora aplicada:** Se creó bitácora con errores de auditoría, empalme, backend frenado, contradicción recaudo/finmovs y documentación no subida a GitHub.
- **Impacto en prototipo comercializable:** Facilita continuidad entre conversaciones y reduce reprocesos.
- **Estado:** RESUELTO DOCUMENTALMENTE.

## 2026-07-03 — Protocolo de rama A&S/backend

- **Módulo/área:** GitHub / control de ramas.
- **Necesidad:** Evitar usar rama de prototipo para backend A&S.
- **Esperado:** Continuar en rama separada de A&S como primer tenant.
- **Archivo/función:** `docs/PROTOCOLO-RAMAS-AYS-BACKEND-20260703.md`.
- **Mejora aplicada:** Se creó y documentó la rama `ays/backend-tenant-continuidad-20260703` como rama vigente para backend A&S.
- **Impacto en prototipo comercializable:** Separa frontend/prototipo de backend/tenant y evita contaminación de ramas.
- **Estado:** RESUELTO DOCUMENTALMENTE / aplicar en todos los commits siguientes.

## 2026-07-03 — Plan urgente de uso interno A&S

- **Módulo/área:** Backend / operación interna A&S.
- **Necesidad:** Reducir alcance inicial para que A&S pueda empezar a usar un LAB interno antes de producción completa.
- **Esperado:** Corte 1 en 24–48 horas efectivas: aseguradoras, clientes, pólizas, cobros, regla recaudo/finmov y smoke básico.
- **Archivo/función:** `docs/PLAN-USO-URGENTE-AYS-EMPRESA-20260703.md`.
- **Mejora aplicada:** Se separó LAB interno usable de producción comercializable completa.
- **Impacto en prototipo comercializable:** Permite validar operación real sin bloquearse por PWA, IA avanzada o integraciones no críticas.
- **Estado:** EN PROGRESO.

## 2026-07-03 — Matriz de importación inicial A&S

- **Módulo/área:** Migración de datos / Importadores.
- **Necesidad:** Definir orden y campos de carga para empezar con datos A&S de forma controlada.
- **Esperado:** Aseguradoras GT/CO primero, luego clientes, pólizas, cobros, comisiones y finanzas históricas.
- **Archivo/función:** `docs/MATRIZ-IMPORTACION-INICIAL-AYS-20260703.md`.
- **Mejora aplicada:** Se revisaron fuentes Excel disponibles y se mapeó destino backend por colección.
- **Impacto en prototipo comercializable:** Define qué debe soportar el importador y qué debe documentarse para Claude.
- **Estado:** EN PROGRESO.

## 2026-07-03 — Smoke mínimo LAB A&S

- **Módulo/área:** QA / Backend LAB / Migración.
- **Necesidad:** Definir criterio comprobable de primer uso interno.
- **Esperado:** Validar aseguradora, cliente, póliza, cobro, pago sin `finmov`, movimiento financiero real, comisión y Cliente 360.
- **Archivo/función:** `docs/SMOKE-MINIMO-LAB-AYS-20260703.md`.
- **Mejora aplicada:** Se creó checklist S1–S8 para aprobar o rechazar Corte 1.
- **Impacto en prototipo comercializable:** Evita afirmar avance sin prueba real.
- **Estado:** LISTO PARA EJECUTAR.
