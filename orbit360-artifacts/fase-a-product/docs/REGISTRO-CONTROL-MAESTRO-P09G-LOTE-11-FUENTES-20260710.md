# Registro control maestro — P0.9g lote controlado de once fuentes

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `LOTE_CONFIGURADO / ORQUESTADOR_IMPLEMENTADO / EJECUCION_REAL_PENDIENTE`

## Fuente real usada

Se reutiliza el inventario real ya auditado:

- ocho cotizadores/tarifarios Excel;
- tres cotizaciones PDF;
- seis aseguradoras;
- tenant Alianzas y Soluciones.

No se subieron binarios, PII, rutas, tasas ni payloads reales.

## Carril A — Prototipo/UX/Claude

Avance:

- panel solo lectura ampliado con lote;
- progreso por fuente;
- referencias pendientes;
- fallos;
- bindings listos/incompletos;
- estados honestos;
- requisitos por rol;
- Academia documentada.

Pendiente:

- UX de ejecución;
- drawer de revisión;
- diff;
- confirmaciones;
- reintentos visuales;
- historial;
- smoke navegador;
- candidata Claude.

Claude no se solicita todavía.

## Carril B — Backend/contratos

Avance:

```text
data/tenant-alianzas-soluciones-source-batch-p09g.js
core/aseguradoras-batch-orchestrator-p09g.js
```

Actualizados:

```text
core/aseguradoras-runtime-bootstrap-p09f.js
modules/aseguradoras-knowledge-panel-p09f.js
```

Cerrado:

- registro tenant del lote;
- resolución por directorio/configuración;
- once fuentes;
- orden secuencial;
- referencias backend;
- reintentos;
- dry-run;
- doble confirmación;
- persistencia delegada al gate P0.9e;
- verificación read model;
- estado público sanitizado;
- binding sets;
- eventos;
- panel de solo lectura;
- workflow.

Pendiente:

- bridge backend real;
- resolver Drive/upload;
- ejecución LAB;
- auditoría de run global si se requiere;
- persistencia del historial de lotes;
- CI visible.

## Carril C — Fuentes reales

Avance:

El lote A&S queda definido así:

```text
Seguros BAM: 2
Bantrab: 2
Seguros Columna: 1
Aseguradora Guatemalteca: 3
Aseguradora Rural (Banrural): 2
Seguros Universales: 1
```

Bindings conocidos:

```text
AseGuate automóvil
AseGuate microbús
Universales Riesgo Plus
```

Pendiente:

- referencias reales;
- dry-run real;
- revisión de outputs;
- reglas tarifarias revisadas;
- reconciliaciones;
- persistencia metadata-only;
- bindings reales;
- segundo gate.

## Decisiones que no deben reabrirse

- Banrural y Aseguradora Rural son la misma aseguradora.
- Columna corresponde a Seguros Columna.
- IDs se resuelven internamente.
- referencias autorizadas las genera backend.
- AseGuate: gasto de emisión 5% sobre prima neta.
- AseGuate: IVA 12% sobre subtotal gravable confirmado.
- automóvil y microbús son variantes separadas.
- Universales tiene presentación, pero todavía no tarifa validada.

## Estado honesto

```text
lote tenant: configurado
orquestador: implementado
bootstrap: actualizado
panel: actualizado
smokes: configurados
workflow: configurado
index aplicado: no
provider: no conectado
referencias reales: no resueltas
lote real: no ejecutado
Firestore LAB: no escrito por P0.9g
Cotizador: deshabilitado
Comparativo: deshabilitado
```

## Próxima acción

P0.9h:

1. definir contrato de referencia backend por lote;
2. preparar comando/bridge de dry-run real;
3. conservar ejecución parcial y reanudable;
4. registrar historial de run metadata-only;
5. conectar el panel a detalle de resultados;
6. ejecutar primera fuente y después lote completo en LAB;
7. mantener segundo gate cerrado.

## Archivos relacionados

- `IMPLEMENTACION-P09G-LOTE-CONTROLADO-11-FUENTES-ASEGURADORAS-20260710.md`
- `ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P09G-LOTE-20260710.md`
- `IMPLEMENTACION-P09F-BOOTSTRAP-PRIMERA-FUENTE-PANEL-20260710.md`
- `REGISTRO-CONTROL-MAESTRO-P09F-RUNTIME-PRIMERA-FUENTE-20260710.md`
