# Orbit 360 — Estado de trabajo, actualización v1.88 y continuidad Backend LAB

**Fecha:** 2026-07-03  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama backend:** `ays/backend-tenant-lab-v99-20260703`  
**Prototipo vigente:** `Prototype Development Request - 2026-07-03T000030.492.zip`  
**Versión interna:** v1.88  
**Cache-busting:** v1287  
**Seed demo:** `__v = 35`

---

## 1. Regla financiera corregida

La factura emitida a una aseguradora **sí genera una CxC de comisiones**. La corrección es separar estado financiero de recaudo real:

- **Pago de póliza por cliente:** afecta recibos, cartera, producción recaudada y comisión estimada. No crea `finmov` como caja/banco de la empresa.
- **Factura de comisión a aseguradora:** crea CxC / ingreso `estado: facturado`.
- **Ingreso real:** solo cuenta como recaudado/caja/banco cuando la factura pase a `estado: recaudado` o se concilie contra banco/caja.
- **Reportes:** deben separar siempre `facturado` vs `recaudado` y no mezclar GTQ/COP.

Implicación para `modules/finanzas.js#facturaAseg`: no es error crear CxC; los pendientes son idempotencia, correlativo, anulación, auditoría, enlace a statement/planilla, enlace a banco/recaudo y estado `facturado → recaudado`.

---

## 2. Corrección de auditoría

La revisión anterior comparó el ZIP v1.88 solo contra el ZIP del 2026-07-02. Esa comparación muestra 6 archivos cambiados, pero no mide el avance acumulado. Desde ahora, cada auditoría debe comparar contra:

1. ZIP inmediatamente anterior.
2. V99/V89 o última base empalmada con backend.
3. Pendientes acumulados para Claude.

Comparativa acumulada registrada:

| Base | Agregados | Eliminados | Modificados | Lectura |
|---|---:|---:|---:|---|
| V89 → v1.88 | 10 | 1 | 44 | Cambio grande acumulado. |
| V99 → v1.88 | 4 | 1 | 36 | Cambio grande frente a base backend/prototipo. |
| 2026-07-01 → v1.88 | 3 | 0 | 27 | Cambio amplio por módulos. |
| 2026-07-02 → v1.88 | 0 | 0 | 6 | Salto corto, pero importante. |

---

## 3. Mejoras v1.80–v1.88 a preservar

- **v1.80 Finanzas profundo:** metas, real vs ideal, semáforos, sugerencia inteligente y dashboard más analítico.
- **v1.81 Presupuesto:** fecha de pago, estado pagado/atrasado/en tiempo.
- **v1.82 Insights:** alerta por concentración de aseguradora ≥35%.
- **v1.83 Regla:** recaudo de póliza no crea `finmov`.
- **v1.84 Comisiones:** conciliación de statements/planillas.
- **v1.85 Academia:** visor unificado con `lessonBody`.
- **v1.86 Finanzas/Academia:** facturas a aseguradoras + visor confirmado.
- **v1.87 Config:** `tenant.paisesCfg` como fuente fiscal multi-tenant.
- **v1.88 Academia:** Marketing y Portal profundizados; seed `__v=35`.

Detalle complementario: `docs/CHANGELOG-V188-CONTINUIDAD.md`.

---

## 4. Estado backend LAB

El backend LAB **no se reinicia**.

Validado previamente:

- Firebase/Auth LAB.
- Tenant `alianzas-soluciones`.
- `Orbit.store` LAB con API completa.
- CRUD ficticio controlado en `actividades`.
- `contractOk true`.
- Sin deploy, sin Hosting, sin producción, sin secretos.

Archivos backend que deben preservarse al empalmar v1.88:

- `core/backend-lab-loader.js`
- `core/backend-lab-init.js`
- `data/store-firestore-lab.local.js`
- `core/auth-firebase.config.local.js`

El ZIP Claude v1.88 no contiene esos archivos; no debe descomprimirse sobre la rama backend sin protección.

---

## 5. Pendientes P0

1. Actualizar `CHANGELOG.md` principal o consolidar entrada v1.88 que remita a `docs/BITACORA-CAMBIOS.md` y `docs/CHANGELOG-V188-CONTINUIDAD.md`.
2. Documentar regla financiera corregida en bitácoras y pendientes.
3. Eliminar `localStorage` directo de `index.html` y `modules/configuracion.js`; usar `Orbit.store`, `Orbit.tenant`, `pref/setPref` o helper core.
4. Completar control operativo de facturas a aseguradoras.
5. Confirmar seed 100% ficticio y sin datos reales.
6. No mostrar notas técnicas en UI cliente.
7. No hardcodear A&S: todo por tenant/configuración/backend.

---

## 6. Plan fijo de migración de información A&S

### Fase 1 — Tenant A&S
Logo, paleta, Guatemala por defecto, Colombia adicional, IVA GT 12%, IVA CO 19%, aseguradoras, usuarios, roles, glosario, planes/tarifas e integraciones.

### Fase 2 — Catálogos base
Aseguradoras GT/CO, contactos, accesos, plataformas, datos fiscales, facturación, Drive y parámetros de cotizador/comparativo.

### Fase 3 — Operación
Clientes, pólizas, vehículos, recibos/cobros, estados de cuenta, planillas de comisiones, histórico financiero, banco/caja, siniestros y calendario de contenidos.

### Fase 4 — Validación end-to-end
Validar mínimo 5 clientes completos: cliente, póliza, vehículo, recibos, pago, comisión, factura/CxC, recaudación, Cliente360, cartera, moneda correcta y cero datos ficticios en tenant real.

---

## 7. Paso inmediato ChatGPT/Codex

1. Tomar v1.88 como prototipo vigente.
2. Empalmarlo con `ays/backend-tenant-lab-v99-20260703` sin borrar backend LAB.
3. Reinsertar hooks LAB en `index.html v1287`.
4. Corregir preferencias sin `localStorage` directo.
5. Documentar cambios y smoke demo + LAB.
6. Solo después iniciar migración controlada de información real de Alianzas.
