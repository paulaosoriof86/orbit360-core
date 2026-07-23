# Cierre de causa raíz — Entrega CSS M1

Fecha: 2026-07-23

## Clasificación

- FUNCTIONAL_DEFECT
- VALIDATOR_STALE
- PIPELINE_MECHANISM_FAILURE

## Evidencia humana

La revisión visual 1.0.40 mostró el shell de Orbit 360 como HTML sin estilos. Por tanto, la entrega anterior no puede considerarse aprobada aunque sus 16 activos declarados coincidieran por hash.

## Causa raíz

1. `ays-lab-preview.html` eliminaba cachés y registraba el service worker, pero no exigía que los CSS base estuvieran disponibles antes de redirigir a `index.html`.
2. El service worker no precargaba `tokens.css`, `base.css`, `infra.css` ni `v1197-empalme.css`.
3. El fallback del service worker dependía de la solicitud completa y podía no encontrar un CSS canónico cuando cambiaban sus parámetros de versión.
4. La validación de Hosting comprobó 16 archivos, pero omitió los cuatro CSS fundacionales y no verificó `Content-Type: text/css`.
5. Hosting no tenía una política explícita `no-store` y `nosniff` para CSS.

## Corrección de raíz

- El preview define seis CSS esenciales y valida estado HTTP, cuerpo no vacío y MIME `text/css`.
- El preview no redirige a la plataforma si algún estilo esencial falla; reintenta y mantiene una pantalla de espera honesta.
- El service worker precarga los seis CSS esenciales durante instalación.
- El fallback busca primero la solicitud canónica sin parámetros y luego usa `ignoreSearch:true`.
- PWA, preview y service worker comparten el build `20260723-10`.
- Hosting aplica `Cache-Control: no-store, max-age=0` y `X-Content-Type-Options: nosniff` a CSS.
- El gate de entrega debe verificar 22 activos, seis CSS esenciales y MIME remoto correcto.

## Alcance preservado

No se modifica:

- CRUD dinámico de Aseguradoras 1.0.40;
- datos de clientes, aseguradoras, bancos o portales;
- Store, Auth, Functions o Rules;
- producción, `main` o merge;
- M2.

## Gate de aceptación

Aceptar exclusivamente:

```text
HOSTING_CSS_DELIVERED_AND_VERIFIED
22/22 hashes remotos coincidentes
6/6 CSS esenciales verificados
MIME CSS remoto válido
0 lecturas Firestore o bóveda
0 escrituras operativas
0 navegador automatizado
0 Functions, Rules o producción
```

## Replicabilidad

Clasificación para Claude: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrón reusable:

- nunca validar solo archivos funcionales si el shell depende de CSS base;
- un preview no debe redirigir hasta confirmar sus recursos visuales esenciales;
- el service worker debe almacenar recursos críticos bajo claves canónicas;
- la validación remota debe comprobar hash, HTTP y MIME;
- la evidencia humana prevalece sobre un gate estático incompleto.

## Academia

Impacto: `ACADEMIA_ACTUALIZAR`.

Debe enseñar la diferencia entre:

- defecto funcional de entrega visual;
- validador obsoleto que omite dependencias;
- caché/PWA como owner de disponibilidad;
- integridad de archivo frente a disponibilidad efectiva en el navegador.
