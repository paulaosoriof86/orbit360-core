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
| Orquestador pipeline metadata-only | Tooling agregado | Encadena perfil, dryRun envelope, candidatos metadata-only y validación final dryRun. |
| Orquestador score/propuestas plan-only | Tooling agregado | Encadena pipeline metadata-only, score gate, generación de propuestas `conciliaciones` y plan de persistencia sin writes. |
| Readiness plan de persistencia LAB | Tooling agregado | Valida que el plan de persistencia sea tenant-safe, sin payload real, sin banderas de escritura/aplicación y listo solo para revisión LAB. |
| Runner validaciones locales Conciliaciones | Tooling agregado | Agrupa smoke estático, test orquestador, test readiness, sintaxis y hash de archivos protegidos en un reporte único local. |
| Guía runner local y criterios de bloqueo | Documentado + wrapper PS | Agrega comando PowerShell, revisión de reportes, criterios de avance/bloqueo y resumen copiable al portapapeles. |
| Checklist smoke visual Conciliaciones | Documentado + helper PS | Agrega checklist por rol, estado vacío, acciones seguras, trazabilidad y plantilla de reporte visual. |
| Modelo clientes + asesor + portal + calidad | Contrato + tooling agregado | Define colecciones, campos, reglas de fuente, portal cliente, relación asesor y validador plan-only. |
| Seguimiento de bloques | Agregado intermedio | Este plan vivo se mantiene actualizado después de cada bloque largo. |

## 4. Bloques pendientes principales

| Prioridad | Bloque | Estado esperado |
|---|---|---|
| P0 | Ejecutar runner local + smoke visual/operativo Conciliaciones | Pendiente en entorno local/navegador. |
| P0 | Adapter Firestore LAB real para `conciliaciones/auditLog` | Pendiente de ejecución local/entorno LAB y autorización. |
| P0 | Ejecutar tests sintéticos modelo clientes | Pendiente de ejecución local. |
| P0 | Contrato/modelo `polizas` + recibos/cartera | Pendiente. |
| P0 | Contrato/modelo `cobros` + pagos reportados + conciliación | Pendiente. |
| P0 | Contrato/modelo `documentos` + Storage futuro | Pendiente. |
| P0 | Smokes de roles: cliente/asesor/cobros/admin | Pendiente. |
| P1 | Validación local del orquestador score/propuestas plan-only | Pendiente de ejecución local; agrupada en runner. |
| P1 | Validación local de readiness plan persistencia LAB | Pendiente de ejecución local; agrupada en runner. |
| P1 | Manuales y Academia actualizados por cambio | Pendiente para Claude/prototipo. |

## 5. Intermedios agregados

### Intermedio 1 — Seguimiento de bloques

Motivo: Paula pidió visualizar avance y pendientes después de cada bloque.

Estado: agregado mediante este documento y addendum maestro.

### Intermedio 2 — Correo por usuario autorizado

Motivo: Paula aclaró que el correo no es por tenant ni rol.

Estado: documentado en contratos y matriz de canales por usuario.

### Intermedio 3 — Cliente sin opción de correo

Motivo: aclaración de producto para Portal Cliente.

Estado: documentado. Debe mantenerse en frontend, backend y manuales.

### Intermedio 4 — Smoke estático post-empalme Conciliaciones

Motivo: validar el empalme sin esperar navegador local.

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

### Intermedio 8 — Orquestador de pipeline metadata-only

Motivo: faltaba ejecutar el tramo metadata-only completo en orden y con reporte único.

Relación con plan principal: puente entre validación metadata-only y score/propuestas plan-only.

Estado: tooling agregado.

### Intermedio 9 — Orquestador score/propuestas plan-only

Motivo: después del pipeline metadata-only faltaba encadenar score gate, propuestas y plan de persistencia en un solo reporte.

Relación con plan principal: puente entre dryRun validado y futura persistencia LAB aprobada.

Estado: tooling agregado; pendiente ejecución local.

### Intermedio 10 — Readiness plan de persistencia LAB

Motivo: antes de cualquier adapter LAB real faltaba validar que el plan de persistencia no contenga payload, filas reales, secretos, banderas de writes ni estados aplicados.

Relación con plan principal: puente entre orquestador score/propuestas plan-only y adapter Firestore LAB futuro.

Estado: tooling agregado; pendiente ejecución local.

### Intermedio 11 — Runner agrupado de validaciones locales Conciliaciones

Motivo: reducir pasos manuales y evitar ejecutar validadores sueltos sin reporte único antes de adapter LAB.

Relación con plan principal: puente entre tooling sintético/estático y smoke visual/operativo local.

Estado: tooling agregado; pendiente ejecución local.

### Intermedio 12 — Guía runner local y criterios de bloqueo

Motivo: faltaba una instrucción corta y operativa para ejecutar, revisar reportes y decidir si se bloquea o se pasa a smoke visual.

Relación con plan principal: puente entre runner local y smoke visual/operativo.

Estado: documentación y wrapper PowerShell agregados; pendiente ejecución local.

### Intermedio 13 — Checklist smoke visual/operativo Conciliaciones

Motivo: faltaba una lista de aceptación visual por rol, copy, estado vacío, acciones seguras y trazabilidad antes de adapter LAB.

Relación con plan principal: puente entre ejecución local del runner y revisión técnica posterior a smoke visual.

Estado: documentación y helper PowerShell agregados; pendiente ejecución local/visual.

### Intermedio 14 — Validador modelo clientes plan-only

Motivo: antes de pólizas/cobros faltaba fijar contrato de clientes, relación asesor, portal y calidad de datos con validación sintética.

Relación con plan principal: base para contratos posteriores de pólizas, cobros, portal y roles.

Estado: contrato y tooling agregados; pendiente ejecución local.

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
Preparar contrato/modelo backend de polizas + recibos + cartera.
```

Condición: no avanzar a adapter Firestore LAB real hasta que el runner local y el smoke visual de Conciliaciones estén ejecutados/revisados.

El nuevo bloque de pólizas debe mantener:

- tenant isolation;
- fuentes separadas;
- no crear clientes sin contrato validado;
- pólizas Vigente/Por renovar generan recibos/cartera cuando país/moneda/estado sean confiables;
- Cancelada/Vencida/Anulada/Rechazada como histórico;
- cartera solo pendiente del año actual;
- prima neta/gastos/impuestos/total separados;
- impacto en Academia/manuales.

## 8. Estado

Plan vivo actualizado después del empalme, smoke estático de Conciliaciones, perfilador de columnas, constructor de dryRunReport, adaptador de candidatos metadata-only, orquestador metadata-only, orquestador score/propuestas plan-only, readiness plan de persistencia LAB, runner agrupado de validaciones locales, guía/wrapper de ejecución local, checklist/helper de smoke visual y contrato/modelo clientes. No avanzar a datos reales, aplicación controlada, Firestore writes ni deploy sin smoke local y autorización.