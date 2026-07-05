# Plan vivo de avance backend — Orbit 360 A&S

Fecha de creación: 2026-07-04
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
- Candidata frontend activa auditada: `Prototype Development Request - 2026-07-04T152321.882.zip`.

## 3. Bloques avanzados

| Bloque | Estado | Resultado |
|---|---|---|
| Fuentes separadas / migración | Avanzado documental/técnico | Contratos y validadores de fuentes separadas, banco a conciliación y no a finmovs. |
| Academia profunda | Avanzado documental | Addendum de Academia, rutas por rol, impacto en manuales/evaluaciones. |
| Portal pago reportado / adjuntos | Avanzado documental + diagnóstico | Contratos de conciliación, documentos, gestiones y plan de auditoría. |
| Ops ruteo de gestiones | Avanzado documental + diagnóstico | Se confirmó que demasiadas gestiones caen en administrativa; se definieron listas y ruteo. |
| Cliente360 pagos pendientes | Avanzado documental | Pago reportado debe aparecer en Cliente360/Pagos con pendiente de aprobación/conciliación. |
| Portal acceso / PWA / invitaciones | Avanzado documental | Definido acceso por web, URL directa, PWA, invitación y activación. |
| Calidad de datos | Avanzado documental | Solicitudes individuales/masivas de datos faltantes con mensaje amable y trazabilidad. |
| Notificaciones unificadas | Avanzado documental | Contrato evento → audiencia → canal → estado → trazabilidad. |
| Auth / roles / tenant / portalUsuarios | Avanzado documental + auditoría v1.123 | Se confirmó login demo/localStorage, selector de rol demo y portal interno con selector de cliente. |
| Guard de autorización / auditoría de acceso | Avanzado documental | Se definió guard por ruta/acción/relación y auditoría de eventos críticos. |
| Canales/correo por usuario autorizado | Avanzado documental | Correo por usuario interno autorizado, no por tenant/rol; cliente sin opción de correo. |
| Seguimiento de bloques | Agregado intermedio | Se crea este plan vivo para visualizar avance y pendientes después de cada bloque. |

## 4. Bloques pendientes principales

| Prioridad | Bloque | Estado esperado |
|---|---|---|
| P0 | Contrato/modelo `clientes` + relación asesor + portal + calidad datos | Siguiente bloque seguro recomendado. |
| P0 | Contrato/modelo `polizas` + recibos/cartera | Pendiente. |
| P0 | Contrato/modelo `cobros` + pagos reportados + conciliación | Pendiente de integración con Cliente360/Ops. |
| P0 | Contrato/modelo `documentos` + Storage futuro | Pendiente backend real. |
| P0 | Smokes de roles: cliente/asesor/cobros/admin | Pendiente. |
| P1 | Validadores ejecutables de Auth/Portal/Ops/Correo | Especificados parcialmente; ejecutar desde Codex/local. |
| P1 | Empalme frontend v1.123 en repo sin pisar backend | Pendiente por limitación de archivos grandes. |
| P1 | Firestore LAB para entidades nuevas | Pendiente tras contratos/smoke. |
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

## 6. Formato de cierre de cada bloque

Cada respuesta de continuidad debe cerrar con:

```txt
Avance del bloque
- Bloque trabajado:
- Documentos creados/actualizados:
- Decisiones agregadas:
- Pendientes que siguen:
- Próximo bloque recomendado:
- Estado PR/rama:
```

## 7. Próximo bloque recomendado

Continuar con:

```txt
Contrato/modelo de clientes + relación cliente/asesor/portal/calidad de datos/contactos autorizados.
```

Este bloque debe conectar:

- tenantId;
- clienteId;
- asesorId;
- país/moneda;
- contacto confiable;
- estado portal;
- calidad de datos;
- notificaciones;
- documentos;
- pólizas;
- cobros;
- gestiones.

## 8. Estado

Plan vivo creado. Debe mantenerse actualizado durante los siguientes bloques.
