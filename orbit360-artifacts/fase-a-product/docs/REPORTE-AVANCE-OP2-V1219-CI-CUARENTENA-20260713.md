# Reporte de avance — Aseguradoras OP-2 v1.219

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Sin merge, deploy, producción ni escritura de datos reales

## Estado modular

```txt
CRM OP-1: cerrado · 10/10
Aseguradoras OP-2 funcional: implementado
Aseguradoras OP-2 visual reutilizable: 12/15
Pendiente visual: solo 3 vistas de Plataformas
```

## Avance visible del bloque

### Cuarentena previa al parser

Se agregó:

```txt
core/aseguradoras-op2-sheet-quarantine.js
```

La cuarentena:

- combina nombre de hoja y señales de contenido;
- excluye hojas de apoyo, internas o técnicas;
- ocurre antes del parser y de construir operaciones;
- no escribe en `Orbit.store`;
- no muestra ni conserva valores de las hojas excluidas;
- conserva una hoja operativa aunque contenga campos de acceso del portal;
- registra únicamente hoja, motivo y conteos.

### Revisión sin captura

Se separaron dos fases:

```txt
Revisión preliminar:
  captureSecure=false
  sin sesión de cuentas o accesos

Importación preparada:
  captureSecure=true por defecto
  solo sobre hojas permitidas
```

La revisión de alias ya no puede provocar una captura protegida duplicada.

### Evidencia estructurada

El reanudador final usa:

```txt
results.jsonl
capturas PNG
IDs exactos de escenario
booleano ok
```

No usa frases del reporte, tildes, codificación ni el archivo más reciente como única prueba.

## Ejecución CI observable

En la ejecución observada posterior a los primeros fixes aprobaron:

```txt
sintaxis JavaScript
validador general Aseguradoras
política de cuentas y accesos
cuarentena de hojas
harness focalizado de Plataformas
reuso de evidencia JSONL
backend protegido
roles
proveedor seguro
```

El único fallo fue una comprobación textual del workflow que todavía buscaba un indicador anterior de la cuarentena. No fue un fallo funcional del módulo ni del validador.

El workflow fue actualizado para comprobar:

```txt
excludedSheetValuesCaptured=false
captureSecure respeta false
prueba REVIEW_CAPTURE_FALSE
Academia v1.219
Node 24
```

Estado actual:

```txt
Última ejecución completamente observada: fallo instrumental ya corregido
Nueva ejecución posterior a la corrección: pendiente de observación
No declarar CI verde hasta confirmar esa ejecución
```

## Carril A — Claude, UX y Academia

Documentado para prototipo comercializable:

```txt
docs/PATRON-CLAUDE-CUARENTENA-HOJAS-IMPORTADORES-V1219-20260713.md
```

Academia conserva los mismos cursos, progreso y certificados, y agrega:

- cuarentena de hojas;
- diferencia entre hoja operativa y técnica;
- revisión sin captura;
- importación preparada;
- pregunta aplicada de exclusión segura.

No se trasladan datos A&S ni configuraciones privadas a Claude.

## Carril B — backend y seguridad

- backend protegido intacto;
- cuarentena antes del parser;
- permisos de cuentas y accesos conservados;
- migración legacy no destructiva;
- integración de index con backup y rollback;
- pruebas estáticas y workflow actualizados.

## Carril C — fuentes reales

Inventario sanitizado:

```txt
Guatemala: 18 hojas · 14 candidatas · 4 excluidas
Colombia: 17 hojas · 16 candidatas · 1 excluida
```

No se hicieron escrituras ni aplicación. Los dry-runs completos siguen separados y pendientes.

## Pendientes reales

1. Observar CI del HEAD posterior a las correcciones.
2. Ejecutar una sola vez el gate focalizado de tres Plataformas.
3. Cerrar Aseguradoras 15/15.
4. Dry-run Guatemala sin escritura.
5. Resolver alias, aliados y bloqueos.
6. Dry-run Colombia sin escritura.
7. Continuar Cotizador + Comparativo.

## Metodología 0% manual

No solicitar otra ejecución a Paula mientras exista un fallo estático o instrumental no estabilizado. El siguiente comando local debe ser único, focalizado y final para Plataformas.
