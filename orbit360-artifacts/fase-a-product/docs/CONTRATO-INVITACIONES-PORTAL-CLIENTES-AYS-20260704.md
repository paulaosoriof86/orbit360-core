# Contrato invitaciones Portal de Clientes

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato funcional/backend. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Definir cómo la plataforma debe invitar a clientes nuevos y existentes a usar el Portal de Clientes.

La invitación debe ser práctica, clara y orientada a beneficios, no solo un envío técnico de acceso.

## 2. Disparadores de invitación

La invitación puede generarse por:

- cliente creado;
- póliza emitida;
- cliente migrado con datos válidos;
- asesor solicita invitar;
- operativo selecciona clientes;
- campaña masiva desde Calidad de Datos/Portal/Admin;
- cliente actualiza datos y queda listo para portal;
- reenvío por invitación no activada.

## 3. Modo automático vs manual

### Automático

Puede enviarse cuando el cliente cumple condiciones mínimas:

- correo o WhatsApp válido;
- país definido;
- asesor relacionado si aplica;
- portal habilitado;
- plantilla aprobada;
- canal conectado o modo demo honesto.

### Manual/masivo

Debe permitir seleccionar:

- uno o varios clientes;
- segmento por país;
- clientes sin activar;
- clientes con pólizas vigentes;
- clientes con datos completos;
- clientes con datos incompletos para solicitar actualización;
- clientes por asesor.

## 4. Canales

Canales previstos:

- correo;
- WhatsApp directo/wa.me;
- WhatsApp Cloud API vía Make;
- notificación interna al asesor;
- link copiable;
- QR.

Si el canal real no está conectado, debe quedar como preparación de mensaje o notificación interna, sin simular envío real.

## 5. Contenido mínimo de invitación

La invitación debe incluir:

- saludo personalizado;
- presentación breve de A&S/tenant;
- qué es el Portal de Clientes;
- beneficios prácticos;
- link de acceso;
- indicación de instalación PWA;
- datos de asesor/contacto;
- advertencia de seguridad: no compartir acceso;
- cierre humano.

## 6. Beneficios que debe comunicar

El cliente debe entender que desde el portal puede:

- consultar sus pólizas;
- ver recibos y pagos pendientes;
- reportar pagos y cargar soporte;
- solicitar gestiones;
- adjuntar documentos;
- revisar estado de solicitudes;
- contactar a su asesor;
- recibir información relevante;
- tener acceso rápido desde el celular como PWA.

## 7. Plantilla base correo

Asunto sugerido:

```txt
Te damos acceso a tu Portal de Clientes A&S
```

Cuerpo base:

```txt
Hola {{nombreCliente}},

Queremos que tengas una forma más práctica de consultar y gestionar tu información de seguros.

Desde tu Portal de Clientes podrás ver tus pólizas, revisar recibos, reportar pagos con soporte, solicitar gestiones y dar seguimiento al estado de tus solicitudes.

Ingresa aquí:
{{linkPortal}}

También puedes agregarlo a la pantalla de inicio de tu celular para tener acceso rápido como app.

Tu asesor/a: {{nombreAsesor}}
Contacto: {{contactoAsesor}}

Por seguridad, no compartas tu acceso con terceros.

Gracias por confiar en Alianzas y Soluciones.
```

## 8. Plantilla base WhatsApp

```txt
Hola {{nombreCliente}}, soy {{nombreAsesor}} de Alianzas y Soluciones.

Te comparto el acceso a tu Portal de Clientes, donde podrás consultar pólizas, ver recibos, reportar pagos con soporte y solicitar gestiones:

{{linkPortal}}

Puedes guardarlo en tu celular como app para ingresar más fácil.

Cualquier duda, estoy pendiente.
```

## 9. Invitación por datos incompletos

Si el cliente no puede ser invitado porque faltan datos, debe pasar a Calidad de Datos para solicitar actualización de forma amable.

No enviar acceso si falta contacto confiable.

## 10. Estados de invitación

- pendiente_datos
- listo_para_invitar
- invitacion_preparada
- enviada
- entregada
- fallida
- reenviar
- activada
- vencida
- cancelada

## 11. Historial

Cada invitación debe guardar:

- clienteId;
- asesorId;
- canal;
- plantilla;
- destinatario;
- fecha;
- estado;
- error;
- linkId o tokenId;
- vencimiento;
- usuario que envió;
- resultado de activación.

## 12. Vista administrativa

Debe existir una vista para:

- clientes no invitados;
- invitados no activados;
- activados;
- invitación fallida;
- pendiente de datos;
- reenviar invitación;
- enviar masivo filtrado;
- exportar/visualizar resultados.

## 13. Relación con Academia

El curso/ruta Cliente nuevo debe explicar:

- cómo ingresar al portal;
- qué puede hacer;
- cómo reportar pago;
- cómo pedir gestión;
- cómo revisar estado;
- cómo instalar la PWA;
- cómo contactar al asesor.

## 14. Estado

Contrato creado. Debe implementarse después de Auth/usuarios/roles y notificaciones reales o modo demo honesto.
