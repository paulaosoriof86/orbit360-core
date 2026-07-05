# Auditoría forense — candidato Claude 2026-07-04T205210.456

**Fecha auditoría:** 2026-07-04  
**Candidato auditado:** `Prototype Development Request - 2026-07-04T205210.456.zip`  
**Base comparada:** `Prototype Development Request - 2026-07-04T202655.833.zip`  
**Proyecto:** Orbit 360 A&S  
**Rama backend activa:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy.

---

## 0. Clasificación obligatoria

El ZIP auditado sí corresponde a Orbit 360 A&S.

Raíz detectada:

```txt
orbit360-platform/
```

No corresponde a Finanzas Paula ni a CXOrbia/TyA.

---

## 1. Inventario y validación técnica

- Archivos totales: **97**.
- JS totales: **54**.
- Módulos `modules/*.js`: **30**.
- Scripts cargados en `index.html`: **51**.
- Scripts faltantes en `index.html`: **0**.
- Módulos no cargados: **0**.
- Módulos sin declaración `Orbit.modules.<modulo>`: **0**.
- `node --check` sobre 54 JS: **0 errores sintácticos**.

Comparado contra `202655.833`:

- Archivos agregados: **0**.
- Archivos removidos: **0**.
- Archivos modificados: **8**.

Archivos modificados:

```txt
core/importa.js
data/academia-plus.js
docs/BITACORA-CAMBIOS.md
index.html
modules/cliente360.js
modules/cobros.js
modules/configuracion.js
modules/polizas.js
```

---

## 2. Backend protegido

No se observan cambios en los archivos backend protegidos. `data/store.js` no cambió contra `202655.833`. El ZIP no incluye backend LAB protegido nuevo.

Mantener restricción:

```txt
No empalmar ZIP completo.
No pisar data/store.js.
No tocar store-firestore-lab.local.js, backend-lab-*, firestore.rules ni tools/orbit360-* backend.
```

---

## 3. Qué mejoró Claude en este candidato

### 3.1 Pólizas — `gastosFinan` corregido

Corregido el bug detectado en `202655.833`: `modules/polizas.js` ya no usa `p.gastosFinancieros`; ahora usa `p.gastosFinan` en el desglose.

**Estado:** cerrado.

### 3.2 Cobros — `validarReporte()` separado de `aplicarPago()` en primera acción

En `modules/cobros.js`:

- El botón **Validar** ya no llama directamente a `aplicarPago()` desde la tabla.
- Ahora llama a `validarReporte()`.
- Se agregó modal con tres caminos:
  - marcar en revisión;
  - rechazar reporte;
  - validar y aplicar pago.
- El módulo exporta `validarReporte`.

**Estado:** avance real, pero todavía parcial porque sigue existiendo el botón final `✓ Validar y aplicar pago`, que une validación y aplicación en la misma acción final. Falta estado intermedio `Validado` / `Aprobado para aplicar` sin aplicar pago.

### 3.3 Cliente360 — estados de cobros reflejados

En `modules/cliente360.js`:

- Se agregó `cobBadge(c)`.
- Las tablas de cobros/recibos usan badge de Reportado, En revisión, Vencido, Pagado/Conciliado.
- En recibos de póliza, si el cobro está reportado, aparece botón **Validar** que invoca `Orbit.modules.cobros.validarReporte()`.

**Estado:** avance real, pero parcial porque depende del mismo flujo de `validarReporte()` que todavía puede aplicar pago en el último botón.

### 3.4 Planillas de comisión — flujo visual agregado

En `core/importa.js` se agregó `planillaFlujo()` para `planillas-comision`.

La vista muestra:

```txt
fila
aseguradora
periodo
comisión esperada
comisión pagada
diferencia
retención
ajuste
score
acción propuesta
estado
```

Incluye copy importante: ninguna fila impacta cobros/comisiones/liquidaciones hasta que un usuario la valide.

**Estado:** avance real, pero parcial: es visual/heurístico. No usa todavía el contrato backend `dryRunReport -> score -> propuestas conciliaciones -> plan persistencia`. También contiene fallback `cur || 'GTQ'` que contradice la regla de no asumir moneda si falta.

### 3.5 Configuración — una corrección de moneda

En `modules/configuracion.js`, `metaPrima` ya no usa GTQ fijo; usa país del asesor o `Orbit.q.monedaPais()`.

**Estado:** avance puntual correcto.

### 3.6 Academia — nueva lección de conciliación

`data/academia-plus.js` sube a:

```txt
CONTENT_V = 5
```

Se agregó la lección:

```txt
Conciliación: score, propuesta y validación
```

Cubre:

- conciliación como propuesta, no aplicación;
- score de coincidencia;
- MATCH_EXACTO / MATCH_PROBABLE / REQUIERE_VALIDACIÓN / BLOQUEADO;
- flujo Importar → dry-run → score → propuesta → validación → aplicación controlada.

**Estado:** avance real. Falta todavía profundización por ramo/producto si se quiere cerrar Academia profunda.

### 3.7 Bitácora

