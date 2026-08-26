# CONTRATO DE TRANSPORTE DEL CONTROL-PLANE — ORBIT 360 A&S — 2026-08-26

## Objetivo

Eliminar de forma permanente la condición de carrera observada al reutilizar un PR técnico mientras la rama canónica avanzaba por publicaciones del propio control-plane. Este contrato no cambia producto, datos, runtime ni seguridad; define únicamente cómo se transportan intents source-only y F2 hacia el workflow canónico.

## Causa raíz cerrada

Clasificación: `PIPELINE_MECHANISM_FAILURE`.

La rama técnica se había movido mientras el PR permanecía abierto. Ese movimiento generaba un evento `synchronize`. Después se materializaba o actualizaba el intent y se generaba otro `synchronize`. Como el workflow canónico usa un único mutex y publica evidencia sobre la rama canónica, el primer run podía avanzar correctamente el HEAD antes de que el segundo validara su snapshot de `base.sha`. El segundo run abortaba correctamente por CAS, pero aparentaba un nuevo fallo del mecanismo y podía inducir otro ciclo innecesario.

No era un defecto de Orbit 360, de la candidata, de F2 ni de seguridad. Los runs afectados no materializaron autorización, request ni runtime.

## Protocolo obligatorio desde esta fecha

1. Leer HEAD vivo de PR #5, ledger y package.
2. Verificar que no exista otro mutador canónico activo o en cola.
3. Cerrar explícitamente el PR técnico antes de mover su rama.
4. Con el PR cerrado, resetear la rama técnica exactamente al HEAD canónico vivo.
5. Materializar el intent completo mientras el PR continúa cerrado.
6. Reabrir el PR técnico.
7. Realizar una sola mutación de `nonce`; esa mutación debe ser el único evento `synchronize` de la operación.
8. El intent debe seguir coincidiendo con ledger, package, candidata y scope vivos al iniciar el run.
9. Cualquier evento stale aborta fail-closed y no se reintenta. Se reconstruye un único transporte desde HEAD vivo.
10. Ningún fallo de transporte puede consumir autorización, materializar request, abrir runtime, leer secrets/Firestore ni tocar producción.

## Reglas de sostenibilidad

- Está prohibido resetear una rama técnica mientras su PR esté abierto.
- Está prohibido generar dos mutaciones de intent para la misma transición.
- Está prohibido convertir un CAS stale en diagnóstico de producto.
- Está prohibido pedir otra autorización por un fallo ocurrido antes de materialización/riesgo.
- El mutex canónico existente se conserva; no se crea otro workflow ni otro owner.
- La candidata y datos permanecen congelados durante fallos de transporte.
- Dos fallos de la misma familia activan `STOP_RETRY`; no se crea un tercer parche del mismo transporte.

## Evidencia de cierre

El readiness determinista quedó demostrado por el run `32914461679`, que publicó `CONTROL_PLANE_SELFTEST_HANDSHAKE_PASS` sin autorización, request, runtime, browser, secrets, Firestore, writes, deploy ni producción.

Los runs `32914479088` y `32914729979` abortaron antes de ejecutar la transición por snapshot/base stale. Se clasifican exclusivamente como transporte stale fail-closed.

El cierre canónico posterior quedó materializado en commit `c712d23429365dfe5662547505d8f096712baaac`, ledger/package `75/69`, fase `CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS_AWAITING_F2_AUTHORIZATION`, con autorización/request/runtime `false/false/false`.

## Siguiente acción

Solo después de comprobar este contrato corresponde solicitar una autorización F2 one-shot nueva y explícita. El contrato no concede esa autorización por sí mismo.
