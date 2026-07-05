# Pendientes y mejoras backend post v1.104 — Orbit 360 A&S

**Fecha base:** 2026-07-03  
**Actualización:** 2026-07-05  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Uso:** registro acumulado para no perder hallazgos antes de pedir paquete formal para Claude.

---

## A. Pendientes cerrados / avances backend ya documentados

### CERRADO-BE-104-01 — Loader LAB con tenant allowlist
- **Área:** Backend LAB / Seguridad tenant.
- **Aplicado:** `core/backend-lab-loader.js` permite solo `alianzas-soluciones` en LAB.
- **Estado:** CERRADO EN RAMA.

### CERRADO-BE-104-02 — Init Firebase LAB con validación de config
- **Área:** Backend LAB / Firebase init.
- **Aplicado:** `core/backend-lab-init.js` valida config local sin exponer secretos.
- **Estado:** CERRADO EN RAMA.

### CERRADO-BE-104-03 — Guard runtime contra secretos y auth incorrecta
- **Área:** Backend LAB / Integraciones / Auth.
- **Aplicado:** `core/backend-lab-security-guard.js` bloquea `setPref` sensible, limpia campos sensibles y bloquea writes si no hay usuario LAB esperado.
- **Estado:** CERRADO EN RAMA / pendiente smoke real.

### CERRADO-BE-104-04 — Script de integración local v104
- **Área:** Tools / Index central.
- **Aplicado:** `tools/orbit360-integrar-backend-lab-index.ps1` integra loader/init/storeLAB/guard con backup y verificación.
- **Estado:** CERRADO EN RAMA.

### CERRADO-BE-104-05 — Validador estático backend LAB
- **Área:** QA backend.
- **Aplicado:** `tools/orbit360-validar-backend-lab-contrato.mjs`.
- **Estado:** CERRADO EN RAMA.

### CERRADO-BE-104-06 — Score de confianza para conciliación
- **Área:** Backend importador / conciliación / planillas / cobros.
- **Aplicado:** `tools/orbit360-calcular-score-conciliacion-ays.mjs`, tests y contrato.
- **Estado:** CERRADO EN RAMA / pendiente ejecución local en repo completo.

### CERRADO-BE-104-07 — Contrato y validador dryRunReport importador
- **Área:** Backend importador / parser / dry-run / conciliación.
- **Aplicado:** `tools/orbit360-validar-dryrun-report-ays.mjs`, tests, contrato y bitácora.
- **Estado:** CERRADO EN RAMA / pendiente integración al parser/importador real.

### CERRADO-BE-104-08 — Contrato y validador de bandeja `conciliaciones`
- **Área:** Backend / Firestore LAB / conciliaciones.
- **Aplicado:** `tools/orbit360-validar-conciliacion-propuesta-ays.mjs`, tests, contrato y bitácora.
- **Estado:** CERRADO EN RAMA / pendiente implementación Firestore LAB y flujo de aplicación controlada.

### CERRADO-BE-104-09 — Generador dryRunReport → propuestas `conciliaciones`
- **Área:** Backend importador / dry-run / conciliación / bandeja.
- **Aplicado:** `tools/orbit360-generar-propuestas-conciliacion-ays.mjs`, tests, contrato y bitácora.
- **Estado:** CERRADO EN RAMA / pendiente persistencia Firestore LAB.

### CERRADO-BE-104-10 — Plan de persistencia LAB para `conciliaciones`
- **Área:** Backend / Firestore LAB / conciliaciones.
- **Aplicado:** `tools/orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs`, tests, contrato y bitácora.
- **Estado:** CERRADO EN RAMA / pendiente ejecutor LAB aprobado.

### CERRADO-BE-104-11 — Auditoría y documentación candidato Claude `211525.464`
- **Área:** Auditoría Claude / continuidad frontend-backend.
- **Aplicado:** auditoría forense, prompt de cierre, nota de pendientes no atendidos, plan de empalme seguro y pipeline PowerShell de empalme.
- **Estado:** CERRADO COMO DOCUMENTACIÓN Y PIPELINE / pendiente ejecución local de empalme y smoke.

