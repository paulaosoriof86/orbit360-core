# Checklist de entrega Claude mínimo post-P0 v1330

## Debe entregar

```txt
- ZIP/candidata del prototipo.
- Lista de archivos modificados.
- Bitácora/changelog.
- Checklist de protegidos no tocados.
- Checklist smoke visual.
- Pendientes restantes separados: Claude vs ChatGPT/Codex.
```

## Archivos objetivo permitidos

```txt
orbit360-platform/modules/cliente360.js
orbit360-platform/modules/portal.js
orbit360-platform/modules/cobros.js
orbit360-platform/modules/conciliaciones.js
orbit360-platform/modules/configuracion.js
orbit360-platform/modules/equipo.js
orbit360-platform/data/academia-plus.js
orbit360-platform/styles/infra.css
orbit360-platform/docs/BITACORA-CAMBIOS.md
```

## Archivos no permitidos

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
orbit360-platform/index.html
```

## Debe conservar

```txt
- metadata-only en soportes/facturas/documentos sin Storage real.
- credentialRef/backend_required para integraciones.
- M5 validada no aplicada.
- Reporte de pago no aplicado automáticamente.
- Último administrador protegido.
- Motivo obligatorio en acciones sensibles.
- Academia profunda por rol.
```

## No debe reintroducir

```txt
readAsDataURL
base64
factData
ci-key
saved.key
API key
Token real
Secreto
Firebase visible al cliente
Firestore visible al cliente
backend visible al cliente
LAB visible al cliente
mock visible al cliente
demo visible al cliente
localStorage visible al cliente
```