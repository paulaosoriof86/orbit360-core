# GATE FASE 9 - Auth/Firebase LAB sobre index.html central

Fecha: 2026-07-01 19:48 local
Estado: PREPARADO / BLOQUEADO POR AUTH DEMO EN CORE.

## Objetivo

Validar Auth/Firebase LAB sobre `index.html` central, con usuario LAB y snapshots reales, sin usar `index-dev-firestore.html` y sin tocar módulos funcionales.

## Diagnóstico directo en GitHub

### `core/auth.js`

Estado actual: demo/localStorage.

Hallazgos:

- Usa `localStorage` para `orbit360_session` y `orbit360_confidencialidad`.
- `authed()` depende de sesión local.
- `login()` guarda usuario demo/local.
- `logout()` borra sesión local.
- `user()` lee sesión local.
- No llama `firebase.auth().signInWithEmailAndPassword()`.
- No usa `firebase.auth().currentUser` como fuente de sesión LAB.

Conclusión: Auth LAB real no está conectado todavía en `core/auth.js`.

### `index.html`

Estado actual: ruta central con `store.js -> store-firestore-lab.local.js -> seed.js` correcto.

Hallazgos:

- No carga Firebase SDK compat/modular.
- No carga `core/auth-firebase.config.local.js`.
- El hook LAB puede preparar Firestore, pero sin SDK/config/Auth no puede adjuntar snapshots reales.

Conclusión: `index.html` central aún requiere loader LAB seguro para Firebase/config local.

## Resultado previo que NO debe repetirse

Fase 8 ya validó:

- `window.Orbit`: true.
- `Orbit.store`: true.
- API expandida completa: true.
- `pref/setPref` roundtrip: true.
- `backendMode`: `firestore-lab`.
- `backendTenant`: `alianzas-soluciones`.
- Sin errores JS globales.

No repetir Fase 8 salvo después de cambiar Auth/loader.

## Bloqueo real

Fase 9 no debe marcarse como completada hasta que:

1. `index.html` central cargue Firebase LAB solo cuando `?orbitBackend=firestore-lab`.
2. La configuración local siga ignorada por Git y no se suban secretos.
3. `core/auth.js` use Firebase Auth cuando el backend sea `firestore-lab`.
4. Si no hay usuario Firebase autenticado, LAB no debe abrir dashboard con sesión demo/local.
5. `OrbitBackend.status()` confirme Auth LAB y snapshots reales.

## Criterio de cierre Fase 9

- URL central: `index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones`.
- Firebase SDK detectado.
- Config local detectada, sin versionar secretos.
- Usuario LAB autenticado: `orbit.lab@demo.com` / UID esperado.
- `OrbitBackend.status().auth.uid` coincide con el usuario LAB esperado.
- `snapshotAttached = true`.
- `snapshotAttachedCount > 0`.
- `Orbit.store` mantiene API completa.
- No fallback a seed/localStorage como fuente de verdad en LAB.
- Sin errores JS globales.

## Restricciones

- No deploy.
- No Hosting.
- No producción.
- No datos reales nuevos.
- No módulos tocados.
- No secretos en GitHub.
- No usar `index-dev-firestore.html` como ruta central.

## Próximo cambio seguro

Preparar fix mínimo en:

1. `core/backend-lab-loader.js` nuevo: carga Firebase SDK + config local solo si `orbitBackend=firestore-lab`.
2. `index.html`: incluir loader antes de `data/store.js`.
3. `core/auth.js`: soportar Firebase Auth en modo LAB, conservando demo/local fuera de LAB.
4. Smoke local único para confirmar Auth + snapshots.

## Estado

PREPARADO / BLOQUEADO - requiere fix Auth/loader antes de validar Fase 9.