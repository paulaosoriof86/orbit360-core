# Prompt Claude mínimo — post-P0 v1330

Trabaja sobre Orbit 360 A&S. Antes de actuar, lee las fuentes maestras y respeta el baseline auditado:

```txt
Repositorio: paulaosoriof86/orbit360-core
Carpeta: orbit360-platform/
Rama backend protegida: ays/backend-tenant-lab-v99-20260703
PR vigente: #5 draft/open, sin merge, sin deploy, sin main
Última candidata auditada: Prototype Development Request - 2026-07-08T135740.684.zip
```

## Contexto

La candidata v1330 fue auditada con certeza. Se aceptó como base incremental frontend/UX, pero no cerró todos los P0. ChatGPT/Codex preparó hotfixes P0 para Cobros/M5/Portal/Config/Equipo/Academia. Tu tarea NO es rehacer backend ni tocar protegidos. Tu tarea es cerrar pendientes UX/prototipo/Academia que sí corresponden a Claude.

## No tocar

No modifiques ni reemplaces:

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

No introduzcas datos reales, secretos, tokens, credenciales, API keys, base64, bytes de archivos, URLs públicas de documentos ni textos técnicos visibles al cliente.

## Frente 1 — Cliente360 Documentos por rol

Objetivo: completar `modules/cliente360.js` para que Documentos sea operable y claro por rol.

Implementar UX para:

```txt
- pestaña Documentos robusta;
- sección Soportes de pago;
- sección Documentos del expediente;
- sección Propuestas/diffs pendientes;
- estado visible: en revisión, requiere aclaración, validado, rechazado, aplicado cuando corresponda;
- responsable interno;
- visibilidad cliente sí/no;
- relación con cobro, póliza o cliente;
- acción revisar / aprobar propuesta / rechazar propuesta / solicitar aclaración;
- motivo obligatorio para aprobar/rechazar/solicitar aclaración;
- historial visible al cliente separado de historial interno.
```

Reglas:

```txt
- Un documento soporte no modifica cliente/póliza/cobro por sí solo.
- Una propuesta documental solo se aplica tras diff y aprobación.
- ClientePortal no ve auditoría interna sensible.
- AuditorSoloLectura no ejecuta acciones.
- Asesor ve según cartera/rol.
- Dirección/Admin/IT ven trazabilidad completa.
```

## Frente 2 — UX visual transversal de estados

Objetivo: que Portal, Cobros, M5 y Cliente360 usen lenguaje visual coherente.

Estados mínimos:

```txt
Pago reportado
En revisión
Validado no aplicado
Aplicado / pagado confirmado
Conciliado
Rechazado / requiere aclaración
Bloqueado por país/moneda
Documento metadata-only
Integración pendiente de conexión
```

Aplicar a:

```txt
modules/portal.js
modules/cobros.js
modules/conciliaciones.js
modules/cliente360.js
modules/configuracion.js
modules/equipo.js
styles/infra.css si se requiere
```

Reglas:

```txt
- Reportado no es aplicado.
- Validado M5 no es aplicado.
- Factura no concilia automáticamente.
- Integración preparada no es activa real.
- No mostrar Firebase/Firestore/backend/LAB/localStorage/mock/demo/smoke/credenciales en UI cliente.
```

## Frente 3 — Academia materializada post-hotfixes

Objetivo: convertir las rutas documentadas en Academia profunda, interactiva y por rol.

Actualizar `data/academia-plus.js` y/o módulos UX de Academia, sin tocar backend, para incluir:

```txt
- ruta Roles, permisos y auditoría segura;
- ruta Cambios locales post-Claude y continuidad;
- progreso visible;
- evaluaciones útiles;
- certificados;
- manuales visibles por rol;
- actualización de lecciones cuando cambien módulos;
- casos prácticos Cobros/M5/Portal/Config/Equipo/Cliente360.
```

## Frente 4 — Smoke visual post-hotfixes

Objetivo: revisar navegación y copy visual después de los hotfixes.

Validar visualmente:

```txt
- Portal: reportar pago y subir documento.
- Cobros: validar reporte, aplicar pago, factura metadata-only.
- M5: validar/anular/rechazar/bloquear y estados.
- Config: integración pendiente, credentialRef/backend_required, plan/módulos.
- Equipo: crear/editar/inactivar, último admin, reset permisos.
- Cliente360: documentos y propuestas.
- Academia: rutas nuevas.
```

Documentar en bitácora:

```txt
archivo modificado;
qué se cambió;
qué se conserva;
qué queda pendiente;
si aplica a prototipo base comercializable.
```

## Criterios de rechazo

Rechazar la candidata si:

```txt
- toca protegidos;
- reintroduce base64/readAsDataURL/factData;
- pide o guarda key/token/API secret;
- muestra integración como activa sin conexión;
- aplica pago desde reporte del cliente;
- trata M5 validado como pago aplicado;
- muestra textos técnicos a cliente;
- pierde Academia;
- elimina trazabilidad;
- hardcodea A&S o datos reales.
```

## Entrega esperada

Entregar ZIP/candidata con:

```txt
- archivos reales del prototipo;
- changelog/bitácora;
- checklist de no protegidos;
- checklist de smoke visual;
- lista de pendientes restantes;
- notas para ChatGPT/Codex si algo requiere backend.
```