# Contrato/modelo — Documentos + Storage futuro + adjuntos A&S

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## 1. Propósito

Definir el contrato backend/prototipo para documentos, adjuntos y Storage futuro sin subir archivos reales, sin escribir datos reales y sin crear/modificar entidades maestras automáticamente.

Este contrato conecta:

- Portal Cliente;
- Cobros / pagos reportados;
- Conciliaciones M5;
- Cliente360;
- Operativo / gestiones;
- pólizas / expediente;
- documentos soporte de importación;
- Academia y manuales.

## 2. Regla maestra

Los documentos soporte **solo proponen datos**. No crean ni modifican clientes, pólizas, cobros, cartera, finmovs ni producción sin confirmación explícita, diff y auditoría.

Un adjunto puede quedar visible y trazable, pero no significa que el dato esté aprobado ni aplicado.

## 3. Colecciones lógicas previstas

### `documentos`

Registro metadata-only del documento/soporte.

Campos mínimos:

```txt
id
tenantId
pais
moneda si aplica
tipoDocumento
origen
estado
storageRef o placeholderRef futuro
nombreVisible
mimeType
hashLocal opcional sin contenido
relaciones[]
trazabilidad
creadoPor
creadoEn
actualizadoEn
```

Estados permitidos:

```txt
recibido
en_revision
propuesta_datos
requiere_validacion
aprobado_para_expediente
rechazado
archivado
bloqueado
```

### `adjuntos`

Referencia visible del archivo asociado a una gestión, pago reportado, conciliación, cliente, póliza o siniestro.

Campos mínimos:

```txt
id
tenantId
documentoId
moduloOrigen
entidadTipo
entidadId
visibleParaRoles[]
estadoVisibilidad
storageRef futuro
noPayload=true
creadoEn
```

Estados de visibilidad:

```txt
visible_operativo
visible_cobros
visible_cliente
solo_interno
bloqueado
archivado
```

### `parchesPendientes`

Propuestas de cambio derivadas de documentos. Nunca se aplican solas.

Campos mínimos:

```txt
id
tenantId
documentoId
entidadTipoObjetivo
entidadIdObjetivo opcional
diffPropuesto
estado
motivo
creadoEn
revisadoPor
revisadoEn
```

Estados:

```txt
propuesto
requiere_validacion
aprobado_para_aplicar
rechazado
bloqueado
aplicado_con_auditoria
```

### `gestiones`

Las gestiones pueden referenciar documentos y adjuntos, pero no deben usar el documento para aplicar cambios sin diff.

Relaciones permitidas:

```txt
documentoId
adjuntoId
pagoReportadoId
conciliacionId
clienteId
polizaId
siniestroId
```

### `conciliaciones`

Pueden referenciar documentos de soporte o estado bancario. Una conciliación validada sigue sin equivaler a pago aplicado hasta que exista flujo autorizado de aplicación.

## 4. Relación con Portal Cliente

Cuando un cliente reporta un pago y adjunta soporte:

1. Se crea o queda preparada una entrada de documento/adjunto metadata-only.
2. Se crea una gestión o evento de pago reportado en estado `recibido_pendiente_validacion`.
3. El cliente ve un estado honesto: recibido / en revisión / requiere validación / rechazado / aplicado cuando corresponda.
4. Cobros/operativo ve el adjunto y la trazabilidad.
5. No se marca cobro como pagado automáticamente.
6. No se actualiza cartera automáticamente.

Copy obligatorio:

```txt
Soporte recibido. Pendiente de validación por el equipo.
```

Copy prohibido si no hay validación/aplicación real:

```txt
Pago aplicado
Cobro confirmado
Póliza pagada
Conciliado automáticamente
```

## 5. Relación con Cliente360

Cliente360 debe mostrar:

- documentos asociados al cliente;
- documentos asociados a pólizas del cliente;
- pagos reportados con soporte;
- parches pendientes derivados de documentos;
- estado de revisión y responsable.

Cliente360 no debe:

- modificar cliente por leer DPI/NIT/soporte;
- crear póliza por leer documento;
- aplicar cobro por soporte;
- crear cartera desde documento.

## 6. Relación con pólizas y expediente

Un documento puede adjuntarse al expediente de póliza si:

