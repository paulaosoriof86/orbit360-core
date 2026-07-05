# Pendientes y mejoras backend post v1.104 — Orbit 360 A&S

**Fecha base:** 2026-07-03  
**Actualización:** 2026-07-04  
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
- **Regla:** match exacto/probable/validación/bloqueado con evidencia de póliza, recibo/cuota, cliente, aseguradora, país/moneda, monto y periodo/fecha.
- **Estado:** CERRADO EN RAMA / pendiente ejecución local en repo completo.

### CERRADO-BE-104-07 — Contrato y validador dryRunReport importador
- **Área:** Backend importador / parser / dry-run / conciliación.
- **Aplicado:** `tools/orbit360-validar-dryrun-report-ays.mjs`, tests, contrato y bitácora.
- **Regla:** no se permite `write_enabled=true`, payload/filas reales, conteos inconsistentes ni país/moneda incoherente.
- **Estado:** CERRADO EN RAMA / pendiente integración al parser/importador real.

### CERRADO-BE-104-08 — Contrato y validador de bandeja `conciliaciones`
- **Área:** Backend / Firestore LAB / conciliaciones.
- **Aplicado:** `tools/orbit360-validar-conciliacion-propuesta-ays.mjs`, tests, contrato y bitácora.
- **Regla:** una propuesta no puede venir como `APLICADA`, no puede traer `write_enabled=true`, no puede traer `apply_payment=true`, no puede traer payload/filas reales y no puede modificar cobros directamente.
- **Estado:** CERRADO EN RAMA / pendiente implementación Firestore LAB y flujo de aplicación controlada.

### CERRADO-BE-104-09 — Generador dryRunReport → propuestas `conciliaciones`
- **Área:** Backend importador / dry-run / conciliación / bandeja.
- **Aplicado:** `tools/orbit360-generar-propuestas-conciliacion-ays.mjs`, tests, contrato y bitácora.
- **Regla:** convierte candidatos validados del dry-run en propuestas estructuradas, sin persistir ni aplicar pagos.
- **Prueba local sintética:** 5 casos, 0 fallos.
- **Estado:** CERRADO EN RAMA / pendiente persistencia Firestore LAB.

### CERRADO-BE-104-10 — Plan de persistencia LAB para `conciliaciones`
- **Área:** Backend / Firestore LAB / conciliaciones.
- **Aplicado:** `tools/orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs`, tests, contrato y bitácora.
- **Regla:** genera operaciones `upsert_conciliacion_propuesta` plan-only; bloquea lote con payload real, tenant mezclado, banderas de escritura/aplicación; bloquea operaciones con estado `APLICADA`, fuente inválida, ID duplicado o país/moneda incoherente.
- **Prueba local sintética:** 6 casos, 0 fallos.
- **Estado:** CERRADO EN RAMA / pendiente ejecutor LAB aprobado.

### CERRADO-BE-104-11 — Auditoría y documentación candidato Claude `211525.464`
- **Área:** Auditoría Claude / continuidad frontend-backend.
- **Aplicado:** auditoría forense, prompt de cierre, nota de pendientes no atendidos, plan de empalme seguro y pipeline PowerShell de empalme.
- **Regla:** Claude perdió capacidad; sus pendientes quedan vivos hasta nuevo paquete. El empalme debe ser por pipeline seguro, excluyendo backend protegido y preservando loader/init/store LAB.
- **Estado:** CERRADO COMO DOCUMENTACIÓN Y PIPELINE / pendiente ejecución local de empalme y smoke.

### CERRADO-BE-104-12 — Validador de transiciones `conciliaciones`
- **Área:** Backend / conciliaciones / auditLog / aplicación controlada.
- **Aplicado:** `tools/orbit360-validar-transicion-conciliacion-ays.mjs`, tests, contrato y bitácora.
- **Regla:** valida `PROPUESTA -> EN_REVISION -> VALIDADA -> APLICADA` sin saltos, exige actor/rol/motivo, país/moneda coherente, target para aplicación y bloquea payload/secrets.
- **Prueba local sintética:** 8 casos, 0 fallos.
- **Estado:** CERRADO EN RAMA / pendiente ejecutor LAB e integración con auditLog real.

