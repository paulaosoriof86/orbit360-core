# Bitácora — Manifest de fuentes reales A&S

**Fecha:** 2026-07-06  
**Bloque:** contrato manifest/catálogo de fuentes reales  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy.

---

## 1. Necesidad

Antes de cualquier lectura real o migración, se debe registrar cada archivo/fuente con fuente separada, país, moneda, periodo, módulo dueño, efecto permitido y trazabilidad mínima. Esto evita mezclar banco, planillas, financiero histórico, cartera, cobros, clientes y pólizas.

---

## 2. Cambio aplicado

Se agregaron:

```txt
orbit360-platform/docs/CONTRATO-MANIFEST-FUENTES-REALES-AYS-20260706.md
orbit360-platform/docs/ESPECIFICACION-VALIDADOR-MANIFEST-FUENTES-AYS-20260706.md
```

---

## 3. Nota sobre tooling

Se intentó agregar el script ejecutable del validador, pero la herramienta lo bloqueó. La regla no se pierde: quedó como especificación documental para implementarla en bloque posterior.

---

## 4. Reglas fijadas

- Manifest antes de lectura real.
- Cada fuente conserva identidad.
- No se guardan filas reales ni payload en repo.
- País/moneda obligatorio o `REQUIERE_VALIDACION`.
- GT -> GTQ, CO -> COP.
- Banco no crea cobro aplicado.
- Financiero histórico no crea cartera, cobros ni producción.
- Documentos soporte solo proponen datos.

---

## 5. Estado

Cerrado como contrato/especificación plan-only. No se abrieron archivos reales, no se procesaron filas, no se escribieron datos, no hay deploy ni merge.