# Contrato backend — Cliente360 Documentos, roles y parches documentales v1330

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Definir el contrato backend/prototipo para que Cliente360 pueda operar documentos, soportes y propuestas de actualización sin mezclar fuentes, sin escribir cambios automáticos y sin exponer datos sensibles.

Este contrato se prepara mientras Claude trabaja en UX/prototipo. No toca backend protegido.

## Alcance

Aplica a:

```txt
clientes
polizas
cobros
documentos
adjuntos
parchesPendientes
auditoria
actividades
```

No aplica a:

```txt
finmovs
produccion
comisiones
cartera automática desde financiero
Storage real final
Auth final
```

## Principios obligatorios

1. Documento soporte no escribe datos finales.
2. Documento soporte puede proponer un cambio, pero no aplicarlo.
3. Todo cambio propuesto vive en `parchesPendientes`.
4. Todo parche requiere diff, motivo, responsable, rol y auditoría.
5. ClientePortal ve historial simplificado, no auditoría interna sensible.
6. Dirección/Admin/IT ven auditoría completa según permisos.
7. AuditorSoloLectura no ejecuta acciones.
8. Faltante país/moneda bloquea escritura operativa.
9. GT exige GTQ; CO exige COP.
10. No se guardan base64, bytes, secretos, tokens ni URL pública de documentos.

## Modelo `documentos`

Campos mínimos:

```json
{
  "id": "doc...",
  "tenantId": "alianzas-soluciones",
  "clienteId": "cli...",
  "polizaId": "pol...",
  "cobroId": "cob...",
  "tipo": "soporte_pago|dpi|rtu|rut|poliza_emitida|tarjeta_circulacion|factura_aseguradora|otro",
  "nombre": "archivo.pdf",
  "mimeType": "application/pdf",
  "tamano": 0,
  "origen": "Portal del cliente|Cobros|Cliente360|Importador|Asesor",
  "estado": "en_revision|requiere_aclaracion|validado|rechazado|aplicado|bloqueado",
  "metaOnly": true,
  "storageEstado": "pendiente_storage|storage_conectado|no_aplica",
  "visibilidadCliente": true,
  "responsableId": "ase...",
  "responsableNombre": "",
  "fecha": "YYYY-MM-DD",
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

## Modelo `parchesPendientes`

Campos mínimos:

```json
{
  "id": "patch...",
  "tenantId": "alianzas-soluciones",
  "documentoId": "doc...",
  "clienteId": "cli...",
  "polizaId": "pol...",
  "cobroId": "cob...",
  "origen": "documento_soporte|poliza_emitida|dpi|rtu|tarjeta|portal",
  "entidadTipo": "cliente|poliza|cobro|vehiculo|aseguradora",
  "entidadId": "",
  "estado": "pendiente_revision|aprobado|rechazado|aplicado|bloqueado",
  "pais": "GT|CO",
  "moneda": "GTQ|COP",
  "campos": [
    {
      "campo": "telefono",
      "actual": "",
      "propuesto": "",
      "confianza": 0.85,
      "fuente": "archivo:hoja:fila/bloque",
      "requiereConfirmacion": true
    }
  ],
  "motivo": "",
  "responsableId": "ase...",
  "responsableNombre": "",
  "createdAt": "ISO",
  "updatedAt": "ISO",
  "auditId": "aud..."
}
```

## Estados permitidos

### Documento

```txt
en_revision
requiere_aclaracion
validado
rechazado
aplicado
bloqueado
```

### Parche

```txt
pendiente_revision
aprobado
rechazado
aplicado
bloqueado
```

## Acciones permitidas por rol

| Acción | Dirección | AdminTenant | ITSeguridad | Finanzas | Cobros | Operativo | Asesor | ClientePortal | AuditorSoloLectura |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Ver documento interno | Sí | Sí | Sí | Según módulo | Según módulo | Sí | Según cartera | No | Sí |
| Ver documento cliente | Sí | Sí | Sí | Según módulo | Según módulo | Sí | Según cartera | Propio | Sí |
| Cambiar visibilidad cliente | Sí | Sí | Sí | No | No | No | No | No | No |
| Solicitar aclaración | Sí | Sí | Sí | Sí | Sí | Sí | Sí | No | No |
| Aprobar parche | Sí | Sí | Según permiso | No | No | Operativo autorizado | No | No | No |
| Rechazar parche | Sí | Sí | Según permiso | No | No | Operativo autorizado | No | No | No |
| Aplicar parche | Sí | Sí | Backend autorizado | No | No | Operativo autorizado | No | No | No |
| Anular documento | Sí | Admin autorizado | IT autorizado | No | No | No | No | No | No |

## Gates obligatorios

Estas acciones requieren motivo obligatorio:

```txt
solicitar_aclaracion
aprobar_parche
rechazar_parche
aplicar_parche
cambiar_visibilidad_cliente
anular_documento
bloquear_documento
```

Estas acciones requieren confirmación reforzada:

```txt
aplicar_parche -> APLICAR
anular_documento -> ANULAR
cambiar_visibilidad_cliente_si_documento_sensible -> MOSTRAR CLIENTE
```

## Bloqueos obligatorios

Bloquear si:

```txt
- falta tenantId;
- falta documentoId en parche;
- falta entidadTipo/entidadId para aplicar;
- falta país/moneda cuando el parche afecta póliza/cobro/cartera;
- GT con moneda distinta de GTQ;
- CO con moneda distinta de COP;
- campos vacíos;
- campo propuesto contiene secreto/token/base64/bytes/url pública;
- rol no autorizado;
- documento está rechazado/anulado;
- parche ya fue aplicado;
- no existe motivo cuando aplica;
- no existe confirmación reforzada cuando aplica.
```

## Auditoría requerida

Cada acción sensible debe crear registro en `auditoria`:

```json
{
  "id": "aud...",
  "tenantId": "alianzas-soluciones",
  "fecha": "ISO",
  "actorRol": "AdminTenant",
  "actorNombre": "",
  "modulo": "cliente360",
  "categoria": "documento|parche_documental",
  "accion": "aprobar_parche",
  "severidad": "info|warning|critical|blocked",
  "motivo": "",
  "entidadTipo": "parchePendiente",
  "entidadId": "patch...",
  "before": {},
  "after": {},
  "resultado": "registrado|bloqueado|aplicado",
  "bloqueos": []
}
```

## Historial cliente vs auditoría interna

### ClientePortal puede ver

```txt
Documento recibido
En revisión
Requiere aclaración
Validado
Rechazado con explicación simple
Aplicado cuando corresponda
```

### ClientePortal no debe ver

```txt
motivos internos sensibles
auditLog completo
nombres de reglas técnicas
errores backend/Firestore/Auth/LAB
bloqueos internos de seguridad
```

## Instrucción para Claude/prototipo

¿Aplica a Claude/prototipo? Sí.

Claude debe implementar la UX de Cliente360 Documentos con este contrato:

```txt
- pestaña Documentos robusta;
- soportes de pago;
- documentos del expediente;
- propuestas/diffs pendientes;
- responsable;
- visibilidad cliente;
- estados claros;
- botones por rol;
- motivo obligatorio;
- historial cliente separado de auditoría interna;
- sin base64 ni secretos;
- sin escribir cambios finales desde documentos sin aprobación.
```

## Estado

Contrato backend/prototipo creado. Pendiente implementación UX por Claude y validación backend futura cuando se conecte Storage/Firestore real.