# Orbit 360 · Plataforma

Sistema 360 para intermediarios de seguros, comercializable, white-label y multi-tenant. A&S es el primer tenant y se configura mediante `Orbit.tenant`; no existe un fork de código para Alianzas.

## Estado vivo — 2026-07-14

```txt
Repositorio: paulaosoriof86/orbit360-core
Rama activa: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge/deploy/main/producción: no autorizados
Baseline: rama viva protegida + candidata v1.251 empalmada aditivamente + documentación vigente
```

La última candidata incremental aceptada y empalmada es:

```txt
Prototype Development Request - 2026-07-14T102112.323.zip
Versión: v1.251
SHA-256: 23f2252e1304708b383b91c3d809e9224c733f2f854267b76bd2fca10239ac6c
```

El empalme no reemplaza la rama: integra el delta funcional de v1.251 mediante un puente aditivo y reversible, preservando backend, `Orbit.store`, Auth, importadores, seguridad y contratos vivos.

Documentos canónicos actuales:

```txt
docs/BASELINE-VIVO-ORBIT360-AYS-20260714.md
docs/EMPALME-SEGURO-CANDIDATA-V1251-20260714.md
docs/PENDIENTES-ACUMULADOS-POST-V1251-20260714.md
docs/PLAN-OPERATIVO-POST-EMPALME-V1251-DATOS-AYS-20260714.md
```

## Estado de cierre operativo

```txt
CRM:
  funcional y visualmente cerrado
  evidencia previa: 10/10 escenarios aprobados
  gates de sesión/país/scope endurecidos por empalme v1.251
  no repetir salvo regresión nueva o cambio de alcance

Aseguradoras:
  directorio y ficha operativa implementados
  cuentas bancarias separadas de credenciales
  bancos visibles y copiables para usuarios con acceso al módulo
  credenciales por referencia/proveedor seguro
  evidencia reutilizable previa: 12/15 escenarios aprobados
  pendiente: gate visual focalizado en tres vistas y validación responsive final

Cotizador/Comparativo:
  gate de tarifa, consistencia, fuente, montos, replanteamiento e historial presentes
  mejoras configurables acumuladas; no reiniciar el módulo

Ops/Leads:
  flujo, emisión y endosos presentes
  acciones públicas endurecidas por el empalme
  legacy restante documentado para una mejora acumulada futura
```

## Próxima acción operativa

```txt
1. Ejecutar verificación read-only del tenant A&S y de sus membresías.
2. Comparar conteos sanitizados contra dry-runs ya recibidos.
3. Preparar diff de Clientes, Aseguradoras e Histórico Financiero.
4. No escribir hasta confirmación explícita.
5. Después de Clientes, procesar Pólizas como fuente separada.
```

## Objetivo operativo

Orbit 360 no se considera terminado por acumular arquitectura o documentación. El objetivo es operar A&S progresivamente con sus fuentes reales, sanitizadas y trazables, mientras el mismo core queda preparado para futuros tenants.

Orden de cierre vigente:

```txt
1. CRM completo — cerrado; carga real controlada pendiente.
2. Aseguradoras operativas — funcional; gate visual focalizado y carga GT/CO pendientes.
3. Cotizador + Comparativo configurable a partir de comparativo_final_v110.html.
4. Ops + Leads y sus cadencias/gestiones.
5. Finanzas, conciliaciones, comisiones, CxC/CxP e histórico.
6. Marketing con calendario real A&S.
7. Siniestros, renovaciones, cancelaciones, reportes, automatizaciones,
   integraciones, portal y Academia profunda transversal.
```

Cada grupo se cierra con datos A&S sanitizados, reglas de negocio, permisos, tests/smoke y una validación visual única cuando el bloque esté listo.

## Metodología 0% manual

```txt
ChatGPT/Codex:
  audita, modifica, empalma, documenta, valida y prepara el gate

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

Los reanudadores usan evidencia estructurada, no frases, tildes, orden de archivos o codificación de reportes.

## Arquitectura y capa de datos

```txt
orbit360-platform/
├── index.html
├── styles/
├── data/
├── core/
├── modules/
├── docs/
└── tools/
```

Los módulos usan exclusivamente `Orbit.store`:

```txt
all/get/where/find/insert/update/remove/on/_emit/pref/setPref/init/reseed/raw
```

No se permite almacenamiento operativo directo en módulos. El adaptador LAB/real conserva firma, tenant y eventos.

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
- Nuevos registros toman país, moneda, impuestos, catálogos, permisos y defaults desde la configuración del tenant.
- GT usa GTQ; CO usa COP. Si falta país/moneda, queda `REQUIERE_VALIDACION`.
- Cobros/recaudos no son `finmovs`.
- Producción, metas y comisiones usan prima neta recaudada.

### Importadores seguros

Los libros multihoja se filtran antes del parser. Índices, diagnósticos, directorios internos y hojas con señales técnicas se excluyen con motivo y conteos, sin mostrar ni persistir su contenido.

```txt
Revisión preliminar:
  sin captura de recursos protegidos

Importación preparada:
  captura protegida solo sobre hojas permitidas

Actualización:
  identidad canónica exacta o revisión humana
```

## Recursos operativos

```txt
Cuentas bancarias de Aseguradoras:
  visibles y copiables para usuarios con acceso al directorio

Usuarios/contraseñas de portales:
  Dirección/Admin/Operativo o permiso extra explícito
```

La migración legacy es no destructiva: se conserva el valor operativo hasta copiarlo, verificarlo y auditar su retiro.

## Documentación actual

Leer primero:

```txt
docs/BASELINE-VIVO-ORBIT360-AYS-20260714.md
docs/EMPALME-SEGURO-CANDIDATA-V1251-20260714.md
docs/PENDIENTES-ACUMULADOS-POST-V1251-20260714.md
docs/PLAN-OPERATIVO-POST-EMPALME-V1251-DATOS-AYS-20260714.md
docs/PROTOCOLO-ANTI-DESVIACION-PLAN-OPERATIVO-DATOS-REALES-AYS-20260709.md
docs/MATRIZ-FUENTES-REALES-RECIBIDAS-FALTANTES-AYS-20260709.md
```

Los documentos históricos siguen como evidencia, pero no prevalecen sobre el baseline vivo y los controles actuales.
