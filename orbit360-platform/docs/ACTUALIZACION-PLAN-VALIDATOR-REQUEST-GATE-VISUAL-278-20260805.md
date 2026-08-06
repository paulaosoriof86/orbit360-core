# Actualización del Plan — validator de identidad del request visual 2.7.8

## Bloque

Visualización post-Auth de `RC-AYS-LAB-CANONICA-01`.

## Antes

El request se consideraba válido solo cuando su ruta aparecía una vez en toda la historia Git.

## Después

La identidad se define por el commit actual:

- request en `HEAD`;
- padre real igual a `parentHead`;
- diff del commit limitado al request;
- contrato y alcance exactos;
- router canónico todavía obligatorio antes de secretos.

## Evidencia nueva

- run `31071875782`: STOP antes del router y sin riesgo abierto;
- prueba sintética: `PASS_REQUEST_IDENTITY_ROOTCAUSE_SYNTHETIC`;
- request anterior retirado y replay prohibido.

## Estado

- paquete independiente 2.7.8: conservado;
- sourcefix de identidad: PASS;
- lifecycle: pendiente de autorización nueva;
- request activo: ninguno;
- Hosting LAB: sin cambios;
- `PASS_VISUAL_POST_AUTH`: pendiente.

## Próximo cierre

Una nueva autorización debe cubrir en un solo bloque: activación del lifecycle, request exclusivo, `GO_GATE_CONTRACT`, backup, máximo un Hosting LAB, precheck, matriz read-only, rollback y cierre del request.
