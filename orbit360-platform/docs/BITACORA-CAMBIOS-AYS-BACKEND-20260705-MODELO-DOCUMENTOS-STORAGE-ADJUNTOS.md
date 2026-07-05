# Bitácora — Modelo documentos, Storage futuro y adjuntos

**Fecha:** 2026-07-05  
**Bloque:** CERRADO-BE-104-31 — Modelo documentos + Storage futuro + adjuntos  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy.

---

## 1. Necesidad

El plan vivo indicó continuar con el contrato/modelo de documentos, adjuntos y Storage futuro, manteniendo que documentos soporte solo proponen datos y que no pueden crear clientes, pólizas, cobros, cartera o producción sin confirmación y diff.

---

## 2. Cambio aplicado

Se agregaron:

```txt
tools/orbit360-validar-modelo-documentos-storage-adjuntos-ays.mjs
tools/orbit360-test-validar-modelo-documentos-storage-adjuntos-ays.mjs
orbit360-platform/docs/CONTRATO-MODELO-DOCUMENTOS-STORAGE-ADJUNTOS-AYS-20260705.md
```

---

## 3. Reglas fijadas

- Modelo plan-only.
- Sin datos reales.
- Sin archivos reales.
- Sin binarios/base64/OCR completo.
- Sin Storage real.
- Documentos soporte solo proponen datos.
- Adjuntos de pago reportado no aplican pagos.
- Documentos no crean clientes, pólizas, recibos, cobros, cartera, producción ni finmovs.
- Cualquier escritura futura requiere diff, confirmación, trazabilidad y auditLog.
- Storage futuro debe ser privado, por tenant, con hash y sin URL pública sensible.

---

## 4. Validador y tests

El validador bloquea Storage activo, payload documental, creación directa de entidades, adjunto aplicando pago, modificación de cartera/producción, ausencia de diff/confirmación, ruta sin tenant, secretos y credenciales.

Los tests cubren modelo válido y escenarios de bloqueo controlado.

---

## 5. Estado

**Cerrado como contrato/tooling en rama.**

Pendiente: ejecución local de tests sintéticos y posterior definición de smokes por rol/portal/cobros/admin.