# Pendientes y mejoras backend post v1.104 — Orbit 360 A&S

**Fecha base:** 2026-07-03  
**Actualización:** 2026-07-05  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Uso:** registro acumulado para no perder hallazgos antes de pedir paquete formal para Claude.

---

## A. Pendientes cerrados / avances documentados

### CERRADO-BE-104-01 a CERRADO-BE-104-18 — Backend LAB, conciliaciones y fuentes separadas
- **Área:** Backend LAB / Firestore LAB / conciliaciones / importadores.
- **Estado:** CERRADO COMO TOOLING EN RAMA.
- **Resumen:** loader/init/guard LAB, validadores, score conciliación, dryRunReport, propuestas `conciliaciones`, plan de persistencia, transiciones, ejecutor local mirror, adapter Firestore LAB preparado, smoke E2E sintético, readiness UI, planificador de aplicación controlada y manifest por fuentes separadas alineado a `conciliaciones`.
- **Restricción vigente:** no hay backend productivo ni writes reales de pagos; todo sigue protegido hasta ejecución/smoke autorizado.

### CERRADO-FRONT-062855 — Candidata Claude `062855.313` auditada
- **Área:** Auditoría Claude / frontend / bandeja conciliaciones.
- **Archivo auditado:** `Prototype Development Request - 2026-07-05T062855.313.zip`.
- **Documento:** `orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-CLAUDE-20260705-062855.md`.
- **Resultado:** no hay crítico. Corrigió ruta `conciliaciones` en tenant, rol Admin y copy residual de importador.
- **Estado:** CERRADO COMO AUDITORÍA.

### CERRADO-FRONT-062855-EMPALME — Empalme frontend aplicado en GitHub
- **Área:** Empalme frontend/backend.
- **Aplicado:**
  - `orbit360-platform/modules/conciliaciones.js` agregado.
  - `orbit360-platform/index.html` actualizado como híbrido LAB.
- **Regla aplicada:** no se copió `index.html` bruto del ZIP; se preservaron `backend-lab-loader`, `backend-lab-init`, `data/store-firestore-lab.local.js` y `auth labfix`.
- **Regla operativa del módulo:** `Conciliaciones` lee y actualiza solo `Orbit.store('conciliaciones')`; no toca `cobros`, `comisiones`, `finmovs`, cartera ni producción.
- **Estado:** CERRADO EN RAMA / pendiente smoke visual y validación local.

---

## B. Pendientes abiertos

### ABIERTO-BE-104-02 — Smoke visual/operativo real sobre rama empalmada
- **Área:** QA / Navegador.
- **Necesidad:** abrir la plataforma y validar que Conciliaciones aparezca para Dirección/Admin/Finanzas, que renderice vacío honestamente y que acciones no toquen cobros.
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

### ABIERTO-BE-104-13 — Smoke UI/Bandeja `conciliaciones`
- **Área:** Frontend/Backend bridge.
- **Estado:** EMPALMADO / pendiente smoke visual.

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

Backend LAB reforzado. Candidata Claude `062855.313` auditada y empalmada de forma segura en GitHub para la UI/Bandeja de `conciliaciones`, preservando backend LAB. Quedan abiertos smoke visual/local, adapter Firestore LAB real, parser real, persistencia `conciliaciones/auditLog`, perfilador de columnas, score real y futuro ejecutor autorizado.
