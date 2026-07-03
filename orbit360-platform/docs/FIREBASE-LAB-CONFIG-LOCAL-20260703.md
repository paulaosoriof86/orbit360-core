# Firebase LAB config local — A&S Backend

**Fecha:** 2026-07-03  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**Archivo local real:** `orbit360-platform/core/auth-firebase.config.local.js`  
**Plantilla segura:** `orbit360-platform/core/auth-firebase.config.local.example.js`  
**Preparador:** `tools/orbit360-preparar-config-firebase-lab-local.ps1`

## 1. Objetivo

Permitir que el backend LAB inicialice Firebase/Auth/Firestore sin subir secretos ni configuración sensible al repositorio.

## 2. Archivo protegido

El archivo real local debe llamarse:

```txt
orbit360-platform/core/auth-firebase.config.local.js
```

Este archivo está protegido por `.gitignore` y no debe subirse a GitHub.

## 3. Variables aceptadas por el init

`core/backend-lab-init.js` busca una configuración Firebase en variables globales como:

```txt
window.ORBIT_FIREBASE_LAB_CONFIG
window.ORBIT_FIREBASE_CONFIG
window.firebaseConfigLab
window.firebaseConfigLocal
window.OrbitFirebaseLabConfig
```

La plantilla usa:

```txt
window.ORBIT_FIREBASE_LAB_CONFIG
```

## 4. Preparación local segura

Si falta el archivo local, ejecutar:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/orbit360-preparar-config-firebase-lab-local.ps1
```

El script:

- valida rama obligatoria;
- valida `.gitignore`;
- crea el archivo local desde la plantilla si falta;
- no sobrescribe config existente;
- abre Notepad;
- no hace commit;
- no hace push;
- no imprime secretos en reporte.

## 5. Uso con run maestro

También se puede pedir al run maestro que prepare la config si falta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/orbit360-run-flujo-ays-lab-v99.ps1 -PrepararConfig
```

Después de reemplazar placeholders, ejecutar de nuevo sin `-PrepararConfig`.

## 6. Reglas de seguridad

- No pegar la config Firebase real en chats.
- No subir `auth-firebase.config.local.js` a GitHub.
- No usar config de producción.
- No mezclar tenant A&S LAB con producción.
- No incluir secretos en reportes.

## 7. Estado

**Estado:** LISTO PARA PREPARACIÓN LOCAL.  
**Siguiente paso:** preparar config local solo en el equipo de Paula y ejecutar run maestro.
