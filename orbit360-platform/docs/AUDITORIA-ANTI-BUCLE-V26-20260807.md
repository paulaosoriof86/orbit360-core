# Auditoría anti-bucle — v26 Block1

Fecha: 2026-08-07

## Pregunta

¿El trabajo reciente está encontrando causa raíz o repitiendo prueba/error?

## Criterio

No se considera avance repetir un mismo gate con cambios cosméticos. Sí existe avance cuando cada ejecución elimina una clase causal distinta, deja evidencia reusable y reduce el siguiente alcance.

## Secuencia observada

- v22: detuvo una transformación encadenada de artifacts (`PIPELINE_MECHANISM_FAILURE`) y activó STOP_RETRY tras repetición del mismo stage.
- v23: sustituyó la transformación por matriz nativa; descubrió un defecto distinto de handoff de stdout.
- v24: corrigió el handoff mediante evidencia estructurada y consiguió GO real; el gate avanzó por primera vez hasta el universo de datos.
- v25: una sola lectura diagnóstica separó el falso positivo de Aseguradoras de los 16 Clientes sin procedencia. No reimportó ni tocó producto.
- v26: corrige source-only la regla stale de dedupe y busca la procedencia de los 16 sin otra lectura LAB.

## Riesgo de bucle que sí existe

Aunque las causas recientes son materialmente diferentes, ha habido demasiadas autorizaciones one-shot alrededor del mismo Block1. El riesgo ya no es principalmente técnico: es fragmentar una misma resolución en demasiados micro-gates y convertir cada evidencia en una nueva ronda de autorización.

## Control desde v26

1. No reejecutar v26.
2. No abrir runtime visual al cerrar source v26.
3. No pedir otra autorización si no existe una frontera de evidencia materialmente nueva.
4. Si los 16 siguen sin locator, la siguiente autorización debe combinar de forma acotada la evidencia focal estrictamente necesaria y, solo si esa evidencia cierra el universo, el gate de universo corregido; no separar artificialmente ambas cosas en varias rondas.
5. Matriz visual únicamente después de universe PASS.
6. Todo nuevo STOP debe declarar causa raíz, owner, solución y por qué no es repetición del STOP anterior.

## Indicador de salida del bucle

El proceso deja de ser iterativo cuando el próximo paso está determinado por una causa demostrada y reduce alcance. Si v26 no puede localizar los 16 con evidencia existente, el bloqueo exacto será de observabilidad/procedencia (fingerprint sin locator), no un nuevo “misterio” de 430 vs 414.
