# CLAUDE ACUMULADO — COBROS / CONCILIACIÓN — GATE 10.9 WRITE_PASS

**Fecha:** 2026-08-01  
**Clasificación principal:** `REPLICABLE_CLAUDE_ACUMULADO`  
**Backend y datos reales:** `BACKEND_PROTEGIDO_NO_CLAUDE` / `TENANT_AYS_ONLY`

## Patrones reutilizables que sí deben trasladarse al prototipo

### 1. Estados honestos

Cobros y conciliación deben distinguir visualmente:

- reportado por cliente;
- en revisión;
- validado para aplicar;
- aplicado al recibo;
- pendiente de conciliación;
- conciliado;
- histórico;
- rechazado o bloqueado.

No debe mostrarse como pagado o conciliado aquello que solo fue reportado o propuesto.

### 2. Separación Cobros / Finanzas

La UI no debe inducir a que todo cobro genere automáticamente un movimiento financiero. Debe existir una separación visible y comprensible entre:

- recibo;
- cobro aplicado;
- conciliación;
- ingreso financiero.

### 3. Recibo histórico sin reactivación

La experiencia debe permitir representar un recibo histórico vinculado a una vigencia reciente vencida, sin reactivar la póliza ni presentarla como vigente.

Estados sugeridos:

```text
Histórico · pago aplicado
Póliza vencida · no reactivada
Sin cartera activa
```

### 4. Relaciones vacías honestas

Si falta una relación o no corresponde mostrarla, la UI debe usar un estado vacío claro. No debe inventar póliza vigente, cartera, producción ni movimiento financiero.

### 5. Resultados de operación

Después de una operación controlada, la UI debe poder reflejar:

- casos aplicados;
- casos verificados;
- casos bloqueados;
- operación revertida;
- sin cambios parciales.

Los detalles técnicos de snapshots, hashes, writer y Firestore no se muestran al usuario final.

## Módulos impactados

- Cobros;
- Recibos / Cartera;
- Cliente 360;
- Historial;
- Portal;
- Notificaciones;
- Academia.

## Texto/estado UI requerido

Ejemplos reutilizables:

```text
Pago reportado — pendiente de validación
Cobro aplicado al recibo
Pendiente de conciliación
Conciliado
Histórico — no genera cartera activa
Operación revertida — no quedaron cambios parciales
```

## Qué no debe compartirse con Claude

- service accounts;
- IDs de archivos privados;
- hashes;
- package privado;
- referencias reales de autorización;
- nombres, importes o pólizas reales;
- Firestore y writer protegido;
- workflows de escritura;
- reglas internas de secrets;
- datos reales A&S.

## Academia impactada

Claude debe reflejar en Academia:

- pago reportado vs pago confirmado;
- conciliación vs movimiento financiero;
- recibo histórico sin reactivar póliza;
- estados honestos;
- rollback como garantía de ausencia de cambios parciales;
- diferencia entre error funcional y contrato/validador.

## Riesgo si Claude ignora este patrón

- presentar pagos no validados como cobrados;
- duplicar ingresos financieros;
- reactivar pólizas vencidas por error;
- mostrar cartera inexistente;
- ocultar un rollback o una operación bloqueada;
- generar inconsistencias entre frontend y backend real.

## Instrucción acumulada para próxima candidata

```text
En Cobros, Recibos, Cliente 360, Portal e Historial, conservar estados honestos y separados para pago reportado, validado, aplicado y conciliado. Un recibo histórico puede registrar un pago sin reactivar la póliza ni generar cartera activa. No crear ni representar finmovs automáticamente desde un cobro. Mostrar operación revertida sin cambios parciales cuando corresponda. Mantener toda interacción mediante Orbit.store; no usar almacenamiento directo ni exponer copy técnico.
```
