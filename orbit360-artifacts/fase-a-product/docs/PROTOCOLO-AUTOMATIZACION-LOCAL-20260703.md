# Protocolo de automatizacion local · Orbit 360

**Fecha:** 2026-07-03  
**Proyecto:** Orbit 360 / A&S / Backend LAB  
**Rama:** `ays/backend-tenant-lab-v99-20260703`

---

## 1. Problema

El proceso local se volvio demasiado manual y genero reprocesos:

- bloques PowerShell largos,
- errores rojos por pegar reportes en consola,
- `git clean` bloqueando OneDrive/agentes,
- dependencia accidental de Python,
- scripts que fallan por stderr de Git,
- configuracion LAB validada despues de pedir credenciales,
- mezcla visual demo/LAB en login.

Paula necesita usar Orbit 360 el mismo dia, por lo que el flujo debe minimizar intervencion manual.

---

## 2. Regla operativa desde ahora

Para Orbit 360, el trabajo local debe seguir esta regla:

1. ChatGPT/Codex hace en GitHub todo lo que pueda hacer directamente.
2. Paula solo ejecuta PowerShell cuando sea estrictamente necesario por depender de archivos locales, credenciales locales, servidor local o Firebase local.
3. Cuando sea necesario PowerShell, se entrega preferentemente un paquete one-click (`.cmd` + `.ps1`) o un unico bloque corto.
4. No se entregan cadenas de comandos interactivas.
5. No se pide pegar reportes en PowerShell.
6. No se usa `git clean` salvo autorizacion expresa.
7. No se asume Python; usar Node.
8. No se toca `main`, no deploy, no Hosting, no produccion.

---

## 3. Flujo one-click recomendado

Cada release candidate de Claude se maneja asi:

1. Auditar ZIP en ChatGPT.
2. Documentar cerrados, abiertos y regresiones.
3. Empalmar cambios en GitHub preservando backend LAB.
4. Crear, si hace falta, un paquete local one-click para Paula:
   - descarga/descomprime,
   - doble clic,
   - valida archivos criticos,
   - sincroniza solo archivos necesarios,
   - levanta servidor Node,
   - abre Demo y LAB,
   - deja reporte.
5. Paula confirma visualmente solo los puntos que no pueden verificarse desde GitHub.

---

## 4. Archivos protegidos en empalmes

No reemplazar a ciegas:

- `core/auth.js`
- `data/store.js`
- `data/store-firestore-lab.local.js`
- `core/backend-lab-loader.js`
- `core/backend-lab-init.js`
- `core/auth-firebase.config.local.js`

Si Claude trae cambios en esos archivos, se hace merge manual y se documenta.

---

## 5. Estado actual v1.97

Se preparo un paquete local one-click para reparar Auth LAB y abrir v1.97:

- actualiza `core/auth.js` desde rama LAB,
- parchea localmente `index.html` para evitar cache y credenciales demo incrustadas,
- valida `auth-firebase.config.local.js`,
- usa Node como servidor,
- abre Demo y LAB,
- no usa `git clean`,
- no usa Python,
- no toca main ni deploy.

---

## 6. Estado

**ACTIVO COMO REGLA DE TRABAJO.**

Este protocolo debe consultarse antes de dar nuevas instrucciones locales a Paula.
