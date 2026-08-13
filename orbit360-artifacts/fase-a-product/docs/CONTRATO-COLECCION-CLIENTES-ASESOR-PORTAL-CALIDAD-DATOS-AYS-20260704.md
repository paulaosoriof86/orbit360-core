# Contrato colección `clientes` — asesor, portal y calidad de datos

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato backend/documental. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Definir el modelo base de clientes para conectar CRM, Cliente360, Portal, Cobros, Pólizas, Documentos, Calidad de Datos, Notificaciones y Academia.

## 2. Principio

Un cliente debe tener trazabilidad, tenant, país, moneda, asesor relacionado cuando aplique, contactos confiables y estado de calidad de datos.

No se deben crear clientes desde movimientos financieros ni desde documentos soporte sin confirmación y diff.

## 3. Campos base recomendados

- id
- tenantId
- tipoCliente
- nombre
- identificacionTipo
- identificacionNumero
- pais
- monedaPreferida
- asesorId
- ejecutivoId
- estadoCliente
- contactoPrincipal
- canalPrincipal
- direccion
- contactos[]
- portalEstado
- portalUsuarioId
- calidadDatosEstado
- camposFaltantes[]
- consentimientoContacto
- canalPreferido
- etiquetas[]
- origen
- fuenteMigracion
- trazabilidad
- createdAt
- updatedAt

## 4. País y moneda

- GT → GTQ.
- CO → COP.
- Si falta país o moneda confiable: `REQUIERE_VALIDACION`.
- Nunca sumar monedas en crudo.

## 5. Asesor relacionado

Si el cliente tiene asesor, debe guardarse `asesorId`.

El asesor debe recibir avisos relevantes de sus clientes cuando exista una acción importante: pago reportado, soporte cargado, solicitud de gestión, datos actualizados, portal invitado/activado, renovación, cancelación, siniestro o respuesta de datos faltantes.

## 6. Contactos

`contactos[]` debe permitir varios contactos por cliente:

- nombre;
- rol/contacto;
- canal;
- datoContacto;
- principal sí/no;
- autorizadoContacto sí/no;
- observación;
- origen;
- actualizadoAt.

## 7. Portal

Cliente360 debe mostrar estado del portal:

- no_habilitado;
- pendiente_datos;
- listo_para_invitar;
- invitado;
- activado;
- requiere_reenvio;
- suspendido;
- bloqueado.

Si no hay contacto confiable, el estado debe ser `pendiente_datos`.

## 8. Calidad de datos

Calidad de Datos debe calcular y gestionar:

- campos faltantes;
- prioridad;
- canal disponible;
- asesor responsable;
- fecha de última solicitud;
- estado de respuesta;
- próxima acción.

No debe inventar ni completar datos sin validación.

## 9. Relación con pólizas, cobros y documentos

Cliente360 debe poder consultar por `clienteId`:

- pólizas;
- recibos/cobros;
- pagos reportados;
- documentos visibles;
- gestiones;
- siniestros;
- renovaciones;
- cancelaciones;
- notificaciones;
- actividad/historial.

## 10. Reglas anti-contaminación

No permitir:

- crear cliente desde `finmovs`;
- inferir cliente desde estado bancario;
- crear cliente desde documento soporte sin confirmación;
- mezclar clientes entre tenants;
- cliente sin `tenantId`;
- portal cliente sin `clienteId`;
- asesor viendo cliente no asignado sin permiso;
- datos reales en seed.

## 11. Comunicación

Las comunicaciones hacia clientes se generan desde usuarios internos autorizados o integraciones configuradas.

El cliente no configura canales internos ni elige remitente.

Si falta canal externo, debe quedar notificación interna, mensaje preparado o tarea de seguimiento.

## 12. Academia y manuales

Actualizar:

- manual Cliente360;
- manual Portal Cliente;
- manual Calidad de Datos;
- manual Asesor;
- manual Administrativo/Operativo;
- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo.

## 13. Estado

Contrato creado. Debe guiar el siguiente bloque de validadores y smokes de cliente/asesor/portal/calidad.
