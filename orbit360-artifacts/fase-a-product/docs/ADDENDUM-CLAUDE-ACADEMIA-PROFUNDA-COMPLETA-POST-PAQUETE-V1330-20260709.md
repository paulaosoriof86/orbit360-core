# Addendum Claude — Academia profunda completa post-paquete v1330

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama backend activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Este addendum complementa el paquete Claude completo post auditoría/empalme P0 v1330. Paula detectó que el paquete enviado podía no reflejar con suficiente profundidad todos los pendientes acumulados de Academia.

Este documento debe pegarse a Claude como instrucción adicional, sin reemplazar el paquete completo.

## Instrucción principal para Claude

Además de todo el paquete completo recibido, debes cerrar la **Academia profunda, interactiva y por rol** de Orbit 360 A&S. No basta con agregar textos o lecciones básicas. La Academia debe funcionar como sistema operativo de adopción, formación, certificación y actualización continua de la plataforma.

## Fuentes obligatorias

Leer y aplicar:

```txt
ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md
DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md
04_HOTFIXES_REPLICABLES_Y_BACKEND_POST_CANDIDATA.md
CONTRATO-BACKEND-CLIENTE360-DOCUMENTOS-ROLES-PARCHES-V1330-20260709.md
ACADEMIA-IMPACTO-CLIENTE360-DOCUMENTOS-PARCHES-ROLES-V1330-20260709.md
```

## No tocar

