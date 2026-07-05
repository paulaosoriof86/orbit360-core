# PROMPT PARA CLAUDE — Orbit 360 A&S · cierre quirúrgico con poca capacidad

Claude, trabaja **solo** sobre este candidato:

```txt
Prototype Development Request - 2026-07-04T205210.456.zip
```

No reinicies, no vuelvas a versiones anteriores y no cambies backend protegido. Este ZIP sí es Orbit 360 A&S con raíz:

```txt
orbit360-platform/
```

## Contexto obligatorio

La última auditoría real comparó `205210.456` contra `202655.833` y confirmó:

- 97 archivos.
- 54 JS.
- 30 módulos.
- 51 scripts en `index.html`.
- 0 errores JS.
- 8 archivos modificados.
- `CONTENT_V=5` en Academia.

Ya hiciste avances reales. **No los rehagas**.

## Conserva sin tocar salvo necesidad directa

Conservar:

1. `modules/polizas.js`: fix `gastosFinan`.
2. `modules/cobros.js`: `validarReporte()` y modal de revisión/rechazo.
3. `modules/cliente360.js`: `cobBadge()` y botón Validar conectado a Cobros.
4. `core/importa.js`: `planillaFlujo()` como base visual.
5. `modules/configuracion.js`: meta prima por país/moneda.
6. `data/academia-plus.js`: `CONTENT_V=5` y lección “Conciliación: score, propuesta y validación”.
7. `docs/BITACORA-CAMBIOS.md`: v1.134–v1.138.

## Corrige solo estos P0 para no gastar capacidad

### P0-1 — Documentación global alineada

Actualizar obligatoriamente:

```txt
CHANGELOG.md
README.md
docs/PENDIENTES-Y-MEJORAS.md
docs/REPORTE-SMOKE.md
docs/BITACORA-CAMBIOS.md
```

Debe quedar claro:

```txt
Candidata activa: Prototype Development Request - 2026-07-04T205210.456.zip
Base comparada: Prototype Development Request - 2026-07-04T202655.833.zip
Academia: CONTENT_V=5
Cerrado: gastosFinan en Pólizas
Avance parcial: validarReporte / Cliente360 / planillaFlujo / conciliación visual
Pendiente no cerrado: applyConciliacion no debe aplicar pagos directo; moneda residual clasificada; validación separada de aplicación; conexión UI con conciliaciones backend
```

No escribir “todos los P0 cerrados” si queda alguno parcial.

### P0-2 — Importador: prohibir aplicación directa en conciliación

En `core/importa.js`, revisar `applyConciliacion(kind)`.

Actualmente puede hacer:

```js
Orbit.store.update('cobros', r._aplicaA, { estado:'Pagado', conciliado:true, metodo:'Conciliación' })
```

Esto debe cambiar.

Resultado esperado:

- La conciliación desde importador debe crear o mostrar **propuestas**, no aplicar pagos.
- No usar copy “pagos aplicados”.
- Usar copy tipo:

```txt
Propuestas generadas para revisión
Pendiente de validación
No impacta cobros hasta aprobación
```

Si no implementas persistencia real de `conciliaciones`, deja el flujo visual y documental claramente como **propuesta pendiente**, nunca como aplicado.

### P0-3 — Cobros: separar validado de aplicado

En `modules/cobros.js`, `validarReporte()` ya existe. Ajusta el flujo para que no mezcle validación con aplicación directa.

Flujo esperado:

```txt
Reportado por cliente -> En revisión -> Validado/Rechazado -> Aplicar pago -> Conciliado
```

Cambios mínimos aceptables:

- Cambiar botón final `✓ Validar y aplicar pago` por dos pasos:
  1. `✓ Validar reporte` → marca `validadoReporte:true` o `estadoValidacion:'VALIDADA'` sin estado `Pagado`.
  2. Luego aparece botón separado `Aplicar pago`.
- Cliente360 debe reflejar ese estado.
- Portal no debe mostrar como pagado algo solo validado.

Si por capacidad no puedes completar Portal, al menos deja Cobros + Cliente360 correcto y documenta Portal pendiente.

### P0-4 — Planilla de comisión: sin fallback GTQ

En `core/importa.js`, dentro de `planillaFlujo()`, no uses:

```js
cur || 'GTQ'
```

Si falta moneda:

- mostrar `REQUIERE_VALIDACION`;
- no calcular como GTQ;
- mostrar `—` o “moneda requerida”.

Mantén el flujo visual:

```txt
fila / aseguradora / periodo / esperada / pagada / diferencia / retención / ajuste / score / acción / estado
```

Pero el score debe usar etiquetas compatibles con backend:

```txt
MATCH_EXACTO
MATCH_PROBABLE
REQUIERE_VALIDACION
BLOQUEADO
```

### P0-5 — Moneda residual: clasificar, no pretender cerrar todo

Audita estos residuos:

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

Con poca capacidad, haz esto:

- Corrige los obvios de UI agregada nueva (`core/importa.js` y `modules/configuracion.js` ya casi está).
- En documentación, clasifica los demás como:
  - válido por cotizador/comparativo manual;
  - pendiente por requerir país/cliente;
  - corregido.

No digas “cerrado” si no está realmente corregido o justificado.

## No tocar backend protegido

No modificar ni incluir cambios en:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-* backend/preflight/manifest/score/dryrun/conciliaciones/pipeline/diff
```

## Entrega esperada

Devuelve ZIP completo `orbit360-platform/` con:

1. lista exacta de archivos modificados;
2. qué P0 quedó cerrado;
3. qué quedó parcial;
4. confirmación de 0 errores JS;
5. confirmación de no backend protegido;
6. smoke visual mínimo: Pólizas, Cobros, Cliente360, Importador planillas, Academia, Docs.

## Regla final

Prioridad absoluta: **evitar reproceso**.

No reescribas todo. No cambies diseño. No cambies módulos no relacionados. Corrige únicamente los P0 anteriores y documenta honestamente lo que no alcance.
