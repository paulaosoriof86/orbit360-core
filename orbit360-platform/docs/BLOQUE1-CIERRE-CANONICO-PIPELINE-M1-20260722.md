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
