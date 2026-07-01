# Workflow Orbit 360 - Actualizacion desde Claude con backend protegido

## Objetivo

Permitir que el prototipo completo generado por Claude sea siempre la base visual y funcional mas reciente, sin perder avances backend.

## Regla principal

Claude entrega el prototipo completo. ChatGPT/Codex conserva y reaplica la capa backend.

## Archivos protegidos backend

- orbit360-platform/data/store.js
- orbit360-platform/data/store-firestore-lab.local.js
- orbit360-platform/index-dev-firestore.html
- orbit360-platform/docs/BACKEND-*.md
- orbit360-platform/docs/CONTRATO-BACKEND-LAB-NO-FALLBACK.md
- orbit360-platform/docs/RESULTADO-BACKEND-*.md
- orbit360-platform/docs/PLAN-INFRAESTRUCTURA.md
- orbit360-platform/docs/BITACORA-CAMBIOS.md
- orbit360-platform/docs/BITACORA-ERRORES.md

## Flujo agil

1. Descargar ZIP nuevo de Claude.
2. Backup automatico del repo y de la capa backend.
3. Instalar ZIP completo como nueva base.
4. Reaplicar backend protegido.
5. Ejecutar smoke automatico:
   - index.html no carga app.js ni demo/index.html.
   - No hay terminos ajenos funcionales.
   - Modulos no usan localStorage.
   - Orbit.store mantiene API all/get/where/insert/update/remove/_emit.
   - Node check sin errores.
6. Documentar resultado.
7. Continuar backend solo si el smoke pasa.

## Separacion de responsabilidades

Claude:
- UX.
- Pantallas.
- Modulos funcionales.
- Visual.
- Flujo comercial.
- Mejoras del prototipo.

ChatGPT/Codex:
- Backend.
- Firestore.
- Auth.
- Orbit.store.
- Tenant.
- Integraciones.
- Smoke.
- Documentacion tecnica.
