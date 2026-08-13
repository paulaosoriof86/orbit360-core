# Auditoría forense — candidato Claude 2026-07-04T202655.833

**Fecha auditoría:** 2026-07-04  
**Candidato auditado:** `Prototype Development Request - 2026-07-04T202655.833.zip`  
**Base comparada:** `Prototype Development Request - 2026-07-04T193658.630.zip`  
**Proyecto:** Orbit 360 A&S  
**Rama backend activa:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy.

---

## 0. Clasificación

El ZIP auditado sí corresponde a Orbit 360 A&S. Raíz detectada:

```txt
orbit360-platform/
```

---

## 1. Inventario y validación

- Archivos totales: **97**.
- JS totales: **54**.
- Módulos `modules/*.js`: **30**.
- Scripts cargados en `index.html`: **51**.
- Todos los módulos están cargados por `index.html`.
- Todos los módulos declaran `Orbit.modules.<modulo>`.
- `node --check` sobre los 54 JS: **0 errores sintácticos**.

Contra `193658.630`:

- Archivos agregados: **0**.
- Archivos removidos: **0**.
- Archivos modificados: **15**.

Archivos modificados:

```txt
CHANGELOG.md
core/comisiones-eng.js
core/queries.js
data/academia-plus.js
docs/BITACORA-CAMBIOS.md
docs/PENDIENTES-Y-MEJORAS.md
docs/REPORTE-SMOKE.md
index.html
modules/cobros.js
modules/comisiones.js
modules/leads.js
modules/polizas.js
modules/portal.js
modules/renovaciones.js
modules/siniestros.js
```

---

## 2. Backend protegido

El ZIP no trae backend LAB protegido:

```txt
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
firestore.rules
```

`data/store.js` está presente y no cambió contra la candidata anterior, pero no debe pisar la rama backend activa. No empalmar ZIP completo.

---

## 3. Qué atendió Claude

### 3.1 Academia — avance real

`data/academia-plus.js` sube `CONTENT_V` de 3 a 4 y agrega 8 lecciones “Paso a paso” adicionales. Conteo auditado:

```txt
Antes: CONTENT_V=3 · 71 lecciones · 5 lecciones Paso a paso.
Ahora: CONTENT_V=4 · 79 lecciones · 13 lecciones Paso a paso.
```

Nuevas lecciones detectadas:

- Insights: leer Insights y actuar.
- Técnico avanzado: aplicar criterio técnico en la venta.
- Siniestros: acompañar un siniestro en Orbit.
- Venta consultiva: entrevista de venta consultiva.
- Liderazgo: semana del líder comercial.
- Cumplimiento: KYC y datos en la práctica.
- Servicio/CX: cuidar momentos clave.
- Digital/IA: apalancarte en la tecnología.

Pendiente Academia: agregar lección/evaluación sobre `dryRunReport -> score -> propuestas conciliaciones -> validación -> aplicación controlada`; profundizar paso a paso por ramos/productos si se quiere cerrar el addendum profundo.

### 3.2 Moneda por país

Claude corrigió displays fijos en Leads, Renovaciones, Siniestros y Portal. Las llamadas `U.money/U.moneyShort(... 'GTQ')` bajan de 19 a 13.

Quedan usos con fallback GTQ que deben clasificarse/corregirse:

```txt
core/crmkit.js
core/importa.js
modules/cancelaciones.js
modules/cliente360.js
modules/configuracion.js
modules/finanzas.js
modules/ia.js
modules/insights.js
modules/notificaciones.js
modules/siniestros.js
```

No cerrar P0-02 como absoluto hasta clasificar estos usos.

### 3.3 Pólizas

Sí agregó:

- filtro con `Anulada`, `Rechazada`, `Requiere validación`;
- KPI `Histórico / sin cartera`;
- `core/queries.js` limita renovaciones próximas a `Vigente` o `Por renovar`;
- botón `Desglose` en tabla de pólizas;
- drawer con prima neta, gastos, IVA/impuestos, prima total, recibos, fuente y estado de validación.

Bug detectado: el drawer calcula gastos con `p.gastosFinancieros`, pero el modelo canónico usa `p.gastosFinan`. Debe corregirse.

### 3.4 Cobros / Portal / Cliente360

Claude agregó en Cobros:

- filtro ampliado;
- `estadoValidacion()`;
- `badgeValidacion()`;
- badge de Reportado/En revisión/Conciliado/Requiere validación/Bloqueado.

Pero queda incompleto:

- Cliente360 no fue actualizado con el mismo modelo de estados.
- El botón “Validar” en Cobros llama `aplicarPago()`.
- El modal sigue diciendo “Aplicar pago” y al confirmar actualiza `estado:'Pagado'`.
- No existe flujo separado `Reportado -> En revisión -> Validado/Rechazado -> Aplicado/Conciliado`.

No cerrar P0-05.

### 3.5 Score de conciliación

Claude agregó en Comisiones:

- `scoreConciliacion(r)`;
- `scoreBadge(r)`;
- columna “Conciliación”.

Esto es avance visual, pero queda parcial:

- no usa el score backend real;
- no lee `dryRunReport` ni propuestas `conciliaciones`;
- no aparece en Importar ni Cobros;
- no hay acción propuesta ni estado de bandeja.

### 3.6 Planillas de comisión

Claude agregó `periodo`, `retencion`, `ajuste`, `aseguradoraId`, `asesorId` en `core/comisiones-eng.js` y columnas en `modules/comisiones.js`.

Pendiente: no existe todavía el flujo visual completo:

```txt
archivo/hoja/fila/bloque/periodo -> esperada/pagada/retención/ajuste -> score -> propuesta -> validación -> impacto pendiente/no aplicado
```

---

## 4. Documentación

`docs/BITACORA-CAMBIOS.md` sí documenta v1.127–v1.133.

Pero quedan desalineados:

- `CHANGELOG.md` solo agrega v1.126, no v1.127–v1.133.
- `docs/PENDIENTES-Y-MEJORAS.md` inicia con candidata `193658.630`, `CONTENT_V=3` y P0-03 a P0-08 abiertos aunque el propio archivo contiene luego cambios v1.127–v1.133.
- `docs/REPORTE-SMOKE.md` inicia como v1.126 y no registra smoke de v1.127–v1.133.
- `README.md` no se actualizó.

---

## 5. Riesgos nuevos

1. **Cobros:** “Validar” puede aplicar pago directamente.
2. **Pólizas:** campo `gastosFinancieros` rompe/omite gastos financieros canónicos.
3. **Score:** es heurístico visual, no backend/dry-run/propuestas.
4. **Docs:** se afirma “todos los P0 cerrados”, pero P0-02, P0-05, P0-06 y P0-07 siguen parciales.
5. **Academia:** falta score/dry-run/conciliaciones y más producto-por-ramo.

---

## 6. Decisión

Aceptar `202655.833` como candidata de avance real, pero no declararla base final ni “P0 cerrado total” hasta que Claude haga corrección incremental. La próxima candidata debe compararse contra `202655.833`.