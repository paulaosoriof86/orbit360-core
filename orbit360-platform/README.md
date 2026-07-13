# Orbit 360 · Plataforma

Sistema 360 para intermediarios de seguros, comercializable, white-label y multi-tenant. A&S es el primer tenant y se configura mediante `Orbit.tenant`; no existe un fork de código para Alianzas.

## Estado vivo — 2026-07-13

```txt
Repositorio: paulaosoriof86/orbit360-core
Rama activa: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge/deploy/main/producción: no autorizados
Baseline: rama viva protegida + empalmes selectivos auditados + documentación vigente
```

La última candidata auditada sigue siendo:

```txt
Prototype Development Request - 2026-07-11T093254.494.zip
SHA256: 8ea0fd79eb80bf8b9da2601e17f4922292087e297773bebfe9530e4745aab1a0
```

La candidata no reemplaza la rama: aporta UX, responsive, Academia y patrones visuales; el backend, `Orbit.store`, Auth, importadores, seguridad y contratos vivos se preservan mediante empalme aditivo.

## Estado de cierre operativo

```txt
CRM OP-1:
  funcional y visualmente cerrado
  evidencia: 10/10 escenarios aprobados
  no repetir salvo regresión nueva o cambio de alcance

Aseguradoras OP-2:
  cierre funcional implementado
  evidencia reutilizable: 12/15 escenarios aprobados
  pendiente real: 3 vistas de Plataformas
  no repetir los 12 escenarios aprobados

Siguiente acción inmediata:
  ejecutar un único gate focalizado de Plataformas
  combinar 12 + 3 para cerrar Aseguradoras 15/15

Siguiente acción operativa Carril C:
  dry-run separado Directorio Guatemala
  dry-run separado Directorio Colombia
  resolver alias/entidades aliadas/filas bloqueadas
  no aplicar recursos sensibles sin proveedor seguro

Siguiente módulo del plan:
  Cotizador + Comparativo configurable
```

## Objetivo operativo

Orbit 360 no se considera terminado por acumular arquitectura o documentación. El objetivo es operar A&S progresivamente con sus fuentes reales, sanitizadas y trazables, mientras el mismo core queda preparado para futuros tenants.

Orden de cierre vigente:

```txt
1. CRM completo: Clientes 360, Pólizas, Vehículos, Recibos, Cobros,
   Cartera, Comisiones, Portal, Calidad y scopes por asesor.
   Estado: OP-1 cerrado; Pólizas reales siguen como fuente separada pendiente.
2. Aseguradoras operativas: contactos, plataformas, cuentas, productos,
   documentos, configuración y relación con Cotizador/Comparativo.
   Estado: 12/15 visual; pendiente únicamente Plataformas.
3. Cotizador + Comparativo configurable a partir de comparativo_final_v110.html.
4. Ops + Leads y sus cadencias/gestiones.
5. Finanzas, conciliaciones, comisiones, CxC/CxP y movimientos históricos.
6. Marketing con calendario real A&S.
7. Siniestros, renovaciones, cancelaciones, reportes, automatizaciones,
   integraciones, portal y Academia profunda transversal.
```

Cada grupo se cierra con datos A&S sanitizados, reglas de negocio, permisos, tests/smoke y una validación visual única cuando el bloque esté listo.

## Metodología 0% manual

```txt
ChatGPT/Codex:
  audita, modifica, empalma, documenta, valida estáticamente y prepara el gate

Paula:
  ejecuta un único gate local final solo cuando Chrome/Windows o fuentes locales
  sean indispensables, y revisa visualmente el resultado
```

No corresponde pedir a Paula:

- escoger puertos;
- cerrar otras aplicaciones;
- seleccionar manualmente reportes o carpetas;
- repetir módulos o escenarios ya aprobados;
- editar archivos, rutas o comandos internos;
- diagnosticar fallos del pipeline.

Los reanudadores deben basarse en evidencia estructurada (`results.jsonl` + capturas), no en frases, tildes, orden de archivos o codificación de reportes.

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

El frontend utiliza referencias y proveedores seguros, pero la visibilidad responde a la necesidad operativa:

```txt
Cuentas bancarias de Aseguradoras:
  visibles y copiables para usuarios autorizados del directorio

Usuarios/contraseñas de portales:
  Dirección/Admin/Operativo o permiso extra explícito
```

La migración de valores legacy es no destructiva: se conserva el valor operativo hasta copiarlo, verificarlo y auditar su retiro.

## Documentación actual

Leer primero:

```txt
docs/PROTOCOLO-ANTI-DESVIACION-PLAN-OPERATIVO-DATOS-REALES-AYS-20260709.md
docs/PATRON-CLAUDE-ASEGURADORAS-OP2-V1217-20260713.md
docs/CORRECCION-OPERATIVIDAD-CUENTAS-CREDENCIALES-ASEGURADORAS-V1218-20260713.md
docs/HALLAZGO-VISUAL-PLATAFORMAS-ASEGURADORAS-12-DE-15-20260713.md
docs/AUDITORIA-SANITIZADA-DIRECTORIOS-ASEGURADORAS-GT-CO-OP2-20260713.md
docs/REPORTE-CIERRE-FUNCIONAL-CRM-OP1-PENDIENTE-GATE-VISUAL-20260712.md
docs/MATRIZ-FUENTES-REALES-RECIBIDAS-FALTANTES-AYS-20260709.md
```

Los documentos históricos anteriores siguen como evidencia, pero no prevalecen sobre estos controles vivos.
