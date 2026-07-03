# Suplemento puente Claude · Integraciones post v1.97

**Fecha:** 2026-07-03  
**Base:** Claude v1.97  
**Rama backend:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** complemento del documento `MEJORAS-CHATGPT-PARA-CLAUDE-POST-V197-20260703.md`.

---

## 1. Motivo

Este suplemento registra avances posteriores al documento puente principal para que Claude no los pierda en la próxima versión del prototipo.

---

## 2. Archivos que Claude debe conservar

Claude debe conservar o migrar sin romper contrato:

- `core/integraciones.js`
- `core/integraciones-panel.js`
- `core/integraciones-lab-mock.js`
- `modules/marketing.js`
- `tools/orbit360-validate-marketing-integraciones.mjs`

---

## 3. Contratos de integración que no deben romperse

`Orbit.integraciones` debe mantener:

- `emit(...)`
- `configurar(...)`
- `status()`
- `list(...)`
- `resumen()`
- `diagnostico(...)`
- `openPanel(...)`
- `ensureLabMock(...)`
- `labMock(...)`
- `mark(...)`

Regla base:

```text
Módulo funcional → Orbit.integraciones.emit(...) → eventosIntegracion → backend seguro por tenant → proveedor final
```

---

## 4. Marketing

Marketing ya emite eventos seguros para:

- `marketing_sync_sheets`
- `marketing_generar_pieza`
- `marketing_programar_publicacion`
- `marketing_contenido_creado`

Claude debe evitar regresar botones a simples `toast` sin trazabilidad.

---

## 5. Panel diagnóstico

El panel reutilizable debe mantenerse como acceso a eventos de integración.

Debe permitir ver:

- total de eventos;
- pendientes;
- errores;
- pendientes de configuración;
- últimos eventos;
- filtros por módulo, proveedor, evento y estado.

También existe acción LAB de simulación. Debe mostrarse solo en demo/desarrollo, no en producción.

---

## 6. Configuración tenant-wide

La configuración final debe ser ágil desde la plataforma, pero segura:

```text
Configuración UI
→ Orbit.integraciones.configurar(...)
→ backend seguro
→ referencia segura por tenant
→ estado visible para todos los usuarios del tenant
```

Claude no debe diseñar una solución local por navegador. La configuración debe aplicar para el tenant completo.

En demo/LAB, `configurar(...)` solo deja el estado como pendiente de backend. No debe presentar eso como conexión real.

Documento adicional:

- `docs/PENDIENTE-CLAUDE-CONFIG-INTEGRACIONES-UI-20260703.md`

---

## 7. Backend real

Decisión tomada:

- no activar backend real antes del próximo empalme de prototipo;
- primero recibir nueva versión Claude;
- auditarla;
- empalmar sin perder backend;
- luego conectar Firestore/Auth/Secret Manager/Make real por tenant.

---

## 8. Validador técnico

El validador técnico ahora cubre:

- contratos de `Orbit.integraciones`;
- panel diagnóstico;
- mock LAB;
- eventos de Marketing;
- reglas seguras;
- sintaxis JS sin ejecutar plataforma;
- contrato `configurar(...)`.

Claude no debe eliminarlo.

---

## 9. Estado para paquete Claude

**INCLUIR EN PAQUETE CLAUDE.**

Cuando Paula pida el paquete, incluir este suplemento junto con:

- `docs/MEJORAS-CHATGPT-PARA-CLAUDE-POST-V197-20260703.md`
- `docs/RESUMEN-AVANCE-INTERNO-POST-V197-20260703.md`
- `docs/RESUMEN-AVANCE-INTERNO-POST-V197-20260703-SUPLEMENTO-VALIDADOR-MAKE.md`
- `docs/CHECKLIST-VALIDACION-MARKETING-INTEGRACIONES-20260703.md`
- `docs/PENDIENTE-CLAUDE-CONFIG-INTEGRACIONES-UI-20260703.md`
- `docs/BITACORA-BACKEND-CHATGPT-20260703.md`
- `docs/MANIFIESTO-PAQUETE-CLAUDE-POST-V197-20260703.md`
- `docs/CHECKLIST-EMPALME-POST-CLAUDE-BACKEND-20260703.md`
