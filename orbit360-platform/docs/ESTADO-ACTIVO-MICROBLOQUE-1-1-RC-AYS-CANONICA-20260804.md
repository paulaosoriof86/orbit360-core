# ESTADO ACTIVO — MICROBLOQUE 1.1

Fecha: 2026-08-04  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `PASS_CANONICAL_BASELINE`

## Objetivo único

Cerrar una reconciliación forense focalizada del baseline, sin reabrir arquitectura general ni ejecutar Firebase, secretos, deploy o escrituras.

## Entradas obligatorias

- `sourceBaseline`: `548cffa50cddfd93ad2118f5a06e9bb420699bde`;
- plan único de salida;
- ledger vivo;
- PR #5 actualizado;
- evidencia funcional 18/18 PASS;
- causa raíz visual vigente;
- censo source-only de Cobros.

## Salida obligatoria

Un solo informe sanitizado con:

1. owner activo por módulo/ruta;
2. scripts realmente cargados por `index.html`;
3. bridges activos, duplicados u obsoletos;
4. mejor versión aceptada por módulo;
5. diferencias de conteos explicadas por evidencia;
6. archivos protegidos preservados;
7. lista exacta de deltas requeridos antes del validador visual;
8. veredicto `PASS_CANONICAL_BASELINE` o STOP con causa raíz y owner.

## Regla anti-bucle

Este microbloque no puede:

- producir otra candidata;
- crear otro gate;
- crear otro workflow;
- volver a ejecutar los 18 escenarios funcionales;
- reimportar datos;
- resolver visualización tocando datos;
- mezclar Cobros con finmovs;
- pasar al navegador sin cerrar el baseline.

## Siguiente acción exacta

Inspeccionar el `index.html` del baseline y construir la matriz owner → ruta → script → bridge → evidencia, seguida por la reconciliación de conteos.