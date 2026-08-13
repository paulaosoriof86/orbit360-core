# Pendientes Claude post v1.88 · Orbit 360

**Fecha:** 2026-07-03  
**Prototipo vigente:** `Prototype Development Request - 2026-07-03T000030.492.zip`  
**Versión interna:** v1.88  
**Objetivo:** conservar pendientes y mejoras para Claude sin que se pierdan en nuevos chats ni en empalmes con backend LAB.

---

## 1. Regla de trabajo estable

Cada ZIP nuevo de Claude se trata como **release candidate**, no como reinicio.

Auditoría obligatoria:

1. Comparar contra el ZIP inmediatamente anterior.
2. Comparar contra V99/V89 o contra la última versión empalmada en GitHub.
3. Comparar contra pendientes acumulados.
4. Revisar `docs/BITACORA-CAMBIOS.md`, `CHANGELOG.md`, `docs/PENDIENTES-Y-MEJORAS.md` y `docs/BITACORA-ERRORES.md`.
5. Separar mejoras cerradas, pendientes abiertos, regresiones, cambios aplicables al prototipo base y cambios aplicables al backend.
6. No eliminar hooks backend LAB si están presentes.

---

## 2. P0 para Claude

### P0.1 — Actualizar `CHANGELOG.md`

`docs/BITACORA-CAMBIOS.md` llegó a v1.88, pero `CHANGELOG.md` sigue desalineado. Claude debe actualizar `CHANGELOG.md` con entradas v1.56–v1.88 o una entrada consolidada v1.88 que remita a la bitácora.

Debe incluir, como mínimo:

- v1.80 Finanzas profundo.
- v1.81 Presupuesto con fecha de pago.
- v1.82 Insights: concentración por aseguradora.
- v1.83 Regla recaudo póliza ≠ finmov.
- v1.84 Conciliación de statements/planillas de comisión.
- v1.85 Visor Academia unificado.
- v1.86 Facturas a aseguradoras + visor Academia confirmado.
- v1.87 `tenant.paisesCfg` como fuente fiscal multi-tenant.
- v1.88 Profundización de cursos Marketing y Portal.

### P0.2 — Documentar regla financiera corregida

Regla correcta:

- Pago de póliza por cliente no crea `finmov` como ingreso de caja/banco.
- Factura emitida a aseguradora sí genera CxC/facturado de comisiones.
- Solo cuenta como ingreso real cuando se marque recaudada o se concilie contra banco/caja.
- Reportes deben separar facturado vs recaudado.

### P0.3 — Factura de comisión a aseguradora: completar control operativo

No es error que genere CxC. Pendientes:

- idempotencia,
- número correlativo,
- anulación/reversión,
- auditoría,
- enlace con statement/planilla,
- enlace con banco/recaudo,
- estado `facturado → recaudado`,
- control país/moneda sin mezclar GTQ/COP.

### P0.4 — Eliminar `localStorage` directo

Revisar especialmente:

- `index.html` preferencias de sidebar.
- `modules/configuracion.js` logo y configuración.

Debe usarse `Orbit.store`, `Orbit.tenant`, `pref/setPref` o helper core. No módulos tocando almacenamiento directo.

### P0.5 — Seed ficticio y no hardcodear A&S

- Validar que seed demo no contenga datos reales de Paula, A&S ni clientes reales.
- A&S debe vivir por configuración/tenant/backend, no como lógica incrustada en core.

### P0.6 — No mostrar notas técnicas en UI cliente

No deben aparecer en UI comercial:

- Firebase,
- Firestore,
- LAB,
- tokens,
- claves,
- notas técnicas,
- advertencias internas.

---

## 3. Instrucción breve para Claude

```text
Actualiza Orbit 360 v1.88 sobre el último ZIP entregado. No reinicies metodología. Actualiza CHANGELOG.md porque BITACORA-CAMBIOS ya llega a v1.88 y el changelog principal quedó desalineado. Documenta la regla financiera corregida: factura de comisión a aseguradora sí genera CxC/facturado; solo pasa a ingreso real cuando se marca recaudada o se concilia banco. Pago de póliza por cliente no crea finmov. Elimina localStorage directo en módulos/index. Mantén A&S solo por configuración, seed ficticio y no elimines hooks backend LAB si están presentes.
```

---

## 4. Relación con backend ChatGPT/Codex

El backend debe preservar:

- rama `ays/backend-tenant-lab-v99-20260703`,
- `core/backend-lab-loader.js`,
- `core/backend-lab-init.js`,
- `data/store-firestore-lab.local.js`,
- `core/auth-firebase.config.local.js`,
- API `Orbit.store`,
- tenant `alianzas-soluciones`,
- sin deploy/Hosting/producción sin autorización.

El empalme del ZIP v1.88 se hará sin reemplazar backend LAB a ciegas.
