# Academia Orbit 360 · actualización v15 · Inicio, hidratación y STOP consumer

## Objetivo didáctico

Explicar por qué una vista puede fallar aunque Auth y membresía estén correctos, cómo distinguir una fuente requerida de una opcional y por qué un gate debe probar la composición runtime real y no solo la presencia de archivos o markers parciales.

## Caso v15

El runtime v15 obtuvo `GO_GATE_CONTRACT`, restauró el baseline autorizado, creó backup y realizó un solo deploy Hosting LAB. Auth, membresía, tenant y ruta Inicio pasaron. Inicio no terminó de hidratar y el precheck cerró en `INICIO_READY_TIMEOUT`.

La evidencia mostró que `asesores` era la fuente faltante, mientras las fuentes canónicas requeridas para Inicio estaban disponibles.

## Lección 1 · required no es lo mismo que optional

Para Inicio:

- required: clientes, pólizas, cobros, aseguradoras;
- optional: asesores, metas, negocios, gestiones.

Una fuente required ausente o fallida bloquea la vista. Una fuente optional ausente o fallida debe producir estado degradado honesto, no una pantalla inutilizable.

Esto evita que una colección legacy no migrada detenga una vista cuyos datos esenciales ya están disponibles.

## Lección 2 · la proyección visual no escribe

Si `asesores` no está disponible como colección legacy, Orbit puede proyectar responsables en lectura desde:

- membresía activa;
- `advisorId` y equivalentes presentes en relaciones canónicas.

La proyección es visual/read-only. No crea, modifica ni reimporta asesores.

## Lección 3 · source PASS no demuestra runtime composition

Un test de código puede comprobar que existe un contrato required/optional y aun así no demostrar que dicho contrato esté montado sobre el `Orbit.store` que termina operando en el navegador.

Por eso el precheck ahora exige tres niveles observables, en orden:

1. `ROOTFIX_MARKER`;
2. `HYDRATION_CONTRACT_MOUNTED`;
3. `INICIO_REQUIRED_HYDRATION`;
4. finalmente `INICIO_READY`.

Si falla el punto 2, es principalmente un problema de composición/pipeline. Si falla el punto 3, hay que revisar las fuentes canónicas requeridas. Si los tres pasan y la UI falla después, aumenta la probabilidad de defecto funcional de la vista.

## Lección 4 · STOP debe ser idempotente

Un pipeline distribuido puede persistir un estado intermedio antes de que otro componente ejecute el cierre final. Por eso un consumidor de STOP no puede asumir solamente:

- request completamente activo; o
- request completamente cerrado.

Debe poder recibir también un estado parcial como:

`consumed=true / allowedExecutions=0 / frozen=false`

y completar el cierre sin reinterpretarlo como una nueva ejecución.

## Lección 5 · cierre terminal en varias capas

En v15 se reforzaron dos defensas:

- el sealer cierra lifecycle y overlay cuando termina el runtime;
- el consumidor automático vuelve a normalizar request+lifecycle+overlay de forma idempotente.

Así, si una defensa persiste parcialmente, la siguiente puede completar el cierre sin replay.

## Diferencia entre defecto funcional y validador/pipeline

### FUNCTIONAL_DEFECT

La composición runtime está probada y las fuentes requeridas están listas, pero el módulo produce un comportamiento incorrecto.

### DATA_CONTRACT_FAILURE

Una fuente realmente requerida no existe, falla o viola el contrato esperado.

### VALIDATOR_STALE

El producto o contrato cambió, pero la validación sigue comprobando una regla vieja o insuficiente.

### PIPELINE_MECHANISM_FAILURE

El mecanismo de transporte, montaje, lifecycle, persistencia o consumo STOP impide que el contrato validado se aplique correctamente en runtime.

En v15 la evidencia no justifica reimportar asesores ni cambiar Firestore Rules. El error fue de composición/validación y de cierre del control-plane.

## Regla operativa para Academia

Antes de atribuir un fallo a datos:

1. confirmar Auth y membresía;
2. separar required de optional;
3. verificar que el contrato correcto esté montado sobre el store vivo;
4. revisar el estado real de snapshots;
5. comprobar que el gate observa la misma composición que usa el producto;
6. solo después clasificar como defecto funcional o data-contract.

## Seguridad y trazabilidad

La corrección v15 fue validada source-only con 0 secretos, 0 Firebase, 0 Hosting, 0 navegador, 0 deploy y 0 writes. El runtime v15 original sí tocó Hosting únicamente dentro de su autorización, realizó un solo deploy y terminó con rollback exitoso y snapshot `VERIFIED_UNCHANGED`.
