# Addendum maestro — seguimiento de bloques, avance y pendientes

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: complemento al documento maestro de continuidad.

## 1. Objetivo

Agregar una regla operativa para que, después de cada bloque largo de trabajo, se pueda ver claramente:

- qué bloque se trabajó;
- qué parte del plan avanzó;
- qué documentos/contratos se crearon;
- qué pendientes siguen;
- qué hallazgos intermedios se agregaron;
- qué sigue después.

## 2. Regla obligatoria al cerrar cada bloque

Al finalizar cada bloque, la respuesta debe incluir una sección breve de control:

```txt
Avance del bloque
- Bloque trabajado:
- Plan/área impactada:
- Documentos creados/actualizados:
- Decisiones agregadas:
- Pendientes que siguen:
- Próximo bloque recomendado:
- Estado PR/rama:
```

## 3. Documento de plan vivo

Debe mantenerse un documento vivo de avance en repo:

```txt
orbit360-platform/docs/PLAN-VIVO-AVANCE-BACKEND-AYS-20260704.md
```

Ese documento debe actualizarse o complementarse cuando un bloque cambie el plan, agregue un pendiente relevante o cree una ruta intermedia.

## 4. Bloques intermedios

Si durante un bloque aparece una necesidad que no estaba en el plan original, no debe perderse. Debe registrarse como:

```txt
Intermedio agregado
- Motivo:
- Riesgo si no se atiende:
- Relación con plan principal:
- Estado:
- Próximo paso:
```

## 5. Correo/canales por usuario

Regla complementaria:

- El correo/canal externo saliente se autoriza por usuario interno.
- No es correo único por tenant.
- No se activa automáticamente por rol.
- El tenant/admin puede crear o indicar la creación del correo del usuario al darlo de alta.
- Si el usuario ya tiene correo autorizado, puede recibir notificación de alta por ese canal.
- Si no lo tiene, debe recibir instrucciones por canal disponible o quedar como pendiente.
- El cliente portal no configura correo ni elige remitente.

## 6. Alta de usuario

Al crear un usuario interno, la plataforma debe poder:

- registrar datos básicos del usuario;
- asignar rol o multi-rol;
- asignar módulos visibles;
- indicar si tendrá correo autorizado;
- indicar si el correo ya existe o debe crearse;
- enviar o preparar notificación de alta por canal disponible;
- registrar trazabilidad de invitación/activación.

## 7. Estado

Este addendum debe leerse junto con el documento maestro y los contratos recientes de Auth, notificaciones, portal, usuarios y correo por usuario autorizado.
