# Addendum Claude — Cliente360 Documentos/Parches/Roles v1330

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo para Claude

Implementar UX/prototipo de Cliente360 Documentos usando el contrato backend:

```txt
orbit360-platform/docs/CONTRATO-BACKEND-CLIENTE360-DOCUMENTOS-ROLES-PARCHES-V1330-20260709.md
```

## Archivos objetivo sugeridos

```txt
orbit360-platform/modules/cliente360.js
orbit360-platform/modules/portal.js
orbit360-platform/modules/cobros.js
orbit360-platform/data/academia-plus.js
orbit360-platform/styles/infra.css
orbit360-platform/docs/BITACORA-CAMBIOS.md
```

## No tocar

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

## UX requerida

En Cliente360 → Documentos:

```txt
- Soportes de pago.
- Documentos del expediente.
- Propuestas/diffs pendientes.
- Estados claros.
- Responsable.
- Visibilidad cliente.
- Relación cliente/póliza/cobro.
- Acción revisar.
- Acción solicitar aclaración.
- Acción aprobar/rechazar propuesta.
- Acción aplicar propuesta solo como simulación honesta si no hay backend real.
- Historial cliente separado de auditoría interna.
```

## Reglas visibles de copy

Usar lenguaje cliente/operativo:

```txt
Recibido
En revisión
Requiere aclaración
Validado
Rechazado
Aplicado
Bloqueado por validación pendiente
```

No usar:

```txt
backend
Firestore
Firebase
LAB
localStorage
mock
demo
smoke
credenciales
```

## Reglas de seguridad

No reintroducir:

```txt
base64
readAsDataURL
factData
key/token/API secret
URL pública de documentos
pago aplicado desde soporte
conciliación M5 como pago aplicado
```

## Entrega Claude esperada

```txt
- Candidata ZIP.
- Lista de archivos modificados.
- Bitácora.
- Checklist protegidos no tocados.
- Smoke visual Cliente360/Portal/Cobros/M5/Academia.
- Pendientes para ChatGPT/Codex si requiere backend real.
```

## Estado

Addendum preparado. Debe incorporarse al próximo paquete Claude o a la siguiente candidata.