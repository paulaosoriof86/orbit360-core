/* ============================================================
   Orbit 360 - Firebase LAB local config EXAMPLE
   Copiar este archivo como:

   orbit360-platform/core/auth-firebase.config.local.js

   IMPORTANTE:
   - No subir auth-firebase.config.local.js a Git.
   - El archivo local real ya esta protegido por .gitignore.
   - Reemplazar placeholders con config LAB autorizada.
   - No usar datos ni proyecto de produccion.
   ============================================================ */

window.ORBIT_FIREBASE_LAB_CONFIG = {
  apiKey: "REEMPLAZAR_API_KEY_LAB",
  authDomain: "REEMPLAZAR_PROJECT_ID.firebaseapp.com",
  projectId: "REEMPLAZAR_PROJECT_ID",
  storageBucket: "REEMPLAZAR_PROJECT_ID.appspot.com",
  messagingSenderId: "REEMPLAZAR_MESSAGING_SENDER_ID",
  appId: "REEMPLAZAR_APP_ID"
};

window.OrbitBackend = Object.assign({}, window.OrbitBackend || {}, {
  firebaseConfigSource: "auth-firebase.config.local.js",
  firebaseConfigScope: "lab-only",
  firebaseConfigTenant: "alianzas-soluciones"
});
