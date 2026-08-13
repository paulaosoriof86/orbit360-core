# ACADEMIA — VALIDATOR STALE Y CONTRATO DE BASELINE — V12

## Objetivo
Enseñar a distinguir un defecto funcional de un validador obsoleto cuando el producto no llegó a ejecutarse.

## Caso v12
La activación source-only pasó todas sus suites. El runtime se detuvo en `REQUEST_CONTRACT_INVALID` antes de secretos, Firebase, Hosting y navegador. El request usaba el baseline vigente, pero el JSON guard seguía exigiendo el nombre del backup v6.

Clasificación correcta: `VALIDATOR_STALE`.

No corresponde clasificarlo como `FUNCTIONAL_DEFECT`, porque ninguna ruta funcional ni matriz visual fue ejecutada en v12.

## Regla reusable
Un validador de autorización no debe codificar una versión histórica del entorno como verdad permanente. Debe comparar:

1. request nuevo e inmutable;
2. lifecycle vigente source-controlled;
3. gate y contractVersion;
4. rama, tenant y proyecto;
5. baseline y restaurador declarados por el lifecycle;
6. capacidades permitidas y denegadas;
7. máximo de deploys y reglas de rollback.

Una discrepancia debe producir STOP antes de secretos. Si la discrepancia existe porque el validador quedó atrás frente al contrato vigente, se congela producto/runtime y se corrige el validador, su test, workflow, documentación y Academia juntos.

## Seguridad aprendida
El STOP v12 funcionó correctamente como barrera de riesgo: secretos 0, Firebase 0, Hosting 0, navegador 0 y escrituras 0. Corregir el validador no autoriza automáticamente un nuevo runtime; una ejecución futura necesita autorización explícita nueva.
