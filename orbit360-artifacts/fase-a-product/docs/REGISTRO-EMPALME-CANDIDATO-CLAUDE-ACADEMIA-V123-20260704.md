# Registro de empalme - candidato Claude Academia v1.123

Fecha: 2026-07-04
ZIP: Prototype Development Request - 2026-07-04T152321.882.zip
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft

## Estado

Auditoria completada y documentada.

Empalme seguro definido como aditivo. No se debe reemplazar ZIP completo a ciegas.

## Archivos del candidato que deben aplicarse al repo

- `orbit360-platform/data/academia-plus.js` nuevo.
- `orbit360-platform/index.html` con carga de `data/academia-plus.js?v1311` y cache-busts.
- `orbit360-platform/modules/academia.js` con `fmtSec()` y cambio de KPI a catalogo.
- `orbit360-platform/styles/base.css` con fix de KPI clickable.
- `orbit360-platform/styles/infra.css` con fix de legibilidad en leccion activa.
- `orbit360-platform/docs/BITACORA-CAMBIOS.md` con entradas v1.118-v1.123.

## Backend protegido que no debe cambiar

- `orbit360-platform/data/store.js`
- `orbit360-platform/data/store-firestore-lab.local.js`
- `orbit360-platform/core/backend-lab-loader.js`
- `orbit360-platform/core/backend-lab-init.js`
- `orbit360-platform/core/backend-lab-security-guard.js`
- `firestore.rules`
- `tools/orbit360-*`

## Validaciones realizadas localmente

- `node --check` core/data/modules: OK.
- Diff contra 14:27: 1 agregado, 5 modificados, 0 eliminados.
- Backend protegido sin cambios frente a la candidata anterior.

## Nota operativa

Los archivos frontend grandes del candidato deben aplicarse usando pipeline local/Git o Codex cuando este disponible, porque no deben copiarse a mano ni por reemplazo ZIP completo. La auditoria y plan quedan en repo para que no se pierda el alcance.

Si se aplica localmente, ejecutar:

1. preflight de archivos protegidos;
2. overlay solo de los 6 archivos listados;
3. diff manual;
4. `node --check`;
5. validador backend LAB;
6. smoke local real;
7. documentar resultado final.

## Decision

Candidato aprobado para convertirse en nueva base frontend de Academia, sujeto a empalme seguro de archivos listados.
