# Orbit 360 A&S — v26 cierre source de causa raíz

Fecha: 2026-08-07  
Bloque: 1 — Cliente 360 + Aseguradoras  
Gate: `block1-client360-insurers-lab-v20260717`  
Owner preservado: `1.0.41`  
Base autorizada: `7f4c76db09b164e0f05d5a53d7ba284932be8fa2`

## Alcance

v26 es exclusivamente source-only. No crea request runtime, no lee LAB, no usa secretos, no ejecuta Hosting/browser y no modifica datos ni contrato.

## Causa raíz de entrada

v25 separó dos fenómenos:
- Aseguradoras: `VALIDATOR_STALE` por tratar `codigo`/`codigoIntermediario` como clave universal de deduplicación pese a que la fuente controlada admite colisiones entre entidades distintas.
- Clientes: 414 miembros baseline demostrados y 16 no-baseline sin procedencia suficiente; estado `REQUIERE_VALIDACION`.

## Implementación v26

1. `orbit360-insurer-identity-dedupe-v26-v20260807.mjs`: contrato reusable de identidad. Código de fuente no excluye por sí solo; duplicado automático exige identidad legal compuesta. Colisiones ambiguas permanecen efectivas y se marcan `REQUIERE_VALIDACION`.
2. `orbit360-adjudicate-block1-universe-readonly-v26-v20260807.mjs`: adjudicador corregido para el próximo gate; en v26 solo se valida source.
3. `orbit360-reconcile-client-provenance-v26-source-v20260807.mjs`: toma únicamente los 16 fingerprints sanitizados de v25 y busca evidencia de sus locators en seed, manifests, bitácoras, artifacts y herramientas actuales/históricas permitidas. No usa Pólizas, Cobros ni financiero.
4. El reconciliador no imprime IDs candidatos: solo fingerprints ya sanitizados, clases de fuente y hashes de rutas.
5. Si la fuente no contiene el locator de un fingerprint, no inventa procedencia. Documenta que un fingerprint SHA-256 es one-way y no sirve como locator Firestore.

## Contratos preservados

- Clientes: 414, sin actualización autorizada.
- Aseguradoras: 26, sin actualización autorizada.
- Asesores: 7.
- Producto, owner 1.0.41, matriz, observer, Auth, Orbit.store, importadores, PWA, Rules y backend protegido: congelados.

## Regla de salida

El único source gate debe validar fixtures, reconciliación documental, invariancia y cero capacidades runtime. Si queda algún cliente sin procedencia objetiva, v26 termina `REQUIERE_VALIDACION` y solo diseña el mínimo contrato focal posterior; no lo ejecuta.
