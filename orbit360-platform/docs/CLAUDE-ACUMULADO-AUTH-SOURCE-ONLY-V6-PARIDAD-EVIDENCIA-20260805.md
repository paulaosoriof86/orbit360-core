# Acumulado Claude — patrón reutilizable Auth source-only v6

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Antes de invocar una operación administrativa remota:

```text
SELECT_ACTOR
→ VALIDATE_TENANT
→ VALIDATE_ACTIVE_MEMBERSHIP
→ VALIDATE_ACTIVE_ROLE_ASSIGNED
→ VALIDATE_ROLE_OR_PERMISSION
→ CALL_REMOTE_OPERATION
```

## Contrato de error

Separar y sanitizar:

```text
httpStatus
callableStatus
errorCode
```

Nunca depender de un único mensaje libre ni exponer PII, tokens o enlaces de acción.

## Persistencia de evidencia

Los archivos de etapas posteriores son opcionales. El cierre debe:

- leer solo archivos existentes;
- conservar el primer fallo real;
- persistir lifecycle y cierre incluso cuando scopes o rollback no se generen;
- distinguir integridad verificada de integridad no comprobada.

## Estados de integridad

```text
VERIFIED_UNCHANGED
VERIFIED_CHANGED
NOT_POSTVERIFIED
```

No traducir `NOT_POSTVERIFIED` como `false` ni como cambio observado.

## Fuera de alcance Claude

No replicar datos A&S, correos reales, memberships, secretos, credenciales, configuración privada del tenant ni backend protegido.
