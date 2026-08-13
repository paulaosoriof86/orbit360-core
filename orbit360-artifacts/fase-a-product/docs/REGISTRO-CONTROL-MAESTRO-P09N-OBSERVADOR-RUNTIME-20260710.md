# Registro de control maestro — P0.9n

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open, sin merge ni deploy.

## Carril actual

Carriles B + C, con traducción acumulada al Carril A.

## Qué parte del plan avanzó

Se implementó observación sanitizada del runtime real de Aseguradoras:

```txt
panel/formulario
→ Auth/rol activo
→ conexión
→ preview
→ lectura
→ historial
→ recarga/read model
→ responsive/copy
→ gate Claude
```

## Paso intermedio, si hubo

Se detectaron y corrigieron cuatro riesgos:

1. `sources` contaba aseguradoras y no documentos.
2. El estado del formulario desaparecía después de recargar.
3. Responsive podía aprobarse con una sola resolución.
4. El cliente podía intentar enviar `Claude listo` al host.

## Qué quedó cerrado

### Carril B

- observador browser P0.9n;
- bridge de reporte;
- endpoint same-origin;
- esquema cerrado;
- reportes privados JSON/Markdown;
- gate derivado por servidor;
- reconstrucción desde historial;
- bootstrap con 29 dependencias;
- launcher/revisor;
- smokes y workflow.

### Carril C

El observador no lee contenido real ni valores. Solo registra el estado estructural de la fuente y del flujo AseGuate cuando se ejecute.

### Carril A

Se acumularon requisitos de:

- estados de usuario;
- responsive;
- copy no técnico;
- progresión documental;
- historial después de recarga;
- frontera Aseguradoras/Cotizador/Comparativo;
- Academia por rol.

## Qué falta

- ejecutar el navegador real;
- observar desktop y mobile;
- generar preview AseGuate;
- ejecutar lectura desde formulario;
- guardar historial mediante confirmación separada;
- recargar;
- confirmar read model;
- revisar frontera visual de módulos;
- consolidar reportes;
- cerrar o mantener gate Claude.

## Riesgos controlados

| Riesgo | Control | Estado |
|---|---|---|
| Capturar PII/texto | esquema cerrado | cerrado |
| Filtrar rutas/referencias | sanitización bridge + host | cerrado |
| Gate manipulado por cliente | cálculo servidor | cerrado |
| Confundir aseguradoras con fuentes | suma `docs[]` | cerrado |
| Perder historial en recarga | `latest/latestItems` | cerrado |
| Aprobar responsive con desktop | exige mobile + desktop | cerrado |
| Activar módulos | flags `false` | cerrado |
| Modificar backend protegido | archivos aditivos | cerrado |

## Estado honesto

```txt
P0.9n código: implementado
smokes/workflow: configurados
reporte real navegador: pendiente
responsive real: pendiente
frontera visual: pendiente
Claude: todavía no
Cotizador: deshabilitado
Comparativo: deshabilitado
```

## Siguiente acción

P0.9o — consolidador de observaciones y checklist visual:

```txt
reportes P0.9n
→ consolidar desktop/mobile
→ consolidar antes/después de recarga
→ checklist frontera de módulos
→ aprobación visual separada
→ gate final Claude
```

## Acción manual requerida

No requerida para preparar P0.9o. La validación real se solicitará únicamente cuando el comando consolidado esté listo.
