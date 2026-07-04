# Registro backend continuidad — bloque notificaciones unificadas

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft

## Bloque trabajado

Se documentó el bloque de notificaciones unificadas para conectar Portal, Cliente360, Ops, Cobros, Calidad de Datos, invitaciones, asesor, Academia y topbar.

## Motivo

En bloques previos se detectó que hay múltiples capas de avisos:

- toast;
- actividades;
- avisos internos;
- notificaciones del portal;
- mensajes preparados;
- textos que sugieren WhatsApp/correo.

Esto debe unificarse para saber quién recibió qué, por qué canal, si fue real o preparado y qué trazabilidad quedó.

## Archivos creados

- `CONTRATO-COLECCION-NOTIFICACIONES-LAB-AYS-20260704.md`
- `MATRIZ-EVENTOS-AUDIENCIAS-CANALES-NOTIFICACIONES-AYS-20260704.md`
- `CONTRATO-PLANTILLAS-COMUNICACION-TENANT-AYS-20260704.md`
- `PLAN-BACKEND-NOTIFICACIONES-UNIFICADAS-20260704.md`
- `PENDIENTES-CLAUDE-NOTIFICACIONES-UNIFICADAS-V123-20260704.md`

## Decisiones

1. Toda notificación debe tener evento, audiencia, canal, estado, entidad relacionada y trazabilidad.
2. El asesor debe recibir avisos de movimientos relevantes de sus clientes.
3. El cliente debe recibir retroalimentación visible de solicitudes iniciadas desde Portal.
4. Cobros/Ops deben recibir avisos accionables.
5. Academia debe tener notificaciones de cursos, manuales, rutas, evaluaciones y certificados.
6. No se debe marcar como enviada una notificación por canal externo si la integración no está conectada.
7. Las plantillas deben ser configurables por tenant.

## Próximo paso recomendado

Auditar la candidata activa v1.123 en:

- `core/notify.js`;
- `core/ciclo.js`;
- `modules/notificaciones.js`;
- `modules/portal.js`;
- `modules/cliente360.js`;
- `modules/cobros.js`;
- `modules/ops.js`;
- `data/seed.js`.

Resultado esperado:

```txt
NOTIFICACIONES-UNIFICADAS-DIAGNOSTICO
- capas actuales
- eventos cubiertos
- eventos faltantes
- duplicidades
- canales simulados
- riesgos
- pendientes Claude
- pendientes backend
- impacto Academia/manuales
```

## Estado

Documentado. No se tocó `data/store.js`, Firestore, deploy, main ni datos reales.
