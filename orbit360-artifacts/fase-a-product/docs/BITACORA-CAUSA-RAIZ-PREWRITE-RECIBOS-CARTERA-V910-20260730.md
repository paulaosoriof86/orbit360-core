# BITÁCORA — CAUSA RAÍZ PREWRITE RECIBOS/CARTERA 9.1.0

Fecha: 2026-07-30 / corte operativo Guatemala  
Gate: `block9-receipts-portfolio-static-v20260730`  
Contrato: `9.1.0`

## Incidencia

El primer intento del prewrite read-only 9.1.0, run `30602732429`, se detuvo en la etapa de descarga privada antes de ejecutar cualquier lectura de Firestore.

## Clasificación

`PIPELINE_MECHANISM_FAILURE`.

No fue un defecto funcional, de datos, permisos de Drive, secreto, Firebase ni contrato. El gate canónico anterior cerró `30/30` en `GO_GATE_CONTRACT` y la etapa de preparación también pasó.

## Causa raíz

El workflow construyó incorrectamente el valor estándar OAuth JWT de `grant_type`. Se generó una URI distinta de la requerida por Google OAuth, lo que produjo `OAUTH_400` antes de solicitar los archivos.

La forma correcta es exactamente:

`urn:ietf:params:oauth:grant-type:jwt-bearer`

## Corrección focal

Corregir únicamente esa constante en `.github/workflows/orbit360-receipts-portfolio-prewrite-readonly-v910-20260730.yml`.

No cambian:

- contrato 9.1.0;
- gate;
- paquetes privados;
- hashes;
- conteos 1293 / 673 / 32;
- writer;
- baseline;
- Firestore Rules/Auth;
- Pólizas/Vehículos;
- autorización de escritura.

## Evidencia del intento fallido

- gate: PASS;
- secretos: accedidos solo después del gate;
- Drive download: no iniciado con token válido;
- Firestore read: no ejecutado;
- Firestore write: 0;
- operational writes: 0;
- deploy/producción: 0.

## Regla de no repetición

No reintentar el mismo workflow sin corregir la URI de OAuth. El siguiente intento debe reutilizar exactamente el mismo contrato y las mismas fuentes, cambiando solo el mecanismo defectuoso.

Estado: `ROOT_CAUSE_IDENTIFIED_CORRECTION_FOCAL_READY`.
