# Plan vivo de avance backend — Orbit 360 A&S

Fecha de creación: 2026-07-04  
Última actualización: 2026-07-05  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft, sin merge y sin deploy.

## 1. Propósito

Mantener una vista rápida de avance, pendientes y bloques intermedios agregados durante la continuidad backend.

Este documento no reemplaza contratos ni auditorías. Sirve como tablero de avance.

## 2. Estado general

- Producción: no autorizada.
- Deploy: no autorizado.
- Merge a main: no autorizado.
- Datos reales en código: no autorizados.
- Backend protegido: intacto.
- Candidata frontend activa aceptada para empalme: `Prototype Development Request - 2026-07-05T062855.313.zip`.
- Empalme frontend aplicado en GitHub: `Conciliaciones` + `index.html` híbrido LAB.

## 3. Bloques avanzados

| Bloque | Estado | Resultado |
|---|---|---|
| Fuentes separadas / migración | Avanzado técnico | Contratos y validadores de fuentes separadas; banco, planillas y cobros realizados proponen a `conciliaciones`. |
| Academia profunda | Avanzado documental | Addendum de Academia, rutas por rol, impacto en manuales/evaluaciones. No desplaza backend crítico. |
| Portal pago reportado / adjuntos | Avanzado documental + diagnóstico | Contratos de conciliación, documentos, gestiones y plan de auditoría. |
| Ops ruteo de gestiones | Avanzado documental + diagnóstico | Se definieron listas y ruteo de gestiones. |
| Cliente360 pagos pendientes | Avanzado documental | Pago reportado debe verse como pendiente de aprobación/conciliación. |
| Portal acceso / PWA / invitaciones | Avanzado documental | Definido acceso por web, URL directa, PWA, invitación y activación. |
| Calidad de datos | Avanzado documental | Solicitudes individuales/masivas de datos faltantes con mensaje amable y trazabilidad. |
| Notificaciones unificadas | Avanzado documental | Contrato evento → audiencia → canal → estado → trazabilidad. |
| Auth / roles / tenant / portalUsuarios | Avanzado documental + auditoría | Pendiente llevar demo a backend real. |
| Guard de autorización / auditoría de acceso | Avanzado documental | Guard por ruta/acción/relación y auditoría de eventos críticos. |
| Canales/correo por usuario autorizado | Avanzado documental | Correo por usuario interno autorizado, no por tenant/rol. |
| Conciliaciones frontend 062855 | Empalmado en GitHub | `modules/conciliaciones.js` agregado e `index.html` híbrido preservando LAB. |
| Smoke estático empalme Conciliaciones | Tooling agregado | Validador estático para confirmar index híbrido, carga única del módulo, roles y acciones seguras. |
| Perfilador de columnas por fuente | Tooling agregado | Manifest validado produce perfil de columnas y readiness para dryRunReport. |
| Constructor dryRunReport sin filas | Tooling agregado | Construye sobre seguro de dryRunReport desde manifest + perfil. |
| Adaptador candidatos metadata-only | Tooling agregado | Combina dryRun envelope con candidatos estructurados y readiness para validador/score/propuestas. |
| Seguimiento de bloques | Agregado intermedio | Este plan vivo se mantiene actualizado después de cada bloque largo. |

## 4. Bloques pendientes principales

| Prioridad | Bloque | Estado esperado |
|---|---|---|
| P0 | Smoke visual/operativo real de Conciliaciones | Pendiente en navegador/local. |
| P0 | Adapter Firestore LAB real para `conciliaciones/auditLog` | Pendiente de ejecución local/entorno LAB. |
| P0 | Contrato/modelo `clientes` + relación asesor + portal + calidad datos | Pendiente. |
| P0 | Contrato/modelo `polizas` + recibos/cartera | Pendiente. |
| P0 | Contrato/modelo `cobros` + pagos reportados + conciliación | Pendiente. |
| P0 | Contrato/modelo `documentos` + Storage futuro | Pendiente. |
| P0 | Smokes de roles: cliente/asesor/cobros/admin | Pendiente. |
| P1 | Orquestador de pipeline metadata-only | Pendiente tras adaptador de candidatos. |
| P1 | Manuales y Academia actualizados por cambio | Pendiente para Claude/prototipo. |

## 5. Intermedios agregados

### Intermedio 1 — Seguimiento de bloques

Motivo: Paula pidió visualizar avance y pendientes después de cada bloque.

Estado: agregado mediante este documento y addendum maestro.

### Intermedio 2 — Correo por usuario autorizado

Motivo: Paula aclaró que el correo no es por tenant ni rol; puede crearlo el tenant/admin para cada usuario al darlo de alta o dar instrucciones para crearlo.

Estado: documentado en contratos y matriz de canales por usuario.

### Intermedio 3 — Cliente sin opción de correo

Motivo: aclaración de producto para Portal Cliente.

Estado: documentado. Debe mantenerse en frontend, backend y manuales.

### Intermedio 4 — Smoke estático post-empalme Conciliaciones

Motivo: después de empalmar candidata `062855.313`, era necesario validar el empalme sin esperar navegador local.

Relación con plan principal: puente entre empalme frontend y smoke visual/backend real.

Estado: tooling agregado.

### Intermedio 5 — Perfilador de columnas por fuente

Motivo: el manifest validado no era suficiente para generar `dryRunReport`; faltaba verificar campos obligatorios, aliases y columnas no mapeadas por fuente.

Relación con plan principal: puente entre manifest por fuentes separadas y constructor de `dryRunReport`.

Estado: tooling agregado.

### Intermedio 6 — Constructor de dryRunReport sin filas

Motivo: después del perfilador, faltaba un sobre seguro de dryRunReport para conectar manifest + perfil.

Relación con plan principal: puente entre perfilador y adaptador de candidatos metadata-only compatible con el validador dryRunReport.

Estado: tooling agregado.

### Intermedio 7 — Adaptador de candidatos metadata-only

Motivo: el sobre dryRunReport necesitaba candidatos estructurados antes de entrar a validación/score/propuestas.

Relación con plan principal: puente entre constructor dryRunReport y orquestador metadata-only.

Estado: tooling agregado.

## 6. Formato obligatorio de cierre de cada bloque

Cada respuesta de continuidad debe cerrar con:

```txt
Avance del bloque
- Qué adelanté:
- Bloque trabajado:
- Plan/área impactada:
- Documentos creados/actualizados:
- Decisiones agregadas:
- ¿Se agregó algo intermedio al plan?:
- Intermedios agregados:
- Pendientes que siguen:
- Qué sigue en el plan:
- Próximo bloque recomendado:
- Estado PR/rama:
```

Regla fija solicitada por Paula: siempre indicar qué se adelantó, si se agregó un intermedio del plan de trabajo y qué sigue en el plan.

## 7. Próximo bloque recomendado

Continuar con:

```txt
Orquestador de pipeline metadata-only.
```

Este bloque debe conectar:

- manifest;
- perfil;
- dryRun envelope;
- candidates metadata-only;
- validación dryRun;
- score;
- propuestas conciliaciones;
- plan de persistencia;
- cero datos reales;
- cero writes.

## 8. Estado

Plan vivo actualizado después del empalme, smoke estático de Conciliaciones, perfilador de columnas, constructor de dryRunReport y adaptador de candidatos metadata-only. No avanzar a datos reales, aplicación controlada ni deploy sin smoke y autorización.