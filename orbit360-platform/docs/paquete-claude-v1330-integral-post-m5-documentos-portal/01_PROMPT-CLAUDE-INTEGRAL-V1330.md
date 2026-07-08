# PROMPT CLAUDE INTEGRAL v1330 — Orbit 360 A&S

Copia este prompt en Claude junto con los documentos del paquete.

---

Actúa como Claude trabajando únicamente en el prototipo/frontend/UX/documentación de Orbit 360 A&S. Tu tarea es generar una nueva candidata completa y auditada del prototipo, basada en la última candidata v1330 aceptada, incorporando los avances acumulados de backend/contratos/UX/Academia sin tocar backend protegido.

## Contexto obligatorio

Proyecto: Migración Alianzas y Soluciones — Orbit 360 A&S.  
Orbit 360 es una plataforma SaaS/white-label/multi-tenant para intermediarios de seguros. A&S es el primer tenant, pero no debe existir fork ni hardcode A&S fuera de configuración. La personalización va por tenant: logo, paleta, país, moneda, aseguradoras, glosario, tarifas, usuarios, roles, módulos, integraciones y automatizaciones.

Rama/backend de referencia: `ays/backend-tenant-lab-v99-20260703`.  
PR vigente: #5 draft/open, sin merge, sin deploy, sin main.

No debes tocar backend protegido ni generar archivos que lo reemplacen.

## Debes leer antes de actuar

```txt
DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md
ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md
```

Y además debes incorporar estos documentos recientes:

```txt
PAQUETE-CLAUDE-ACUMULADO-POST-EQUIPO-CONFIG-M5-V1330-20260708.md
ACADEMIA-IMPACTO-EQUIPO-CONFIG-M5-V1330-20260708.md
ACTUALIZACION-PLAN-VIVO-POST-EQUIPO-CONFIG-M5-V1330-20260708.md
CONTRATO-MODELO-DOCUMENTOS-STORAGE-ADJUNTOS-AYS-20260708.md
REGISTRO-DOCUMENTOS-STORAGE-ADJUNTOS-AYS-20260708.md
ACADEMIA-IMPACTO-DOCUMENTOS-STORAGE-ADJUNTOS-AYS-20260708.md
ADDENDUM-PAQUETE-CLAUDE-DOCUMENTOS-STORAGE-ADJUNTOS-20260708.md
AUDITORIA-PORTAL-COBROS-CLIENTE360-DOCUMENTOS-V1330-20260708.md
CONTRATO-OPERACIONAL-PORTAL-COBROS-CLIENTE360-DOCUMENTOS-V1330-20260708.md
ACADEMIA-IMPACTO-PORTAL-COBROS-CLIENTE360-DOCUMENTOS-V1330-20260708.md
ADDENDUM-PAQUETE-CLAUDE-PORTAL-COBROS-CLIENTE360-DOCUMENTOS-20260708.md
DECISION-PRE-CLAUDE-POST-PORTAL-COBROS-CLIENTE360-DOCUMENTOS-20260708.md
CIERRE-EQUIPO-CONFIG-GATES-V1330-20260707.md
CIERRE-M5-CONCILIACIONES-GATES-V1330-20260708.md
```

## Backend protegido — NO TOCAR

No reemplaces, modifiques ni regeneres:

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

Si necesitas integración con datos, usa solo el contrato conceptual `Orbit.store`: `all`, `get`, `where`, `insert`, `update`, `remove`, `_emit`. No uses `localStorage`, Firebase, Firestore, mocks ni APIs directas en módulos.

## Objetivo de esta candidata

Generar una candidata nueva que mejore UX/prototipo/Academia para:

1. Equipo y Configuración con gates administrativos.
2. M5 Conciliaciones con estados honestos.
3. Documentos + adjuntos + Storage futuro.
4. Portal Cliente con pago reportado y soporte visible.
5. Cobros con revisión documental, motivo y auditoría.
6. Cliente360 con pestaña o bloque de Documentos.
7. Academia profunda por rol, actualizada por estos cambios.
8. Manuales y copy honesto.

## Reglas de producto que debes conservar

### Estados honestos

No muestres como productivo algo que no está conectado. Usa estados como:

```txt
Pendiente de configuración
Pendiente de conexión
Requiere validación
Propuesta de conciliación
Reportado por cliente
En revisión
Validado no aplicado
Pendiente de conciliación
Conciliado
Histórico / sin cartera
Documento recibido
Documento en revisión
Cambio propuesto pendiente de aprobación
Referencia preparada para canal seguro de documentos
```

No mostrar en UI cliente:

```txt
Firebase
Firestore
backend
LAB
mock
demo
smoke
localStorage
credenciales
API key
```

### Documentos y adjuntos

Documento recibido no equivale a dato aprobado.
Soporte de pago no equivale a pago aplicado.
Storage pendiente no equivale a Storage conectado.
Documento de identidad no actualiza cliente sin diff.
Póliza emitida no activa póliza/cartera sin país, moneda, estado y validación.

Debes mostrar:

- documentos recibidos;
- documentos en revisión;
- expediente aprobado;
- soportes de pago en revisión;
- parches/diffs pendientes;
- historial de acciones.

No debes guardar ni simular:

- base64;
- bytes;
- URL pública real;
- token;
- secreto;
- carga real a Storage si no existe conexión.

### Portal Cliente

Al reportar pago:

- mostrar `Soporte recibido. Pendiente de validación por el equipo.`;
- crear/mostrar seguimiento del reporte;
- permitir ver estado de revisión;
- no decir `Pago aplicado`;
- no decir `Cobro confirmado`;
- no marcar póliza pagada.

### Cobros

Agregar UX para revisar soporte con acciones:

```txt
marcar en revisión
solicitar aclaración
rechazar reporte con motivo
validar reporte no aplicado con motivo
bloquear reporte con motivo
aplicar pago autorizado con motivo
conciliar con soporte/factura
```

Reglas:

- Validar reporte no aplica pago.
- Aplicar pago requiere país/moneda y estado válido.
- GT requiere GTQ; CO requiere COP.
- Rechazar no debe borrar trazabilidad.
- Motivo obligatorio para validar/rechazar/bloquear/aplicar.

### M5 Conciliaciones

Validar, rechazar, bloquear y anular conciliaciones exige motivo.
Anular exige confirmación reforzada.
Validada no equivale a pago aplicado.
Estado bancario no crea cobros ni cartera.
No mezclar GTQ y COP.

### Equipo y Configuración

Acciones sensibles deben pedir motivo y registrar bitácora:

```txt
crear usuario
editar usuario
inactivar usuario
cambiar roles
cambiar permisos
reset de permisos
cambiar plan
guardar módulos activos
reset de configuración
configurar integraciones
```

No dejar tenant sin administrador activo.
Integración configurada no equivale a integración activa.
No guardar contraseñas ni tokens en frontend/store.

### Cliente360

Agregar pestaña/bloque `Documentos` con secciones:

```txt
Expediente aprobado
Soportes de pago en revisión
Documentos en revisión
Parches pendientes / diffs
Historial documental
```

Cada fila debe mostrar:

```txt
nombre visible
tipo
estado
origen
fecha
relación
visibilidad
responsable
acción permitida
```

## Academia profunda

No basta agregar textos. Debes actualizar Academia como sistema de inducción y adopción por rol.

Rutas mínimas impactadas:

- Cliente Portal.
- Cobros / Finanzas.
- Operativo / Gestiones.
- Cliente360 / Asesor.
- Dirección / Admin.
- IT / Seguridad.

Cada ruta debe tener:

- objetivo;
- público objetivo;
- módulos obligatorios;
- pasos guiados;
- casos prácticos;
- preguntas de decisión;
- evaluación aplicada;
- certificado o avance;
- última actualización.

Casos obligatorios:

1. Cliente reporta pago con soporte.
2. Cobros revisa soporte pero no aplica pago.
3. Cobros rechaza soporte con motivo y conserva trazabilidad.
4. Cliente360 revisa documento de identidad con diff.
5. Dirección aprueba/rechaza cambio sensible.
6. M5 valida conciliación, pero no aplica pago.
7. Equipo cambia permisos con motivo.
8. Configuración muestra integración pendiente de conexión.

## Módulos que debes revisar/actualizar

```txt
modules/portal.js
modules/cobros.js
modules/cliente360.js
modules/finanzas.js
modules/equipo.js
modules/configuracion.js
modules/documentos.js si existe o crear módulo frontend seguro si el prototipo lo requiere
modules/academia.js
modules/notificaciones.js
modules/automatizaciones.js
manuales / docs frontend visibles
```

No toques `index.html` si puedes evitarlo. Si necesitas registrar módulo nuevo y no hay forma segura sin `index.html`, documenta exactamente qué debe integrarse y no lo fuerces.

## Entregables esperados

Entrega una candidata completa con:

1. Resumen ejecutivo.
2. Archivos modificados.
3. Módulos impactados.
4. Qué se corrigió.
5. Qué quedó pendiente.
6. Riesgos y cómo mitigarlos.
7. Checklist de smoke visual.
8. Instrucciones de auditoría para ChatGPT/Codex.
9. Documento de cambios para Academia.
10. Garantía explícita de que no tocaste backend protegido.

## Prohibiciones

No usar datos reales.
No subir secretos.
No simular producción.
No decir que algo está conectado si no lo está.
No usar HR/shoppers/mystery shopping/CXOrbia/TyAOnline.
No traer lógica externa ajena a Orbit 360 A&S.
No borrar documentación existente.
No sobrescribir backend protegido.

## Criterio de aceptación

La candidata será auditada por ChatGPT antes de empalmar. Debe pasar:

- JS sin errores de sintaxis;
- rutas/módulos coherentes;
- no textos técnicos visibles;
- no backend protegido modificado;
- no datos reales;
- no base64/secretos;
- estados honestos;
- Academia actualizada;
- Portal/Cobros/Cliente360 cumplen contrato documental.

Entrega el ZIP/candidata o el conjunto de archivos según el flujo habitual de Claude, junto con un changelog claro.