# Auditoría bloque pólizas/renovaciones/cartera post-empalme v1330 — 2026-07-07

## Estado

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: no
Deploy: no
```

## Archivos revisados

```txt
orbit360-platform/core/importa.js
orbit360-platform/core/queries.js
orbit360-platform/modules/polizas.js
orbit360-platform/modules/renovaciones.js
orbit360-platform/modules/cliente360.js
orbit360-platform/modules/cancelaciones.js
```

## Resultado ejecutivo

No se detectó P0 que escriba cartera indebidamente.

Sí se detectó un P1 visual/operativo en renovación: algunas vistas de Renovaciones/Cliente360 incluyen pólizas históricas por filtrar solo `estado !== 'Cancelada'`.

## Validado — generación de recibos/cartera desde importador

Archivo:

```txt
orbit360-platform/core/importa.js
```

Conclusión:

- La importación de pólizas no asume `Vigente` si falta estado.
- Si falta estado, país, moneda o prima neta confiable, la póliza queda `Requiere validación`.
- `afterInsert()` genera recibos/cobros solo si:
  - estado es `Vigente` o `Por renovar`;
  - hay clienteId;
  - hay país y moneda;
  - hay forma de pago;
  - no requiere validación;
  - hay prima neta mayor a cero.
- Pólizas históricas o incompletas no generan cartera.

Regla preservada:

```txt
Vigente/Por renovar generan recibos/cartera.
Cancelada/Vencida/Anulada/Rechazada/Requiere validación no generan cartera automática.
```

## Validado — queries globales

Archivo:

```txt
orbit360-platform/core/queries.js
```

Conclusión:

- `primaVigenteGlobal()` solo suma `Vigente` y `Por renovar`.
- `renovacionesProximas()` solo incluye `Vigente` y `Por renovar`.
- `leaderboard()` solo usa `Vigente` y `Por renovar` para prima.
- `postRecaudo()` no escribe `finmovs`.

## Validado — Pólizas global

Archivo:

```txt
orbit360-platform/modules/polizas.js
```

Conclusión:

- La vista separa pólizas vigentes/por renovar de histórico.
- KPI `Histórico / sin cartera` agrupa `Cancelada`, `Vencida`, `Anulada`, `Rechazada`.
- El desglose muestra si una póliza genera cartera o es histórica.
- El desglose muestra prima neta, gastos, IVA/impuestos y total.

Pendiente menor:

- Revisar que `primaVig` use `primaNeta` cuando sea producción/metas y no `prima`/total si el KPI se interpreta como producción. En pantalla dice prima vigente anualizada, no producción recaudada; no es P0.

## P1 — Renovaciones incluye históricos por filtro laxo

Archivo:

```txt
orbit360-platform/modules/renovaciones.js
```

Hallazgo:

```js
const pols = S().where('polizas', p => p.estado !== 'Cancelada');
```

Esto excluye solo `Cancelada`, pero puede incluir:

```txt
Vencida
Anulada
Rechazada
Requiere validación
```

Impacto:

- La vista de Renovaciones puede mostrar pólizas que deberían ser históricas o no gestionables como renovación.
- `Prima en juego` puede incluir primas de pólizas que no deben formar parte de pipeline de renovación.
- No se detectó escritura de cartera ni aplicación de pagos; el riesgo es visual/operativo y de KPI.

Corrección recomendada:

```js
const renovable = p => p.estado === 'Vigente' || p.estado === 'Por renovar';
const pols = S().where('polizas', renovable);
```

Si se quiere mostrar recuperaciones de vencidas/canceladas, debe ir a `Cancelaciones/Retención`, no al pipeline principal de Renovaciones ni a prima en juego.

## P1 — Cliente360/Renovaciones del cliente incluye históricos por filtro laxo

Archivo:

```txt
orbit360-platform/modules/cliente360.js
```

Hallazgo:

```js
const items = r.pol.filter(p => p.estado !== 'Cancelada')
```

Impacto:

- Puede mostrar `Vencida`, `Anulada`, `Rechazada` o `Requiere validación` en la línea de renovación del cliente.
- Puede habilitar gestión/comparativo de pólizas que deberían quedar como histórico o validación.

Corrección recomendada:

```js
const items = r.pol.filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar')
```

Para recuperación de canceladas/vencidas, usar módulo `Cancelaciones`/Leads de recuperación.

## Validado — Cancelaciones

Archivo:

```txt
orbit360-platform/modules/cancelaciones.js
```

Conclusión:

- Cancelaciones se tratan como histórico.
- El módulo permite gestión de recuperación y crea oportunidad comercial en Leads si corresponde.
- Eso es correcto: recuperación comercial sí, pero no cartera automática ni renovación directa.

## Pendiente Academia

Agregar/reforzar microlección:

```txt
Renovación vs recuperación
```

Debe explicar:

- Renovaciones: solo pólizas `Vigente` o `Por renovar`.
- Vencida/Cancelada/Anulada/Rechazada: histórico o recuperación, no cartera activa.
- Recuperar una cancelada/vencida crea gestión comercial/lead, no recibos automáticos.
- Diferencia entre “prima en juego” de renovación y “valor perdido” de cancelación.

## Pendiente Claude

Si Claude toca Renovaciones o Cliente360, debe corregir/conservar:

- filtros estrictos de renovables (`Vigente`/`Por renovar`);
- históricos en Cancelaciones/Retención, no en Renovaciones;
- textos honestos: recuperación ≠ renovación activa;
- no sumar históricos en `Prima en juego`.

## Decisión

No bloquea continuar auditoría general, pero debe corregirse antes de considerar la candidata lista para producción/demo ejecutiva.

Tipo de pendiente:

```txt
P1 visual/operativo — recomendable hotfix Codex pequeño.
```
