# P0 Auth LAB · Config local faltante / carga no confirmada

**Fecha:** 2026-07-03  
**Proyecto:** Orbit 360 / Backend LAB  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Area:** Auth / Firebase LAB / smoke local

---

## 1. Sintoma

Durante el smoke LAB, la pantalla de login mostro que Firebase Auth LAB no estaba disponible y solicito verificar el archivo local de configuracion.

Esto ocurre antes de validar la clave. Por tanto, no se debe asumir que la contrasena sea incorrecta hasta confirmar que el SDK/config local cargo correctamente.

---

## 2. Diagnostico actualizado

Paula ejecuto diagnostico local y el resultado confirma:

- `core/auth-firebase.config.local.js` existe en destino.
- Contiene `firebaseConfig`.
- Contiene `apiKey`.
- Contiene `authDomain`.
- Contiene `projectId`.
- Contiene `initializeApp`.
- No se imprimieron claves ni contrasenas.

Por tanto, el bloqueo ya no debe tratarse como archivo faltante. El siguiente paso es verificar carga en navegador:

1. recarga dura `Ctrl + F5` en la pestaña LAB,
2. confirmar que desaparece el mensaje `Firebase Auth LAB no disponible`,
3. si persiste, validar por consola/HTTP que el navegador esta sirviendo el archivo local actualizado y que `firebase.auth()` queda disponible.

---

## 3. Causa probable actual

Posibles causas restantes:

- cache del navegador despues de restaurar/configurar archivo local,
- servidor local corriendo antes de restaurar el archivo,
- error JS dentro de la config local aunque tenga las claves esperadas,
- configuracion Firebase incompatible con el SDK compat cargado,
- orden de carga entre `backend-lab-loader`, `auth-firebase.config.local.js` y `core/auth.js`.

---

## 4. Riesgo

- Bloquea el smoke LAB aunque demo normal funcione.
- Puede generar confusion con credenciales si se intenta cambiar contrasena antes de verificar config.
- Repite el patron de depender de archivos locales no verificados antes de pedir login.

---

## 5. Regla de no repeticion

Antes de pedir ingreso a LAB, el smoke debe verificar:

1. existencia de `core/auth-firebase.config.local.js`,
2. que el archivo cargue sin error JS,
3. que `window.firebase` y `firebase.auth()` esten disponibles,
4. que `OrbitBackend.status()` reporte modo LAB,
5. solo despues probar credenciales.

---

## 6. Estado

**EN PROGRESO / P0 operativo.**

Pendiente inmediato:

1. recargar LAB con `Ctrl + F5`,
2. probar nuevamente login con la contrasena guardada,
3. si falla, ejecutar diagnostico de navegador sin exponer secretos,
4. completar smoke LAB:
   - `OrbitBackend.status()`,
   - prueba ficticia de escritura,
   - `writeQueue/writeErrors`.
