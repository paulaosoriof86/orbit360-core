# Auditoría forense — candidato Claude Orbit 360 A&S 2026-07-04T211525.464

**Fecha auditoría:** 2026-07-04  
**Candidato auditado:** `Prototype Development Request - 2026-07-04T211525.464.zip`  
**Base comparada:** `Prototype Development Request - 2026-07-04T205210.456.zip`  
**Proyecto:** Orbit 360 A&S  
**Repo/rama backend de continuidad:** `paulaosoriof86/orbit360-core` · `ays/backend-tenant-lab-v99-20260703`  
**PR vigente:** #5 draft, sin merge, sin deploy.  
**Decisión de auditoría:** avance incremental real; aceptable como siguiente candidata de frontend **solo con pendientes documentales y de integración aún abiertos**.

---

## 0. Clasificación obligatoria del ZIP

El ZIP auditado **sí corresponde a Orbit 360 A&S**.

Raíz detectada:

```txt
orbit360-platform/
```

No corresponde a Finanzas Paula, CXOrbia, TyA, Orbia ni otro proyecto. Por tanto, sí procede la auditoría contra la base Orbit anterior `205210.456`.

---

## 1. Inventario técnico real

Inventario de `211525.464`:

```txt
Archivos totales: 97
JS totales: 54
Módulos modules/*.js: 30
Scripts cargados por index.html: 51
Scripts faltantes en index.html: 0
Módulos no cargados: 0
Módulos sin declaración Orbit.modules.<modulo>: 0
node --check sobre 54 JS: 0 errores sintácticos
```

Comparación contra `205210.456`:

```txt
Archivos agregados: 0
Archivos removidos: 0
Archivos modificados: 6
```

Archivos modificados:

```txt
CHANGELOG.md
core/importa.js
docs/BITACORA-CAMBIOS.md
index.html
modules/cliente360.js
modules/cobros.js
```

Observación importante: el candidato **no modificó** `data/academia-plus.js`, `modules/polizas.js` ni `modules/configuracion.js`. Esos avances se conservaron desde `205210.456`, pero no fueron nuevos en esta entrega.

---

## 2. Backend protegido

No se observan cambios en backend protegido:

```txt
data/store.js                    presente, sin cambios contra 205210.456
data/store-firestore-lab.local.js no incluido en ZIP
core/backend-lab-loader.js        no incluido en ZIP
core/backend-lab-init.js          no incluido en ZIP
core/backend-lab-security-guard.js no incluido en ZIP
firestore.rules                   no incluido en ZIP
```

Herramientas backend protegidas del repo no vienen en este ZIP; no se detectó intento de pisarlas.

**Decisión:** no empalmar ZIP completo de forma bruta. Si se empalma, debe ser aditivo y respetar la rama backend protegida.

---

## 3. Cambios confirmados por archivo

### 3.1 `core/importa.js`

Cambios reales:

1. `applyConciliacion(kind)` ya no actualiza `cobros` como `Pagado` ni llama `Orbit.q.postRecaudo`.
2. Para `noAplicados`, ahora busca el cobro y escribe una marca:

```js
conciliacionPropuesta: {
  fuente: kind,
  monto: r.monto,
  fecha: ...,
  estado: 'REQUIERE_VALIDACION'
}
```

3. El mensaje del importador cambió de “pagos aplicados” a:

```txt
referencias creadas · propuestas para revisión (pendiente de validación · no impacta cobros hasta aprobación)
```

4. `planillaFlujo()` ya no usa `cur || 'GTQ'` dentro de esa función.
5. Si falta moneda, muestra “moneda requerida” y fuerza `REQUIERE_VALIDACION`.
6. El score visual de planilla usa etiquetas backend-compatibles:

```txt
MATCH_EXACTO
MATCH_PROBABLE
REQUIERE_VALIDACION
BLOQUEADO
```

Pendientes detectados dentro del mismo archivo:

- `applyConciliacion()` todavía modifica el registro de `cobros` al guardar `conciliacionPropuesta`; esto ya no aplica pago, pero todavía no usa colección/bandeja separada `conciliaciones`.
- `noCreados` todavía se insertan en la colección del importador (`IMPORT_MAP[kind].coll`) como referencias importadas. Debe validarse si para producción conviene que esas referencias entren a `conciliaciones`/`parchesPendientes` antes de tocar colecciones operativas.
- El copy de `KINDS['estados-cuenta'].desc` todavía dice “permite aplicar pagos por póliza”. Debe cambiarse a “propone pagos para validación” o equivalente.
- En la tabla de planilla, el estado válido aún muestra “Pendiente de aplicar”; sería más seguro cambiarlo a “Propuesta pendiente” / “Pendiente de validación”.

### 3.2 `modules/cobros.js`

Cambios reales:

1. `estadoValidacion(c)` ahora reconoce:

```txt
Validada (por aplicar)
```

cuando `c.validadoReporte` está activo y el recibo sigue `Pendiente` o `Vencido`.

