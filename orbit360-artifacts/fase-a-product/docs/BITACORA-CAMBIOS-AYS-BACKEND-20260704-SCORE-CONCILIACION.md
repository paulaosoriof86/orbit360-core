# Bitácora backend — Score conciliación A&S

**Fecha:** 2026-07-04  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** documentado y herramienta segura agregada.

---

## 2026-07-04 — Score de confianza para conciliación

- **Módulo/área:** Backend importador / conciliación / planillas / cobros.
- **Necesidad:** evitar que estados de cuenta, planillas de aseguradora o planillas de comisión apliquen pagos solo por póliza+monto, sin suficiente evidencia.
- **Esperado:** cada coincidencia debe clasificarse como exacta, probable, requiere validación o bloqueada, preservando trazabilidad y sin escritura automática.
- **Causa raíz:** el prototipo ya propone conciliaciones útiles, pero backend real necesita un contrato objetivo antes de impactar cobros, comisiones, cartera, Portal y Cliente360.
- **Archivos agregados:**
  - `tools/orbit360-calcular-score-conciliacion-ays.mjs`
  - `tools/orbit360-test-score-conciliacion-ays.mjs`
  - `orbit360-platform/docs/CONTRATO-SCORE-CONFIANZA-CONCILIACION-AYS-20260704.md`
- **Fix/mejora aplicada:** se agregó herramienta metadata-only que calcula score con evidencia de póliza, recibo/cuota, cliente, aseguradora, país/moneda, monto y periodo/fecha. También bloquea país/moneda incoherente, fuentes no autorizadas y casos con filas embebidas.
- **Impacto comercializable:** permite avanzar hacia importador inteligente real sin mezclar fuentes ni aplicar pagos sin validación. Protege producción, metas, comisiones, liquidaciones y Portal Cliente.
- **Estado:** LISTO EN RAMA / pendiente ejecución local en repo completo y empalme visual Claude.

---

## Reglas agregadas

- Fuentes autorizadas para score:
  - `planilla_aseguradora`
  - `planilla_comisiones`
  - `estado_cuenta_bancario`
  - `cobros_realizados`
- Núcleo mínimo para no bloquear:
  - póliza;
  - país/moneda;
  - monto.
- Decisiones:
  - `MATCH_EXACTO`
  - `MATCH_PROBABLE`
  - `REQUIERE_VALIDACION`
  - `BLOQUEADO`
- Acciones propuestas:
  - `PROPONER_APLICACION_CON_CONFIRMACION`
  - `PROPONER_REVISION`
  - `ENVIAR_A_BANDEJA_VALIDACION`
  - `NO_APLICAR`

---

## Pendiente siguiente

Integrar este score al flujo backend de dry-run/manifest para que cada importación de planilla o estado genere bandeja de conciliación trazable, no escritura directa.
