# Avance Carga Mock LAB Integraciones · Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Base:** Claude v1.97

---

## 1. Objetivo

Permitir que el mock LAB de integraciones se cargue bajo demanda desde `Orbit.integraciones`, sin tocar `index.html` y sin activar envíos reales.

---

## 2. Archivo actualizado

- `core/integraciones.js`

Commit:

- `242ff505871ad6d9e51a1251c57b9c8087dc902a` · `feat(integraciones): cargar mock LAB bajo demanda`

---

## 3. Versión del helper

`Orbit.integraciones` pasa a:

- `v0.5-lab-mock-loader`

---

## 4. API agregada

Se agregan:

- `Orbit.integraciones.ensureLabMock(cb)`
- `Orbit.integraciones.labMock(action, idEvento, opts)`

`ensureLabMock` carga:

- `core/integraciones-lab-mock.js?v1296`

solo cuando se necesita.

---

## 5. Uso esperado en LAB

Ejemplo futuro, solo para pruebas ficticias:

```js
Orbit.integraciones.labMock('ciclo', eventoId, { forzar: true })
```

Acciones soportadas por el mock:

- `enviar`
- `confirmar`
- `fallar`
- `ciclo`

---

## 6. Seguridad

- No toca `index.html`.
- No llama redes externas.
- No contiene credenciales.
- No contiene webhooks.
- No hace deploy.
- No toca producción.
- Solo funciona sobre eventos ya registrados en `eventosIntegracion`.

---

## 7. Pendiente UI

El siguiente paso, cuando toque, es agregar un botón LAB en el panel diagnóstico:

- “Simular ciclo LAB”

Ese botón debe estar visible solo en demo/LAB, nunca como funcionalidad de producción.

---

## 8. Estado

**RESUELTO EN CORE / PENDIENTE BOTÓN LAB Y VALIDACIÓN LOCAL.**