2. `badgeValidacion(c)` da tono OK a “Validada (por aplicar)”.
3. En la tabla, si el cobro ya está `validadoReporte`, deja de mostrar “Validar” y pasa a mostrar la acción de pago separada.
4. El modal `validarReporte()` cambió el botón final de:

```txt
✓ Validar y aplicar pago
```

a:

```txt
✓ Validar reporte
```

5. Al confirmar, ya no llama `aplicarPago(cobroId)`. Ahora actualiza:

```js
{ validadoReporte: true, enRevision: false }
```

y muestra mensaje de que el reporte quedó validado y ahora se puede aplicar el pago.

**Estado:** P0-3 cerrado en Cobros a nivel prototipo: validar ya no equivale a aplicar.

Pendiente menor:

- Integrar esta lógica con futura bandeja `conciliaciones` y auditLog backend real.
- Confirmar visualmente que el detalle individual del recibo también refleja `validadoReporte` de forma consistente. La tabla sí lo hace.

### 3.3 `modules/cliente360.js`

Cambios reales:

1. `cobBadge(c)` muestra “Validada (por aplicar)” cuando corresponde.
2. En recibos, si está reportado pero no validado, muestra “Validar”.
3. Si ya está validado y sigue pendiente/vencido, muestra “Aplicar pago”.
4. El botón “Validar” invoca `Orbit.modules.cobros.validarReporte()`.

**Estado:** P0-3 cerrado en Cliente360 a nivel prototipo, dependiente del módulo Cobros.

Pendiente menor:

- El copy inferior de recibos aún dice “Aplicar pago concilia el recibo con su póliza”; no es falso cuando se aplica, pero podría aclarar que “Validar reporte no aplica pago”.

### 3.4 `index.html`

Solo actualiza cache-bust:

```txt
core/importa.js?v1321
modules/cliente360.js?v1322
modules/cobros.js?v1322
```

No cambió estructura, rutas ni scripts cargados. Validación de scripts: 51 scripts cargados, 0 faltantes.

### 3.5 `CHANGELOG.md`

Agrega entrada `1.139.0` con:

- candidata activa `205210.456`;
- base comparada `202655.833`;
- P0-2, P0-3, P0-4, P0-5;
- pendiente de persistencia/UI de conciliaciones backend.

Pendiente crítico: para esta nueva entrega, el documento debería indicar que el ZIP auditado/entregado es `211525.464`, no quedarse solo en `205210.456`.

### 3.6 `docs/BITACORA-CAMBIOS.md`

Agrega v1.139 con detalle útil:

- P0-2 cerrado: conciliación no aplica pagos directo;
- P0-3 cerrado en Cobros+Cliente360;
- P0-4 cerrado: planilla sin fallback GTQ;
- P0-1 docs alineadas;
- P0-5 moneda residual clasificada;
- pendiente honesto: persistencia real de conciliaciones y conexión UI con bandeja backend.

Pendientes detectados:

- Dice que P0-1 docs quedaron alineadas con `CHANGELOG/PENDIENTES/SMOKE`, pero `docs/PENDIENTES-Y-MEJORAS.md` y `docs/REPORTE-SMOKE.md` no cambiaron y siguen viejos.
- También `README.md` no cambió.
- La bitácora v1.139 sigue nombrando candidata activa `205210.456`, no `211525.464`.

---

## 4. P0 del paquete anterior: estado real después de `211525.464`

### P0-1 — Documentación global alineada

**Estado:** parcial / no cerrado.

Sí mejoró:

```txt
CHANGELOG.md
docs/BITACORA-CAMBIOS.md
```

No se actualizó:

```txt
README.md
docs/PENDIENTES-Y-MEJORAS.md
docs/REPORTE-SMOKE.md
```

Hallazgos concretos:

- `docs/PENDIENTES-Y-MEJORAS.md` sigue encabezado como candidata activa `2026-07-04T193658.630`, base `v1.117`, Academia `CONTENT_V=3`.
- `docs/REPORTE-SMOKE.md` sigue encabezado como candidata activa `193658.630` / v1.126 y `CONTENT_V=3`.
- `README.md` no refleja `202655.833`, `205210.456` ni `211525.464`.
- `CHANGELOG.md` y `BITACORA-CAMBIOS.md` sí agregan v1.139, pero hablan de candidata activa `205210.456`; para trazabilidad del ZIP final debe quedar claro que el candidato auditado es `211525.464`.

**Decisión:** mantener abierto. Es prioritario porque documentación vieja genera reproceso.

### P0-2 — Importador: prohibir aplicación directa en conciliación

**Estado:** cerrado para “no aplicar pago directo”; parcial para arquitectura final de bandeja.

Cerrado:

- Ya no se actualiza `estado:'Pagado'` desde `applyConciliacion()`.
- Ya no se llama `postRecaudo` desde ese flujo.
- Ya no dice “pagos aplicados” en el mensaje final.
- Ahora deja una `conciliacionPropuesta` con estado `REQUIERE_VALIDACION`.

