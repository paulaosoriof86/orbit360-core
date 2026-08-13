# Academia Orbit 360 — Autorización controlada de Cobros

Fecha: 2026-08-01

## Propósito

Enseñar la diferencia entre evidencia suficiente para presentar una propuesta y autorización efectiva para escribir un cobro.

## Dirección

Dirección revisa cada tarjeta con:

- tipo de evidencia;
- recibo existente o histórico;
- cambio propuesto;
- impacto en cartera;
- idempotencia;
- rollback;
- estado de autorización.

Puede aprobar o rechazar casos individualmente. Un recibo histórico exige confirmación reforzada y no reactiva la póliza.

## Operativo

Operativo prepara y revisa evidencia, pero no convierte por sí mismo una propuesta en cobro. Debe comprobar:

- identidad exacta del recibo;
- fecha del pago frente al corte de cartera;
- moneda y monto;
- vigencia correspondiente;
- fuentes usadas y diferencias visibles.

Los casos HOLD se mantienen separados y solo solicitan una fuente adicional cuando existe una necesidad concreta.

## Asesor

El asesor puede consultar el estado y crear una gestión de corrección. No puede:

- aprobar el cobro;
- crear recibos históricos;
- alterar pólizas;
- aplicar pagos;
- modificar fuentes validadas.

## Secuencia correcta

```text
evidencia
→ matriz
→ cola
→ tarjeta sanitizada
→ decisión de Dirección
→ snapshot pre-write
→ gate de escritura independiente
→ operación idempotente
→ auditoría y rollback disponible
```

## Error que debe evitarse

`Listo para autorización` no significa `autorizado` y tampoco significa `escrito`.

La desaparición de un recibo en una cartera, una comisión o un movimiento bancario aislado no crean un cobro. Un pago dirigido a una vigencia reciente vencida puede aplicarse al recibo histórico exacto o, cuando no lo identifica, al exigible más antiguo conforme a FIFO controlado.

## Evidencia que queda

- tarjeta con referencia opaca;
- diff antes/después;
- decisión y rol autorizante;
- fecha y motivo;
- llave de idempotencia;
- snapshot anterior;
- resultado de escritura futura;
- referencia de rollback.
