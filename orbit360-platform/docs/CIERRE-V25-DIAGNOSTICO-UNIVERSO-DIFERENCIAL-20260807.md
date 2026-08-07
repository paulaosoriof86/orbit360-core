# Orbit 360 A&S — v25 diagnóstico diferencial de universo

Fecha: 2026-08-07  
Bloque: 1 — Cliente 360 + Aseguradoras  
Gate: `block1-client360-insurers-lab-v20260717`  
Owner de producto preservado: `1.0.41`  
Base autorizada: `4d8c3f77588853a0abed512c0f19e7efb266d56a`

## Necesidad

v24 cerró `DATA_CONTRACT_FAILURE / UNIVERSE_ADJUDICATION` antes de Hosting con 430/30/7 raw y 430/25/7 efectivos frente al contrato 414/26/7. El producto, el owner, la matriz, el observer y el handoff v24 no son el objeto de v25.

## Fuente/base

El manifiesto controlado del 14-jul registra batch template `ays_clients_insurers_20260714`: 440 filas fuente de clientes, 414 candidatos de escritura, 26 en requiere-validación; 26 aseguradoras, 13 GT + 13 CO, 3 omitidas. El freeze vigente preservó después 414 clientes, 26 aseguradoras activas y 7 asesores.

## Implementación v25

- diagnóstico diferencial por fingerprint estable, sin nombres/correos/documentos;
- pertenencia a baseline probada por batch template, no por posición ni corte numérico;
- Clientes: solo si aparecen exactamente 414 miembros baseline y 16 no-baseline con procedencia objetiva posterior se permite clasificar `VALIDATOR_STALE`;
- Aseguradoras: se distinguen baseline, extras y exclusiones; una exclusión de un miembro baseline exige evidencia objetiva de transición para declarar stale; sin ella se conserva `DATA_CONTRACT_FAILURE` o `REQUIERE_VALIDACION`;
- Asesores: solo control 7/7;
- máximo 3 lecturas Firestore; cero Auth reads/writes, cero Firestore writes, cero Hosting/browser/reimport.

## Gates

Source primero, request ausente. Solo con source PASS se habilita un único request diagnóstico v25. El preflight diagnóstico debe devolver `GO_V25_DIAGNOSTIC_READONLY` antes de secretos y demostrar `firestoreReadsMaximum=3`, writes=0, Auth reads=0, Hosting/browser=false.

## Salida permitida

`VALIDATOR_STALE`, `DATA_CONTRACT_FAILURE`, `REQUIERE_VALIDACION` o `PASS_DATA_CONTRACT`, siempre con matriz sanitizada únicamente de diferenciales. v25 no actualiza contrato ni datos.

## Carriles

A UX/frontend: congelado.  
B control-plane: preflight diagnóstico y one-shot closure.  
C datos/migración: diagnóstico diferencial de procedencia sin writes.

## Siguiente acción

La evidencia runtime decidirá si corresponde actualizar únicamente el contrato, preparar reparación focal de datos o conseguir evidencia adicional de procedencia.
