# Empalme candidato Claude final — plan seguro v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** plan de empalme aditivo, no reemplazo total.

## 1. Contexto

El candidato final de Claude fue auditado y validado localmente. Además se preparó un candidato documentado con ajustes mínimos de seguridad/copy. Sin embargo, el empalme completo todavía no debe hacerse como reemplazo total porque esta rama ya contiene Backend LAB v1.104 y documentación técnica que el ZIP del prototipo no puede pisar.

## 2. Regla de empalme

El empalme debe ser archivo por archivo y aditivo.

No se permite:

- reemplazar todo el repositorio por el ZIP;
- pisar `data/store.js` sin decisión de backend;
- pisar `data/store-firestore-lab.local.js`;
- eliminar loader/init/guard LAB;
- eliminar tools de smoke/validación;
- borrar docs backend;
- subir secretos o datos reales.

## 3. Archivos protegidos

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-smoke-ays-lab-v99.ps1
tools/orbit360-integrar-backend-lab-index.ps1
tools/orbit360-run-flujo-ays-lab-v99.ps1
tools/orbit360-validar-backend-lab-contrato.mjs
orbit360-platform/docs/RAMA-ACTIVA-OBLIGATORIA-AYS-BACKEND.md
orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260703.md
orbit360-platform/docs/BACKEND-LAB-V104-SEGURIDAD-SECRETS-AUTH-20260703.md
orbit360-platform/docs/REPORTE-CONTINUIDAD-BACKEND-V104-20260703.md
orbit360-platform/docs/PLAN-BACKEND-REAL-POST-V104-20260703.md
orbit360-platform/docs/PENDIENTES-Y-MEJORAS-BACKEND-POST-V104-20260703.md
```

## 4. Archivos aceptables desde Claude con revisión

- `modules/*.js`, siempre que no toquen almacenamiento directo ni reintroduzcan secretos.
- `core/*.js`, excepto backend LAB y store, revisando compatibilidad.
- `styles/*.css`.
- `sw.js` y PWA, si no rompe caché ni datos vivos.
- documentación funcional.
- `index.html` solo con diff controlado para evitar mojibake.

## 5. Orden recomendado

1. Empalmar documentación funcional y matrices del candidato.
2. Empalmar módulos de menor riesgo.
3. Empalmar `core` no backend.
4. Validar sintaxis.
5. Validar contrato backend LAB.
6. Integrar `index.html` localmente con script si aplica.
7. Ejecutar smoke local.
8. Solo después avanzar Firestore/Auth real.

## 6. Estado actual

Backend LAB v1.104 está aplicado. El candidato Claude final sigue pendiente de empalme completo en GitHub. Este documento existe para evitar que el siguiente bloque reemplace accidentalmente los avances backend.
