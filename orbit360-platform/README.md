# Orbit 360 · Plataforma

Sistema 360 para intermediarios de seguros, comercializable, white-label y multi-tenant. A&S es el primer tenant y se configura mediante `Orbit.tenant`; no existe un fork de código para Alianzas.

## Estado vivo — 2026-07-11

```txt
Repositorio: paulaosoriof86/orbit360-core
Rama activa: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge/deploy/main/producción: no autorizados
Baseline: rama viva protegida + empalme selectivo candidata Claude v1.188–v1.197
```

La última candidata auditada es:

```txt
Prototype Development Request - 2026-07-11T093254.494.zip
SHA256: 8ea0fd79eb80bf8b9da2601e17f4922292087e297773bebfe9530e4745aab1a0
```

La candidata no reemplaza la rama: aporta UX, responsive, Academia y patrones visuales; el backend, `Orbit.store`, Auth, importadores, seguridad y contratos vivos se preservan mediante empalme aditivo.

## Objetivo operativo

Orbit 360 no se considera terminado por acumular arquitectura o documentación. El objetivo es operar A&S progresivamente con sus fuentes reales, sanitizadas y trazables, mientras el mismo core queda preparado para futuros tenants.

Orden de cierre vigente:

```txt
1. CRM completo: Clientes 360, Pólizas, Vehículos, Recibos, Cobros,
   Cartera, Comisiones, Portal, Calidad y scopes por asesor.
2. Aseguradoras operativas: contactos, plataformas, cuentas, productos,
   documentos, configuración y relación con Cotizador/Comparativo.
3. Cotizador + Comparativo configurable a partir de comparativo_final_v110.html.
4. Ops + Leads y sus cadencias/gestiones.
5. Finanzas, conciliaciones, comisiones, CxC/CxP y movimientos históricos.
6. Marketing con calendario real A&S.
7. Siniestros, renovaciones, cancelaciones, reportes, automatizaciones,
   integraciones, portal y Academia profunda transversal.
```

Cada grupo se cierra con datos A&S sanitizados, reglas de negocio, permisos, tests/smoke y una validación visual única cuando el bloque esté listo.

## Arquitectura

```txt
orbit360-platform/
├── index.html
├── styles/
├── data/
│   ├── store.js
│   ├── store-firestore-lab.local.js
│   └── seed.js
├── core/
├── modules/
├── docs/
└── tools/
```

### Capa de datos única

Los módulos usan exclusivamente `Orbit.store`:

```txt
all/get/where/find/insert/update/remove/on/_emit/pref/setPref/init/reseed/raw
```

No se permite almacenamiento operativo directo en módulos. El adaptador LAB/real conserva la firma, el tenant y los eventos.

### Carriles permanentes

```txt
A — prototipo/UX/Academia/empalmes Claude.
B — backend protegido, Auth, seguridad, Orbit.store, integraciones.
C — datos reales y migración operativa A&S por fuentes separadas.
```

Ningún bloque debe avanzar solo en documentación: debe dejar código, prueba, smoke, matriz de cierre o avance operativo verificable.

## Datos y tenant

- Prototipo comercial: datos ficticios.
- Tenant A&S/LAB: datos reales solo por importación/control local, sin hardcodearlos ni subir payload al repositorio.
- Nuevos registros creados desde la plataforma deben tomar país, moneda, impuestos, catálogos, permisos y defaults desde la configuración del tenant.
- GT usa GTQ; CO usa COP. Si falta país/moneda, el registro queda `REQUIERE_VALIDACION`.
- Cobros/recaudos no son `finmovs`.
- Producción, metas y comisiones usan prima neta recaudada.

## Recursos seguros

El frontend utiliza referencias, no secretos:

```txt
documentRef
credentialRef
```

El visor y la bóveda visual ya tienen contrato. OAuth Drive, Shared Drives, bóveda real, reautenticación, TTL y auditoría durable pertenecen al backend Carril B y deben conectarse sin exponer secretos en frontend, store, seed o logs.

## Documentación actual

Leer primero:

```txt
docs/PROTOCOLO-ANTI-DESVIACION-PLAN-OPERATIVO-DATOS-REALES-AYS-20260709.md
docs/AUDITORIA-FORENSE-Y-EMPALME-CANDIDATA-V1197-20260711.md
docs/DELTA-CANDIDATA-V1197-VS-RAMA-VIVA-20260711.md
docs/PLAN-RETOMA-BACKEND-POST-EMPALME-V1197-20260711.md
docs/MATRIZ-FUENTES-REALES-RECIBIDAS-FALTANTES-AYS-20260709.md
```

Los documentos históricos anteriores siguen como evidencia, pero no prevalecen sobre estos controles vivos.
