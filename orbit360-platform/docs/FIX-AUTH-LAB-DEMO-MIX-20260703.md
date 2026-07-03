# Fix Auth LAB · Separacion de credenciales demo y Firestore LAB

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Archivo corregido:** `orbit360-platform/core/auth.js`  
**Commit:** `c5f1df22c12499501b013ad6344eb8ded0247113`

---

## 1. Sintoma reportado

Al recargar la URL LAB:

`/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones`

Paula observa que aparecen o se mezclan las credenciales demo (`admin@demo.com` / `demo123`) con el usuario Firestore (`orbit.lab@demo.com`). El formulario queda en modo mixto y el login Firestore no funciona de forma confiable.

---

## 2. Causa raiz

El `index.html` del prototipo trae valores demo incrustados en los inputs:

- usuario demo,
- contrasena demo.

Luego `core/auth.js` intentaba convertir esos valores a LAB cuando detectaba `orbitBackend=firestore-lab`. Esto generaba un estado transitorio/mix entre demo y LAB, especialmente con autofill/cache del navegador.

---

## 3. Fix aplicado

Se actualizo `core/auth.js` para separar el comportamiento:

1. Demo normal:
   - mantiene `admin@demo.com` / `demo123` como credenciales demo.
   - conserva usuario ficticio `Andrea Beltran`.
2. Firestore LAB:
   - fuerza usuario `orbit.lab@demo.com` si detecta usuario demo o campo vacio.
   - limpia `demo123` si aparece como contrasena en modo LAB.
   - elimina sesion demo local al entrar en modo LAB.
   - reintenta limpiar valores demo con pequenos retardos para evitar autofill tardio del navegador.
   - si el usuario intenta enviar `demo123` en modo LAB, muestra error explicito: usar contrasena LAB guardada.

---

## 4. Impacto

- Evita mezcla demo/LAB en el formulario.
- No cambia `data/store.js`.
- No cambia `store-firestore-lab.local.js`.
- No toca main.
- No hace deploy.
- No expone claves ni contrasenas.

---

## 5. Estado

**RESUELTO EN GITHUB / PENDIENTE SINCRONIZAR LOCAL Y RETEST.**

Siguiente paso local:

1. traer solo `core/auth.js` actualizado desde GitHub,
2. recargar LAB con `Ctrl + F5`,
3. confirmar que no aparece `admin@demo.com` ni `demo123` en modo LAB,
4. probar clave LAB guardada,
5. completar smoke con `OrbitBackend.status()` y escritura ficticia.
