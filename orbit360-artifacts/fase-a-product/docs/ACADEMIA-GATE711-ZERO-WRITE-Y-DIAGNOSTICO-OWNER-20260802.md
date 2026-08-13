# Academia — Gate 7.11: cero escrituras y diagnóstico del owner

Fecha: 2026-08-02

## Objetivo

Comprender por qué una operación bloqueada sigue siendo un fallo del contrato read-only, aunque no haya llegado a Firestore.

## Caso observado

El gate cambió secuencialmente entre Dirección, Operativo y Asesor. El write guard detectó una llamada `insert` alrededor de cada transición.

Las llamadas fueron bloqueadas:

```text
intentos de escritura: 3
Firestore writes: 0
operational writes: 0
```

## Diferencia importante

- **Intento de escritura:** una capa del navegador llamó a `Orbit.store.insert`.
- **Escritura materializada:** el adapter alcanzó y modificó Firestore.

En este caso existieron intentos, pero no escrituras materializadas.

## Clasificación por capas

1. `DATA_CONTRACT_FAILURE`: el gate exigía cero operaciones de escritura y detectó tres intentos.
2. `PIPELINE_MECHANISM_FAILURE`: el cleanup del runner falló después por una variable fuera de alcance.
3. Clasificación subyacente pendiente:
   - `FUNCTIONAL_DEFECT` si el producto no debía escribir;
   - `VALIDATOR_STALE` si el test representó incorrectamente un flujo auditable;
   - `DATA_CONTRACT_FAILURE` si se usó una colección no autorizada.

## Por qué no se corrige todavía el producto

El artefacto original solo registró `insert`. No registró:

- colección;
- claves del payload;
- ruta activa;
- stack del llamador.

Modificar sesión, auditoría o los módulos sin esa evidencia sería ensayo y error.

## Diagnóstico correcto

Un guard diagnóstico debe registrar únicamente metadatos sanitizados:

- nombre de la operación;
- colección;
- nombres de las claves del payload;
- rol activo;
- ruta;
- stack sin host, tokens, correos, IDs completos ni valores de negocio.

La operación debe seguir bloqueada.

## STOP_RETRY

Al detectar la familia repetida en los tres roles:

- se detiene el runtime;
- se consume la autorización;
- se bloquea replay;
- se deshabilitan secrets, Firestore y navegador;
- se investiga estáticamente;
- se requiere autorización nueva para cualquier diagnóstico runtime.

## Regla práctica por rol

### Dirección / Superadmin

Puede comprender la causa y autorizar el diagnóstico, pero no debe convertir evidencia automática en aprobación visual.

### Operativo

Debe distinguir una navegación read-only de una acción que genera auditoría o actividad.

### Asesor

Cambiar la vista activa no debe ampliar permisos ni producir modificaciones invisibles sin contrato explícito.

### IT / Auditoría

Debe capturar el owner exacto antes de tocar producto, adapter o validador.
