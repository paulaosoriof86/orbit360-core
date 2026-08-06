# Actualización del Plan — gate visual corregido 2.7.8

Fecha: 2026-08-05  
Bloque afectado: visualización post-Auth de `RC-AYS-LAB-CANONICA-01`

## Motivo

Dos fallos consecutivos en la preparación del gate activaron `STOP_RETRY`. La causa raíz fue el mecanismo de generación de archivos por plantillas anidadas y sustituciones textuales, no el producto.

## Antes

- generador source-only producía varios owners;
- reparador textual intentaba modificar el generador;
- dos runs fallaron antes de registrar el gate;
- request, secretos, navegador y deploy no se ejecutaron.

## Después

- owners independientes, versionados y revisables;
- generador y reparador retirados;
- prueba source-only del paquete;
- ensayo sintético del router canónico sin secretos ni runtime;
- request continúa ausente hasta PASS completo;
- la autorización visual previamente otorgada permanece reservada y no consumida.

## Criterio de reapertura

Solo se crea el request exclusivo y se ejecuta el riesgo autorizado cuando exista evidencia sanitizada:

`PASS_VISUAL_MATRIX_GATE_PACKAGE_SOURCE_ONLY`

y un ensayo sintético del router canónico con:

`GO_GATE_CONTRACT`

La ejecución posterior conserva backup, máximo un Hosting LAB, precheck, matriz read-only, rollback y `STOP_RETRY` ante cualquier fallo.

## Siguiente acción exacta

1. validar sintaxis y límites del paquete independiente;
2. ejecutar el router canónico contra fixture sintético completo;
3. persistir evidencia source-only;
4. solo con PASS, crear el request exclusivo en un commit de un archivo;
5. ejecutar preflight sin secretos y, con `GO_GATE_CONTRACT`, consumir la autorización runtime.


## Compatibilidad del router canónico

Los gates anteriores se delegan al blob inmutable `03d1c45db555a3e482afb4be6aaf8d29c74a79dc`, conservado como `tools/orbit360-validar-gate-contracts-legacy-v20260717.mjs`. El nuevo gate se resuelve directamente desde el entrypoint canónico; no existe transformación textual del router histórico.
