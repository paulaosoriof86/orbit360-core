# Acumulado Claude — callable, actor parity y evidencia condicional

Fecha: 2026-08-05  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable 1 — paridad del actor

Antes de invocar una callable administrativa, el precheck debe replicar exactamente su contrato de autorización:

```text
identity present
+ tenant exact
+ membership active
+ activeRole assigned
+ privileged role OR explicit permission
```

No seleccionar un actor usando un criterio menos estricto que el endpoint de destino.

## Patrón reusable 2 — error callable sanitizado

Persistir siempre:

- HTTP status;
- status lógico de la callable;
- código de detalle allowlisted;
- etapa y target hash;
- cero correos, contraseñas, action links o payload privado.

## Patrón reusable 3 — evidencia condicional

```text
files = required evidence
for each optional stage evidence:
  add only if file exists
```

Una etapa omitida no debe impedir que se persista la evidencia de la etapa que falló.

## Patrón reusable 4 — integridad trivalente

```text
VERIFIED_UNCHANGED
VERIFIED_CHANGED
NOT_POSTVERIFIED
```

No convertir evidencia ausente en `false` semántico.

## Exclusiones

No incluye nombres, correos, credenciales, tenant real, datos CRM ni código backend protegido. No autoriza runtime, infraestructura o producción.
