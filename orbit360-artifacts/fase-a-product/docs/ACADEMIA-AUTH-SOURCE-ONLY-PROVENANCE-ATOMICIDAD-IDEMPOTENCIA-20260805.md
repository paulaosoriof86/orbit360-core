# Academia Orbit 360 — Auth source-only, provenance, atomicidad e idempotencia

Fecha: 2026-08-05

## Objetivo

Enseñar por qué una corrección de acceso debe validarse primero sin ejecutar infraestructura cuando el intento anterior terminó en `STOP_RETRY`.

## Diferencia entre producto y pipeline

El fallo v3 no demostró un defecto del login ni de los roles. La transacción del reparador intercalaba una escritura antes de completar todas las lecturas. La base de datos abortó la operación completa antes del commit.

Clasificación:

```text
PIPELINE_MECHANISM_FAILURE
FIRESTORE_TRANSACTION_READ_AFTER_WRITE
```

## Patrón correcto

```text
READ_ALL
→ VALIDATE_ALL
→ WRITE_ALL
```

1. Leer todos los registros dentro de la transacción.
2. Validar que cada snapshot coincide con el plan aprobado.
3. Construir parches limitados a la allowlist.
4. Programar todas las escrituras después de terminar todas las lecturas.
5. Postverificar el estado final.

## Atomicidad

Atomicidad significa que los tres perfiles se corrigen juntos o ninguno. No deben quedar identidades o memberships parciales si una validación falla.

## Idempotencia

Un segundo cálculo sobre el mismo estado no debe volver a escribir. El reparador compara el valor actual con el deseado, conserva solo campos realmente diferentes y omite documentos sin cambios.

## Provenance

El gate source-only comprueba:

- que el root fix pertenece a la historia del HEAD;
- que el archivo conserva el blob auditado;
- que los requests anteriores siguen inmutables;
- que el nuevo request es el único archivo del commit disparador;
- que el futuro request runtime todavía no existe.

## Gate source-only

Un gate source-only tiene todas las capacidades operativas en `false`. Puede validar código, contratos, hashes, workflow y evidencias, pero no puede leer o escribir datos remotos ni desplegar infraestructura.

## Lección por rol

- Dirección: distingue avance técnico real de una repetición de riesgo.
- Operativo: entiende que un usuario configurado no equivale todavía a una identidad autenticable.
- Asesor: comprende que roles y scopes provienen de contratos del tenant, no de excepciones por persona.
- Academia técnica: diferencia `VALIDATOR_STALE`, `DATA_CONTRACT_FAILURE` y `PIPELINE_MECHANISM_FAILURE`.
