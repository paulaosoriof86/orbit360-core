# P0 Auth LAB · Config local faltante

**Fecha:** 2026-07-03  
**Proyecto:** Orbit 360 / Backend LAB  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Area:** Auth / Firebase LAB / smoke local

---

## 1. Sintoma

Durante el smoke LAB, la pantalla de login muestra que Firebase Auth LAB no esta disponible y solicita verificar el archivo local de configuracion.

Esto ocurre antes de validar la clave. Por tanto, no se debe asumir que la contrasena sea incorrecta hasta confirmar que el SDK/config local cargo correctamente.

---

## 2. Causa probable

El archivo local protegido de configuracion Firebase no esta presente, no esta en la ruta esperada o no fue cargado por el shell local.

Este archivo es intencionalmente local y no debe subirse al repositorio porque puede contener configuracion operativa del backend LAB.

---

## 3. Riesgo

- Bloquea el smoke LAB aunque demo normal funcione.
- Puede generar confusion con credenciales si se intenta cambiar contrasena antes de verificar config.
- Repite el patron de depender de archivos locales no verificados antes de pedir login.

---

## 4. Regla de no repeticion

Antes de pedir ingreso a LAB, el smoke debe verificar:

1. existencia de `core/auth-firebase.config.local.js`,
2. que el archivo cargue sin error JS,
3. que `window.firebase` y `firebase.auth()` esten disponibles,
4. que `OrbitBackend.status()` reporte modo LAB,
5. solo despues probar credenciales.

---

## 5. Estado

**ABIERTO / P0 operativo.**

Pendiente restaurar o crear la config local fuera del repositorio, ejecutar smoke y validar login LAB.