Parcial:

- La propuesta se guarda como campo dentro de `cobros`, no como registro separado en `conciliaciones`.
- `noCreados` todavía se insertan como referencias dentro de la colección del importador.
- El copy de `estados-cuenta` todavía dice “permite aplicar pagos por póliza”.
- No existe UI real de bandeja `conciliaciones`.

**Decisión:** aceptar como avance fuerte; no declarar cierre backend final.

### P0-3 — Cobros: separar validado de aplicado

**Estado:** cerrado en Cobros + Cliente360 a nivel prototipo.

Cerrado:

- “Validar reporte” ya no aplica pago.
- Se crea estado `validadoReporte:true`.
- La tabla muestra “Validada (por aplicar)”.
- Después de validar aparece acción separada “Pagar” / “Aplicar pago”.
- Cliente360 refleja el mismo estado y cambia la acción.

Pendiente:

- Portal no fue modificado en este candidato, aunque desde auditorías anteriores ya reportaba pago como pendiente de validación. Conviene dejarlo documentado en smoke real.
- Futura integración con auditLog/backend.

### P0-4 — Planilla de comisión sin fallback GTQ

**Estado:** cerrado dentro de `planillaFlujo()`; queda copy menor.

Cerrado:

- `planillaFlujo()` ya no usa `cur || 'GTQ'`.
- Si falta moneda, muestra “moneda requerida”.
- Si falta moneda, score `REQUIERE_VALIDACION`.
- Labels compatibles con backend.

Pendiente menor:

- Estado “Pendiente de aplicar” debería cambiar a “Propuesta pendiente” o “Pendiente de validación” para no contradecir el enfoque propuesta ≠ aplicación.

### P0-5 — Moneda residual: clasificar, no pretender cerrar todo

**Estado:** parcial documental.

La bitácora clasifica residuos de moneda y afirma que algunos son válidos por diseño. Sin embargo:

- `README.md`, `PENDIENTES-Y-MEJORAS.md` y `REPORTE-SMOKE.md` no reflejan esa clasificación.
- Persisten ocurrencias `GTQ` en varios módulos; algunas pueden ser válidas por diseño, pero deben quedar documentadas de forma consistente.

**Decisión:** no bloquear por esto, pero no marcar como cerrado absoluto hasta alinear docs.

---

## 5. Academia

`data/academia-plus.js` no cambió en `211525.464`, pero conserva el avance de `205210.456`:

```txt
CONTENT_V=5
Lección: Conciliación: score, propuesta y validación
```

Estado:

- Conciliación ya está cubierta en Academia.
- Falta profundización por ramos/productos si se quiere cerrar el addendum profundo:

```txt
Vida
Gastos médicos
Hogar
Fianzas
Responsabilidad Civil
Transporte/Carga
```

Con poca capacidad de Claude, esto puede quedar como pendiente documentado, no como reproceso inmediato.

---

## 6. Portal

`modules/portal.js` no cambió. La revisión estática confirma que el Portal sigue:

- permitiendo reportar pago;
- creando actividad “Pago reportado por el cliente”;
- generando gestión “Validar pago reportado”;
- mostrando mensaje “el equipo lo validará”.

No muestra pago reportado como aplicado. Sin embargo, no incorpora explícitamente el nuevo estado `validadoReporte`. Debe verificarse en smoke visual si se quiere que el cliente vea “validado por aplicar” o si ese estado es solo interno.

---

## 7. Riesgos persistentes

1. **Documentación vieja:** `PENDIENTES-Y-MEJORAS.md` y `REPORTE-SMOKE.md` siguen apuntando a `193658.630` y `CONTENT_V=3`.
2. **Trazabilidad del candidato:** `CHANGELOG.md` y `BITACORA-CAMBIOS.md` documentan v1.139 sobre `205210.456`, pero el ZIP auditado es `211525.464`.
3. **Bandeja `conciliaciones`:** sigue sin UI/persistencia real en el prototipo de Claude; solo hay `conciliacionPropuesta` dentro de `cobros`.
4. **Copy residual:** `estados-cuenta` todavía dice “permite aplicar pagos por póliza”; planilla muestra “Pendiente de aplicar”.
5. **No empalmar ZIP completo:** aunque no tocó backend protegido, el ZIP trae `data/store.js`; el empalme debe preservar el backend de la rama.

---

## 8. Decisión final de auditoría

`211525.464` es un avance real y corrige lo más crítico del flujo:

- ya no aplica pago al validar reporte;
- `applyConciliacion()` ya no marca cobros como pagados;
- planilla ya no cae a GTQ si falta moneda;
- score visual usa etiquetas backend-compatible.

Pero no está cerrado como candidato final por documentación incompleta y falta de alineación con la bandeja `conciliaciones`.

**Base recomendada para siguiente revisión:**

```txt
Prototype Development Request - 2026-07-04T211525.464.zip
```

**Siguiente instrucción si Claude aún tiene capacidad:** corregir solo documentación global y copy residual, no reescribir módulos.
