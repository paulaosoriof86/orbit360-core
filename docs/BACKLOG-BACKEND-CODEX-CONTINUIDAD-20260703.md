# Backlog backend ChatGPT/Codex — Continuidad Orbit 360

**Fecha:** 2026-07-03  
**Responsable:** ChatGPT/Codex  
**Alcance:** backend, datos, Firestore, Auth, integraciones, contratos, migración A&S.

## 1. Regla principal

El backend no se reinicia por cada prototipo nuevo de Claude. Avanza por contrato estable:

- misma API `Orbit.store`;
- tenant isolation;
- colecciones estables;
- reglas recaudo/finmov;
- migración de datos controlada;
- documentación directa en GitHub.

## 2. Pendientes P0 backend

### B0-01 — Crear contrato de datos backend

Documento requerido: `docs/CONTRATO-DATOS-BACKEND-ORBIT360.md`.

Debe definir:

- colecciones;
- campos mínimos;
- índices sugeridos;
- relaciones;
- tenant path;
- reglas de escritura/lectura;
- eventos `_emit`;
- campos de auditoría.

### B0-02 — Proteger regla recaudo vs `finmovs`

Backend debe impedir duplicidad:

- Cobros/pagos aplicados no escriben finmov real.
- Solo conciliación/factura/comisión recibida/banco crea finmov.
- Todo debe tener traza.

### B0-03 — Firestore LAB con `Orbit.store`

Implementar/validar:

- `all`;
- `get`;
- `where`;
- `insert`;
- `update`;
- `remove`;
- `_emit`;
- `onSnapshot`;
- aislamiento por `tenantId`.

### B0-04 — Smoke backend mínimo

Debe validar:

- crear cliente;
- crear póliza;
- generar recibo/cobro;
- aplicar pago como recaudo comercial;
- verificar que no se crea `finmov`;
- crear comisión real/liquidación según caso;
- leer Cliente 360.

### B0-05 — Migración base A&S controlada

Primer corte:

- directorio aseguradoras GT/CO;
- clientes;
- pólizas;
- vehículos;
- recibos/cobros;
- deduplicación;
- reporte de rechazados.

Los datos reales no se hardcodean ni van al prototipo. Van a backend/tenant autorizado o dataset anonimizado.

## 3. Pendientes P1 backend

### B1-01 — Auth LAB

- Usuarios por correo real.
- Roles/módulos visibles.
- Tenant isolation.
- Reglas Firestore.
- No mezclar usuarios demo con reales.

### B1-02 — Storage/Drive

- Documentos por cliente/póliza/reclamo/aseguradora.
- URLs reales.
- Carpeta por tenant/cliente.
- Permisos según rol.

### B1-03 — Planillas, facturas y liquidaciones

- Planilla aseguradora.
- Factura con IVA.
- Comisión a cobrar.
- Comisión asesor.
- USD/tasa/diferencia.
- Historial de cambios.
- Aprobación fila/todo.

### B1-04 — Integraciones Make/correo/WhatsApp

- Webhook por tenant.
- Evento + datos + plantilla.
- Make arma correo HTML; WhatsApp texto plano.
- Registro de envío/estado.

### B1-05 — IA backend

- Proveedor por tenant.
- Claude/OpenAI/Gemini/endpoint.
- No `window.claude` directo en backend.
- JSON estructurado.
- Logs y costos por tenant.

## 4. Pendientes P2 backend

- Reportería exportable.
- Auditoría completa por usuario.
- Monitoreo de errores.
- Backups y restore.
- Ambientes dev/lab/prod.
- Migración histórica completa.

## 5. Orden recomendado de ejecución

1. Crear contrato de datos.
2. Validar/implementar Firestore store.
3. Smoke con datos ficticios.
4. Importación base A&S controlada.
5. Finanzas/comisiones.
6. Auth.
7. Storage/Drive.
8. Integraciones reales.
9. IA backend.

## 6. Criterio para declarar avance backend

Un avance backend solo cuenta si tiene:

- archivo cambiado o creado en GitHub;
- reporte de smoke o validación;
- bitácora actualizada;
- no afecta frontend Claude;
- no rompe `Orbit.store`.

## Estado

**Estado:** ABIERTO / EN PROGRESO.  
**Próxima acción:** crear contrato de datos backend.
