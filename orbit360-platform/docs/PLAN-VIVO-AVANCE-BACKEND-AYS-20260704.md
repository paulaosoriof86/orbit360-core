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
| Ops ruteo de gestiones | Avanzado documental + diagnóstico | Se confirmó que demasiadas gestiones caen en administrativa; se definieron listas y ruteo. |
| Cliente360 pagos pendientes | Avanzado documental | Pago reportado debe aparecer en Cliente360/Pagos con pendiente de aprobación/conciliación. |
| Portal acceso / PWA / invitaciones | Avanzado documental | Definido acceso por web, URL directa, PWA, invitación y activación. |
| Calidad de datos | Avanzado documental | Solicitudes individuales/masivas de datos faltantes con mensaje amable y trazabilidad. |
| Notificaciones unificadas | Avanzado documental | Contrato evento → audiencia → canal → estado → trazabilidad. |
| Auth / roles / tenant / portalUsuarios | Avanzado documental + auditoría v1.123 | Se confirmó login demo/localStorage, selector de rol demo y portal interno con selector de cliente. |
| Guard de autorización / auditoría de acceso | Avanzado documental | Se definió guard por ruta/acción/relación y auditoría de eventos críticos. |
| Canales/correo por usuario autorizado | Avanzado documental | Correo por usuario interno autorizado, no por tenant/rol; cliente sin opción de correo. |
| Conciliaciones frontend 062855 | Empalmado en GitHub | `modules/conciliaciones.js` agregado e `index.html` híbrido preservando LAB. |
| Smoke estático empalme Conciliaciones | Tooling agregado | Validador estático para confirmar index híbrido, carga única del módulo, roles y acciones seguras. |
| Seguimiento de bloques | Agregado intermedio | Este plan vivo se mantiene actualizado después de cada bloque largo. |

## 4. Bloques pendientes principales

| Prioridad | Bloque | Estado esperado |
|---|---|---|
| P0 | Smoke visual/operativo real de Conciliaciones | Pendiente en navegador/local: roles Dirección/Admin/Finanzas, vacío honesto, detalle, acciones seguras. |
| P0 | Adapter Firestore LAB real para `conciliaciones/auditLog` | Pendiente de ejecución local/entorno LAB. |
| P0 | Contrato/modelo `clientes` + relación asesor + portal + calidad datos | Pendiente; sigue siendo bloque seguro recomendado después de smokes mínimos. |
| P0 | Contrato/modelo `polizas` + recibos/cartera | Pendiente. |
| P0 | Contrato/modelo `cobros` + pagos reportados + conciliación | Pendiente de integración con Cliente360/Ops. |
| P0 | Contrato/modelo `documentos` + Storage futuro | Pendiente backend real. |
| P0 | Smokes de roles: cliente/asesor/cobros/admin | Pendiente. |
| P1 | Perfilador de columnas por fuente | Pendiente tras manifest por fuentes separadas. |
| P1 | Manuales y Academia actualizados por cambio | Pendiente para Claude/prototipo; debe documentarse cada cambio de módulo. |

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

Riesgo si no se atiende: perder backend LAB, duplicar carga del módulo o permitir acciones de bandeja que no corresponden.

Relación con plan principal: puente entre empalme frontend y smoke visual/backend real.

Estado: tooling agregado.

Próximo paso: ejecutar smoke visual/local y continuar con perfilador de columnas por fuente.

## 6. Formato de cierre de cada bloque

Cada respuesta de continuidad debe cerrar con:

```txt
Avance del bloque
- Bloque trabajado:
- Plan/área impactada:
- Documentos creados/actualizados:
- Decisiones agregadas:
- Intermedios agregados:
- Pendientes que siguen:
- Próximo bloque recomendado:
- Estado PR/rama:
```

## 7. Próximo bloque recomendado

Continuar con:

```txt
Perfilador de columnas por fuente.
```

Este bloque debe conectar:

- manifest validado;
- fuente separada;
- campos mínimos;
- columnas reales declaradas sin payload;
- mapeo candidato;
- advertencias por país/moneda/periodo;
- readiness para dryRunReport;
- cero writes.

## 8. Estado

Plan vivo actualizado después del empalme y smoke estático de Conciliaciones. No avanzar a datos reales, aplicación controlada ni deploy sin smoke y autorización.