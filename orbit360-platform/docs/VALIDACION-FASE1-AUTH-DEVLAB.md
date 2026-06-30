# Validacion Fase 1 Auth DEV/LAB

## Checklist

- Rama: `feat/ays-auth-lab-correction-20260630`
- Proyecto Firebase: `ays-orbit-360-lab`
- Proyecto prohibido: `ays-dashboard-4a575`
- URL Firebase LAB: `http://127.0.0.1:5178/index-dev-auth.html?orbitAuth=firebase`
- URL demo: `http://127.0.0.1:5178/index.html?orbitAuth=demo`

## Validaciones requeridas

- Login con usuario ficticio DEV/LAB en Firebase Auth.
- Logout con `signOut` Firebase.
- Demo sigue funcionando por default.
- `data/store.js` sin cambios.
- `modules/` sin cambios.
- `styles/` sin cambios.
- Sin referencia activa a `ays-dashboard-4a575`.

## Usuario ficticio

Crear en Firebase Auth LAB si aun no existe:

- Email: `dev.auth.lab@orbit360.test`
- Tipo: Email/password
- Datos: ficticios

No cargar usuarios reales ni datos reales.
