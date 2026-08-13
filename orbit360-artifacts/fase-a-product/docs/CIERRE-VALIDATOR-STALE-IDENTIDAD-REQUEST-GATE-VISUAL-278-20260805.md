# Cierre de causa raíz — identidad del request del gate visual 2.7.8

Fecha: 2026-08-05  
Run detenido: `31071875782`  
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`

## Primera etapa real fallida

`GO_GATE_CONTRACT sin secretos` se detuvo antes de invocar el router canónico. La etapa runtime quedó omitida.

## Primer check real fallido

`REQUEST_HISTORY_COUNT_EQ_1`

El preflight exigía que la ruta del request apareciera exactamente una vez en toda la historia Git. Esa condición no define la inmutabilidad del request vigente: una ruta puede conservar solicitudes retiradas y después recibir una autorización nueva sin invalidar el commit actual.

## Clasificación

`VALIDATOR_STALE`

No fue un defecto de Auth, membresía, hidratación, módulos, datos ni Hosting.

## Corrección de una sola capa

Se reemplazó el predicado histórico por tres invariantes del request vigente:

1. el request es el `HEAD` actual;
2. `parentHead` coincide con el padre real del commit;
3. el request es el único archivo modificado por ese commit.

El request del run detenido se retiró y no puede reutilizarse. El lifecycle queda sin autorización activa hasta recibir una nueva autorización explícita.

## Prueba sintética

La prueba crea una ruta histórica, la elimina y después la recrea:

- predicado anterior: falla;
- predicado nuevo: PASS;
- secretos, navegador, datos y deploy: cero.

Evidencia: `visual-matrix-request-identity-sourcefix-sanitized-v20260805.json`.

## Límites preservados

- `GO_GATE_CONTRACT`: no obtenido en el run detenido;
- secretos: no leídos;
- navegador: no abierto;
- Hosting LAB: cero deploys;
- Functions/Rules/escrituras/reimportación/producción/main/merge: cero;
- PR técnico #14: cerrado sin merge.

## Clasificación Claude

`REPLICABLE_CLAUDE_INMEDIATO`: los requests se validan por identidad del commit vigente, no por ausencia de historia previa de la ruta.

## Siguiente acción exacta

Esperar autorización explícita nueva; después activar el lifecycle y crear un request nuevo como commit exclusivo. No se reutiliza el request `ba993d061a2d55f1703ebaeb0bad2cd9ab8a98ad` ni el run `31071875782`.
