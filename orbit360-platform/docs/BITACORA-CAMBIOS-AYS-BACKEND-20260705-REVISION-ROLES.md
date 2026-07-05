# Bitácora — Revisión visual y operativa por roles

**Fecha:** 2026-07-05  
**Bloque:** Revisión visual/operativa por roles  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy.

---

## 1. Necesidad

Después del empalme controlado v1.142 y del contrato de documentos/adjuntos, faltaba preparar una revisión por roles para validar que la UI y los estados sean honestos antes de cualquier persistencia real.

---

## 2. Cambio aplicado

Se agregaron:

```txt
tools/orbit360-validar-revision-roles-ays.mjs
tools/orbit360-preparar-revision-roles-ays.ps1
orbit360-platform/docs/CHECKLIST-REVISION-VISUAL-OPERATIVA-ROLES-AYS-20260705.md
```

---

## 3. Roles cubiertos

```txt
Cliente / Portal
Asesor
Cobros / Finanzas
Dirección / Admin
```

---

## 4. Reglas validadas

- Pago reportado queda pendiente de revisión/conciliación.
- Adjunto es soporte, no pago aplicado.
- Conciliaciones no aplica pagos ni modifica cobros.
- Dirección ve recaudo confirmado, no recaudo aplicado.
- Integraciones pendientes no se muestran como reales.
- País/moneda se conserva visible por rol.
- Backend protegido se mantiene cargado en index.

---

## 5. Estado

Cerrado como checklist/tooling en rama. Pendiente ejecución local y revisión visual en navegador.