# Bitácora — Checklist smoke visual/operativo Conciliaciones

**Fecha:** 2026-07-05  
**Bloque:** CERRADO-BE-104-27 — Checklist smoke visual/operativo Conciliaciones  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy.

---

## 1. Necesidad

Después de crear el runner local y la guía de ejecución, faltaba definir el checklist visual para validar el módulo `Conciliaciones` antes de cualquier adapter Firestore LAB real.

---

## 2. Cambio aplicado

Se agregaron:

```txt
tools/orbit360-preparar-smoke-visual-conciliaciones-ays.ps1
orbit360-platform/docs/CHECKLIST-SMOKE-VISUAL-CONCILIACIONES-AYS-20260705.md
```

---

## 3. Helper PowerShell

El helper:

- genera una plantilla `SMOKE-VISUAL-CONCILIACIONES-AYS-*.txt` en `_orbit360_reports`;
- incluye precondiciones del runner;
- incluye checklist por navegación, roles, estado vacío, copy, acciones y trazabilidad;
- intenta copiar la plantilla al portapapeles;
- opcionalmente abre URL local con `-OpenBrowser`;
- no valida visualmente de forma automática;
- no escribe datos operativos.

---

## 4. Criterios documentados

Se documentaron criterios de:

- acceso y navegación por Dirección/Admin/Finanzas;
- ocultamiento para roles no autorizados;
- estado vacío honesto;
- copy seguro;
- acciones sin mutar cobros, pólizas, comisiones, finmovs, cartera ni producción;
- trazabilidad visual de fuentes;
- resultado `OK`, `OK_CON_OBSERVACIONES` o `BLOQUEADO`.

---

## 5. Restricciones preservadas

- No datos reales.
- No Firestore writes.
- No `Orbit.store` writes fuera de `conciliaciones`.
- No aplicación de pagos.
- No marcar cobros como pagados.
- No generar cartera.
- No generar producción.
- No deploy.
- No merge.

---

## 6. Estado

**Cerrado como documentación/tooling en rama.**

Pendiente: ejecutar runner local, ejecutar smoke visual con checklist y pegar reporte/resultados en conversación antes de cualquier adapter LAB real.