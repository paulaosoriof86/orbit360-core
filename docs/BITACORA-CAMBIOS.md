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

## 2026-07-03 — Política de datos reales A&S LAB

- **Módulo/área:** Datos reales / Tenant A&S / Seguridad.
- **Necesidad:** Aclarar que el dataset mínimo era solo smoke y que A&S puede avanzar con datos reales vivos si no se hardcodean.
- **Esperado:** Datos reales solo en backend/tenant LAB o producción controlada, nunca en prototipo demo ni `seed.js`.
- **Archivo/función:** `docs/POLITICA-DATOS-REALES-AYS-LAB-20260703.md`.
- **Mejora aplicada:** Se definió diferencia entre prototipo Claude, LAB interno A&S y producción A&S.
- **Impacto en prototipo comercializable:** Protege confidencialidad y evita contaminar demo comercializable.
- **Estado:** ACTIVO.

## 2026-07-03 — Plan de migración CRM real A&S

- **Módulo/área:** Migración CRM / Backend / Importadores.
- **Necesidad:** Migrar clientes, pólizas, cobros efectuados y demás desde el CRM actual por bloques.
- **Esperado:** Pedir archivos uno por uno, mapear, importar, validar y reportar.
- **Archivo/función:** `docs/PLAN-MIGRACION-CRM-REAL-AYS-20260703.md`.
- **Mejora aplicada:** Se definieron bloques: configuración, clientes, pólizas, cartera, cobros históricos, vehículos/documentos, siniestros, comisiones/facturas, marketing.
- **Impacto en prototipo comercializable:** Define qué debe soportar Importar y qué debe persistir backend.
- **Estado:** ACTIVO.

## 2026-07-03 — Validación CRUD manual antes de migrar

- **Módulo/área:** UX operativa / Backend / QA.
- **Necesidad:** Garantizar que la plataforma funcione manualmente para operación diaria, no solo por importación.
- **Esperado:** Crear/editar clientes, pólizas, cobros, pagos, aseguradoras, comisiones y movimientos desde UI.
- **Archivo/función:** `docs/VALIDACION-CRUD-MANUAL-ANTES-DE-MIGRAR-AYS-20260703.md`.
- **Mejora aplicada:** Se creó checklist CRUD manual por módulos críticos.
- **Impacto en prototipo comercializable:** Asegura operación posterior a la migración y debe ser implementado por Claude en UX si falta.
- **Estado:** LISTO PARA VALIDAR.