### CERRADO-BE-104-12 — Validador de transiciones `conciliaciones`
- **Área:** Backend / conciliaciones / auditLog / aplicación controlada.
- **Aplicado:** `tools/orbit360-validar-transicion-conciliacion-ays.mjs`, tests, contrato y bitácora.
- **Regla:** valida `PROPUESTA -> EN_REVISION -> VALIDADA -> APLICADA` sin saltos, exige actor/rol/motivo, país/moneda coherente, target para aplicación y bloquea payload/secrets.
- **Estado:** CERRADO EN RAMA / pendiente ejecutor LAB e integración con auditLog real.

### CERRADO-BE-104-13 — Ejecutor LAB local de persistencia `conciliaciones`
- **Área:** Backend / conciliaciones / auditLog / persistencia LAB.
- **Aplicado:** `tools/orbit360-ejecutar-persistencia-conciliaciones-lab-ays.mjs`, tests, contrato y bitácora.
- **Regla:** ejecutor deshabilitado por defecto; en `dry-run` solo reporta, en `local-mirror` exige confirmación explícita; materializa `conciliaciones` + `auditLog` en mirror local; nunca toca `cobros`, `comisiones`, `polizas`, `finmovs` ni aplica pagos.
- **Estado:** CERRADO EN RAMA / pendiente adapter Firestore LAB directo y UI/bandeja.

### CERRADO-BE-104-14 — Adapter Firestore LAB para `conciliaciones/auditLog` preparado
- **Área:** Backend / Firestore LAB / conciliaciones / auditLog.
- **Aplicado:** `tools/orbit360-integrar-adapter-conciliaciones-firestore-lab-ays.ps1`, `tools/orbit360-validar-adapter-conciliaciones-firestore-lab-ays.mjs`, `tools/orbit360-test-validar-adapter-conciliaciones-firestore-lab-ays.mjs`, contrato y bitácora.
- **Regla:** integración local protegida con backup; agrega/verifica `conciliaciones` y `auditLog` en `COLLECTIONS`; valida gate `firestore-lab`, tenant, path tenant-safe, `onSnapshot`, API compatible y ausencia de aplicación directa.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecutar `-Apply` local y smoke de extremo a extremo.

### CERRADO-BE-104-15 — Smoke E2E sintético de conciliaciones LAB
- **Área:** Backend / QA / conciliaciones / LAB readiness.
- **Aplicado:** `tools/orbit360-smoke-conciliaciones-lab-e2e-ays.mjs`, contrato y bitácora.
- **Regla:** smoke sintético encadena propuestas -> plan persistencia -> ejecutor dry-run -> ejecutor local mirror -> transición validada -> adapter/readiness; no datos reales, no Firestore writes, no pagos, no mutación de `cobros`.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local real y readiness UI/bandeja.

### CERRADO-BE-104-16 — Readiness UI/Bandeja `conciliaciones`
- **Área:** Backend/frontend bridge / conciliaciones / UI readiness.
- **Aplicado:** `tools/orbit360-generar-readiness-bandeja-conciliaciones-ays.mjs`, `tools/orbit360-test-generar-readiness-bandeja-conciliaciones-ays.mjs`, contrato y bitácora.
- **Regla:** define columnas obligatorias, estados, score, fuente, trazabilidad, acciones permitidas y bloqueos permanentes para futura bandeja. Prohíbe aplicar pagos directos, marcar cobros pagados desde bandeja, mutar cobros sin transición y mezclar fuentes.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local y construcción UI/bandeja.

