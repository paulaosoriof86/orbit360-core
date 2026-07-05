# Bitácora backend — Plan de persistencia conciliaciones A&S

**Fecha:** 2026-07-04  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** herramienta plan-only agregada y documentada.

---

## 2026-07-04 — Preparador de persistencia LAB para `conciliaciones`

- **Módulo/área:** Backend / Firestore LAB / importador / conciliación.
- **Necesidad:** convertir propuestas generadas desde dry-run en un plan de persistencia tenant-safe, sin escribir todavía en Firestore ni modificar `cobros`.
- **Esperado:** generar operaciones `upsert_conciliacion_propuesta` con documento normalizado, `path_hint`, colección `conciliaciones`, tenant, audit event y validación por operación.
- **Causa raíz:** ya existía generador dry-run → propuestas, pero faltaba el paso previo a persistencia LAB para garantizar que no se mezclen tenants, no se cuelen payloads reales y no se persista algo ya aplicado.
- **Archivos agregados:**
  - `tools/orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs`
  - `tools/orbit360-test-preparar-persistencia-conciliaciones-lab-ays.mjs`
  - `orbit360-platform/docs/CONTRATO-PLAN-PERSISTENCIA-CONCILIACIONES-LAB-AYS-20260704.md`
- **Fix/mejora aplicada:** preparador plan-only que valida lote y operaciones sin escribir nada. Bloquea lote con payload real, tenant mezclado o banderas de escritura/aplicación; bloquea operaciones con estado `APLICADA`, fuente inválida, ID duplicado o país/moneda incoherente.
- **Impacto comercializable:** permite preparar persistencia de conciliaciones con trazabilidad y seguridad antes de activar Firestore LAB real.
- **Estado:** LISTO EN RAMA / pendiente ejecutor LAB aprobado.

---

## Pruebas locales sintéticas

Ejecutado localmente en entorno aislado:

```txt
node tools/orbit360-test-preparar-persistencia-conciliaciones-lab-ays.mjs
```

Resultado:

```txt
Casos: 6
FAIL: 0
RESULTADO: OK
```

Casos cubiertos:

1. plan válido con 2 operaciones;
2. propuesta `APLICADA` bloqueada internamente;
3. lote con `rawRows` bloquea todo;
4. tenant distinto a `--tenant` bloquea todo;
5. ID duplicado bloquea operación duplicada;
6. fuente `financiero_historico` bloqueada internamente.

---

## Pendiente siguiente

Crear ejecutor LAB deshabilitado por defecto:

```txt
plan validado -> guardar en conciliaciones -> auditLog -> sin aplicar pago
```

con bandera explícita y smoke local antes de cualquier uso real.
