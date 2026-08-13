# Plan de rescate controlado — candidata Claude 2026-07-08T183042.881

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

La candidata nueva trae avances útiles de UX, pero también riesgos P0 que impiden empalmar ZIP completo.

## Decisión

```txt
No empalmar ZIP completo.
Rescatar solo fragmentos seguros.
Mantener hotfixes P0 ChatGPT/Codex como fuente de verdad para backend/prototipo seguro.
```

## Qué se puede rescatar

### Cliente360

Rescatable:

```txt
- layout de propuestas/diffs en pestaña Documentos;
- botones Aprobar/Rechazar/Solicitar aclaración;
- idea de motivo obligatorio;
- visibilidad por rol como UX base.
```

Debe corregirse antes de empalmar:

```txt
- aprobar NO debe aplicar diff directo al cliente sin gate reforzado;
- usar estados del contrato: pendiente_revision, requiere_aclaracion, aprobado, rechazado, aplicado, bloqueado;
- registrar auditoría unificada;
- validar país/moneda si afecta póliza/cobro;
- separar aprobar de aplicar cuando corresponda;
- usar confirmación APLICAR si aplica cambios finales.
```

### Cobros

Rescatable:

```txt
- motivo obligatorio al confirmar cobro;
- guard país/moneda GT=GTQ y CO=COP;
- factura metadata-only.
```

Debe corregirse:

```txt
- eliminar comentario con readAsDataURL/base64 para validadores estrictos;
- factura metadata-only no debe poner conciliado=true;
- registrar auditoría unificada.
```

### Portal

Rescatable:

```txt
- soporte de pago como documento metaOnly;
- soporteDocumentoId vinculado al cobro;
- storageEstado pendiente_storage.
```

Debe corregirse:

```txt
- enRevision debe quedar coherente con reporte en revisión;
- eliminar comentario base64;
- completar campos tenantId/visibilidadCliente/responsable/updatedAt;
- registrar auditoría.
```

### Configuración

Rescatable:

```txt
- credentialRef;
- backend_required;
- RESTABLECER para reset.
```

Debe corregirse:

```txt
- no usar id ci-key;
- no mostrar copy API key/token/backend si queda visible a usuario final;
- no guardar endpoint sensible como secreto;
- integrar con gates Equipo.
```

## Qué NO se puede considerar cerrado por esta candidata

```txt
- Academia profunda completa.
- Cotizador/Comparativo smoke y rutas Academia.
- M5/Conciliaciones P0.
- Equipo gates P0.
- Auditoría unificada real.
- Runner/validador post-runner ejecutados.
```

## Orden de rescate recomendado

```txt
1. Ejecutar runner P0 ChatGPT/Codex cuando haya computador.
2. Validar commit_ready.
3. Preparar script de Cliente360 Documentos/Parches/Roles que rescate UX de botones, pero adaptado al contrato v1330.
4. Preparar smoke Cotizador/Comparativo/Academia.
5. Regenerar paquete Claude si hace falta con addendum Academia incluido.
```

## Estado

Plan de rescate creado. Pendiente decidir si se crea script de rescate Cliente360 adaptado al contrato o se espera nueva candidata.