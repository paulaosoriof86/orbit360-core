# Contrato Calidad de Datos — solicitud amable de datos faltantes

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato funcional/backend. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Definir cómo Calidad de Datos debe permitir gestionar individual o colectivamente datos faltantes de clientes, con comunicación amable, trazable y útil para habilitar Portal, notificaciones, cobros, renovaciones y servicio.

## 2. Principio

Calidad de Datos no debe ser solo una lista pasiva de faltantes. Debe permitir accionar:

- solicitar datos individualmente;
- solicitar datos masivamente por segmento;
- seleccionar campos faltantes;
- elegir canal;
- generar mensaje amable;
- registrar historial;
- notificar al asesor;
- actualizar estado de respuesta.

## 3. Campos faltantes relevantes

Ejemplos de campos que pueden bloquear o limitar operación:

- correo;
- teléfono/WhatsApp;
- DPI/NIT/documento;
- dirección;
- fecha de nacimiento;
- país;
- moneda;
- asesor;
- consentimiento de contacto;
- contacto de emergencia si aplica;
- datos de facturación;
- placa/vehículo si aplica;
- datos de beneficiarios si aplica;
- documentos soporte.

## 4. Acciones requeridas

Desde Calidad de Datos debe poderse:

- ver faltantes por cliente;
- filtrar por tipo de dato;
- filtrar por asesor;
- filtrar por país;
- filtrar por prioridad;
- seleccionar uno o varios clientes;
- generar solicitud individual;
- generar campaña masiva;
- excluir clientes sin canal válido;
- registrar respuesta;
- marcar completado;
- crear gestión si requiere seguimiento.

## 5. Canales

- correo;
- WhatsApp/wa.me;
- WhatsApp Cloud API vía Make;
- llamada registrada como actividad;
- tarea para asesor;
- mensaje desde Portal si ya está activo.

Si el canal real no está conectado, usar estado honesto: mensaje preparado / notificación interna / pendiente de conexión.

## 6. Mensaje base amable

```txt
Hola {{nombreCliente}},

En Alianzas y Soluciones estamos actualizando la información de nuestros clientes para mantenerte informado/a, ayudarte con tus pólizas y atender tus solicitudes de forma más ágil y segura.

Nos ayudarías confirmando o completando estos datos:

{{camposFaltantes}}

Puedes responder por este medio o ingresar al Portal de Clientes:
{{linkPortal}}

Gracias por tu apoyo. Esta actualización nos permite darte un mejor seguimiento y mantener tu expediente al día.
```

## 7. Mensaje corto WhatsApp

```txt
Hola {{nombreCliente}}, soy {{nombreAsesor}} de Alianzas y Soluciones.

Estamos actualizando tu información para mantener tu expediente al día y poder atenderte mejor.

Nos ayudas confirmando estos datos:
{{camposFaltantes}}

Puedes responder por aquí o ingresar al Portal:
{{linkPortal}}

Gracias.
```

## 8. Estados de solicitud

- pendiente_datos;
- solicitud_preparada;
- enviada;
- entregada;
- respondida;
- completada;
- parcial;
- fallida;
- requiere_llamada;
- vencida;
- descartada.

## 9. Trazabilidad

Cada solicitud debe registrar:

- clienteId;
- asesorId;
- campos solicitados;
- canal;
- plantilla;
- fecha;
- responsable;
- estado;
- respuesta;
- actualización aplicada;
- gestión relacionada;
- notificación relacionada.

## 10. Relación con Portal

Si el cliente ya tiene Portal activo, puede completar datos desde su perfil.

Si no tiene Portal activo pero sí canal confiable, se le puede enviar invitación al Portal junto con solicitud de datos.

Si no tiene correo ni teléfono válido, debe quedar en pendiente para gestión por asesor/operativo.

## 11. Relación con asesor

El asesor debe poder:

- ver clientes con datos faltantes;
- recibir notificación cuando se solicita información a su cliente;
- recibir notificación cuando el cliente responde;
- hacer seguimiento manual;
- completar datos si el cliente se los entrega por otro canal.

## 12. Criterio de aceptación

El módulo cumple cuando:

- no solo muestra faltantes, permite gestionarlos;
- permite solicitud individual y masiva;
- permite seleccionar campos;
- genera mensaje claro y amable;
- registra trazabilidad;
- notifica al asesor;
- conecta con Portal si aplica;
- no inventa datos ni completa sin validación.

## 13. Academia y manuales

Actualizar:

- manual Calidad de Datos;
- manual Cliente360;
- manual Portal;
- ruta Administrativo/Operativo;
- ruta Asesor nuevo;
- evaluación sobre actualización de datos y trazabilidad.

## 14. Estado

Contrato creado. No implementa envíos reales ni actualiza datos reales. Debe guiar frontend, backend y notificaciones.
