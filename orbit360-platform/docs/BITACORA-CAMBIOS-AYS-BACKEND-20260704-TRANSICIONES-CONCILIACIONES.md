# Bitácora backend — Transiciones conciliaciones A&S

**Fecha:** 2026-07-04  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** validador metadata-only agregado y probado localmente.

---

## 2026-07-04 — Validador de transiciones `conciliaciones`

- **Módulo/área:** Backend / conciliaciones / auditLog / aplicación controlada.
- **Necesidad:** impedir que una propuesta de conciliación salte de propuesta a aplicada o se aplique sin validación, actor, motivo, país/moneda coherente y target auditable.
- **Esperado:** validar transiciones permitidas antes de persistencia o aplicación real.
- **Causa raíz:** ya existían score, dry-run, propuestas y plan de persistencia; faltaba blindar el ciclo de vida de la propuesta para evitar aplicación automática.
- **Archivos agregados:**
  - `tools/orbit360-validar-transicion-conciliacion-ays.mjs`
  - `tools/orbit360-test-validar-transicion-conciliacion-ays.mjs`
  - `orbit360-platform/docs/CONTRATO-TRANSICIONES-CONCILIACIONES-AYS-20260704.md`
- **Fix/mejora aplicada:** reglas de transición metadata-only con audit_event, validación de actor/rol/motivo, bloqueo de payload/secretos, país/moneda y estados terminales.
- **Impacto comercializable:** permite que conciliaciones sea una bandeja segura y auditada antes de modificar cobros, comisiones o producción.
- **Estado:** LISTO EN RAMA / pendiente integración con ejecutor LAB.

---

## Pruebas locales sintéticas

Ejecutado localmente:

```txt
node tools/orbit360-test-validar-transicion-conciliacion-ays.mjs
```

Resultado:

```txt
Casos: 8
FAIL: 0
RESULTADO: OK
```

Casos cubiertos:

1. `PROPUESTA -> EN_REVISION` válido.
2. `EN_REVISION -> VALIDADA` válido.
3. `VALIDADA -> APLICADA` válido con contexto controlado.
4. `PROPUESTA -> APLICADA` bloqueado.
5. `BLOQUEADO -> VALIDADA` bloqueado.
6. Falta de actor bloqueada.
7. País/moneda incoherente bloqueado.
8. Payload/rawRows bloqueado.

---

## Pendiente siguiente

Crear ejecutor LAB deshabilitado por defecto:

```txt
plan persistencia validado -> guardar en conciliaciones -> auditLog -> sin tocar cobros
```

La aplicación real queda para fase posterior:

```txt
VALIDADA -> validar transición -> aplicar cobro/comisión -> auditLog -> notificación
```
