# Academia Delta — F2 terminal artifact recovery sin replay

Fecha: 2026-08-26  
Clasificación: `ACADEMIA_ACTUALIZAR`  
Ámbito: control-plane, gates, seguridad, evidencia y diferencia entre defecto funcional y mecanismo de pipeline.

## Caso que debe enseñar Academia

Un F2 puede completar correctamente provider read-only, browser, integridad before/after y evidencia terminal, pero fallar después durante la publicación canónica. Ese caso **no autoriza repetir runtime** si el límite de riesgo privilegiado ya fue cruzado.

La clasificación correcta separa dos verdades:

- El resultado funcional/runtime puede ser `PASS`.
- La publicación terminal puede fallar por `PIPELINE_MECHANISM_FAILURE` o `VALIDATOR_STALE`.

Nunca se debe convertir un fallo de publicación en un nuevo intento F2 ni reutilizar una autorización cuyo riesgo privilegiado ya fue observado.

## Patrón reusable

`F2_TERMINAL_ARTIFACT_RECONCILE` recupera exclusivamente evidencia terminal ya sellada en GitHub Actions. Debe:

1. verificar artifact ID, digest, expiración y run original;
2. verificar que el run coincide con el `runtimeRunId` reservado en el ledger;
3. verificar candidata exacta;
4. verificar terminal `PASS`, browser `PASS`, integridad before/after `PASS`, cero writes y cero deploy/producción;
5. copiar a la superficie canónica únicamente el terminal sanitizado;
6. ejecutar el owner existente `F2_RUNTIME_TERMINAL_RECONCILE_GENERIC`;
7. ejecutar invariants y publicación CAS existentes;
8. no instalar dependencias runtime, no enlazar provider, no acceder a secretos, no leer Firestore y no ejecutar browser.

## Gate de evidencia

Cuando existe un terminal nuevo modificado en el worktree, ese terminal del run/candidata actual tiene precedencia sobre punteros históricos. Un terminal histórico nunca puede sombrear el terminal que está siendo sellado. Si existen múltiples terminales modificados y no puede resolverse exactamente uno para el run/candidata actual, el gate debe fallar cerrado.

## Regla de seguridad

La autorización se consume por haber cruzado riesgo privilegiado, no por el éxito de la publicación documental posterior. Un recovery terminal no revive, amplía ni reutiliza la autorización; únicamente reduce evidencia ya producida a estado canónico.

## Diferencia que debe dominar cada rol técnico

- `FUNCTIONAL_DEFECT`: la aplicación o flujo probado falló realmente.
- `VALIDATOR_STALE`: el producto/evidencia es válido, pero un contrato de validación obsoleto lo rechaza.
- `PIPELINE_MECHANISM_FAILURE`: el mecanismo de transporte/publicación no pudo cerrar la verdad ya producida.

En los dos últimos casos se congela producto y se corrige el mecanismo; no se repite runtime para ocultar el fallo de cierre.

No contiene secretos, PII, datos reales del cliente ni detalles de credenciales.
