# Avance Seed Marketing + Integraciones · Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Base:** Claude v1.97  
**Archivo modificado:** `core/integraciones.js`

---

## 1. Motivo

El seed principal `data/seed.js` ya contiene `contenidos`, pero no tenía todavía las colecciones requeridas para el flujo operativo de Marketing + Integraciones:

- `integraciones`
- `eventosIntegracion`
- `campanas`
- `piezas`
- `metricasMarketing`

Tocar directamente `data/seed.js` es más riesgoso porque es un archivo grande y lo puede reemplazar Claude en nuevas iteraciones. Se decidió extender el seed desde `core/integraciones.js`, que carga después de `data/seed.js` y antes de `Orbit.store.init(...)`.

---

## 2. Avance aplicado

Commit:

- `23fca9827cab93c8da516037392c73a7f27341e6` · `feat(integraciones): extender seed demo marketing`

Cambios:

- `Orbit.integraciones` pasa a versión `v0.2-demo-marketing-seed`.
- Se agrega `extendSeed()`.
- Se inicializan colecciones demo si no existen.
- Se amplían contenidos demo con campos operativos:
  - `tenantId`
  - `campanaId`
  - `objetivo`
  - `publico`
  - `pais`
  - `piezaIds`
  - `programacion`
- Se generan piezas demo para los primeros contenidos.
- Se normalizan métricas publicadas en `metricasMarketing`.
- Se eleva estructura demo a `__v = 37` para forzar re-siembra segura del demo.

---

## 3. Seguridad

- No hay datos reales.
- No hay secretos.
- No hay webhooks.
- No hay envíos reales.
- No se toca producción.
- No se toca Firestore directamente.
- Se mantiene `Orbit.store` como única capa de datos.
- No se usa `localStorage` desde módulos.

---

## 4. Integraciones demo inicializadas

Quedan como `pendiente_configuracion`:

- Make
- Metricool
- Canva
- Google Sheets

Esto permite probar trazabilidad sin activar conexiones reales.

---

## 5. Pendiente para Claude

Claude debe conservar esta estructura en próximas versiones:

1. No borrar `core/integraciones.js`.
2. No quitar la carga de `core/integraciones.js` desde `index.html`.
3. Mantener compatibilidad de `modules/marketing.js` con:
   - `campanas`
   - `piezas`
   - `metricasMarketing`
   - `eventosIntegracion`
   - `integraciones`
4. Mejorar UI para mostrar campañas, piezas, métricas e historial de integración.
5. Si decide mover la extensión al `seed.js`, debe hacerlo sin hardcodear A&S y manteniendo versión/compatibilidad.

---

## 6. Estado

**RESUELTO EN BACKEND BRANCH / PENDIENTE UX CLAUDE.**

Marketing ya cuenta con estructura demo viva para pasar de calendario simple a centro operativo de campañas, piezas, programación y métricas.
