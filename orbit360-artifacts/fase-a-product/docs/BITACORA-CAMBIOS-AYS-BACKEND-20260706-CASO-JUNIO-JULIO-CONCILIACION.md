# Bitácora — Caso especial junio/julio 2026 conciliación

**Fecha:** 2026-07-06  
**Bloque:** caso especial junio/julio 2026 para conciliación  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy.

---

## 1. Necesidad

Paula indicó que junio y julio requieren lógica especial porque puede haber desalineación entre planillas de comisión, estados de cuenta de clientes, bancos y movimientos financieros. Algunas fuentes muestran pagos aplicados del mes anterior, otras muestran pagos pendientes y movimientos financieros puede no cubrir todos los meses.

---

## 2. Cambio aplicado

Se agregaron:

```txt
orbit360-platform/docs/CONTRATO-CASO-ESPECIAL-JUNIO-JULIO-CONCILIACION-AYS-20260706.md
tools/orbit360-validar-caso-junio-julio-conciliacion-ays.mjs
tools/orbit360-test-validar-caso-junio-julio-conciliacion-ays.mjs
```

---

## 3. Reglas fijadas

- Mantener fuentes separadas.
- Planilla de comisiones puede proponer pago aplicado/periodo/comisión, pero no crear cartera ni cobro aplicado.
- Estado de cuenta cliente puede proponer saldo pendiente, pero no pago realizado.
- Estado bancario puede proponer match, pero no crear cobro aplicado.
- Financiero histórico no crea cartera, cobros ni producción.
- Falta país/moneda confiable: `REQUIERE_VALIDACION`.
- GT -> GTQ y CO -> COP.
- No sumar monedas en crudo.
- Junio/julio produce propuestas de conciliación, no writes.

---

## 4. Estado

Cerrado como contrato/tooling plan-only. No se procesaron archivos reales, no se escribieron datos, no hay deploy ni merge.