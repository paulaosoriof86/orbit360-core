# Registro de modificaciones locales para Claude — post v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Este documento queda como registro acumulativo de toda modificación que ChatGPT/Codex haga directamente después de la candidata Claude v1330, para que en el siguiente paquete Claude pueda replicarla, consolidarla o mejorarla en prototipo/UX/Academia.

## Regla permanente

Cada hotfix, ajuste backend, documentación, patrón reutilizable, cambio UX hecho por ChatGPT/Codex o corrección local debe registrarse con este formato:

```txt
Fecha:
Bloque:
Archivos tocados:
Motivo:
Problema detectado:
Cambio realizado:
Impacto UX/prototipo:
Impacto backend:
Impacto Academia:
¿Aplica a Claude/prototipo?: Sí/No
Instrucción futura para Claude:
Pendientes derivados:
Validaciones:
Estado:
```

## Estado base para el registro

Última candidata auditada:

```txt
Prototype Development Request - 2026-07-08T135740.684.zip
SHA256: 97e968810029181dc10747a13d7c4f343f058b6ed9b4400af6d11f68dee6836c
```

Decisión:

```txt
Aceptada como última base incremental frontend/UX.
No cierre total de 7 ítems.
Requiere hotfix P0 + empalme selectivo corregido.
```

## Modificaciones locales pendientes de registrar al ejecutarse

### Hotfix P0 — Cobros

Pendiente de ejecutar.

Debe documentar:

- eliminación de `readAsDataURL`/base64;
- motivo obligatorio en validar/aplicar;
- guard país/moneda;
- copy honesto de factura/conciliación;
- trazabilidad/auditoría.

### Hotfix P0 — Conciliaciones

Pendiente de ejecutar.

Debe documentar:

- motivo obligatorio al validar;
- confirmación reforzada al anular;
- guard país/moneda;
- copy `VALIDADA · no aplicada`.

### Hotfix P0 — Portal

Pendiente de ejecutar.

Debe documentar:

- soporte de pago como documento/adjunto metadata-only;
- fecha dinámica de gestión;
- relación cobro-documento;
- historial visible para cliente.

### Hotfix P0 — Config/Equipo

Pendiente de ejecutar.

Debe documentar:

- gates de crear/editar/inactivar usuario;
- bloqueo de último administrador;
- reset permisos/configuración con motivo/confirmación;
- eliminación de guardado key/token en frontend/store;
- patrón `credentialRef: backend_required`.

### Hotfix P0 — Academia

Pendiente de ejecutar.

Debe documentar:

- incorporación matriz roles/permisos;
- auditoría unificada;
- historial interno vs historial cliente;
- certificados/progreso/manuales pendientes.

## Registros acumulados

### 2026-07-08 — Reauditoría de certeza candidata Claude v1330

Bloque: Auditoría / continuidad.  
Archivos tocados:

```txt
orbit360-platform/docs/AUDITORIA-CERTEZA-CANDIDATA-CLAUDE-V1330-20260708T135740.md
```

Motivo: Paula solicitó certeza por subítem y no una conclusión general.  
Cambio realizado: se documentó matriz exacta por ítem/subrequisito, con evidencia de archivo/línea, estado y conclusión.  
Impacto UX/prototipo: define qué se conserva de la candidata y qué debe corregirse antes de baseline corregido.  
Impacto backend: bloquea empalme completo y ordena hotfix P0 seguro.  
Impacto Academia: aclara que Academia cumple base del paquete pero falta roles/permisos, auditoría unificada, progreso/certificados/manuales.  
¿Aplica a Claude/prototipo?: Sí.  
Instrucción futura para Claude: no declarar cierre total si faltan subcontratos P0; conservar mejoras UX y completar pendientes.  
Estado: documentado.

## Estado

Registro creado. Debe actualizarse en cada bloque antes de entregar próximo paquete Claude descargable.