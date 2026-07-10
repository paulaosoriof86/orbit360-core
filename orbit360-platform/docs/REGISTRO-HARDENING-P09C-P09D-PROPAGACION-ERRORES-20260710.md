# Registro hardening P0.9c/P0.9d — propagación de errores del resolver

Fecha: 2026-07-10  
Módulo: Aseguradoras / runner y resolver documental  
Estado: `CORREGIDO / CUBIERTO_POR_SMOKE`

## Necesidad

El resolver P0.9d devuelve códigos precisos para tenant, expiración, task, purpose y estado de una referencia. El bridge P0.9c debe conservar esos códigos para que el registry, la auditoría y la futura UX expliquen la causa real.

## Comportamiento esperado

Ejemplos:

```text
REFERENCE_TENANT_MISMATCH
REFERENCE_EXPIRED
REFERENCE_TASK_NOT_ALLOWED
REFERENCE_PURPOSE_NOT_ALLOWED
REFERENCE_ALREADY_USED
```

No deben convertirse automáticamente en:

```text
SOURCE_REFERENCE_NOT_RESOLVED
```

## Causa raíz

`sanitizeReferenceResult()` conservaba únicamente:

- ruta interna;
- fileRef;
- hash;
- autorización sensible.

Descartaba:

- `ok`;
- `code`;
- `errors`;
- auditoría del resolver.

Al no existir una ruta local, `execute()` respondía con un error genérico.

## Archivos y funciones

```text
tools/orbit360-document-backend-bridge-p09c.mjs
  sanitizeReferenceResult()
  execute()

tools/orbit360-test-document-backend-bridge-p09c.mjs
```

## Fix

El bridge ahora conserva metadata saneada del resultado del resolver:

```text
ok
code
errors
audit
```

Cuando `ok === false`:

1. crea un error controlado;
2. mantiene el código original;
3. conserva detalles no sensibles;
4. evita ejecutar el runner.

La ruta local continúa sin incluirse en auditoría o respuesta frontend.

## Impacto

- mensajes operativos correctos;
- auditoría trazable;
- UX futura puede distinguir expiración, permisos y cross-tenant;
- evita reintentos inútiles;
- mantiene aislamiento multi-tenant;
- no cambia Orbit.store;
- no habilita Cotizador/Comparativo.

## Smoke

Se añadió el caso:

```text
resolver → REFERENCE_TENANT_MISMATCH
bridge → conserva REFERENCE_TENANT_MISMATCH
runner → no ejecutado
```
