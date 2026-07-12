# Reporte de empalme v1.215 y arranque CRM OP-1

Fecha: 2026-07-12  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main

## Resultado ejecutivo

Se cerró el ciclo de candidata Claude v1.215 sin devolver otro paquete. Los cambios útiles se conservaron y los dos errores residuales se corrigieron en el contrato reusable de la rama, no mediante reemplazo ciego de módulos.

Después del empalme se retomó el plan operativo e inició OP-1 CRM con una corrección funcional en Calidad de datos. CRM no se declara cerrado hasta completar su validación visual.

## Empalme v1.215 aplicado

### Código

Archivo actualizado:

```txt
orbit360-platform/core/quote-comparison-contracts-v1203-refinements.js
```

Commit:

```txt
672cfb49744a509eb87ff594ff79e23b095f2827
```

Incluye:

- desglose real de prima neta, gastos, impuestos y total;
- tolerancia absoluta de 0.51;
- compatibilidad con DTO plano heredado;
- persistencia por `Orbit.store`;
- auditoría de creación/actualización;
- `estimacion_interna` → `revisada_interna`;
- estimación interna no elegible para ranking, comparativo, comunicación o emisión;
- rechazo de comparativos con propuestas internas/no validadas.

### Patrón obligatorio para Claude

Documento:

```txt
orbit360-platform/docs/PATRON-REUTILIZABLE-CLAUDE-DESGLOSE-COTIZACION-ESTIMACION-INTERNA-20260712.md
```

Commit:

```txt
8edb44ee99ef86c4150838e3da7e5d30507071fc
```

Debe incorporarse en la próxima candidata Claude que modifique Cotizador/Comparativo. No contiene tarifas ni reglas exclusivas de A&S.

### Validación automatizada

```txt
tools/orbit360-validar-cierre-cotizador-comparativo-v1215.mjs
.github/workflows/orbit360-cotizador-comparativo-v1215-smoke.yml
```

Commits:

```txt
bc9b271a0cdae203610e04bbbfb1837896b2d335
7f5e02d8bf7ded1507b3c738dcbdcf974a49ccbc
```

El validador revisa contrato, default-deny, desglose, estimaciones internas, persistencia, flujo de emisión, sintaxis y hashes protegidos.

### Cache-bust seguro

```txt
tools/orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1
```

Último commit:

```txt
05c2548c89ae93871a67da8c0d10cbc2100107f0
```

Actualiza de forma idempotente y con backup:

- refinamientos Cotizador/Comparativo v1.215;
- Calidad CRM OP-1.

No hace commit, push ni deploy.

## Archivos que no se reemplazaron

Se preservaron los módulos y extensiones operativas de la rama:

```txt
modules/aseguradoras.js
modules/cliente360.js
modules/ops.js
modules/leads.js
```

Ops y Leads eran byte-equivalentes a la candidata auditada. Aseguradoras y Cliente360 contienen extensiones operativas posteriores y no se sustituyeron por versiones del ZIP.

No se modificaron:

```txt
data/store.js
core/auth.js
core/importa.js
data/store-firestore-lab.local.js
core/backend-lab-*
firestore.rules
```

## Plan operativo consolidado

Documento:

```txt
orbit360-platform/docs/PLAN-OPERATIVO-MODULOS-POST-EMPALME-V1215-20260712.md
```

Commit:

```txt
fc3d19dc3541fb5ec49e4be7eb85c569d022224f
```

Orden activo:

```txt
OP-1 CRM / Cliente360
OP-2 Aseguradoras
OP-3 Cotizador y Comparativo
OP-4 Ops y Leads end-to-end
```

Cada módulo exige validación visual antes de avanzar.

## OP-1 CRM — avance funcional

### Hallazgo

Calidad iniciaba con `soloVig=true`. Mientras no existe la fuente de Pólizas, la vista podía ocultar todos los clientes incompletos del dry-run.

### Corrección aplicada

Archivo:

```txt
orbit360-platform/modules/calidad.js
```

Commit:

```txt
1e36f0a9575b029f0f83935c6c8acd3c683340a2
```

Cambios:

- `soloVig=false` como estado inicial;
- operación antes y después de importar Pólizas;
- vista según scope activo;
- filtro por asesor cuando aplica;
- alertas para contacto, correo, documento, departamento, ciudad, dirección y contacto principal;
- catálogos geográficos;
- solo completar campos vacíos;
- motivo/fuente obligatorio;
- auditoría y `REQUIERE_VALIDACION`;
- campañas preparadas, no enviadas.

### Validador CRM

```txt
tools/orbit360-validar-crm-op1.mjs
.github/workflows/orbit360-crm-op1-smoke.yml
```

Commits:

```txt
91e3187b4c502c76fa25beaf391860f953310ba2
e25acbb75ef0e27a037ed264d0bb2502849cf463
```

## Estado por módulo

### CRM

```txt
Funcional estático: avanzado
Calidad por alcance: corregida
Validación visual: pendiente
Fuente clientes: disponible/dry-run sanitizado
Fuente Pólizas: siguiente fuente separada después del cierre visual CRM
```

### Aseguradoras

```txt
Directorio/ficha/recursos: avanzados
Panel documental/lotes/historial: disponible en consulta controlada
Dry-run GT/CO: pendiente de revisión operativa y visual
Habilitación tarifaria: bloqueada hasta validación explícita
```

### Cotizador/Comparativo

```txt
Contrato y empalme v1.215: aplicados
Validador/CI: agregados
Validación visual: pendiente
Tarifas reales A&S: no requeridas para cerrar contrato/UI
```

### Ops/Leads

```txt
Núcleo compartido: conservado
issuance_request/endorsement_request: integrados
Validación end-to-end y visual: pendiente
```

## Gate visual

Un módulo solo se declara cerrado después de probar:

```txt
1366 px
768 px
390 px
Admin/Dirección
Operativo
Asesor
scopes propios/equipo/todos/ninguno cuando aplique
GT/GTQ y CO/COP
persistencia tras recarga
cero errores de consola
capturas y reporte
```

## Próxima acción

Completar OP-1 CRM con:

1. cache-bust seguro local;
2. validador estático CRM;
3. smoke en LAB/local;
4. validación visual de Cliente360 y Calidad por roles/tamaños;
5. reporte de hallazgos;
6. corregir P0/P1 visuales;
7. pasar a Aseguradoras.

No se ejecutará producción ni carga masiva de datos.
