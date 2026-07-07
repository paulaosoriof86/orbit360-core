# Pendientes Academia acumulado vivo — Orbit 360 A&S — 2026-07-07

## Propósito

Este documento acumula los impactos, pendientes y mejoras de Academia derivados de auditorías, empalmes, hotfixes, correcciones locales ChatGPT/Codex y futuras candidatas Claude.

No es descargable por defecto. Paula lo pedirá cuando necesite paquete acumulado.

---

## Regla obligatoria

Cada cambio en módulos, importadores, cobros, conciliaciones, documentos, portal, configuración, roles o backend debe revisar impacto en Academia:

```txt
1. Ruta o curso afectado.
2. Rol impactado.
3. Qué debe aprender el usuario.
4. Qué flujo cambió.
5. Qué estado honesto debe explicarse.
6. Si requiere evaluación, certificado o notificación.
7. Si debe sincronizarse en data/academia-plus.js y data/seed.js.
8. Si es runtime temporal, debe pasar luego a fuente Claude.
```

---

## Estado actual Academia tras hotfix v1.150

### Cambio aplicado directo ChatGPT/Codex

Archivo aplicado:

```txt
orbit360-platform/modules/portal-v1142-copyfix.js
```

Se agregó runtime bridge con curso mínimo:

```txt
cur_migracion_honesta_v150
Migración honesta y fuentes separadas
```

### Contenido cubierto

```txt
reportado ≠ conciliado ≠ confirmado
manifest de fuentes
banco y estados de cuenta no confirman cobro
junio/julio 2026
financiero histórico no crea cartera/cobros/producción
documentos soporte solo proponen datos
GT=GTQ, CO=COP
REQUIERE_VALIDACION
```

### Estado

```txt
Runtime aplicado.
Pendiente pasar a fuente formal en data/academia-plus.js y data/seed.js.
```

---

## Matriz viva por bloque

| Fecha | Bloque/módulo | Cambio o hallazgo | Impacto Academia | Estado | Responsable siguiente |
|---|---|---|---|---|---|
| 2026-07-07 | Importador | Estados honestos y fuentes separadas; residuo “Todo cuadra” corregido por runtime | Crear/actualizar lección sobre revisión previa, propuestas y aprobación; no prometer escritura directa | Runtime aplicado; fuente pendiente | Claude debe pasarlo a `data/academia-plus.js` y `data/seed.js`; ChatGPT/Codex valida |
| 2026-07-07 | Cobros/Conciliación | Reportado no es confirmado; conciliado no confirma cobro por sí solo | Ruta para equipo de cobros: estados reportado/conciliado/confirmado y efectos en cartera | Runtime aplicado; fuente pendiente | Claude fuente; ChatGPT/Codex backend real |
| 2026-07-07 | Junio/Julio 2026 | Meses con fuentes y cortes distintos; no mezclar planillas, estados ni financiero histórico | Caso práctico de conciliación junio/julio, por fuente separada | Curso mínimo runtime | Claude profundiza con evaluación |
| 2026-07-07 | Documentos soporte | Soportes solo proponen datos; no actualizan clientes/pólizas sin diff | Lección para usuarios operativos y administración sobre propuestas/diff/confirmación | Curso mínimo runtime | Claude fuente; backend documentos después |
| 2026-07-07 | País/moneda | GT=GTQ, CO=COP, REQUIERE_VALIDACION si falta país/moneda | Evaluación corta de moneda, país y no sumar crudo | Curso mínimo runtime | Claude profundiza |
| 2026-07-07 | Portal cliente | Pago reportado queda pendiente de revisión/conciliación | Microlección interna para responder al cliente y explicar estados | Hotfix aplicado | Claude fuente/UX |
| 2026-07-07 | Phase A backend | Contrato de persistencia para `conciliaciones`, `auditLog`, `documentosAdjuntos` y `storageRefs` | Lección por rol sobre transición propuesta→revisión→validada→autorizada→confirmada; el usuario debe entender que validar conciliación no aplica cobro | Contrato/documentación creado | ChatGPT/Codex implementará backend cuando corresponda; Claude debe reflejarlo en Academia fuente |
| 2026-07-07 | Storage/adjuntos | Un soporte de portal o documento importado queda como metadata/adjunto y solo propone datos | Ruta para Cobros/Operaciones/Portal: cómo revisar soporte, cuándo pedir validación y cuándo responder al cliente | Contrato/documentación creado | Backend pendiente; Claude fuente pendiente |
| 2026-07-07 | AuditLog | Toda confirmación/reversión sensible debe quedar auditada con actor, motivo, hashes y correlationId | Ruta Dirección/Superadmin/Auditoría: trazabilidad, reversión y responsabilidad por confirmaciones | Contrato/documentación creado | Backend pendiente; Academia evaluaciones pendiente |

