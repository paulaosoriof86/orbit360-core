# Bitácora — Modelo pólizas, recibos y cartera

**Fecha:** 2026-07-05  
**Bloque:** CERRADO-BE-104-29 — Modelo pólizas + recibos + cartera  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy.

---

## 1. Necesidad

El plan vivo indicó continuar con el contrato/modelo de pólizas, recibos y cartera, manteniendo separación de fuentes, país/moneda, estados de póliza y componentes de prima.

---

## 2. Cambio aplicado

Se agregaron:

```txt
tools/orbit360-validar-modelo-polizas-recibos-cartera-ays.mjs
tools/orbit360-test-validar-modelo-polizas-recibos-cartera-ays.mjs
orbit360-platform/docs/CONTRATO-MODELO-POLIZAS-RECIBOS-CARTERA-AYS-20260705.md
```

---

## 3. Reglas fijadas

- Modelo plan-only.
- Sin datos reales.
- Sin persistencia real.
- Pólizas vigentes o por renovar pueden generar recibos/cartera solo con datos confiables.
- Estados históricos no generan cartera vigente.
- Cartera se limita a pendientes del año actual.
- Prima separada en neta, gastos, impuestos y total.
- Producción/metas/comisiones sobre prima neta recaudada.
- País y moneda obligatorios para generar recibos.
- GT usa GTQ y CO usa COP.

---

## 4. Validador y tests

El validador revisa contrato sintético y reporta bloqueo si detecta fuentes no permitidas, reglas incompletas, componentes de prima faltantes, mezcla de moneda o banderas de escritura.

Los tests cubren modelo válido y escenarios de bloqueo controlado.

---

## 5. Estado

**Cerrado como contrato/tooling en rama.**

Pendiente: ejecución local de tests sintéticos y posterior contrato de cobros/pagos reportados/conciliación.