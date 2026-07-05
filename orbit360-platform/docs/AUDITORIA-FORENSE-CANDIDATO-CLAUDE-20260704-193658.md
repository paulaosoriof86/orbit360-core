# Auditoría forense — candidato Claude 2026-07-04T193658.630

**Fecha de auditoría:** 2026-07-04  
**Candidato auditado:** `Prototype Development Request - 2026-07-04T193658.630.zip`  
**Base comparada:** `Prototype Development Request - 2026-07-04T152321.882.zip`  
**Proyecto:** Orbit 360 A&S  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama backend activa:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Método:** extracción de ZIP real, inventario, comparación contra candidata anterior, validación sintáctica JS, revisión focal de archivos modificados, moneda, Academia, documentación y backend protegido.

---

## 1. Veredicto ejecutivo

El candidato `193658.630` sí debe aceptarse como nueva base frontend/prototipo auditada, pero no como empalme automático completo.

Aporta avances reales:

- Academia v1.125 con lecciones “Paso a paso”.
- `CONTENT_V = 3` para re-sincronizar contenido preservando progreso/certificado.
- Corrección parcial importante de displays con moneda fija GTQ.
- Cache-bust actualizado para módulos cambiados.
- Mantiene estructura de 30 módulos y 54 JS sin errores sintácticos.

Sigue pendiente:

- documentación/versionado completo;
- cerrar moneda por país en módulos restantes;
- desglose visible de pólizas;
- estados Portal/Cliente360/Cobros;
- score de conciliación en UI;
- planillas de comisión con flujo visual completo;
- smoke visual actualizado por GT/CO/TODOS.

---

## 2. Inventario real

- Archivos totales: **97**.
- JS totales: **54**.
- Módulos en `modules/`: **30**.
- Scripts cargados desde `index.html`: **51**.
- Todos los `modules/*.js` están cargados por `index.html`.
- Todos los módulos declaran `Orbit.modules.<modulo>`.
- Validación `node --check` sobre los 54 JS: **0 errores sintácticos**.

---

## 3. Comparación contra candidata anterior

Contra `Prototype Development Request - 2026-07-04T152321.882.zip`:

- Archivos agregados: **0**.
- Archivos removidos: **0**.
- Archivos modificados: **13**.

Archivos modificados:

```txt
orbit360-platform/data/academia-plus.js
orbit360-platform/docs/BITACORA-CAMBIOS.md
orbit360-platform/index.html
orbit360-platform/modules/cancelaciones.js
orbit360-platform/modules/cliente360.js
orbit360-platform/modules/cobros.js
orbit360-platform/modules/comisiones.js
orbit360-platform/modules/equipo.js
orbit360-platform/modules/finanzas.js
orbit360-platform/modules/inicio.js
orbit360-platform/modules/insights.js
orbit360-platform/modules/polizas.js
orbit360-platform/modules/reportes.js
```

---

## 4. Backend protegido

El ZIP nuevo no trae:

```txt
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
firestore.rules
```

Sí trae `data/store.js` de prototipo, igual al ZIP anterior.

Conclusión: no empalmar ZIP completo. ChatGPT/Codex debe conservar `data/store.js` y backend LAB de la rama activa.

---

## 5. Mejoras reales

### 5.1 Academia v1.125

`data/academia-plus.js` agrega lecciones “Paso a paso” para:

- Orbit Clientes;
- Pólizas y Cobros;
- Ops + Leads;
- Finanzas;
- Importador.

También agrega `CONTENT_V = 3` y `apply()` ahora puede actualizar contenido conservando `progreso` y `certificado`.

### 5.2 Moneda por país

Se redujeron displays de `U.money/U.moneyShort` con GTQ fijo en módulos:

- antes: 69;
- ahora: 17;
- mejora aproximada: 52 ocurrencias removidas.

Esto es avance real, pero no cierre total.

### 5.3 Cache-bust

`index.html` actualiza cache-bust para Academia y módulos modificados:

```txt
data/academia-plus.js?v1314
modules/inicio.js?v1313
modules/cliente360.js?v1313
modules/polizas.js?v1313
modules/cobros.js?v1313
modules/cancelaciones.js?v1313
modules/comisiones.js?v1313
modules/insights.js?v1313
modules/equipo.js?v1313
modules/reportes.js?v1313
modules/finanzas.js?v1313
```

---

## 6. Pendientes que siguen abiertos

### P0-01 — Documentación/versionado

Solo se actualizó `docs/BITACORA-CAMBIOS.md`.

Siguen desalineados:

```txt
CHANGELOG.md
README.md
docs/PENDIENTES-Y-MEJORAS.md
docs/REPORTE-SMOKE.md
```

`docs/PENDIENTES-Y-MEJORAS.md` todavía dice candidato v1.114 y `docs/REPORTE-SMOKE.md` todavía dice v1.117 congelada.

### P0-02 — Moneda por país

Quedan 17 llamadas visibles con `U.money/U.moneyShort` y `GTQ` fijo/fallback en módulos. Deben revisarse en:

```txt
cancelaciones.js
cliente360.js
configuracion.js
finanzas.js
ia.js
insights.js
leads.js
notificaciones.js
portal.js
renovaciones.js
siniestros.js
```

Casos críticos:

- Leads: Prima estimada y pronóstico ponderado siguen en GTQ.
- Renovaciones: Prima en juego sigue en GTQ.
- Siniestros: Indemnización pagada sigue en GTQ.
- Portal: Monto reclamado sigue en GTQ.
- Configuración: metaPrima sigue en GTQ.
- Finanzas: lote de pagos conserva partidas con `cur: 'GTQ'`.

### P0-03 — Pólizas

`modules/polizas.js` solo cambia KPI moneda. Sigue sin mostrar en lista/detalle:

```txt
prima neta
gastos
IVA/impuestos
prima total
recibos generados
fuente de importación
estado de validación
```

### P0-04 — Estados históricos

No se observa cierre completo para `Anulada` y `Rechazada` en filtros/vistas.

### P0-05 — Portal/Cliente360/Cobros

No se observa cierre de estados visuales:

```txt
Reportado por cliente
En revisión
Pagado
Conciliado
Requiere validación
Bloqueado
```

### P0-06 — Score de conciliación

ChatGPT/Codex agregó score backend seguro, pero Claude aún debe reflejarlo visualmente:

```txt
MATCH_EXACTO
MATCH_PROBABLE
REQUIERE_VALIDACION
BLOQUEADO
```

### P0-07 — Planillas de comisión

Falta flujo visual completo:

```txt
fila real → score → propuesta → validación → impacto en cobros/comisiones/liquidaciones
```

---

## 7. Riesgos

1. **Documentación incompleta:** bitácora avanza a v1.125 pero el resto de docs no.
2. **Moneda parcialmente resuelta:** `Orbit.q.monedaPais()` mejora display, pero debe validarse en GT, CO y TODOS.
3. **Vista global mixta:** si se normaliza a GTQ debe decirlo; si no, separar por país.
4. **Empalme:** el ZIP conserva `data/store.js` de prototipo; no debe pisar el backend activo.
5. **Academia:** `CONTENT_V` sirve en prototipo, pero backend real debe persistir progreso por usuario/tenant.

---

## 8. Decisión

Aceptar `193658.630` como nueva base frontend/prototipo auditada.

No empalmar como ZIP completo. Requiere siguiente corrección Claude antes de empalme final.
