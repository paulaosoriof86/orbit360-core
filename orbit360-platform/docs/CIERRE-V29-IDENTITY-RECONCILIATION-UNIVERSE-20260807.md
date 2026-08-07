# Orbit 360 A&S — v29 Identity Reconciliation + Universe Gate
Fecha: 2026-08-07
Gate: `block1-client360-insurers-lab-v20260717`
Owner: `1.0.41`
Base autorizada: `b7f35f1a76d43e2485e0631a618a4ef6ec297336`

## Clasificación de causa raíz
`DATA_CONTRACT_FAILURE / CLIENT_PROVENANCE_NOT_DEMONSTRABLE_AFTER_AUTHORIZED_FOCAL_READ` proveniente de v28. No repetir metadatos de procedencia v28.

## Evidencia nueva
La fuente sanitizada de dry-run de clientes documenta 440 filas: 414 candidatas a crear y 26 `REQUIERE_VALIDACION`; dentro de esas 26 existen 16 registros en 8 grupos de duplicado exacto bajo el criterio `IDENTIDAD_NORMALIZADA_IGUAL` y 10 registros en 5 pares probables. `Sin folio cliente` no es identificador real. El reporte prohíbe generar seed/payload real en repositorio.

v29 usa únicamente esa regla de identidad como contrato de reconciliación, sin incorporar valores reales al source. En runtime proyecta el marcador baseline y campos mínimos de identidad de la colección `clientes`, normaliza en memoria, identifica los 16 objetivos por fingerprint de document ID y emite únicamente fingerprint, clasificación y base de decisión.

Orden de adjudicación:
1. documento fuerte exacto contra baseline;
2. identidad normalizada exacta contra baseline según contrato fuente;
3. referencia ficticia del seed actual procesada solo en memoria;
4. únicamente para no resueltos, auditoría externa de creación si existe un registry canónico explícito; no se escanean colecciones por heurística.

Un nombre igual con documento fuerte distinto es contradicción y detiene el gate. `createTime` no demuestra legitimidad. Pólizas, Cobros y financiero histórico quedan fuera.

## Universe gate condicionado
Solo si los 16 quedan resueltos sin contradicción se consultan Aseguradoras y conteo de asesores. El contrato no cambia: 414 / 26 / 7. Una alta legítima objetiva que eleve clientes efectivos sobre 414 produce `VALIDATOR_STALE`, no ajuste del contrato.

## Seguridad
Source-only primero. Runtime máximo lógico: 4 operaciones de lectura si existe auditoría externa registrada; cero Firestore/Auth/operational writes, cero reimportación, Functions, Rules, Hosting, browser, producción, main o merge. Un solo intento runtime. STOP_RETRY sin segundo intento.
