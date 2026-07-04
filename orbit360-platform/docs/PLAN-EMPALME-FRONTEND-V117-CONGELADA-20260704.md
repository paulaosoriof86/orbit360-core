# Plan de empalme seguro - frontend v1.117 congelada

Fecha: 2026-07-04
Rama obligatoria: ays/backend-tenant-lab-v99-20260703
PR: #5 draft
Estado: plan previo al empalme. Sin merge, sin deploy, sin Firestore.

## Base candidata

ZIP base frontend congelada:

Prototype Development Request - 2026-07-04T142707.503.zip

La auditoria confirma que frente a la candidata 14:00 solo cambio documentacion:

- docs/BITACORA-CAMBIOS.md
- docs/REPORTE-SMOKE.md

## Regla de empalme

No reemplazar el ZIP completo a ciegas. El empalme debe conservar backend protegido y aplicar solo archivos frontend/prototipo autorizados.

## Backend protegido que no debe pisarse

- orbit360-platform/data/store.js
- orbit360-platform/data/store-firestore-lab.local.js
- orbit360-platform/core/backend-lab-loader.js
- orbit360-platform/core/backend-lab-init.js
- orbit360-platform/core/backend-lab-security-guard.js
- firestore.rules
- tools/orbit360-*

## Archivos candidatos esperados del frontend v1.117

- core/importa.js
- core/integraciones-panel.js
- index.html
- docs/BITACORA-CAMBIOS.md
- docs/REPORTE-SMOKE.md

Si el pipeline detecta otros cambios del ZIP contra la rama, deben revisarse manualmente antes de aplicar.

## Validaciones previas requeridas

1. Inventario del ZIP.
2. Comparacion contra ultima candidata auditada.
3. Preflight de backend protegido.
4. Plan de overlay sin protected files.
5. Preview del overlay.
6. Diff manual.
7. node --check en core, modules y data.
8. Validadores backend LAB.
9. Documentar resultado.

## Decision operativa

La base v1.117 esta congelada para frontend. El siguiente paso es ejecutar pipeline seguro; no hay pendientes nuevos para Claude.
