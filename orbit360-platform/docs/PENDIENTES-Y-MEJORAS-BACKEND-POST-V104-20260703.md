# Pendientes y mejoras backend post v1.104 — Orbit 360 A&S

**Fecha base:** 2026-07-03  
**Actualización:** 2026-07-05  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Uso:** registro acumulado para no perder hallazgos antes de pedir paquete formal para Claude.

---

## A. Pendientes cerrados / avances backend ya documentados

### CERRADO-BE-104-01 — Loader LAB con tenant allowlist
- **Área:** Backend LAB / Seguridad tenant.
- **Estado:** CERRADO EN RAMA.

### CERRADO-BE-104-02 — Init Firebase LAB con validación de config
- **Área:** Backend LAB / Firebase init.
- **Estado:** CERRADO EN RAMA.

### CERRADO-BE-104-03 — Guard runtime contra secretos y auth incorrecta
- **Área:** Backend LAB / Integraciones / Auth.
- **Estado:** CERRADO EN RAMA / pendiente smoke real.

### CERRADO-BE-104-04 — Script de integración local v104
- **Área:** Tools / Index central.
- **Estado:** CERRADO EN RAMA.

### CERRADO-BE-104-05 — Validador estático backend LAB
- **Área:** QA backend.
- **Estado:** CERRADO EN RAMA.

### CERRADO-BE-104-06 — Score de confianza para conciliación
- **Área:** Backend importador / conciliación / planillas / cobros.
- **Estado:** CERRADO EN RAMA / pendiente ejecución local en repo completo.

### CERRADO-BE-104-07 — Contrato y validador dryRunReport importador
- **Área:** Backend importador / parser / dry-run / conciliación.
- **Estado:** CERRADO EN RAMA / pendiente integración al parser/importador real.

### CERRADO-BE-104-08 — Contrato y validador de bandeja `conciliaciones`
- **Área:** Backend / Firestore LAB / conciliaciones.
- **Estado:** CERRADO EN RAMA / pendiente implementación Firestore LAB y flujo de aplicación controlada.

### CERRADO-BE-104-09 — Generador dryRunReport → propuestas `conciliaciones`
- **Área:** Backend importador / dry-run / conciliación / bandeja.
- **Estado:** CERRADO EN RAMA / pendiente persistencia Firestore LAB.

### CERRADO-BE-104-10 — Plan de persistencia LAB para `conciliaciones`
- **Área:** Backend / Firestore LAB / conciliaciones.
- **Estado:** CERRADO EN RAMA / pendiente ejecutor LAB aprobado.

### CERRADO-BE-104-11 — Auditoría y documentación candidato Claude `211525.464`
- **Área:** Auditoría Claude / continuidad frontend-backend.
- **Estado:** CERRADO COMO DOCUMENTACIÓN Y PIPELINE / pendiente ejecución local de empalme y smoke.

### CERRADO-BE-104-12 — Validador de transiciones `conciliaciones`
- **Área:** Backend / conciliaciones / auditLog / aplicación controlada.
- **Estado:** CERRADO EN RAMA / pendiente ejecutor LAB e integración con auditLog real.

### CERRADO-BE-104-13 — Ejecutor LAB local de persistencia `conciliaciones`
- **Área:** Backend / conciliaciones / auditLog / persistencia LAB.
- **Estado:** CERRADO EN RAMA / pendiente adapter Firestore LAB directo y UI/bandeja.

### CERRADO-BE-104-14 — Adapter Firestore LAB para `conciliaciones/auditLog` preparado
- **Área:** Backend / Firestore LAB / conciliaciones / auditLog.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecutar `-Apply` local y smoke de extremo a extremo.

### CERRADO-BE-104-15 — Smoke E2E sintético de conciliaciones LAB
- **Área:** Backend / QA / conciliaciones / LAB readiness.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local real y readiness UI/bandeja.

### CERRADO-BE-104-16 — Readiness UI/Bandeja `conciliaciones`
- **Área:** Backend/frontend bridge / conciliaciones / UI readiness.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local y construcción UI/bandeja.

### CERRADO-BE-104-17 — Planificador de aplicación controlada desde `conciliaciones`
- **Área:** Backend / conciliaciones / cobros / comisiones / auditLog.
- **Regla:** herramienta plan-only; valida propuesta `VALIDADA`, actor, trazabilidad, país/moneda, monto y target; no escribe Firestore, no toca `cobros/comisiones`, no aplica pagos y no genera producción.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente conectar a UI/Bandeja y futuro ejecutor autorizado.

### CERRADO-BE-104-18 — Manifest por fuentes separadas alineado a `conciliaciones`
- **Área:** Backend / importador / parser / fuentes separadas / conciliación.
- **Regla:** banco, planillas y cobros realizados proponen hacia `conciliaciones`, no a `cobros`; financiero histórico solo a `finmovs`; documentos soporte solo a documentos/parches pendientes; no filas reales ni banderas de escritura en manifest.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local y perfilador de columnas por fuente.

### CERRADO-FRONT-062855 — Candidata Claude `062855.313` auditada y apta para empalme seguro
- **Área:** Auditoría Claude / frontend / bandeja conciliaciones.
- **Archivo auditado:** `Prototype Development Request - 2026-07-05T062855.313.zip`.
- **Aplicado/documentado:**
  - `orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-CLAUDE-20260705-062855.md`.
  - `tools/orbit360-empalmar-candidato-claude-062855-ays.ps1`.
- **Resultado:** no hay crítico. Corrigió ruta `conciliaciones` en tenant, rol Admin y copy residual de importador.
- **Regla de empalme:** no copiar `index.html` bruto; usar index híbrido que preserva backend LAB.
- **Estado:** CERRADO COMO AUDITORÍA / listo para empalme seguro local y smoke.

---

## B. Pendientes abiertos

### ABIERTO-BE-104-01 — Ejecutar empalme seguro del candidato `062855.313`
- **Área:** Empalme frontend/backend.
- **Herramienta:** `tools/orbit360-empalmar-candidato-claude-062855-ays.ps1`.
- **Necesidad:** ejecutar sobre repo local con backup, exclusión de backend protegido e index híbrido LAB.
- **Estado:** ABIERTO / requiere entorno local o ejecución Codex con acceso al repo.

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
- **Estado:** EN CANDIDATA 062855 / pendiente empalme y smoke.

### ABIERTO-BE-104-14 — Futuro ejecutor autorizado de aplicación controlada
- **Área:** Backend / cobros / comisiones / auditLog / notificaciones.
- **Restricción:** no construir ejecutor real sin autorización explícita de Paula.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-15 — Perfilador de columnas por fuente
- **Área:** Backend / importador / parser.
- **Estado:** ABIERTO.

---

## C. Pendientes para reportar a Claude cuando Paula pida paquete

1. No reintroducir persistencia sensible en `Orbit.store`, localStorage ni Firestore directo.
2. No reemplazar backend LAB ni scripts de validación al entregar nuevos ZIPs.
3. Mantener `CONTENT_V=5` y lección de conciliación.
4. No declarar cerrado backend real de `conciliaciones/auditLog`, score real, aplicación controlada ni smoke visual hasta ejecución ChatGPT/Codex.

---

## D. Estado general actualizado

Backend LAB reforzado. Candidata Claude `062855.313` no tiene críticos y queda apta para empalme seguro, con la condición de preservar backend LAB e index híbrido. Backend continúa por fases: parser real, manifest por fuente, perfilador de columnas, dryRunReport, score, propuestas, persistencia LAB, smoke local, bandeja y futuro ejecutor autorizado pendiente.
