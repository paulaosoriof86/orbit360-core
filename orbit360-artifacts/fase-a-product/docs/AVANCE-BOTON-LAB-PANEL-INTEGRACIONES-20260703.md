# Avance Botón LAB en Panel de Integraciones · Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Base:** Claude v1.97

---

## 1. Objetivo

Agregar una acción controlada en el panel diagnóstico para simular el ciclo de integración en LAB, sin llamadas externas y sin presentar la simulación como integración real.

---

## 2. Archivo actualizado

- `core/integraciones-panel.js`

Commit:

- `b806002b3106116c764d6bb974b524f82a3b226e` · `feat(integraciones): agregar simulacion LAB en panel`

---

## 3. Cambio aplicado

El panel de eventos ahora muestra una columna `LAB` con botón:

- `🧪 Simular`

solo cuando detecta entorno local/LAB:

- `localhost`,
- `127.0.0.1`,
- query `orbitBackend=firestore-lab`,
- query `smoke`.

Al hacer clic, llama:

```js
Orbit.integraciones.labMock('ciclo', eventoId, { forzar: true })
```

Después repinta el panel para mostrar el nuevo estado del evento.

---

## 4. Seguridad

- No aparece como botón de producción.
- No llama redes externas.
- No usa webhooks.
- No usa credenciales.
- No hace deploy.
- No toca datos reales.
- Solo opera sobre eventos ya registrados en `eventosIntegracion`.

---

## 5. Pendiente

Falta validación local/visual:

1. abrir demo local;
2. generar evento desde Marketing;
3. abrir panel con `Orbit.integraciones.openPanel({ modulo: 'marketing' })`;
4. presionar `🧪 Simular`;
5. confirmar que el estado cambia a `confirmado` sin llamadas externas.

---

## 6. Estado

**RESUELTO EN CÓDIGO / PENDIENTE VALIDACIÓN LOCAL VISUAL.**
