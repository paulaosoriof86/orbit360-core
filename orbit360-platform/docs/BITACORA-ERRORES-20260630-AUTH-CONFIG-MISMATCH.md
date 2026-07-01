# Bitácora de Errores — Auth config LAB 2026-06-30

## Incidencia

- Fecha: 2026-06-30.
- Módulo/área: Auth LAB / Store Firestore LAB.
- Síntoma: `index-dev-firestore.html` limpio abrió sin mojibake, pero Auth mostró alerta: Firebase Auth LAB requiere config local de `ays-orbit-360-lab`.
- Esperado: Auth y Store deben leer la configuración LAB local ya existente.
- Causa raíz: `auth-firebase.config.local.js` define `window.Orbit.firebaseAuthConfig`, mientras `core/auth.js` buscaba `window.OrbitFirebaseAuthConfig`.
- Archivo/función: `core/auth.js` / `ensureFirebase`; `data/store.js` / inicialización Firebase previa a Firestore.
- Fix aplicado localmente: compatibilidad con ambos nombres de configuración: `window.Orbit.firebaseAuthConfig` y `window.OrbitFirebaseAuthConfig`.
- Impacto en prototipo comercializable: permite continuar validación backend Firestore LAB sin tocar módulos ni rediseñar frontend.
- Estado: EN PROGRESO hasta validar login LAB limpio.

## Protección

- No se tocaron módulos.
- No se hizo deploy.
- No se hizo push desde local.
- No se usaron datos reales.
- Se mantiene `Orbit.store` como única capa de datos.
