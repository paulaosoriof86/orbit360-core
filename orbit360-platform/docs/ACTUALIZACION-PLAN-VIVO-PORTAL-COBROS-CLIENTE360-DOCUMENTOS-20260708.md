# Actualización plan vivo — Portal + Cobros + Cliente360 documentos visibles

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

Complementa:

- `PLAN-VIVO-AVANCE-BACKEND-AYS-20260704.md`
- `ACTUALIZACION-PLAN-VIVO-DOCUMENTOS-STORAGE-ADJUNTOS-20260708.md`

## Bloque cerrado

| Bloque | Estado | Resultado |
|---|---|---|
| Auditoría/contrato Portal + Cobros + Cliente360 documentos visibles | Avanzado auditoría + contrato + tooling | Se revisaron flujos visibles y se fijaron reglas operativas para reportes de pago, soporte, documentos, cobros y Cliente360. |

## Intermedio agregado

### Intermedio 21 — Portal/Cobros/Cliente360 contra contrato documental

Motivo: después del contrato de Documentos + Storage futuro, era necesario bajar la regla a flujos visibles: cliente reporta pago, Cobros revisa/aplica y Cliente360 muestra documentos.

Hallazgos resumidos:

- Portal ya evita decir pago aplicado y registra actividad/gestión, pero falta documento/adjunto metadata-only vinculado al cobro.
- Portal ya registra documentos generales sin archivo real, pero faltan estados canónicos y adjuntos por rol.
- Cobros ya diferencia reportado/en revisión/validado por aplicar/pagado, pero validar/rechazar/aplicar requiere motivo y auditoría.
- Cobros no debe borrar trazabilidad al rechazar reporte.
- Cliente360 necesita vista/pestaña documental estructurada.

Relación con plan principal:

- Portal Cliente;
- Cobros;
- Cliente360;
- Documentos;
- M5 Conciliaciones;
- Academia;
- paquete Claude.

Estado: auditoría, contrato, validador estático, impacto Academia y addendum Claude agregados.

## Archivos agregados

```txt
orbit360-platform/docs/AUDITORIA-PORTAL-COBROS-CLIENTE360-DOCUMENTOS-V1330-20260708.md
orbit360-platform/docs/CONTRATO-OPERACIONAL-PORTAL-COBROS-CLIENTE360-DOCUMENTOS-V1330-20260708.md
tools/orbit360-validar-portal-cobros-cliente360-documentos-v1330.mjs
orbit360-platform/docs/ACADEMIA-IMPACTO-PORTAL-COBROS-CLIENTE360-DOCUMENTOS-V1330-20260708.md
orbit360-platform/docs/ADDENDUM-PAQUETE-CLAUDE-PORTAL-COBROS-CLIENTE360-DOCUMENTOS-20260708.md
orbit360-platform/docs/ACTUALIZACION-PLAN-VIVO-PORTAL-COBROS-CLIENTE360-DOCUMENTOS-20260708.md
```

## Pendientes actualizados

| Prioridad | Pendiente | Estado esperado |
|---|---|---|
| P0 | Decidir hotfix quirúrgico vs paquete Claude UX | Recomendado: Claude para UX visual completa; hotfix solo si hay texto crítico que corregir. |
| P0 | Cliente360 documentos visibles | Pendiente UX/prototipo. |
| P0 | Cobros motivo/auditoría para validar/rechazar/aplicar | Pendiente hotfix o Claude. |
| P0 | Portal crear documento/adjunto metadata-only al reportar pago | Pendiente hotfix o Claude. |
| P1 | Ejecutar validador estático local agrupado | Pendiente; no pedir manual hasta runner agrupado o necesidad real. |
| P1 | Paquete Claude integral | Recomendado pronto porque ya hay suficiente material UX/documental/Academia acumulado. |

## Próximo bloque recomendado

```txt
Preparar paquete Claude integral acumulado o, si se prefiere seguir backend, diseñar hotfix quirúrgico mínimo para Cobros motivo/auditoría sin tocar UI grande.
```

Criterio recomendado:

- Si Claude tiene capacidad: enviar paquete integral para UX Portal/Cobros/Cliente360/Academia.
- Si Claude no tiene capacidad: continuar con hotfix quirúrgico de Cobros/Portal, pero con riesgo visual controlado y validación local posterior.

## Estado

Plan vivo actualizado. El paquete Claude ya tiene addenda de Documentos y Portal/Cobros/Cliente360.