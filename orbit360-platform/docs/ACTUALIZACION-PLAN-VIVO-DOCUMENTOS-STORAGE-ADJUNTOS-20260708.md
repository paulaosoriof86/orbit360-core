# Actualización plan vivo — Documentos + Storage futuro + adjuntos

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

Complementa:

- `PLAN-VIVO-AVANCE-BACKEND-AYS-20260704.md`
- `ACTUALIZACION-PLAN-VIVO-POST-EQUIPO-CONFIG-M5-V1330-20260708.md`

## Bloque cerrado

| Bloque | Estado | Resultado |
|---|---|---|
| Documentos + Storage futuro + adjuntos | Avanzado contrato + tooling | Define documentos metadata-only, adjuntos, parches pendientes, relación con Portal/Cobros/M5/Cliente360/Operativo y Storage futuro sin payload real. |

## Intermedio agregado

### Intermedio 20 — Documentos/adjuntos metadata-only y Storage futuro

Motivo: antes de avanzar Portal/Cobros/Cliente360/Operativo faltaba fijar reglas para soportes, documentos de identidad, pólizas emitidas, recibos y estados bancarios sin crear entidades ni aplicar pagos automáticamente.

Riesgo si no se atiende:

- soporte de pago tratado como pago aplicado;
- documento de identidad actualizando cliente sin revisión;
- póliza emitida activando cartera sin validación;
- Storage simulado como conectado;
- documentos con payload real o secretos en repo;
- visibilidad documental sin control de rol/relación.

Relación con plan principal:

- Portal Cliente;
- Cobros;
- Conciliaciones M5;
- Cliente360;
- Operativo/Gestiones;
- Expediente de póliza;
- Academia;
- futuro Storage por tenant.

Estado: contrato, validador, tests sintéticos, registro, impacto Academia y addendum Claude agregados.

## Archivos agregados

```txt
orbit360-platform/docs/CONTRATO-MODELO-DOCUMENTOS-STORAGE-ADJUNTOS-AYS-20260708.md
tools/orbit360-validar-modelo-documentos-storage-ays.mjs
tools/orbit360-test-validar-modelo-documentos-storage-ays.mjs
orbit360-platform/docs/REGISTRO-DOCUMENTOS-STORAGE-ADJUNTOS-AYS-20260708.md
orbit360-platform/docs/ACADEMIA-IMPACTO-DOCUMENTOS-STORAGE-ADJUNTOS-AYS-20260708.md
orbit360-platform/docs/ADDENDUM-PAQUETE-CLAUDE-DOCUMENTOS-STORAGE-ADJUNTOS-20260708.md
orbit360-platform/docs/ACTUALIZACION-PLAN-VIVO-DOCUMENTOS-STORAGE-ADJUNTOS-20260708.md
```

## Pendientes actualizados

| Prioridad | Pendiente | Estado esperado |
|---|---|---|
| P0 | Ejecutar tests sintéticos del validador documentos/storage | Pendiente; puede agruparse en runner posterior para reducir manualidad. |
| P0 | Auditar módulos Portal/Cobros/Cliente360/Operativo contra contrato documental | Pendiente, preferiblemente desde GitHub sin pedir ejecución local. |
| P0 | Preparar prompt/paquete Claude integral | Ya tiene addendum; recomendado al cerrar auditoría de Portal/Cobros/Cliente360. |
| P1 | Diseñar UX de documentos y adjuntos | Para Claude/prototipo. |
| P1 | Storage real / reglas / adapter | Futuro; requiere autorización explícita, sin datos reales y revisión de reglas. |

## Próximo bloque recomendado

```txt
Auditoría/contrato operacional de Portal pago reportado + Cobros + Cliente360 documentos visibles, aplicando el contrato documental recién creado.
```

Criterios:

- no tocar backend protegido;
- no pedir manual local salvo indispensable;
- revisar módulos existentes desde GitHub;
- documentar hallazgos para Claude;
- si hay hotfix quirúrgico de copy/estado, aplicarlo directo en GitHub con validación razonable.

## Estado

Plan vivo complementado. El paquete Claude ya cuenta con addendum documental, pero sigue recomendado enviarlo después de revisar Portal/Cobros/Cliente360 contra este contrato.