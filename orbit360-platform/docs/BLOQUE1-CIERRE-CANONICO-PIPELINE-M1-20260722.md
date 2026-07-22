# Bloque 1 — cierre canónico del pipeline M1

Fecha: 2026-07-22  
Gate único: `block1-client360-insurers-lab-v20260717`  
Contrato: `1.0.37`

## Clasificación de causa raíz

- `FUNCTIONAL_DEFECT`: hallazgos de la revisión visual ya corregidos en el owner visual y CSS.
- `VALIDATOR_STALE`: el lifecycle anterior exigía estados incompatibles con una autorización activa de un solo uso y el check bancario buscaba una variable retirada.
- `PIPELINE_MECHANISM_FAILURE`: el workflow canónico, el preflight y las autorizaciones no compartían el mismo contrato ejecutable.

No existe evidencia suficiente para clasificar el incidente como `ENVIRONMENT_FAILURE`.

## Corrección atómica

1. El entrypoint oficial `tools/orbit360-validar-gate-contracts-v20260717.mjs` integra el lifecycle canónico.
2. El motor histórico se preserva sin reescritura como `tools/orbit360-validar-gate-contracts-engine-v20260717.mjs`.
3. Se retiran el wrapper y el overlay paralelos creados para diagnóstico.
4. El workflow canónico reconoce una autorización estática 1.0.37 y una futura entrega visual LAB.
5. La entrega visual LAB no ejecuta nuevamente el gate final.
6. El producto visual, datos, Store, Auth, bóveda e importadores no cambian.

## Aceptación del preflight

Se acepta exclusivamente cuando coinciden:

- `GO_GATE_CONTRACT`;
- contrato visual `PASS`, 29/29;
- `GO_STATIC_ARCHITECTURE`;
- cero secretos, Firestore, escrituras operativas, runtime, navegador y deploy;
- gate final no repetido.

## Estado

Autorizado exactamente un preflight estático vinculante. M1 permanece abierto hasta consumir esa evidencia y completar una entrega correctiva separada en Hosting LAB con revisión visual humana acotada.

## Evidencia de la primera ejecución canónica

La ejecución `29953485798` confirmó que el workflow, la autorización y el inventario eran válidos. El único fallo ocurrió en `CANONICAL_PREFLIGHT_ENTRYPOINT`: el motor preservado escribió correctamente su archivo JSON sincronizado, pero su `process.exit()` interrumpió la salida extensa enviada por `stdout`, que quedó incompleta. Se retiró la interpretación de `stdout`; el entrypoint ahora consume exclusivamente el archivo de evidencia escrito sincrónicamente dentro del mirror temporal.

La autorización `final-block1-static-preflight-1-0-37-v2` se considera consumida por esa ejecución fallida. La revisión `v3` es una autorización nueva, separada y de un solo uso emitida únicamente después de cerrar la causa raíz. No habilita secretos, Firestore, escrituras operativas, runtime, navegador, deploy ni repetición del gate final.
