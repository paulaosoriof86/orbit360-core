# Especificación de rutas y reglas productivas multi-tenant — Orbit 360

Fecha: 2026-07-13  
Carril: B — backend protegido, seguridad y `Orbit.store`  
Estado: contrato P0 implementado; reglas productivas todavía no aplicadas  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Objetivo

Definir una única jerarquía productiva, reusable y no dependiente de A&S, para que el adapter productivo de `Orbit.store`, Auth y las reglas futuras compartan la misma resolución de tenant, membresía, rol activo, módulos y scopes.

Este bloque no modifica `firestore.rules`, `core/auth.js`, `data/store.js`, el adapter LAB ni producción.

## 2. Rutas canónicas

```txt
tenants/{tenantId}
tenants/{tenantId}/system/config
tenants/{tenantId}/members/{uid}
tenants/{tenantId}/data/{collection}/items/{documentId}
tenants/{tenantId}/auditEvents/{eventId}
tenants/{tenantId}/importBatches/{batchId}
tenants/{tenantId}/credentialRefs/{refId}
tenants/{tenantId}/academyProgress/{uid}
```

La ruta operativa conserva la intención documental previa `tenants/{tenantId}/data/...`, pero la hace válida y determinista para Firestore mediante un documento de colección y la subcolección `items`.

## 3. Reglas obligatorias de identidad

- `tenantId` es un slug canónico de 3 a 63 caracteres.
- Ningún documento operativo puede cambiar de tenant.
- La ruta y `record.tenantId` deben coincidir.
- El usuario debe tener membresía activa en `tenants/{tenantId}/members/{uid}`.
- `activeRole` debe existir dentro de `roles[]`.
- Cambiar vista activa no concede roles nuevos.
- Módulos visibles y scopes son controles independientes.
- País permitido se valida además del tenant.

## 4. Scopes y consultas

```txt
own  -> consulta por advisorId
team -> consulta por teamId
all  -> sin filtro de ownership, siempre dentro del tenant
none -> denegar
```

Toda consulta productiva debe construirse desde la política y no descargar el tenant completo para filtrar en cliente. Firestore exige que las consultas satisfagan las mismas restricciones que las reglas.

## 5. Separación de colecciones sensibles

Firestore no ofrece lectura parcial por campo. Por eso:

- secretos reales no se almacenan en documentos operativos;
- `credentialRefs` contiene solo referencias y metadatos seguros;
- el secreto vive en un proveedor seguro del backend;
- `auditEvents` es append-only;
- cambios de membresías usan el contrato específico de membresías;
- `finmovs`, banco y conciliaciones usan planes de escritura controlada;
- documentos visibles al asesor deben estar separados de documentos internos.

## 6. Límites del rol Asesor

Puede leer únicamente registros propios y países habilitados cuando el módulo esté visible. Puede:

- completar campos de contacto permitidos;
- registrar gestiones de corrección tipificadas;
- trabajar calidad de datos de sus propios clientes.

No puede:

- reasignar asesor;
- fusionar o borrar clientes;
- modificar pólizas, cobros, cartera o movimientos financieros;
- editar documentos validados;
- leer plataformas/credenciales restringidas;
- leer auditoría interna;
- administrar membresías.

## 7. Escrituras sensibles

No deben escribirse directamente desde módulos:

```txt
members
credentialRefs
finmovs
movimientosBanco
conciliacionBancaria
auditEvents
```

Estas operaciones requieren contrato, diff, actor, rol activo, motivo, confirmación reforzada, audit log, idempotencia y rollback. El ejecutor futuro usa exclusivamente el adapter productivo de `Orbit.store` o un servicio backend autorizado.

## 8. Coexistencia con LAB

El adapter LAB y su ruta legacy se mantienen intactos mientras sirven de entorno de prueba. El modo productivo debe:

- activarse por configuración de entorno, no por fallback;
- resolver cualquier tenant autorizado;
- usar las rutas canónicas;
- no contener UID, correo ni tenant de demostración;
- fallar cerrado si Auth, membresía o configuración no están disponibles.

## 9. Orden de implementación posterior

1. Adapter productivo compatible con API `Orbit.store`.
2. Resolución Auth → tenant memberships.
3. Lectura de membresía y rol activo persistido.
4. Consultas por módulo/scope/país.
5. Rules productivas equivalentes a los contratos.
6. Emulator tests para aislamiento cross-tenant y escalamiento de permisos.
7. Ejecutor de escrituras controladas.
8. Hosting y secretos de entorno.
9. Primera carga confirmada y smoke real.

## 10. Aplicación a Claude/prototipo

```txt
¿Aplica a Claude/prototipo? Sí.
```

Claude debe conservar:

- selector de rol activo limitado a roles asignados;
- estados no técnicos cuando falta acceso/configuración;
- módulos visibles separados del alcance de datos;
- pantallas de confirmación antes/después para ampliar permisos;
- gestiones de corrección para asesores;
- ausencia total de rutas Firestore, nombres de backend o secretos en UI.

No se solicita una candidata paralela mientras Claude trabaja. El delta se incorpora únicamente después de auditar la candidata incremental más reciente.