### CERRADO-BE-104-17 — Planificador de aplicación controlada desde `conciliaciones`
- **Área:** Backend / conciliaciones / cobros / comisiones / auditLog.
- **Aplicado:**
  - `tools/orbit360-preparar-aplicacion-controlada-conciliacion-ays.mjs`.
  - `tools/orbit360-test-preparar-aplicacion-controlada-conciliacion-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-APLICACION-CONTROLADA-CONCILIACIONES-AYS-20260705.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-APLICACION-CONTROLADA-CONCILIACIONES.md`.
- **Regla:** herramienta plan-only; recibe propuesta `VALIDADA`, actor, rol, motivo y frase explícita; valida fuente, trazabilidad, país/moneda, monto y target; genera efectos planificados, pero no escribe Firestore, no toca `cobros/comisiones`, no aplica pagos y no genera producción.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente conectar a UI/Bandeja y futuro ejecutor autorizado.

---

## B. Pendientes abiertos

### ABIERTO-BE-104-01 — Ejecutar empalme seguro del candidato `211525.464`
- **Área:** Empalme frontend/backend.
- **Necesidad:** aplicar candidato Claude sin reemplazo bruto.
- **Estado:** ABIERTO / listo para ejecución local controlada.

### ABIERTO-BE-104-02 — Smoke visual/operativo real sobre rama empalmada
- **Área:** QA / Navegador.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-03 — Decisión sobre `index.html` permanente
- **Área:** Index central / Backend activation.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-04 — Backend real de secretos
- **Área:** Integraciones / Seguridad.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-05 — Auth LAB a Auth real
- **Área:** Auth / Equipo / Roles.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-06 — Contrato pólizas/recibos/cartera/conciliación
- **Área:** Backend importador / pólizas / cobros / comisiones / finanzas.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-07 — Junio/julio 2026 como caso especial de conciliación
- **Área:** Migración A&S / planillas / conciliación.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-08 — Pendientes Claude acumulados hasta próximo paquete
- **Área:** Coordinación Claude / Frontend / Academia.
- **Estado:** ABIERTO hasta que Paula pida nuevo paquete Claude.

### ABIERTO-BE-104-09 — Integrar parser real + generador + plan de persistencia
- **Área:** Backend importador / conciliaciones.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-10 — Ejecutar integración local del adapter Firestore LAB
- **Área:** Backend / Firestore LAB / conciliaciones.
- **Estado:** ABIERTO / requiere entorno local.

### ABIERTO-BE-104-11 — Ejecutar smoke E2E conciliaciones LAB en entorno local
- **Área:** QA backend / conciliaciones.
- **Estado:** ABIERTO / requiere entorno local.

### ABIERTO-BE-104-12 — Ejecutar readiness UI/Bandeja en entorno local
- **Área:** Backend/frontend bridge.
- **Estado:** ABIERTO / requiere entorno local o mirror generado.

### ABIERTO-BE-104-13 — UI/Bandeja `conciliaciones`
- **Área:** Frontend/Backend bridge / Claude.
- **Necesidad:** construir módulo/bandeja visual con tabla segura, detalle y acciones de revisión según contrato readiness.
- **Restricción:** no aplicar pagos desde la bandeja hasta fase autorizada.
- **Estado:** ABIERTO / recomendado para Claude cuando se le entregue paquete actualizado.

### ABIERTO-BE-104-14 — Futuro ejecutor autorizado de aplicación controlada
- **Área:** Backend / cobros / comisiones / auditLog / notificaciones.
- **Necesidad:** diseñar y aprobar el paso posterior donde una propuesta `VALIDADA` puede pasar a `APLICADA` y modificar cobro/comisión con auditoría.
- **Esperado:** `propuesta VALIDADA -> plan aplicación controlada -> validar transición -> ejecutor autorizado -> auditLog -> notificación -> actualización Portal/Cliente360/Cobros`.
- **Restricción:** no construir ejecutor real sin autorización explícita de Paula.
- **Estado:** ABIERTO.

---

## C. Pendientes para reportar a Claude cuando Paula pida paquete

