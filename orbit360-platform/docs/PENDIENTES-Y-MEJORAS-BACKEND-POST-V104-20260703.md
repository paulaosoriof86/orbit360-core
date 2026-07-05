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
- **Aplicado:** `core/backend-lab-security-guard.js` bloquea configuración sensible, limpia campos sensibles y bloquea writes si no hay usuario LAB esperado.
- **Estado:** CERRADO EN RAMA / pendiente smoke real.

### CERRADO-BE-104-04 — Script de integración local v104
- **Área:** Tools / Index central.
- **Aplicado:** `tools/orbit360-integrar-backend-lab-index.ps1`.
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
- **Estado:** CERRADO EN RAMA / pendiente ejecutor LAB e integración con auditLog real.

### CERRADO-BE-104-13 — Ejecutor LAB local de persistencia `conciliaciones`
- **Área:** Backend / conciliaciones / auditLog / persistencia LAB.
- **Aplicado:** `tools/orbit360-ejecutar-persistencia-conciliaciones-lab-ays.mjs`, tests, contrato y bitácora.
- **Estado:** CERRADO EN RAMA / pendiente adapter Firestore LAB directo y UI/bandeja.

### CERRADO-BE-104-14 — Adapter Firestore LAB para `conciliaciones/auditLog` preparado
- **Área:** Backend / Firestore LAB / conciliaciones / auditLog.
- **Aplicado:** `tools/orbit360-integrar-adapter-conciliaciones-firestore-lab-ays.ps1`, `tools/orbit360-validar-adapter-conciliaciones-firestore-lab-ays.mjs`, tests, contrato y bitácora.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecutar `-Apply` local y smoke de extremo a extremo.

### CERRADO-BE-104-15 — Smoke E2E sintético de conciliaciones LAB
- **Área:** Backend / QA / conciliaciones / LAB readiness.
- **Aplicado:** `tools/orbit360-smoke-conciliaciones-lab-e2e-ays.mjs`, contrato y bitácora.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local real y readiness UI/bandeja.

### CERRADO-BE-104-16 — Readiness UI/Bandeja `conciliaciones`
- **Área:** Backend/frontend bridge / conciliaciones / UI readiness.
- **Aplicado:** `tools/orbit360-generar-readiness-bandeja-conciliaciones-ays.mjs`, tests, contrato y bitácora.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local y construcción UI/bandeja.

### CERRADO-BE-104-17 — Planificador de aplicación controlada desde `conciliaciones`
- **Área:** Backend / conciliaciones / cobros / comisiones / auditLog.
- **Aplicado:** `tools/orbit360-preparar-aplicacion-controlada-conciliacion-ays.mjs`, tests, contrato y bitácora.
- **Regla:** herramienta plan-only; valida propuesta `VALIDADA`, actor, trazabilidad, país/moneda, monto y target; no escribe Firestore, no toca `cobros/comisiones`, no aplica pagos y no genera producción.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente conectar a UI/Bandeja y futuro ejecutor autorizado.

### CERRADO-BE-104-18 — Manifest por fuentes separadas alineado a `conciliaciones`
- **Área:** Backend / importador / parser / fuentes separadas / conciliación.
- **Aplicado:**
  - `tools/orbit360-validar-manifest-fuente-ays.mjs` actualizado a v1.2.
  - `tools/orbit360-test-validar-manifest-fuente-ays.mjs` alineado.
  - `orbit360-platform/docs/CONTRATO-MANIFEST-FUENTES-SEPARADAS-AYS-20260705.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-MANIFEST-FUENTES-SEPARADAS.md`.
- **Regla:** banco, planillas y cobros realizados proponen hacia `conciliaciones`, no a `cobros`; financiero histórico solo a `finmovs`; documentos soporte solo a documentos/parches pendientes; no filas reales ni banderas de escritura en manifest.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local y perfilador de columnas por fuente.

---

## B. Pendientes abiertos

### ABIERTO-BE-104-01 — Ejecutar empalme seguro del candidato `211525.464` / siguiente candidato aceptado
- **Área:** Empalme frontend/backend.
- **Estado:** ABIERTO / listo para ejecución local controlada cuando haya candidato aceptado.

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
- **Estado:** ABIERTO / en trabajo con Claude.

### ABIERTO-BE-104-14 — Futuro ejecutor autorizado de aplicación controlada
- **Área:** Backend / cobros / comisiones / auditLog / notificaciones.
- **Restricción:** no construir ejecutor real sin autorización explícita de Paula.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-15 — Perfilador de columnas por fuente
- **Área:** Backend / importador / parser.
- **Necesidad:** a partir de manifest validado, generar perfil de columnas, mapeo candidato, advertencias y readiness para dryRunReport, sin payload real.
- **Esperado:** `manifest validado -> perfil columnas -> mapeo candidato -> dryRunReport sin payload real`.
- **Estado:** ABIERTO.

---

## C. Pendientes para reportar a Claude cuando Paula pida paquete

1. No reintroducir persistencia sensible en `Orbit.store`, localStorage ni Firestore directo.
2. No reemplazar backend LAB ni scripts de validación al entregar nuevos ZIPs.
3. Mantener `CONTENT_V=5` y lección de conciliación.
4. Corregir copy residual: no “aplicar pagos”; usar “proponer para validación”.
5. Documentar que `conciliacionPropuesta` en cobro es visual/prototipo; persistencia real en `conciliaciones` queda para backend ChatGPT/Codex.
6. Academia profunda por ramo/producto: Vida, Gastos médicos, Hogar, Fianzas, Responsabilidad Civil, Transporte/Carga.
7. Construir UI/Bandeja `conciliaciones` con el contrato readiness, sin aplicar pagos directos.
8. Incorporar acción visual `preparar_aplicacion_controlada` solo como antesala, sin aplicar pagos ni mutar cobros.
9. No declarar “todos los P0 cerrados” si sigue pendiente bandeja real, smoke visual real y aplicación controlada ejecutable.

---

## D. Estado general actualizado

Backend LAB reforzado. Candidata viva Claude `211525.464` auditada y aceptada como avance incremental; candidata `061837.674` auditada y enviada a mini-fix por ruta/rol/copy. Backend continúa por fases sobre conciliación: parser real, manifest por fuente, perfilador de columnas, dryRunReport, score, propuestas, persistencia LAB, bandeja, aplicación controlada plan-only y futuro ejecutor autorizado pendiente.

---

## E. Documentos clave recientes

- `orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-CLAUDE-20260705-061837.md`
- `orbit360-platform/docs/PROMPT-CLAUDE-CANDIDATO-061837-FIX-RUTA-COPY-20260705.md`
- `orbit360-platform/docs/CONTRATO-APLICACION-CONTROLADA-CONCILIACIONES-AYS-20260705.md`
- `orbit360-platform/docs/CONTRATO-MANIFEST-FUENTES-SEPARADAS-AYS-20260705.md`
- `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-MANIFEST-FUENTES-SEPARADAS.md`
- `tools/orbit360-preparar-aplicacion-controlada-conciliacion-ays.mjs`
- `tools/orbit360-test-preparar-aplicacion-controlada-conciliacion-ays.mjs`
- `tools/orbit360-validar-manifest-fuente-ays.mjs`
- `tools/orbit360-test-validar-manifest-fuente-ays.mjs`
