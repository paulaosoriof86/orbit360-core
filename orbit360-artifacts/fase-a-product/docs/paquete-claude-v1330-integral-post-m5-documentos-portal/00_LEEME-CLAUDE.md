# PAQUETE CLAUDE INTEGRAL v1330 — README

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama backend activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Este paquete se entrega a Claude para generar una nueva candidata frontend/prototipo que incorpore los avances acumulados de backend/contratos/UX/Academia posteriores a v1330, sin tocar backend protegido.

El foco es UX/prototipo/Academia, no backend real.

## Fuente maestra

Antes de modificar cualquier archivo, Claude debe leer y aplicar:

```txt
DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md
ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md
```

## Restricciones absolutas

No tocar, reemplazar ni regenerar:

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

No incluir:

```txt
secretos
credenciales reales
tokens
service accounts
config Firebase sensible
datos reales A&S
clientes reales
pólizas reales
estados bancarios reales
planillas reales completas
rutas privadas
base64 de archivos
bytes de archivos
URLs públicas de documentos reales
```

## Archivos del paquete

```txt
00_LEEME-CLAUDE.md
01_PROMPT-CLAUDE-INTEGRAL-V1330.md
02_ALCANCE-MODULOS-Y-UX.md
03_REGLAS-BACKEND-A-CONSERVAR.md
04_ACADEMIA-PROFUNDA-ACTUALIZAR.md
05_CHECKLIST-ENTREGA-CANDIDATA.md
06_PROMPT-CORTO-PARA-PEGAR.md
07_MAPA-DOCUMENTOS-BASE.md
```

## Resultado esperado de Claude

Claude debe entregar una candidata completa del prototipo que:

- mantenga Orbit 360 SaaS/multi-tenant;
- conserve backend protegido intacto;
- actualice UX de Portal Cliente, Cobros, Cliente360, Documentos, M5 Conciliaciones, Equipo, Configuración y Academia;
- use estados honestos;
- no simule integraciones ni Storage real;
- no use datos reales;
- documente cambios, pendientes y riesgos;
- incluya checklist de entrega.

## Estado

Paquete creado para uso inmediato con Claude.