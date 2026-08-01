# Academia — impacto Cobros/Conciliación read-only

Fecha: 2026-08-01  
Bloque: Cobros/Conciliación

## Qué debe enseñar Academia

### Diferencias obligatorias

- **Recibo esperado:** obligación o calendario.
- **Cartera:** saldo pendiente.
- **Pago reportado:** evidencia pendiente de revisión.
- **Propuesta de conciliación:** coincidencia para revisar; no aplica pagos.
- **Cobro conciliado:** pago confirmado contra fuentes autoritativas bajo contrato one-to-one.
- **Movimiento financiero:** registro financiero separado; no nace por inferencia desde cartera o banco.

### Fuentes y autoridad

- Una sola fuente no crea cobro conciliado.
- El estado bancario solo propone conciliación.
- La ausencia de saldo en aseguradora no demuestra pago.
- Las diferencias de fechas y centavos se conservan para auditoría.
- Empate, conflicto o identidad insuficiente se envía a validación.

### FIFO

El pago se simula primero contra la obligación exigible aplicable más antigua. Esto incluye recibos pendientes de vigencias recientemente vencidas cuando siguen siendo exigibles. La aplicación no reactiva la póliza vencida.

Academia debe mostrar ejemplos ficticios de:

- pago que cubre totalmente la obligación histórica y parcialmente la actual;
- pago parcial sobre la obligación más antigua;
- excedente que queda sin aplicar hasta una decisión válida;
- monedas distintas que nunca se mezclan;
- pago reportado que permanece pendiente por falta de segunda fuente.

### Permisos y fase

En `READ_ONLY_DRYRUN` el equipo puede revisar propuestas y entender su trazabilidad, pero no confirmar pagos, cargar facturas para conciliar, ejecutar post-recaudo ni cambiar cartera.

La interfaz debe explicar el estado sin copy técnico y sin presentar una propuesta como pagada o aplicada.

## Clasificación

- Arquitectura de bandeja, UX de HOLD y FIFO: `REPLICABLE_CLAUDE_ACUMULADO`.
- Contratos de colección y bloqueo de aplicación: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Resultados A&S 2/9/5/4: `TENANT_AYS_ONLY`.
- Filas, nombres, pólizas, montos y referencias reales: `SECRETO_DATO_REAL`.

## Evidencia de aprendizaje requerida

El contenido debe permitir que Dirección, Operativo y Asesor identifiquen correctamente:

1. cuándo una fila es solo propuesta;
2. por qué una sola fuente no basta;
3. qué significa HOLD;
4. cómo funciona FIFO;
5. por qué cobro y finmov son entidades distintas;
6. qué acciones están bloqueadas hasta autorización.
