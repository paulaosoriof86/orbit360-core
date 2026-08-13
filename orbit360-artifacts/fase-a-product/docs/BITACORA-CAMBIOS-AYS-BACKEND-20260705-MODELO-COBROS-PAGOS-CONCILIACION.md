# Bitácora — Modelo cobros, pagos reportados y conciliación

**Fecha:** 2026-07-05  
**Bloque:** CERRADO-BE-104-30 — Modelo cobros + pagos reportados + conciliación  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy.

---

## 1. Necesidad

El plan vivo indicó continuar con el contrato/modelo de cobros, pagos reportados y conciliación, manteniendo separación entre recaudos, cartera, financiero histórico, estado bancario y producción.

---

## 2. Cambio aplicado

Se agregaron:

```txt
tools/orbit360-validar-modelo-cobros-pagos-conciliacion-ays.mjs
tools/orbit360-test-validar-modelo-cobros-pagos-conciliacion-ays.mjs
orbit360-platform/docs/CONTRATO-MODELO-COBROS-PAGOS-CONCILIACION-AYS-20260705.md
```

---

## 3. Reglas fijadas

- Modelo plan-only.
- Sin datos reales.
- Sin persistencia real.
- Cobros/recaudos se mantienen separados de `finmovs`.
- Estado bancario solo propone conciliación.
- Pago reportado no equivale a cobro aplicado.
- Conciliación validada no aplica pago por sí sola.
- Producción/metas/comisiones sobre prima neta recaudada.
- Cartera no se modifica sin conciliación/aprobación.
- Trazabilidad fuente/archivo/hoja/fila/bloque/periodo.

---

## 4. Validador y tests

El validador revisa contrato sintético y reporta bloqueo si detecta fuentes no permitidas, banco aplicando cobro directo, pago reportado como cobrado, conciliación aplicando pago, producción indebida, cartera modificable, mezcla de moneda o banderas de escritura.

Los tests cubren modelo válido y escenarios de bloqueo controlado.

---

## 5. Estado

**Cerrado como contrato/tooling en rama.**

Pendiente: ejecución local de tests sintéticos y posterior contrato de documentos/Storage/adjuntos.