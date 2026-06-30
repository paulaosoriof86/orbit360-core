# Firebase Auth Activacion Fase 1 LAB

## Alcance

Esta activacion corresponde solo a Fase 1 Auth real en entorno LAB para A&S como primer tenant de Orbit 360 Core. No habilita produccion, no despliega, no migra datos y no cambia `data/store.js`.

## Proyecto autorizado

- Nombre visible: AyS Orbit 360 LAB
- projectId: `ays-orbit-360-lab`
- authDomain: `ays-orbit-360-lab.firebaseapp.com`
- storageBucket: `ays-orbit-360-lab.firebasestorage.app`
- messagingSenderId: `646761409743`
- appId Web: `1:646761409743:web:2ec4595ee9160f9d945bba`

El proyecto antiguo `ays-dashboard-4a575` no se debe conectar ni reutilizar para esta migracion.

## Activacion local

1. Copiar `core/auth-firebase.config.example.js` a `core/auth-firebase.config.local.js`.
2. Confirmar que `core/auth-firebase.config.local.js` queda ignorado por Git.
3. Levantar servidor local desde `orbit360-platform/`.
4. Abrir `http://127.0.0.1:5178/index-dev-auth.html?orbitAuth=firebase`.

El modo demo sigue siendo el default. Firebase Auth solo se activa con `?orbitAuth=firebase` o con la bandera local explicita `localStorage.setItem('orbit360_auth_mode', 'firebase')`.

## Usuario ficticio DEV/LAB

Usar solo usuarios ficticios creados manualmente en Firebase Auth LAB. Ejemplo recomendado:

- Email: `dev.auth.lab@orbit360.test`
- Password: definir temporalmente en Firebase Console LAB

No usar usuarios reales, service accounts, private keys ni Admin SDK.