No tocar ni reemplazar:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
orbit360-platform/index.html
```

## Archivos objetivo probables

Puedes trabajar en:

```txt
orbit360-platform/data/academia-plus.js
orbit360-platform/modules/academia.js
orbit360-platform/modules/cliente360.js
orbit360-platform/modules/portal.js
orbit360-platform/modules/cobros.js
orbit360-platform/modules/conciliaciones.js
orbit360-platform/modules/configuracion.js
orbit360-platform/modules/equipo.js
orbit360-platform/styles/infra.css
orbit360-platform/docs/BITACORA-CAMBIOS.md
```

## Requisito de profundidad

La Academia debe incluir:

```txt
- rutas guiadas por rol;
- cursos por módulo;
- lecciones paso a paso;
- casos prácticos reales pero con datos ficticios;
- evaluaciones útiles por rol;
- progreso visible;
- certificados/microcertificados;
- manuales descargables o visibles;
- actualización continua cuando cambien módulos;
- relación con permisos y acciones sensibles;
- historial de cambios de cursos;
- recordatorios/notificaciones honestas de capacitación pendiente;
- lenguaje no técnico para usuarios operativos;
- lenguaje más profundo para Dirección/Admin/IT.
```

## Roles mínimos

Crear o reforzar rutas para:

```txt
1. Dirección
2. AdminTenant
3. ITSeguridad
4. Finanzas
5. Cobros
6. Operativo
7. Asesor
8. Marketing
9. AcademiaAdmin
10. ClientePortal
11. AuditorSoloLectura
```

Cada ruta debe indicar:

```txt
- objetivo del rol;
- módulos que debe dominar;
- permisos y límites;
- acciones sensibles que puede/no puede hacer;
- riesgos comunes;
- checklist de operación diaria;
- evaluación final;
- certificado o constancia.
```

## Rutas por rol esperadas

### Dirección

Debe dominar:

```txt
- tablero ejecutivo;
- producción sobre prima neta recaudada;
- metas;
- comisiones;
- cartera por país/moneda;
- KPIs sin mezclar GTQ/COP;
- auditoría;
- permisos;
- aprobación de cambios sensibles;
- lectura de riesgos operativos;
- integraciones como estados honestos.
```

### AdminTenant

Debe dominar:

```txt
- configuración tenant;
- marca y white-label;
- países/monedas/impuestos;
- aseguradoras;
- roles y usuarios;
- módulos visibles;
- integraciones preparadas;
- gates de seguridad;
- último administrador protegido;
- auditoría por tenant.
```

### ITSeguridad

Debe dominar:

```txt
- secretos fuera del frontend;
- credentialRef/backend_required;
- integraciones pendientes vs activas;
- no base64/bytes en UI;
- backend protegido;
- store contract;
- auditoría unificada;
- bloqueo de acciones sensibles;
- lectura de reportes y validadores.
```

### Finanzas

Debe dominar:

```txt
- recaudos/cobros separados de finmovs;
- banco y estados de cuenta;
- financiero histórico vs cartera;
- no crear cobros desde banco sin conciliación;
- no sumar monedas en crudo;
- validaciones GT/CO;
- reportes por país/moneda;
- trazabilidad de fuente.
```

### Cobros

Debe dominar:

```txt
- pago reportado por cliente;
- soporte metadata-only;
- validación de reporte;
- aplicación autorizada de pago;
- factura metadata-only;
- motivo obligatorio;
- bloqueo por país/moneda;
- aging;
- recordatorios;
- historial cliente.
```

### Operativo

Debe dominar:

```txt
- Cliente360;
- pólizas;
- renovaciones;
- documentos;
- parchesPendientes;
- diffs documentales;
- solicitar aclaración;
- no aplicar cambios sin aprobación;
- siniestros;
- cartera operativa.
```

### Asesor

Debe dominar:

```txt
- clientes propios;
- CRM/leads;
- oportunidades;
- cotizador/comparativo;
- tareas de seguimiento;
- documentos visibles según cartera;
- no ver auditoría interna completa;
- no aplicar parches sin permiso.
```

### Marketing

Debe dominar:

```txt
- calendario de contenidos;
- campañas;
- plantillas;
- comunicación por canal;
- estados honestos de integración;
- no simular envío real;
- relación con CRM y renovaciones.
```

### AcademiaAdmin

Debe dominar:

```txt
- crear cursos;
- editar rutas;
- asignar por rol;
- revisar progreso;
- emitir certificados;
- actualizar contenidos cuando cambien módulos;
- usar IA como apoyo sin perder control humano;
- manuales y evaluaciones.
```

### ClientePortal

Debe dominar:

```txt
- ver pólizas;
- reportar pago;
- adjuntar soporte metadata-only;
- entender estados: recibido/en revisión/validado/rechazado/aplicado;
- subir documentos;
- solicitar soporte;
- no ver auditoría interna;
- no confundir reporte con pago aplicado.
```

### AuditorSoloLectura

Debe dominar:

```txt
- revisar historial;
- revisar auditoría autorizada;
- revisar documentos y cambios;
- no ejecutar acciones;
- exportar/consultar evidencias según permiso;
- detectar riesgos sin modificar operación.
```

## Rutas por módulo esperadas

Actualizar o crear cursos para:

```txt
1. Inicio/Dashboard ejecutivo
2. Clientes y Cliente360
3. Documentos, soportes y parches pendientes
4. Pólizas
5. Cobros y cartera
6. Conciliaciones M5
7. Finanzas/finmovs
8. Siniestros
9. Renovaciones
10. CRM/Leads/Ops
11. Cotizador/Comparativo
12. Aseguradoras
13. Marketing/Calendario/Plantillas
14. Portal Cliente
15. Configuración tenant
16. Equipo/Roles/Permisos
17. Integraciones/Automatizaciones
18. Importadores/Migración por fuentes separadas
19. Auditoría y acciones sensibles
20. Seguridad/no secretos/no base64
```

Cada curso debe tener:

```txt
- objetivo;
- a quién va dirigido;
- prerequisitos;
- 3 a 6 lecciones;
- práctica operativa;
- checklist;
- quiz con mínimo 4 preguntas;
- criterio de aprobación;
- certificado/microcertificado si aplica.
```

## Contenidos obligatorios por hotfix post-candidata

Incorporar como lecciones/evaluaciones:

### Cobros

```txt
- reportado ≠ validado ≠ aplicado ≠ conciliado;
- validación exige motivo;
- aplicación exige motivo;
- país/moneda obligatorios;
- GT→GTQ y CO→COP;
- factura metadata-only;
- no base64/readAsDataURL/factData.
```

### Conciliaciones M5

```txt
- validada no aplicada;
- M5 no modifica cobros;
- M5 no baja cartera;
- M5 no crea finmovs;
- anular exige ANULAR;
- rechazar/bloquear/anular conservan trazabilidad.
```

### Portal

```txt
- soporte de pago metadata-only;
- soporteDocumentoId;
- storageEstado pendiente_storage;
- historial cliente;
- reporte no aplica pago.
```

### Config/Equipo

```txt
- credentialRef/backend_required;
- integración preparada no activa;
- motivo para plan/módulos/integraciones;
- motivo para crear/editar/inactivar usuarios;
- último administrador protegido;
- reset permisos con RESTABLECER.
```

### Cliente360 Documentos

```txt
- documentos;
- soportes;
- propuestas/diffs;
- parchesPendientes;
- estados;
- visibilidad cliente;
- historial cliente vs auditoría interna;
- acciones por rol;
- motivo y confirmación.
```

## Migración y fuentes separadas en Academia

Agregar ruta específica para migración:

```txt
- clientes;
- aseguradoras;
- pólizas;
- vehículos;
- cobros_realizados;
- planilla_aseguradora;
- planilla_comisiones;
- estado_cuenta_bancario;
- financiero_historico;
- siniestros;
- documentos_soporte;
- configuracion_catalogo.
```

Reglas a evaluar:

```txt
- no mezclar fuentes;
- no inferir clientes/pólizas desde finmovs;
- no escribir cartera desde financiero histórico;
- no escribir cobros desde banco sin conciliación;
- conservar archivo/hoja/fila/bloque/país/moneda/periodo;
- faltante país/moneda = requiere_validación;
- planillas comisión desde filas reales, no tarifas simuladas;
- producción/metas/comisiones sobre prima neta recaudada.
```

## Evaluaciones y certificados mínimos

Crear microcertificados:

```txt
- Inducción Orbit 360 A&S por rol.
- Gestión segura de documentos y cambios de expediente.
- Cobros y cartera segura.
- Conciliación M5 sin aplicación automática.
- Administración tenant y permisos.
- Migración por fuentes separadas.
- Seguridad operativa y auditoría.
- Portal Cliente: uso correcto para clientes.
```

Cada certificado debe tener:

```txt
- progreso visible;
- puntaje mínimo sugerido 80%;
- fecha de aprobación;
- rol asociado;
- opción de recertificación cuando cambien reglas o módulos.
```

## Notificaciones y actualización continua

Agregar UX o datos para:

```txt
- curso pendiente;
- curso vencido por actualización;
- recertificación requerida;
- nueva lección por cambio de módulo;
- aviso a AdminTenant cuando un rol crítico no está certificado;
- aviso a Dirección cuando haya brechas de capacitación en acciones sensibles.
```

Estados honestos:

```txt
Pendiente
En progreso
Aprobado
Requiere refuerzo
Requiere recertificación
Actualizado por cambio de módulo
```

## Manuales visibles

La Academia debe mostrar manuales por rol/módulo:

```txt
- Manual rápido por rol.
- Manual operativo por módulo.
- Checklist de cierre diario/semanal.
- Glosario de estados.
- Guía de acciones sensibles.
- Guía de documentos/parches.
- Guía de migración por fuentes.
```

No tienen que ser PDFs reales si no existe generador; pueden ser secciones descargables/visibles dentro del prototipo con estado honesto.

## Criterios de rechazo Academia

Rechazar candidata si:

```txt
- Academia queda como texto plano superficial;
- no hay rutas por rol;
- no hay progreso;
- no hay evaluaciones;
- no hay certificados o microcertificados;
- no incluye hotfixes post-candidata;
- no incluye documentos/parches/roles;
- no incluye migración por fuentes separadas;
- muestra términos técnicos al cliente;
- toca backend protegido;
- elimina contenido existente de academia-plus;
- pierde cursos ya existentes;
- hardcodea A&S/datos reales.
```

## Entrega esperada

Claude debe entregar:

```txt
- candidata ZIP;
- lista de archivos modificados;
- bitácora de cambios Academia;
- checklist de rutas por rol;
- checklist de cursos por módulo;
- checklist de evaluaciones/certificados;
- smoke visual Academia;
- pendientes restantes para ChatGPT/Codex si algo requiere backend.
```

## Nota final

Este addendum es obligatorio. No reemplaza el paquete completo; lo complementa y corrige la falta de profundidad percibida en Academia.