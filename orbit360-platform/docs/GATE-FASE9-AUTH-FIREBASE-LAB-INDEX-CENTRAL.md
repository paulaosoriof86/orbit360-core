# GATE FASE 9 - Auth/Firebase LAB sobre index.html central

Fecha actualización: 2026-07-01 20:04 local
Estado: BLOQUEADO / PAUSADO POR CONFIG LOCAL NO INICIALIZABLE Y RIESGO VISUAL.

## Objetivo

Validar Auth/Firebase LAB sobre `index.html` central, con usuario LAB y snapshots reales, sin usar `index-dev-firestore.html` y sin tocar módulos funcionales.

## Resultado acumulado

### Avances confirmados

- Fase 8 sigue válida: `Orbit.store` existe, API expandida completa, `backendMode = firestore-lab`, `backendTenant = alianzas-soluciones`, 27 colecciones y sin errores JS globales.
- `core/auth.js` fue preparado en rama para usar Firebase Auth solo cuando el backend sea `firestore-lab`, conservando demo/local fuera de LAB.
- `core/backend-lab-loader.js` fue creado para cargar SDK/config solo en LAB.
- `core/backend-lab-init.js` fue creado para intentar inicializar Firebase desde config local reconocida.
- `tools/orbit360-fase9-auth-lab-index-central.ps1` y `tools/orbit360-fase9-auth-lab-index-central-v2.ps1` quedaron preparados para smoke local.
- `core/auth-firebase.config.local.js` fue recuperado desde backup local y confirmado como ignorado por Git.

### Fallo Fase 9 V1

- `firebaseDetected = true`.
- `firebaseApps = 0`.
- `authUser = null`.
- `snapshotAttached = false`.
- `snapshotAttachedCount = 0`.
- Estado: `waiting-firebase`.

Conclusión: SDK detectado, pero Firebase no inicializado.

### Fallo Fase 9 V2

- `firebaseDetected = true`.
- `firebaseApps = 0`.
- `firebaseInit = config-not-found`.
- `firebaseInitError = Local config did not expose a recognized Firebase config object`.
- `authUser = null`.
- `snapshotAttached = false`.
- `snapshotAttachedCount = 0`.

Conclusión: la config local existe, pero no expone un objeto Firebase reconocible por el inicializador. No se debe pegar ni subir esta config.

### Fase 9 V3 local

Se agregó un puente local dentro de `auth-firebase.config.local.js`, archivo ignorado por Git. No se subieron secretos. Debe considerarse intervención local temporal.

## Riesgo visual detectado

Durante Fase 9 se hizo visible nuevamente el problema de mojibake/encoding en UI:

- `IngresÃ¡`, `sesiÃ³n`, `paÃ­ses`, `GestiÃ³n`, símbolos/emoji dañados.
- También se ven badges `BETA` en sidebar.

Este problema ya estaba detectado en smoke previo de v1.73 y debe pasar a Claude como P0 visual/base. No debe corregirse dentro del backend ni mezclarse con Auth.

## Decisión metodológica

Fase 9 queda PAUSADA. No marcar como completada hasta resolver:

1. Formato de config Firebase LAB local sin exponer secretos.
2. Inicialización real `firebase.initializeApp(...)`.
3. Login con usuario LAB.
4. `OrbitBackend.status().auth.uid` con UID esperado.
5. `snapshotAttached = true` y `snapshotAttachedCount > 0`.
6. UI sin retrocesos visuales por encoding, o al menos documentada para Claude y no atribuida al backend.

## Criterio de cierre Fase 9

- URL central: `index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones`.
- Firebase SDK detectado.
- Config local detectada, sin versionar secretos.
- `firebaseApps > 0`.
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

## Acción segura inmediata

Restaurar `index.html` local si quedó modificado por scripts fallidos y mantener el gate pausado. La config local puede conservarse con backup, pero no debe subirse.

## Estado

BLOQUEADO / PAUSADO - requiere revisión de config local Firebase LAB sin exponer secretos y corrección visual separada para Claude.