`docs/BITACORA-CAMBIOS.md` documenta v1.134 a v1.138:

- v1.134: flujo de validación de pago + gastos financieros;
- v1.135: auditoría de moneda residual;
- v1.136: Cliente360;
- v1.137: planilla de comisión;
- v1.138: Academia CONTENT_V=5.

**Estado:** avance real, pero documentación global sigue incompleta.

---

## 4. Qué quedó pendiente o parcial

### P0-DOC — Documentación global sigue desalineada

Solo `docs/BITACORA-CAMBIOS.md` se actualizó. No cambiaron contra `202655.833`:

```txt
CHANGELOG.md
README.md
docs/PENDIENTES-Y-MEJORAS.md
docs/REPORTE-SMOKE.md
```

Problemas observados:

- `CHANGELOG.md` sigue con candidata `193658.630` / v1.126.
- `docs/PENDIENTES-Y-MEJORAS.md` sigue diciendo candidata activa `193658.630`, base v1.117, `CONTENT_V=3` y P0 abiertos viejos.
- `docs/REPORTE-SMOKE.md` sigue encabezado como candidata `193658.630` / v1.126 y `CONTENT_V=3`.
- `README.md` no refleja `202655.833` ni `205210.456`.

**Prioridad:** alta, porque Claude tiene poca capacidad y una documentación vieja causa reproceso.

### P0-IMPORTA — `applyConciliacion()` todavía aplica pagos directamente

En `core/importa.js`, `applyConciliacion(kind)` todavía puede:

```txt
Orbit.store.update('cobros', ..., { estado:'Pagado', conciliado:true, metodo:'Conciliación' })
```

Y el mensaje dice:

```txt
pagos aplicados
```

Esto contradice el flujo nuevo backend:

```txt
dryRunReport -> score -> propuesta conciliaciones -> plan persistencia -> revisión -> aplicación controlada
```

**Prioridad:** crítica. Debe cambiar a propuesta/bandeja, no aplicación directa.

### P0-05 — Validación de pago todavía mezcla validación y aplicación final

Aunque el primer clic ya abre `validarReporte()`, el modal conserva:

```txt
✓ Validar y aplicar pago
```

Esto puede estar bien como confirmación explícita, pero no cumple del todo el flujo pedido:

```txt
Reportado -> En revisión -> Validado/Rechazado -> Aplicado/Conciliado
```

Falta un estado intermedio: `validadoReporte` / `aprobadoParaAplicar` / `VALIDADA`, sin aplicar pago todavía.

### P0-07 — Planilla visual sí, contrato backend no conectado

`planillaFlujo()` es un buen avance visual, pero:

- no usa `MATCH_EXACTO`, `MATCH_PROBABLE`, `REQUIERE_VALIDACION`, `BLOQUEADO` como constantes del contrato;
- no muestra `dryRunReport`, `proposal_id`, `queue_state`, `review_state` ni `proposed_action` real;
- no conecta visualmente con `conciliaciones`;
- usa `cur || 'GTQ'`.

### P0-02 — Moneda residual sigue parcial

La candidata solo corrige moneda en Configuración. Quedan usos `GTQ` residuales en:

```txt
core/crmkit.js
core/importa.js
modules/cancelaciones.js
modules/cliente360.js
modules/comparativo.js
modules/finanzas.js
modules/ia.js
modules/insights.js
modules/notificaciones.js
modules/siniestros.js
```

No todos son necesariamente bug, pero deben clasificarse. Lo que no pueda corregirse ahora debe quedar documentado como pendiente, no como cerrado.

### Academia profunda — sigue parcial

Ya agregó la lección de conciliación, pero falta profundizar por ramos/productos:

```txt
Vida
Gastos médicos
Hogar
Fianzas
Responsabilidad Civil
Transporte/Carga
```

Con poca capacidad de Claude, esto puede quedar como pendiente documentado si no cabe en el siguiente candidato.

---

## 5. Riesgos nuevos o persistentes

1. **Importador sigue pudiendo aplicar pagos por conciliación** desde `applyConciliacion()`.
2. **Docs viejas pueden inducir a Claude a trabajar sobre 193658/CONTENT_V=3**, cuando la base real ya es `205210.456` con `CONTENT_V=5`.
3. **`validarReporte()` no crea estado Validado separado**, todavía termina en aplicación si se elige el botón final.
4. **Planilla de comisión usa fallback `GTQ`**, en vez de bloquear/validar si falta moneda.
5. **No se ve aún una bandeja `conciliaciones` real en UI**, solo visuales parciales.

---

## 6. Decisión

Aceptar `202655.833 -> 205210.456` como avance incremental real.

No declararlo base cerrada/final hasta corregir como mínimo:

1. Documentación global alineada.
2. `applyConciliacion()` sin aplicación directa de cobros.
3. `validarReporte()` con estado validado separado o copy/flujo explícitamente separado.
4. `planillaFlujo()` sin fallback GTQ cuando falte moneda.

La próxima candidata debe compararse contra:

```txt
Prototype Development Request - 2026-07-04T205210.456.zip
```