1. No reintroducir persistencia sensible en `Orbit.store`, localStorage ni Firestore directo.
2. No reemplazar backend LAB ni scripts de validación al entregar nuevos ZIPs.
3. Mantener `CONTENT_V=5` y lección de conciliación.
4. Documentar y/o corregir `README.md`, `CHANGELOG.md`, `docs/PENDIENTES-Y-MEJORAS.md`, `docs/REPORTE-SMOKE.md`, `docs/BITACORA-CAMBIOS.md` para `211525.464`.
5. Corregir copy de estados de cuenta: no “aplicar pagos”; debe ser “proponer pagos para validación”.
6. Corregir copy de planilla: no “Pendiente de aplicar”; debe ser “Propuesta pendiente” o “Pendiente de validación”.
7. Documentar que `conciliacionPropuesta` en cobro es visual/prototipo; persistencia real en `conciliaciones` queda para backend ChatGPT/Codex.
8. Academia profunda por ramo/producto: Vida, Gastos médicos, Hogar, Fianzas, Responsabilidad Civil, Transporte/Carga.
9. Construir UI/Bandeja `conciliaciones` con el contrato `CONTRATO-READINESS-UI-BANDEJA-CONCILIACIONES-AYS-20260704.md`, sin aplicar pagos directos.
10. Incorporar acción visual `preparar_aplicacion_controlada` solo como antesala, sin aplicar pagos ni mutar cobros.
11. No declarar “todos los P0 cerrados” si sigue pendiente bandeja real, smoke visual real y aplicación controlada ejecutable.

---

## D. Estado general actualizado

Backend LAB reforzado. Candidata viva Claude `211525.464` auditada y aceptada como avance incremental, no como cierre final. Quedan pendientes Claude documentales, copy residual, Academia por ramo y UI/Bandeja `conciliaciones` hasta próximo paquete. Backend continúa por fases sobre conciliación: parser real, persistencia LAB local controlada en `conciliaciones/auditLog`, transiciones auditadas, adapter Firestore LAB preparado por tooling local, smoke E2E sintético, readiness UI/bandeja, planificador de aplicación controlada y futuro ejecutor autorizado pendiente.

---

## E. Documentos clave agregados/actualizados

- `orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-CLAUDE-20260704-211525.md`
- `orbit360-platform/docs/PROMPT-CLAUDE-CANDIDATO-211525-CIERRE-PENDIENTES-20260704.md`
- `orbit360-platform/docs/NOTA-PARA-CLAUDE-PENDIENTES-CANDIDATO-211525-NO-ATENDIDO-20260704.md`
- `orbit360-platform/docs/PLAN-EMPALME-SEGURO-CANDIDATO-CLAUDE-211525-20260704.md`
- `orbit360-platform/docs/CONTRATO-TRANSICIONES-CONCILIACIONES-AYS-20260704.md`
- `orbit360-platform/docs/CONTRATO-EJECUTOR-PERSISTENCIA-CONCILIACIONES-LAB-AYS-20260704.md`
- `orbit360-platform/docs/CONTRATO-ADAPTER-FIRESTORE-LAB-CONCILIACIONES-AUDITLOG-AYS-20260704.md`
- `orbit360-platform/docs/CONTRATO-SMOKE-CONCILIACIONES-LAB-E2E-AYS-20260704.md`
- `orbit360-platform/docs/CONTRATO-READINESS-UI-BANDEJA-CONCILIACIONES-AYS-20260704.md`
- `orbit360-platform/docs/CONTRATO-APLICACION-CONTROLADA-CONCILIACIONES-AYS-20260705.md`
- `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-APLICACION-CONTROLADA-CONCILIACIONES.md`
- `tools/orbit360-preparar-aplicacion-controlada-conciliacion-ays.mjs`
- `tools/orbit360-test-preparar-aplicacion-controlada-conciliacion-ays.mjs`