---

## Pendientes Academia P0

### ACD-P0-001 — Pasar runtime a fuente formal

**Necesidad:** el curso `cur_migracion_honesta_v150` hoy se inserta por runtime bridge.  
**Esperado:** incorporarlo formalmente en `data/academia-plus.js` y `data/seed.js`.  
**Impacto:** evita pérdida si se reemplaza hotfix/runtime en futura candidata.  
**Estado:** pendiente Claude; validación ChatGPT/Codex.

### ACD-P0-002 — Evitar regresión de textos de cobro aplicado

**Necesidad:** Academia no puede enseñar “aplicar pago” como si fuera confirmación productiva.  
**Esperado:** usar reportado, pendiente de revisión, conciliado, confirmado.  
**Estado:** runtime aplicado; fuente pendiente.

### ACD-P0-003 — Integrar manifest/fuentes separadas en evaluaciones

**Necesidad:** no basta texto de lectura.  
**Esperado:** evaluación por casos: banco, estado cliente, planilla comisión, financiero histórico, documentos soporte.  
**Estado:** contenido mínimo creado; evaluación pendiente.

### ACD-P0-004 — Profundizar Phase A: conciliaciones, auditLog y adjuntos

**Necesidad:** el contrato Phase A ya define estados y colecciones, pero Academia aún no lo enseña como ruta aplicada por rol.  
**Esperado:** crear lecciones/evaluaciones para Cobros, Operaciones, Administración, Dirección/Superadmin, Auditoría/migración y Portal cliente sobre:

```txt
propuesta
en_revision
validada
rechazada
requiere_validacion
autorizada_para_confirmar
confirmada
revertida
```

**Casos de evaluación obligatorios:**

```txt
1. cliente adjunta comprobante en portal;
2. banco muestra depósito sin póliza relacionada;
3. planilla de comisión refleja pago aplicado;
4. financiero histórico tiene ingreso genérico;
5. falta moneda o país en archivo;
6. se requiere reversión auditada de una confirmación.
```

**Estado:** contrato creado; fuente Academia pendiente.

---

## Pendientes Academia P1

### ACD-P1-001 — Rutas por rol

Crear rutas diferenciadas:

```txt
Administración
Cobros
Operaciones
Comercial/asesores
Configuración/SaaS
Auditoría/migración
```

### ACD-P1-002 — Progreso/certificados persistentes

Cuando backend real esté listo, Academia debe persistir:

```txt
progreso por usuario
intentos de evaluación
certificados
fecha de actualización de curso
notificaciones por cambio de módulo
```

### ACD-P1-003 — Lecciones conectadas con módulos

Cada módulo crítico debe tener “cómo usarlo” y “qué impacto tiene”:

```txt
Importador
Cliente360
Pólizas/recibos/cartera
Cobros/conciliaciones
Finanzas histórico
Documentos
Portal cliente
Configuración/roles
Automatizaciones
```

### ACD-P1-004 — Ruta Auditoría/migración

Crear ruta específica para quien revise migración y conciliaciones:

```txt
manifest de fuentes
trazabilidad archivo/hoja/fila/bloque
idempotencyKey
correlationId
auditLog
beforeHash/afterHash
reversión autorizada
bloqueos por REQUIERE_VALIDACION
```

---

## Regla para futuras candidatas Claude

Claude debe revisar este documento antes de entregar nueva candidata. Si cambia cualquier módulo, debe actualizar Academia y bitácora.

Si Claude no puede hacerlo, debe dejarlo explícito como pendiente con:

```txt
módulo
tema
rol afectado
curso/lección sugerida
estado
motivo
```

---

## Estado final de este documento

Vivo y acumulativo. No reemplazar; solo actualizar.
