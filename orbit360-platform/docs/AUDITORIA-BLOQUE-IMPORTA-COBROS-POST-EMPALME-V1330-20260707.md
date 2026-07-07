# Auditoría bloque importa/cobros post-empalme v1330 — 2026-07-07

## Estado

Rama auditada:

```txt
ays/backend-tenant-lab-v99-20260703
```

PR:

```txt
#5 draft/open, sin merge y sin deploy
```

Head auditado:

```txt
730bc5e80fb606f0306fd0ef7b2f22aeaca1a2d8
```

## Archivos revisados

```txt
orbit360-platform/core/importa.js
orbit360-platform/modules/cobros.js
```

## Hallazgo P0 — importador estados-cuenta puede saltarse conciliación

En `core/importa.js`, `IMPORT_MAP['estados-cuenta']` declara:

```js
coll: 'cobros', conciliacion: true
```

pero el botón `Finalizar` calcula la ruta con:

```js
const isConc = (state.meta.conciliacion === true);
```

`state.meta` proviene de `KINDS[kind]`, no de `IMPORT_MAP[kind]`.

Impacto:

- `estados-cuenta` puede entrar por `applyImport()` en vez de `applyConciliacion()`.
- Si la fuente trae `estadoPago` como pagado, el `build()` actual pone `rec.estado = 'Pagado'` y `fechaPago = rec.vence`.
- Esto puede escribir un cobro como pagado desde un estado de cuenta sin pasar por propuesta/validación.

Regla afectada:

- No aplicar pagos ni modificar cartera desde estados/cuentas sin conciliación/validación.
- Pagos reportados por cliente o estados de cuenta deben quedar como propuesta o pendiente de validación, no como cobro aplicado.

Corrección recomendada inmediata:

```js
const cfgFin = IMPORT_MAP[kind];
const isConc = !!(cfgFin && cfgFin.conciliacion === true && kind !== 'planillas-comision');
```

Además, para `estados-cuenta`, `build()` no debe producir `estado: 'Pagado'` directo. Debe producir una de estas dos alternativas seguras:

```js
estado: 'Pendiente', reportado: fecha/true, requiereValidacion: true, conciliacionPropuesta: {...}
```

o delegar completamente a `applyConciliacion()`.

## Hallazgo P1 — `applyConciliacion()` crea referencias en la colección destino

En `applyConciliacion(kind)` los `noCreados` se insertan en `IMPORT_MAP[kind].coll`.

Para `estados-cuenta`, eso significa `cobros`.

Riesgo:

- Si el registro viene con estado pagado, puede crearse una referencia como cobro pagado.
- Debe forzarse estado seguro: `Pendiente`, `requiereValidacion`, `origen: 'estado-cuenta'`, sin producción/cartera aplicada hasta revisión.

## Hallazgo P1 — cobros confirma pago sin factura obligatoria

En `modules/cobros.js`, `aplicarPago()` permite confirmar un cobro sin factura y deja `conciliado: false`.

Esto puede ser válido como flujo manual interno, pero debe quedar semánticamente claro:

- Confirmar cobro = recaudo registrado por usuario autorizado.
- Conciliar = factura/soporte validado.
- Reporte cliente = nunca equivalente a pago confirmado.

Pendiente de revisión:

- Confirmar si `Orbit.q.postRecaudo()` solo se debe ejecutar con cobro confirmado manualmente o también requiere factura/conciliación.
- Cambiar evento de automatización `pago_aplicado` a `pago_confirmado`/`recaudo_confirmado` si existe en automatizaciones.

## Hallazgos positivos

`core/importa.js` sí mejora reglas importantes:

- `normPais()` ya no asume GT por defecto.
- Moneda explícita obligatoria; moneda sugerida no se escribe como valor real.
- Hojas soporte quedan excluidas.
- `financiero-historico` excluye títulos/subtotales/dashboards.
- Estado bancario va a `conciliacionBanco`, no a `finmovs`.
- Documentos generan `parchesPendientes`, no modifican clientes directo.

`modules/cobros.js` sí mejora estados visibles:

- `Reportado por cliente`
- `En revisión`
- `Validada (por aplicar)`
- `Conciliado`
- `Requiere validación`
- `Bloqueado`

## Decisión

No se debe considerar cerrado el importador hasta aplicar hotfix P0 sobre `core/importa.js` y validar flujo:

```txt
estados-cuenta -> applyConciliacion() -> propuestas/referencias seguras -> NO cobro pagado directo
```

Este pendiente es backend/ChatGPT-Codex, no Claude, salvo que Claude reentregue importador UX. Si Claude toca importador, debe conservar esta regla.
