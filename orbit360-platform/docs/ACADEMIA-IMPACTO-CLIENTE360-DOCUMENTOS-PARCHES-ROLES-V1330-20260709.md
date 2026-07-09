# Academia — impacto Cliente360 Documentos/Parches/Roles v1330

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Impacto

El contrato backend de Cliente360 Documentos/Parches/Roles debe traducirse en Academia profunda porque afecta operación diaria, roles, auditoría y atención al cliente.

## Rutas a actualizar

### Dirección/AdminTenant/ITSeguridad

Debe aprender:

```txt
- revisar auditoría documental;
- aprobar/rechazar/aplicar parches;
- cambiar visibilidad cliente;
- bloquear documento;
- anular documento;
- proteger último admin y acciones sensibles;
- diferenciar historial cliente de auditoría interna.
```

### Operativo/Asesor

Debe aprender:

```txt
- revisar documentos del expediente;
- solicitar aclaración;
- leer propuestas/diffs;
- no aplicar datos sin autorización;
- no inferir país/moneda;
- no convertir soporte en pago aplicado.
```

### Cobros/Finanzas

Debe aprender:

```txt
- soporte de pago es evidencia;
- factura es metadata-only hasta revisión;
- pago aplicado exige validación autorizada;
- conciliación M5 validada no aplica pago;
- cobros/recaudos no son finmovs.
```

### ClientePortal

Debe ver lenguaje simple:

```txt
- recibido;
- en revisión;
- necesitamos aclaración;
- validado;
- rechazado;
- aplicado cuando corresponda.
```

No debe ver:

```txt
auditLog interno;
reglas técnicas;
Firebase/Firestore/backend/LAB;
severidad interna;
bloqueos técnicos.
```

## Evaluaciones mínimas

Preguntas obligatorias:

1. ¿Un documento soporte puede modificar automáticamente una póliza?
2. ¿Qué rol puede aplicar un parche documental?
3. ¿Qué pasa si falta país/moneda?
4. ¿Qué ve ClientePortal y qué no ve?
5. ¿Qué datos nunca deben guardarse en auditoría?

## Certificación

Crear microcertificado:

```txt
Gestión segura de documentos y cambios de expediente
```

Requisito:

```txt
80% de acierto + caso práctico de diff documental.
```

## Estado

Impacto Academia documentado. Pendiente que Claude lo materialice en rutas, progreso, evaluaciones y certificados.