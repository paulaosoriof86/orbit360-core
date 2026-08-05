# Academia — Auth source-only v6: paridad, errores y evidencia

## Diferencia entre defecto funcional y fallo de mecanismo

- `FUNCTIONAL_DEFECT`: la callable rechaza o no completa onboarding.
- `PIPELINE_MECHANISM_FAILURE`: el workflow pierde o interpreta mal la evidencia del fallo.

Un STOP puede contener ambas causas y deben registrarse por separado.

## Paridad del actor

Antes de llamar una Function administrativa, el actor seleccionado debe cumplir exactamente el contrato que la Function verificará:

1. pertenecer al tenant correcto;
2. tener membership activa;
3. usar un rol activo realmente asignado;
4. tener un rol privilegiado o permiso explícito de gestión;
5. tener identidad activa disponible.

No basta con encontrar cualquier usuario con apariencia administrativa.

## Evidencia de errores callable

La evidencia sanitizada debe conservar tres campos distintos:

- `httpStatus`: resultado del transporte HTTP;
- `callableStatus`: clasificación devuelta por la callable;
- `errorCode`: código operativo estable para gates y soporte.

No se exponen correos completos, tokens, contraseñas, URLs de acción ni payloads privados.

## Evidencia condicional

Cada etapa puede producir o no un archivo. El cierre debe persistir únicamente los archivos existentes y registrar cuáles faltan. La ausencia de scopes porque onboarding falló no puede romper el cierre completo.

## Integridad trivalente

- `VERIFIED_UNCHANGED`: la comparación before/after fue ejecutada y coincidió.
- `VERIFIED_CHANGED`: la comparación fue ejecutada y encontró cambio.
- `NOT_POSTVERIFIED`: la comparación no llegó a ejecutarse.

`NOT_POSTVERIFIED` no significa daño ni PASS; significa que falta evidencia.

## Gate source-only v6

Resultado: 32/32 PASS con cero capacidades operativas. El siguiente runtime requiere autorización nueva y deberá usar estos controles antes y después de onboarding.
