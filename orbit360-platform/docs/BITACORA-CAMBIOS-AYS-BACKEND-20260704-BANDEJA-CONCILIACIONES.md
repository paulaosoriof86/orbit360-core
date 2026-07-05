# Bitácora backend — Bandeja conciliaciones A&S

**Fecha:** 2026-07-04  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** documentado y herramienta segura agregada.

---

## 2026-07-04 — Contrato de bandeja `conciliaciones`

- **Módulo/área:** Backend / Firestore LAB / importador / conciliación.
- **Necesidad:** definir una estructura segura para guardar propuestas de conciliación sin modificar `cobros`, `comisiones`, `polizas`, `finmovs`, `cartera` ni `Portal` antes de validación.
- **Esperado:** cada propuesta debe conservar tenant, fuente, manifest, dry-run, hoja/fila/hash, país, moneda, score, decisión, acción propuesta, estado de bandeja, estado de revisión y vínculos a póliza/cobro/comisión si existen.
- **Causa raíz:** los flujos de importación/planillas/estado bancario pueden encontrar coincidencias útiles, pero si impactan cobros directamente se corre riesgo de aplicar pagos incorrectos o mezclar fuentes.
- **Archivos agregados:**
  - `tools/orbit360-validar-conciliacion-propuesta-ays.mjs`
  - `tools/orbit360-test-validar-conciliacion-propuesta-ays.mjs`
  - `orbit360-platform/docs/CONTRATO-BANDEJA-CONCILIACIONES-AYS-20260704.md`
- **Fix/mejora aplicada:** se agregó validador metadata-only para propuestas individuales. Bloquea propuestas ya aplicadas, `write_enabled=true`, `apply_payment=true`, payload/filas reales, fuentes no autorizadas y moneda incoherente.
- **Impacto comercializable:** permite operar conciliación como bandeja auditable y comercializable para intermediarios de seguros, evitando que planillas o estados modifiquen cartera sin revisión.
- **Estado:** LISTO EN RAMA / pendiente integración Firestore LAB y flujo de aplicación controlada.

---

## Reglas agregadas

- Colección sugerida: `conciliaciones`.
- Estados bandeja: `PROPUESTA`, `EN_REVISION`, `VALIDADA`, `RECHAZADA`, `APLICADA`, `BLOQUEADA`, `ANULADA`.
- Estados revisión: `PENDIENTE`, `REQUIERE_VALIDACION`, `VALIDADA`, `RECHAZADA`, `BLOQUEADA`.
- Una propuesta nueva no puede venir como `APLICADA`.
- `APLICADA` solo ocurre después de flujo aprobado posterior.
- No se permite `apply_payment=true` en una propuesta.
- No se permite payload de filas reales dentro del objeto versionado.

---

## Pendiente siguiente

Diseñar aplicación controlada:

```txt
propuesta VALIDADA -> aplicar cobro/comisión -> auditLog -> notificación -> actualización Portal/Cliente360/Cobros
```

sin tocar producción ni datos reales.
