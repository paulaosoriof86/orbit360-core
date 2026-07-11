# ACTUALIZACIÓN DELTA PARA CLAUDE — CRM v1.198

Fecha: 2026-07-11  
Base Claude: candidata v1.197  
Base viva: rama `ays/backend-tenant-lab-v99-20260703`.

## Cambios posteriores que la próxima candidata debe recibir

```txt
core/access-scope.js
modules/crm-v1198-operational-bridge.js
modules/portal-v1198-scope-viewer-bridge.js
```

Patrones UX/producto obligatorios:

- scope de datos `own/team/all/none` separado del rol activo;
- filtro de listas, KPI, selectores y deep-links;
- rol desconocido sin acceso, nunca Dirección por fallback;
- KPI Cliente360 con detalle real;
- GTQ y COP separados;
- alta manual con tenant/país/moneda/asesor/fuente/actor/calidad;
- estado inicial `pendiente_polizas`;
- deduplicación exacta/probable antes de crear;
- Asesor completa únicamente campos faltantes;
- reasignación, estado, pólizas y cobros mediante gestión de corrección;
- Portal limitado por alcance;
- documentos mediante visor transversal y `documentRef`;
- copy operativo, sin términos de backend.

## Pendientes que no deben declararse cerrados

- transacción completa Póliza → Recibos/Cobros;
- permisos finos de Conciliaciones/Comisiones;
- Portal cliente con Auth real;
- mensajería según conexión real;
- Equipo multirol + scope configurable;
- smoke visual responsive y dataset sanitizado;
- Academia actualizada con estos flujos.

## No entregar a Claude

```txt
payload real A&S
secretos
reglas Firebase/Auth
providers reales
URLs privadas
cuentas reales
```

Estado: `ACUMULADO_PARA_PROXIMO_PAQUETE_CLAUDE`.