- existe póliza validada;
- existe relación explícita;
- el documento está aprobado para expediente o marcado como soporte en revisión;
- queda trazabilidad de quién lo vinculó y cuándo.

Un documento de póliza emitida puede proponer datos, pero debe pasar por diff:

```txt
campo
valorActual
valorPropuesto
fuenteDocumento
confianza
estadoRevision
```

## 7. Relación con importación y documentos soporte

Tipos de fuente permitidos:

```txt
documentos_soporte
pago_reportado
estado_cuenta_bancario
planilla_aseguradora
planilla_comisiones
poliza_emitida
dpi_nit_cliente
tarjeta_circulacion
recibo_pago
siniestro_soporte
```

Bloqueos:

- `documentos_soporte` no puede escribir directamente `clientes` ni `polizas`.
- `estado_cuenta_bancario` no puede escribir `cobros` ni `cartera` directamente.
- `recibo_pago` no puede aplicar pago sin conciliación/validación.
- `poliza_emitida` no puede activar póliza sin país, moneda, estado y diff aprobado.
- `dpi_nit_cliente` no puede crear/actualizar cliente sin revisión.

## 8. País, moneda y trazabilidad

Si el documento está asociado a dinero o póliza, debe conservar:

```txt
pais
moneda
periodo
archivoOrigen
hojaOrigen si aplica
filaOrigen si aplica
bloqueOrigen si aplica
tipoFuente
responsable
fechaRecepcion
```

Si falta país o moneda confiable:

```txt
estado = requiere_validacion
write_enabled = false
aplicacion_directa = false
```

Puede sugerirse moneda por país, pero no autoriza escritura.

## 9. Storage futuro

Mientras no exista Storage final conectado:

- no se suben archivos reales al repo;
- no se guardan base64;
- no se guardan URLs públicas reales;
- no se guardan tokens ni credenciales;
- se puede registrar `storageRef` placeholder o contrato futuro;
- el estado debe decir `pendiente_storage` o `referencia_preparada`.

Contrato futuro de referencia:

```txt
tenants/{tenantId}/documents/{documentId}/{safeFileName}
```

Reglas esperadas para Storage futuro:

- tenant isolation;
- access por rol/relación;
- cliente solo ve documentos permitidos de su expediente;
- asesor solo ve documentos de su cartera autorizada;
- operativo/cobros ve soportes según flujo;
- auditoría de lectura/descarga para documentos sensibles.

## 10. Acciones administrativas permitidas

Acciones con motivo obligatorio:

```txt
aprobar documento para expediente
rechazar documento
bloquear documento
archivar documento
aprobar diff propuesto
aplicar diff aprobado
vincular documento a cliente/póliza/cobro/siniestro
quitar vínculo
```

Acciones con confirmación reforzada:

```txt
aplicar diff a entidad maestra
eliminar vínculo crítico
bloquear documento por sospecha
habilitar visibilidad a cliente
```

## 11. Auditoría mínima

Cada acción sensible debe registrar:

```txt
fecha
usuario
rol
tenantId
accion
motivo
documentoId
entidadRelacionada
before
after
resultado
```

## 12. Impacto en Academia

Rutas impactadas:

- Portal Cliente: cómo reportar pago y cargar soporte.
- Cobros: revisión de soportes y relación con conciliación.
- Operativo: expediente documental y gestiones.
- Dirección: auditoría, control de riesgos y aprobación de cambios.
- IT/Superadmin: Storage futuro, roles y accesos.

Lecciones necesarias:

- Documento recibido no equivale a dato aprobado.
- Soporte de pago no equivale a pago aplicado.
- Diff obligatorio antes de modificar cliente/póliza.
- País/moneda bloquean flujos monetarios.
- Visibilidad por rol y relación.

## 13. Instrucciones para Claude

Claude debe implementar UX/prototipo que:

- muestre adjuntos y documentos con estado honesto;
- diferencie recibido, en revisión, aprobado para expediente y aplicado;
- use modales de diff antes de cambiar datos;
- no muestre términos técnicos de backend/Storage/LAB/Firebase al cliente;
- no prometa carga real si Storage no está conectado;
- mantenga trazabilidad visible para roles autorizados;
- incluya estas lecciones en Academia.

## 14. Estado

Contrato/modelo creado sin datos reales, sin Storage real, sin Firestore writes, sin deploy, sin merge y sin tocar backend protegido.