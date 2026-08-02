# Claude acumulado — Contenido estático idempotente y cambio de sesión

Fecha: 2026-08-02  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón

Una rutina que instala contenido estático no debe escuchar eventos frecuentes de sesión, rol, viewport o navegación.

Debe:

- activarse al iniciar o al reemplazarse realmente el store;
- comparar el contenido objetivo;
- insertar solo faltantes;
- actualizar solo diferencias;
- devolver cero escrituras cuando el contenido ya está vigente.

## Anti-patrón detectado

```text
session event → reseed completo → varias escrituras automáticas
```

Este patrón convierte una interacción read-only en una mutación silenciosa.

## Contrato reusable

```text
first apply on empty store: expected target writes
second apply on same store: zero additional writes
role changes on same store: zero additional writes
same-store event: zero additional writes
new store: one target application, then zero additional writes
```

## Prueba mínima

Instrumentar `insert`, `update`, `remove` y preferencias persistentes. Contar llamadas antes y después de:

1. primera aplicación;
2. segunda aplicación;
3. tres cambios de rol;
4. repetición del evento de store;
5. sustitución real del store.

## Ledger

Un root fix autorizado que cambia un archivo visual exige recalcular el manifiesto acumulativo. Debe probarse que:

- el número de archivos no cambia;
- las rutas no cambian;
- el shell principal no cambia;
- solo cambia el owner corregido;
- el nuevo digest se registra en constants, contrato, engine y lifecycle.

## Exclusiones

No enviar a Claude:

- nombres de tenants;
- project IDs;
- usuarios o correos;
- datos reales;
- secretos;
- backend protegido;
- nombres de clientes o aseguradoras.
