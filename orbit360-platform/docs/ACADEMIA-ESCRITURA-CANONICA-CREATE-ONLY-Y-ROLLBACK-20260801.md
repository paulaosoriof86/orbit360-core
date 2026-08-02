# Academia — Escritura canónica create-only, idempotencia y rollback

Fecha: 2026-08-01

## Propósito

Este caso enseña cómo trasladar un universo operativo hacia un read model multi-tenant sin convertir un dry-run en una escritura abierta ni confundir éxito técnico con aprobación visual.

## Autoridad y destino

La fuente operativa y el destino técnico pueden ser distintos durante una migración:

- la ruta heredada conserva la autoridad operativa mientras se verifica la transición;
- la ruta canónica recibe únicamente documentos autorizados por un plan sellado;
- el frontend no debe cambiar de ruta hasta que exista revalidación posterior y aprobación separada.

## Create-only

Una escritura `create-only` rechaza cualquier documento cuyo ID ya exista en el destino. Esto evita que una migración sobrescriba silenciosamente proyecciones, seeds o registros creados por otro proceso.

En el gate 7.5:

```text
CREATE: 4,377
UPDATE: 0
OMIT: 440
HOLD: 25
```

Los documentos equivalentes se omiten. Los documentos en HOLD se preservan fuera de la escritura.

## Idempotencia

La idempotencia no significa ejecutar repetidamente una escritura hasta que funcione. Significa que el mismo request no puede producir efectos adicionales.

Se combinaron:

1. digest del snapshot previo;
2. digest del plan;
3. precondición de creación;
4. consumo de la autorización;
5. post-verificación del estado final.

Después del primer PASS, el destino ya no coincide con el snapshot previo y un replay se bloquea antes de escribir.

## Snapshot y rollback

Cuando una operación solo crea documentos, el rollback exacto consiste en retirar exclusivamente los IDs creados por esa ejecución y verificar que el digest del destino regrese al snapshot previo.

El snapshot privado no se publica con PII o IDs. La evidencia sanitizada conserva conteos y digests suficientes para auditar el proceso sin revelar datos reales.

## HOLD no equivale a defecto

Un HOLD puede representar:

- validación pendiente;
- seed no operativo;
- referencia de importación no resoluble;
- relación sin evidencia exacta.

No debe eliminarse ni forzarse para lograr paridad de conteos.

## Defecto funcional frente a validador obsoleto

Antes del gate 7.5, el gate 7.4 detectó un `VALIDATOR_STALE`: Póliza y Recibo se habían agrupado como alternativas, aunque eran relaciones independientes. La regla se corrigió antes de escribir.

La lección es:

```text
hallazgo inesperado
→ clasificar
→ congelar si el validador está obsoleto
→ corregir contrato y evidencia
→ revalidar
→ solo después habilitar escritura
```

## Aprobación visual

Una escritura correcta no prueba que la interfaz sea correcta. Los estados de aprobación humana continúan separados:

```text
Clientes: aprobado
Pólizas: pendiente
Vehículos: pendiente
Recibos: pendiente
Cartera: pendiente
```

## Continuidad acumulativa

La futura visualización debe conservar todos los módulos y mejoras acreditadas. No se admite un shell reducido creado únicamente para comprobar Pólizas.

## Checklist reusable

Antes de escribir:

- gate canónico antes de secrets y Firestore;
- autoridad y destino explícitos;
- plan CREATE/UPDATE/OMIT/HOLD sellado;
- snapshot y digests exactos;
- precondiciones de no sobrescritura;
- límites de escritura;
- rollback verificable;
- cero navegador, preview o deploy si no están autorizados.

Después de escribir:

- conteos e IDs esperados;
- contenido exacto;
- fuente sin cambios;
- HOLD preservados;
- referencias no resolubles excluidas;
- autorización consumida;
- revalidación read-only antes del cambio de lectura o visualización.
