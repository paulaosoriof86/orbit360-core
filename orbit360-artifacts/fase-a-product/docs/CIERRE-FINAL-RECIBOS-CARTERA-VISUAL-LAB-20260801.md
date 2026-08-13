# Cierre final Recibos/Cartera — Orbit 360 A&S

Fecha: 2026-08-01  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Veredicto

`RECEIPTS_PORTFOLIO_FINAL_VISUAL_CLOSURE_PASS`

## Baseline preservado

- clientes: 430
- aseguradoras: 30
- asesores: 7
- pólizas: 1373
- vehículos: 1032
- recibosEsperados: 1293
- carteraPrimas: 673
- cobros: 0
- finmovs: 0

## Publicación final LAB

Run `30676303473` · artifact `8810598726` · digest `sha256:a927d3c5ef6f6e5f0221802e0c870d1d64d6821c8983589a383346697737aa4c`.

- Hosting LAB: 1 ejecución, PASS.
- Paridad remota: 12/12.
- Hidratación exacta: PASS.
- Rules, Functions, Storage: 0.
- Firestore data writes: 0.
- Cobros writes: 0.
- Producción: false.

## Recuperación browser-only

Run `30676673787` · artifact `8810714415` · digest `sha256:d2f2d04811da20cbb17f4bf6e713078697125f51395945e4cd4b0b447acce995`.

- runtime base multirol: PASS;
- runtime humano integral: PASS;
- badge del hero de Recibo: PASS;
- altura: 21 px;
- align-self: flex-start;
- flex-grow: 0;
- flex-shrink: 0;
- page errors: 0.

El workflow consultaba `.badge.*` aunque el test publicaba `.metrics.*`. Clasificación: `VALIDATOR_STALE`. No hubo cambio de producto.

## Evidencia visual fail-closed

La continuación `30676843740` se detuvo antes de capturar por `ROLE_SELECTION_FAILED`. Clasificación: `PIPELINE_MECHANISM_FAILURE_ROLE_SELECTION`. No produjo screenshots válidos.

Se corrigió el sanitizador para esperar roles disponibles, aceptar Dirección si ya estaba activa y confirmar el rol antes de enmascarar.

Cierre definitivo:

Run `30677086901` · artifact `8810863574` · digest `sha256:5591a478f0b2ce8cc328bb1911aad586172e3b8640daa14785950b727c68908c`.

- seis screenshots sanitizados;
- Dirección confirmada;
- residualDynamicText: 0;
- residualVisibleFormValues: 0;
- containsPII: false;
- containsSecrets: false;
- Hosting deploy: 0;
- escrituras: 0;
- producción: false.

La inspección visual confirmó que el badge no se estira y que Recibo y Cartera conciliada mantienen composición estable.

## Contratos preservados

- Recibo esperado ≠ Cartera ≠ Pago reportado ≠ Cobro conciliado.
- Una sola fuente no auto-concilia.
- La ausencia de saldo no crea pago.
- Cartera conciliada confirma saldo pendiente, no pago.
- Cobro conciliado requiere match one-to-one entre fuentes autoritativas.
- Diferencias de fecha o centavos se preservan.
- Empate, conflicto o identidad insuficiente pasa a HOLD.
- Un pago no puede aplicarse dos veces.

## Siguiente bloque

Cobros/Conciliación entra en modo read-only y dry-run.

Regla FIFO: el pago se aplica al requerimiento pendiente aplicable más antiguo, incluidos recibos vencidos de vigencias recientemente vencidas cuando siguen siendo exigibles. La aplicación no reactiva la póliza vencida.

No se escribirá `cobros` ni `finmovs` antes de cerrar inventario de fuentes, dry-run one-to-one, HOLD, no doble aplicación y rollback exacto.