### CERRADO-BE-104-13 — Ejecutor LAB local de persistencia `conciliaciones`
- **Área:** Backend / conciliaciones / auditLog / persistencia LAB.
- **Aplicado:**
  - `tools/orbit360-ejecutar-persistencia-conciliaciones-lab-ays.mjs`.
  - `tools/orbit360-test-ejecutar-persistencia-conciliaciones-lab-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-EJECUTOR-PERSISTENCIA-CONCILIACIONES-LAB-AYS-20260704.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260704-EJECUTOR-PERSISTENCIA-CONCILIACIONES-LAB.md`.
- **Regla:** ejecutor deshabilitado por defecto; en `dry-run` solo reporta, en `local-mirror` exige `CONFIRMO_ESCRITURA_LAB_CONCILIACIONES`; materializa `conciliaciones` + `auditLog` en mirror local; nunca toca `cobros`, `comisiones`, `polizas`, `finmovs` ni aplica pagos.
- **Prueba local sintética:** 8 casos, 0 fallos.
- **Estado:** CERRADO EN RAMA / pendiente adapter Firestore LAB directo y UI/bandeja.

---

## B. Pendientes abiertos

### ABIERTO-BE-104-01 — Ejecutar empalme seguro del candidato `211525.464`
- **Área:** Empalme frontend/backend.
- **Necesidad:** aplicar candidato Claude sin reemplazo bruto.
- **Candidato base vivo:** `Prototype Development Request - 2026-07-04T211525.464.zip`.
- **Herramienta agregada:** `tools/orbit360-empalmar-candidato-claude-211525-ays.ps1`.
- **Restricción:** excluir backend protegido y preservar inyección LAB en `index.html`.
- **Estado:** ABIERTO / listo para ejecución local controlada.

### ABIERTO-BE-104-02 — Smoke visual/operativo real sobre rama empalmada
- **Área:** QA / Navegador.
- **Necesidad:** validar render real con backend LAB y guard activo después del empalme.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-03 — Decisión sobre `index.html` permanente
- **Área:** Index central / Backend activation.
- **Necesidad:** mantener integración permanente loader/init/storeLAB/guard sin mojibake y sin pisar cambios Claude.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-04 — Backend real de secretos
- **Área:** Integraciones / Seguridad.
- **Necesidad:** construir backend/secret manager por tenant para Make, IA, WhatsApp, correo y conectores.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-05 — Auth LAB a Auth real
- **Área:** Auth / Equipo / Roles.
- **Necesidad:** pasar de usuario LAB a creación y control real de usuarios por asesor/correo/rol.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-06 — Contrato pólizas/recibos/cartera/conciliación
- **Área:** Backend importador / pólizas / cobros / comisiones / finanzas.
- **Necesidad:** alinear generación de recibos, cartera activa, estados de póliza, país/moneda, planillas de comisiones y conciliación con aseguradoras.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-07 — Junio/julio 2026 como caso especial de conciliación
- **Área:** Migración A&S / planillas / conciliación.
- **Necesidad:** junio y julio deben conciliarse especialmente con planillas de comisiones porque no están cubiertos por el archivo financiero revisado.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-08 — Pendientes Claude acumulados hasta próximo paquete
- **Área:** Coordinación Claude / Frontend / Academia.
- **Documento:** `orbit360-platform/docs/NOTA-PARA-CLAUDE-PENDIENTES-CANDIDATO-211525-NO-ATENDIDO-20260704.md`.
- **Pendientes vivos:** documentación global, copy residual de importador/planilla, nota sobre `conciliacionPropuesta`, Academia por ramo.
- **Estado:** ABIERTO hasta que Paula pida nuevo paquete Claude.

