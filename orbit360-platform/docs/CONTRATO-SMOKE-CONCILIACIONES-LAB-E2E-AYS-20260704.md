# Contrato backend — Smoke E2E conciliaciones LAB A&S

**Fecha:** 2026-07-04  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** smoke E2E sintético agregado. Sin datos reales, sin Firestore writes, sin pagos.

---

## 1. Objetivo

Probar de extremo a extremo, con datos sintéticos, el flujo seguro de conciliaciones LAB:

```txt
propuestas sintéticas
-> plan persistencia
-> ejecutor dry-run
-> ejecutor local mirror
-> transición validada
-> adapter Firestore LAB validado/readiness
-> reporte
```

Este smoke no aplica pagos ni toca colecciones operativas.

---

## 2. Herramienta agregada

```txt
tools/orbit360-smoke-conciliaciones-lab-e2e-ays.mjs
```

---

## 3. Flujo cubierto

El smoke crea propuestas sintéticas para:

```txt
planilla_comisiones
estado_cuenta_bancario
```

Luego ejecuta:

```txt
tools/orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs
tools/orbit360-ejecutar-persistencia-conciliaciones-lab-ays.mjs --mode dry-run
tools/orbit360-ejecutar-persistencia-conciliaciones-lab-ays.mjs --mode local-mirror --execute-lab CONFIRMO_ESCRITURA_LAB_CONCILIACIONES
tools/orbit360-validar-transicion-conciliacion-ays.mjs
tools/orbit360-validar-adapter-conciliaciones-firestore-lab-ays.mjs
```

---

## 4. Modo normal y modo estricto

Modo normal:

```bash
node tools/orbit360-smoke-conciliaciones-lab-e2e-ays.mjs
```

En modo normal, si el adapter Firestore LAB todavía no fue aplicado localmente con:

```powershell
tools/orbit360-integrar-adapter-conciliaciones-firestore-lab-ays.ps1 -Apply
```

el smoke puede salir como:

```txt
SMOKE_OK_CON_READINESS_PENDIENTE
```

Esto no significa error del flujo sintético; significa que falta ejecutar el Apply local del adapter.

Modo estricto:

```bash
node tools/orbit360-smoke-conciliaciones-lab-e2e-ays.mjs --strict-adapter
```

En modo estricto, el adapter debe estar integrado y validado; si no, el smoke falla.

---

## 5. Salidas

El smoke genera:

```txt
_orbit360_reports/SMOKE-CONCILIACIONES-LAB-E2E-AYS-*.json
_orbit360_reports/SMOKE-CONCILIACIONES-LAB-E2E-AYS-*.txt
```

Además crea archivos sintéticos en:

```txt
_orbit360_tmp/smoke-conciliaciones-lab-e2e/
```

Archivos sintéticos:

```txt
propuestas-sinteticas-conciliaciones.json
plan-persistencia-conciliaciones.json
lab-mirror-conciliaciones.json
transicion-conciliacion.json
```

---

## 6. Restricciones

El smoke declara y respeta:

```txt
synthetic-only
no real data
no Firestore writes
no payment application
no cobros mutation
no deploy
no merge
```

---

## 7. Decisiones posibles

```txt
SMOKE_OK
SMOKE_OK_CON_READINESS_PENDIENTE
SMOKE_BLOQUEADO
```

### SMOKE_OK

Todo el flujo sintético pasó y el adapter Firestore LAB validó.

### SMOKE_OK_CON_READINESS_PENDIENTE

El flujo sintético pasó, pero el adapter Firestore LAB aún requiere integración local o validación estricta.

### SMOKE_BLOQUEADO

Falló el plan, el ejecutor, el mirror, la transición o el adapter en modo estricto.

---

## 8. Qué valida

- que se pueda generar un plan de persistencia con 2 propuestas sintéticas;
- que el ejecutor `dry-run` no escriba;
- que el ejecutor `local-mirror` materialice `conciliaciones` + `auditLog` solo con token explícito;
- que el mirror contenga mínimo 2 conciliaciones y 2 auditLog;
- que una transición `PROPUESTA -> EN_REVISION` valide correctamente;
- que el adapter Firestore LAB esté listo o quede marcado como readiness pendiente.

---

## 9. Lo que NO valida todavía

No valida todavía:

- UI/bandeja visual;
- writes Firestore reales;
- reglas Firestore desplegadas;
- Auth real;
- aplicación de cobros/comisiones;
- notificaciones;
- Portal/Cliente360 en navegador.

---

## 10. Siguiente bloque recomendado

Construir el reporte de readiness UI/bandeja y/o una vista backend-safe para `conciliaciones`:

```txt
conciliaciones/auditLog -> readiness UI -> módulo/bandeja -> acciones sin aplicar pagos
```

La aplicación real sigue bloqueada hasta tener autorización explícita y validación de transición `VALIDADA -> APLICADA`.