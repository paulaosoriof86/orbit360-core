# Orbit 360 - Backend LAB Fase 0

Fecha: 2026-07-01.

## Objetivo
Continuar la migración backend sobre el último prototipo auditado, separando estrictamente la vista visual cliente del laboratorio técnico.

## Separación de puertos
- 5178: preview visual cliente.
- 5177: laboratorio backend.

## Archivos técnicos de esta fase
- `index-dev-firestore.html`
- `data/store-firestore-lab.local.js`
- `core/firebase-lab.local.example.js`
- `tools/orbit360-static-server.cjs`
- `tools/orbit360-open-backend-lab.ps1`
- `tools/orbit360-open-visual-preview.ps1`
- `docs/firestore-lab.rules.example`

## Reglas
- No producción.
- No deploy.
- No datos reales.
- No tocar módulos para conectar backend; el contrato es `Orbit.store`.

## Siguiente fase
Validar laboratorio local, luego avanzar a autenticación LAB, reglas por tenant y migración gradual de configuración/catálogos.