### ABIERTO-BE-104-09 — Integrar parser real + generador + plan de persistencia
- **Área:** Backend importador / conciliaciones.
- **Necesidad:** conectar el parser/importador real para que cada fuente genere `manifest validado -> dryRunReport validado -> score -> propuestas conciliaciones -> plan persistencia`.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-10 — Adapter Firestore LAB directo para `conciliaciones/auditLog`
- **Área:** Backend / Firestore LAB / conciliaciones.
- **Necesidad:** conectar el ejecutor a escritura Firestore LAB real usando tenant isolation, sin secretos en repo y sin mutar `cobros`.
- **Esperado:** `plan validado -> conciliaciones/auditLog en Firestore LAB -> onSnapshot -> UI/bandeja`, con ejecución deshabilitada por defecto.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-11 — Flujo de aplicación controlada
- **Área:** Backend / cobros / comisiones / auditLog / notificaciones.
- **Necesidad:** diseñar el paso posterior donde una propuesta `VALIDADA` puede aplicar cobro/comisión con auditoría.
- **Esperado:** `propuesta VALIDADA -> validar transición -> aplicar cobro/comisión -> auditLog -> notificación -> actualización Portal/Cliente360/Cobros`, sin saltarse revisión.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-12 — UI/Bandeja `conciliaciones`
- **Área:** Frontend/Backend bridge.
- **Necesidad:** mostrar propuestas separadas en bandeja `conciliaciones`, con estado, score, fuente, trazabilidad, decisión y acción controlada.
- **Restricción:** no aplicar pagos desde la bandeja hasta fase autorizada.
- **Estado:** ABIERTO / puede coordinarse con Claude cuando vuelva capacidad.

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
9. No declarar “todos los P0 cerrados” si sigue pendiente bandeja real `conciliaciones` y smoke visual real.

---

## D. Estado general actualizado

Backend LAB reforzado. Candidata viva Claude `211525.464` auditada y aceptada como avance incremental, no como cierre final. Quedan pendientes Claude documentales y de copy hasta próximo paquete. Se agregó pipeline de empalme seguro para no pisar backend protegido. Backend continúa por fases sobre conciliación: parser real, persistencia LAB local controlada en `conciliaciones/auditLog`, transiciones auditadas, adapter Firestore LAB y flujo de aplicación controlada.

---

## E. Documentos clave agregados/actualizados

- `orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-CLAUDE-20260704-211525.md`
- `orbit360-platform/docs/PROMPT-CLAUDE-CANDIDATO-211525-CIERRE-PENDIENTES-20260704.md`
- `orbit360-platform/docs/NOTA-PARA-CLAUDE-PENDIENTES-CANDIDATO-211525-NO-ATENDIDO-20260704.md`
- `orbit360-platform/docs/PLAN-EMPALME-SEGURO-CANDIDATO-CLAUDE-211525-20260704.md`
- `orbit360-platform/docs/CONTRATO-TRANSICIONES-CONCILIACIONES-AYS-20260704.md`
- `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260704-TRANSICIONES-CONCILIACIONES.md`
- `orbit360-platform/docs/CONTRATO-EJECUTOR-PERSISTENCIA-CONCILIACIONES-LAB-AYS-20260704.md`
- `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260704-EJECUTOR-PERSISTENCIA-CONCILIACIONES-LAB.md`
- `tools/orbit360-empalmar-candidato-claude-211525-ays.ps1`
- `tools/orbit360-validar-transicion-conciliacion-ays.mjs`
- `tools/orbit360-test-validar-transicion-conciliacion-ays.mjs`
- `tools/orbit360-ejecutar-persistencia-conciliaciones-lab-ays.mjs`
- `tools/orbit360-test-ejecutar-persistencia-conciliaciones-lab-ays.mjs`
