# Fix post-empalme v1.97 · Auth LAB

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Archivo corregido:** `orbit360-platform/core/auth.js`  
**Commit de empalme detectado:** `8c6a1a10c4fa1ddf61ace88a30b84a55feba6223`  
**Commit de corrección:** `2361a1ac55bb9f28236eddc684ae4282c6fffa54`

---

## 1. Hallazgo

El lote v1.97 sí se aplicó y el commit `8c6a1a1` quedó disponible en GitHub, aunque el reporte local mostró `ERROR: git push falló`.

Al revisar el commit remoto se detectó una regresión crítica:

- `core/auth.js` fue reemplazado por la versión demo pura de Claude.
- Esa versión eliminaba la lógica Firebase LAB:
  - `isLab()`,
  - `fbAuth()`,
  - `fbUser()`,
  - `mapFbUser()`,
  - `loginFirebase()`,
  - `onAuthStateChanged()`.

Esto habría roto el ingreso real del modo:

`?orbitBackend=firestore-lab&tenant=alianzas-soluciones`

---

## 2. Corrección aplicada

Se restauró `core/auth.js` como archivo dual:

1. **Demo normal:** conserva identidad ficticia v1.97:
   - usuario demo `Andrea Beltrán`,
   - email configurable desde login,
   - sesión local demo.
2. **Firestore LAB:** restaura:
   - detección `orbitBackend=firestore-lab`,
   - login por Firebase Auth,
   - default `orbit.lab@demo.com`,
   - `loginFirebase(email, pass)`,
   - `auth.onAuthStateChanged`,
   - `logout()` con `signOut()`,
   - `user()` mapeado desde Firebase.

---

## 3. Impacto

- Backend LAB vuelve a poder iniciar sesión con Firebase Auth.
- El prototipo demo conserva el saneamiento de identidad ficticia de Claude.
- No se toca `main`.
- No hay deploy.
- No se toca Hosting.
- No se agregan secretos al repo.

---

## 4. Estado

**RESUELTO EN BACKEND LAB.**

Pendiente smoke real:

1. demo normal sin querystring,
2. LAB con `?orbitBackend=firestore-lab&tenant=alianzas-soluciones`,
3. confirmar login Firebase,
4. confirmar `OrbitBackend.status().apiVersion === 'v1.74-firestore-lab-write-status'`,
5. confirmar escritura ficticia y eventos `write-pending/write-ok`.
