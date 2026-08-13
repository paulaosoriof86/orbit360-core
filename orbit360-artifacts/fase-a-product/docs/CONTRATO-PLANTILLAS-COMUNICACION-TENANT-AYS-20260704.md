# Contrato plantillas de comunicación por tenant

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato funcional/backend. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Centralizar plantillas de comunicación para portal, cobros, calidad de datos, gestiones, renovaciones, siniestros y Academia.

Las plantillas deben ser configurables por tenant, país, canal, audiencia y evento. No deben quedar hardcodeadas en módulos.

## 2. Entidad sugerida

```txt
plantillasComunicacion
```

## 3. Campos recomendados

- id
- tenantId
- pais
- canal
- audiencia
- evento
- nombre
- asunto
- cuerpo
- variablesPermitidas[]
- tono
- idioma
- version
- estado
- requiereAprobacion
- aprobadoPor
- createdBy
- createdAt
- updatedAt

## 4. Canales

- correo
- whatsapp_wa_me
- whatsapp_cloud_api_make
- portal
- interna
- topbar
- academia

## 5. Audiencias

- cliente
- asesor
- operativo
- cobros
- dirección/admin
- academia

## 6. Variables permitidas iniciales

- nombreCliente
- nombreAsesor
- contactoAsesor
- nombreTenant
- linkPortal
- linkPwaInstrucciones
- numeroPoliza
- numeroRecibo
- monto
- moneda
- fechaVencimiento
- estadoSolicitud
- camposFaltantes
- linkGestion
- linkDocumento
- linkCurso
- nombreCurso

## 7. Plantillas mínimas iniciales

### Portal — invitación cliente

- correo;
- WhatsApp;
- notificación interna asesor.

### Portal — activación confirmada

- cliente;
- asesor;
- operativo.

### Cobros — pago reportado

- confirmación cliente;
- aviso asesor;
- aviso Cobros/Operativo.

### Cobros — pago aprobado/rechazado

- cliente;
- asesor;
- Cobros.

### Calidad de datos

- solicitud individual;
- solicitud masiva;
- recordatorio;
- confirmación de actualización.

### Gestiones

- solicitud recibida;
- asignada;
- requiere información;
- resuelta;
- vencida;
- escalada.

### Renovaciones / cancelaciones / siniestros

- aviso cliente;
- aviso asesor;
- aviso operativo.

### Academia

- curso asignado;
- curso actualizado;
- evaluación pendiente;
- certificado emitido;
- manual actualizado.

## 8. Reglas de tono

Las plantillas deben ser:

- claras;
- humanas;
- profesionales;
- breves cuando son WhatsApp;
- explicativas cuando son correo;
- orientadas a beneficios;
- sin lenguaje técnico interno;
- sin prometer conexiones reales si no existen.

## 9. Reglas de seguridad

No incluir:

- contraseñas planas;
- tokens visibles largos;
- rutas internas;
- datos de otros clientes;
- información sensible no necesaria;
- mensajes que parezcan enviados si solo están preparados.

## 10. Estado honesto

Si un canal no está conectado, la plantilla puede quedar preparada, pero la notificación debe registrar:

```txt
estadoEnvio: preparada | pendiente_conexion
canalRealConectado: false
```

## 11. Configuración por tenant

A&S puede tener plantillas propias por tono, marca y país, pero el motor debe ser generalizable para otros tenants.

## 12. Relación con Academia

Cuando se cree o modifique una plantilla que afecte un flujo, debe actualizarse el manual/curso correspondiente:

- Portal;
- Cobros;
- Ops;
- Cliente360;
- Calidad de Datos;
- Integraciones;
- Academia.

## 13. Estado

Contrato creado. No implementa motor de plantillas ni envíos reales. Debe guiar configuración, frontend Claude y backend ChatGPT/Codex.
