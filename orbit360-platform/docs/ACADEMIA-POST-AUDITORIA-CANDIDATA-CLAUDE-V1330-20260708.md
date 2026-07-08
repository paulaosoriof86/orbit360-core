# Academia post-auditoría — candidata Claude v1330 `2026-07-08T135740`

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Qué sí hizo la candidata

La candidata sí agrega o fortalece contenidos de Academia en `data/academia-plus.js` para:

- Portal Cliente: pagos y documentos.
- Cobros/Finanzas: validar sin aplicar.
- Cliente360/Documentos: expediente, soportes y diffs.
- Dirección/Admin: configuración, roles e integraciones.
- Estados honestos e integraciones pendientes.

## Qué queda pendiente en Academia

La candidata fue generada antes de los últimos bloques backend/documentales, por lo tanto todavía debe incorporar:

```txt
MATRIZ-ROLES-PERMISOS-ACCIONES-SENSIBLES-V1330-20260708.md
MATRIZ-ROLES-PERMISOS-V1330.json
CONTRATO-AUDITORIA-UNIFICADA-ACCIONES-SENSIBLES-V1330-20260708.md
AUDITORIA-UNIFICADA-SCHEMA-V1330.json
PATRONES-REPLICABLES-FUTUROS-TENANTS-ORBIT360-V1330-20260708.md
```

## Lecciones pendientes nuevas

1. Matriz de roles Orbit 360.
2. Acciones sensibles y motivo obligatorio.
3. Confirmación reforzada.
4. Auditoría unificada y severidades.
5. Historial visible para cliente vs historial interno.
6. Qué datos nunca deben registrarse en bitácora.
7. Integraciones: configurada vs activa vs bloqueada.
8. Futuros tenants: configuración sin fork.

## Casos prácticos pendientes

- Admin intenta inactivar el último administrador: debe bloquearse.
- Cobros intenta aplicar pago con moneda incoherente: debe bloquearse.
- Usuario intenta guardar API key en frontend/store: debe bloquearse o transformarse en referencia segura.
- Cliente ve historial de soporte sin motivos internos sensibles.
- AuditorSoloLectura revisa bitácora sin ejecutar acciones.

## Certificados pendientes

```txt
Administración segura de tenant
Gobierno de acciones sensibles
Auditoría operativa Orbit 360
Seguridad documental por rol
Cobros auditables
```

## Estado

Academia de la candidata es una base fuerte, pero debe recibir actualización post-auditoría antes de considerarse cerrada.