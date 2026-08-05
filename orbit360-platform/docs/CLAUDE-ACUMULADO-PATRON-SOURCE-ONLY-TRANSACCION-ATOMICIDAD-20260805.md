# Acumulado Claude — patrón source-only para transacciones de configuración

Fecha: 2026-08-05  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Antes de reabrir un gate de escritura después de un `STOP_RETRY` transaccional:

```text
request nuevo e inmutable
→ provenance del root fix
→ capacidades source-only en cero
→ allowlists exactas
→ validación de atomicidad
→ validación de idempotencia
→ evidencia sanitizada
→ autorización runtime separada
```

## Regla transaccional

```text
READ_ALL → VALIDATE_ALL → WRITE_ALL
```

Nunca intercalar nuevas lecturas después de programar la primera escritura dentro de una transacción.

## Atomicidad reusable

- leer todos los snapshots;
- validar existencia y digest de todos;
- construir parches solo con campos permitidos;
- escribir únicamente después de completar todas las lecturas;
- abortar sin cambios ante cualquier conflicto.

## Idempotencia reusable

- calcular diff por campo;
- no escribir documentos sin cambios;
- usar digest del estado observado para detectar cambios concurrentes;
- postverificar el estado deseado;
- mantener request y evidencia separados.

## Exclusiones

No incluye nombres reales, correos, credenciales, tenant específico, datos de clientes ni código de backend protegido. No autoriza infraestructura ni producción.
