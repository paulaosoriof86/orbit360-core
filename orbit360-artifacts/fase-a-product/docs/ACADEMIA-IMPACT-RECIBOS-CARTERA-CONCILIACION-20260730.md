# Academia — Recibos, cartera y conciliación por fuente — 2026-07-30

## Qué debe aprender cada rol

### Dirección
Distinguir `cartera pendiente total`, `cartera exigible/vencida` y cuotas futuras. Un calendario de pagos no equivale a mora.

### Operativo
Leer la secuencia `póliza activa → recibos → cartera → pago reportado → conciliación`. La vigencia contractual manda sobre el estado de la póliza; una etiqueta financiera de la fuente no cancela una póliza activa.

### Asesor
Ver únicamente clientes dentro de su scope y sus recibos relacionados. Puede completar datos faltantes permitidos, pero no aplicar cobros ni mover deuda entre pólizas.

## Patrones reutilizables

1. Solo `Vigente` / `Por renovar` alimenta el calendario operativo.
2. Términos cancelados, históricos, renovados o futuros no se mezclan con el calendario actual.
3. El calendario incluye futuro, vencido y pago reportado; no solo mora.
4. `carteraPrimas` es el subconjunto todavía pendiente.
5. Un endoso con prima es una obligación separada.
6. Un balance de aseguradora puede corregir programación/monto/fecha cuando existe match seguro de término.
7. Un pago reportado no es un cobro conciliado.
8. Banco/estado de cuenta propone conciliación; no crea cobro por inferencia.
9. Diferencias de estructura deben quedar en diff/HOLD, no resolverse inventando cuotas.
10. Importación individual y masiva consumen el mismo normalizador, calidad, dry-run, confirmación, auditoría y rollback.

## Defecto funcional vs contrato/fuente

- `FUNCTIONAL_DEFECT`: el normalizador o UI transforma incorrectamente una identidad o relación.
- `DATA_CONTRACT_FAILURE`: las fuentes no concuerdan o falta una relación segura.
- `VALIDATOR_STALE`: el producto es correcto pero el gate espera una regla vieja.
- `PIPELINE_MECHANISM_FAILURE`: falla el mecanismo de workflow/evidencia, no el producto.

En esta etapa las diferencias SIGA vs aseguradora se tratan como reconciliación de fuente/contrato, no como un parche visual.

Clasificación: `ACADEMIA_ACTUALIZAR` + `REPLICABLE_CLAUDE_ACUMULADO`.
