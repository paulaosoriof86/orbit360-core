# Auditoría bloque conciliaciones/integraciones post-empalme v1330 — 2026-07-07

## Estado

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: no
Deploy: no
```

## Archivos revisados

```txt
orbit360-platform/modules/conciliaciones.js
orbit360-platform/core/integraciones.js
orbit360-platform/core/integraciones-panel.js
```

## Resultado ejecutivo

No se detectó P0 en este bloque.

## Conciliaciones

Archivo:

```txt
orbit360-platform/modules/conciliaciones.js
```

Conclusión:

- La bandeja lee solo desde `Orbit.store('conciliaciones')`.
- Las acciones (`validar`, `rechazar`, `bloquear`, `anular`) solo actualizan la propuesta.
- No toca `cobros`.
- No aplica pagos.
- No modifica cartera, producción, comisiones ni `finmovs`.
- La UI indica que las propuestas validadas quedan para proceso posterior autorizado.

Regla preservada:

```txt
VALIDADA no significa pago aplicado.
Conciliación es propuesta/revisión técnica, no escritura productiva.
```

## Integraciones

Archivo:

```txt
orbit360-platform/core/integraciones.js
```

Conclusión:

- Sanitiza credenciales y entradas sensibles.
- No persiste secretos reales en frontend.
- Convierte integraciones activas a estados honestos como `pendiente_backend` / `pendiente_configuracion`.
- Registra eventos en `eventosIntegracion` con payload sanitizado.
- No llama proveedores externos desde módulos.
- Usa `backend_required` para credenciales/webhooks.

Riesgo controlado:

- El estado interno `pendiente_backend` existe en datos, pero el panel lo traduce a etiqueta visible `Pendiente de conexión`.
- No se detectó exposición visible de claves, tokens, URLs o endpoints reales.

## Panel de integraciones

Archivo:

```txt
orbit360-platform/core/integraciones-panel.js
```

Conclusión:

- Muestra estados de integración por tenant con etiquetas no técnicas.
- El botón `Probar` solo aparece en localhost, `127.0.0.1`, `?orbitBackend=firestore-lab` o `?smoke`.
- La nota visible dice que, mientras una integración no esté activa, no se envía a proveedores externos.

Regla preservada:

```txt
No simular como productivo algo no conectado.
```

## Búsqueda transversal de textos técnicos visibles

Se buscó en el repo por términos sensibles:

```txt
Firestore
backend
LAB
localStorage
mock
```

El índice de GitHub no devolvió coincidencias para estos términos en la búsqueda ejecutada desde el conector. Esta búsqueda no sustituye un smoke visual final, pero reduce riesgo inmediato de textos técnicos visibles.

## Pendientes

### Backend / ChatGPT-Codex

- Mantener `core/integraciones.js` como archivo backend-crítico ampliado.
- No permitir que Claude lo reemplace sin diff.
- En fase backend real, conectar emisión real a Make/WhatsApp/correo desde backend seguro, no desde frontend.

### Claude / UX

No hay paquete Claude nuevo por este bloque. Solo conservar:

- etiquetas honestas de integración;
- no mostrar `pendiente_backend` literal al cliente;
- no exponer botones de prueba fuera de LAB/local/smoke;
- no usar textos tipo mock/demo/backend/LAB en UI cliente.

### Academia

No hay cambio obligatorio nuevo. Se mantiene pendiente acumulado de explicar integraciones en Academia:

- integración configurada vs pendiente de conexión;
- qué hace Make/WhatsApp/correo;
- qué queda en trazabilidad;
- por qué las credenciales reales no se guardan en frontend.
